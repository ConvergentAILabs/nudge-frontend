import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";

import { useChatContext } from "./ChatContext";

const API_BASE = import.meta.env.VITE_API_BASE;

/* ======================================================
 * Types
 * ====================================================== */

export type WizardQuestion = {
  key: string;
  prompt: string;
  example?: string;
};

type WizardAnswers = Record<string, string>;

export type WizardContextType = {
  taskId: string | null;
  isActive: boolean;

  questions: WizardQuestion[];
  answers: WizardAnswers;
  authorized: boolean | null;

  isLoading: boolean;
  error: string | null;

  startWizard: (taskId: string) => Promise<void>;
  reloadWizard: () => Promise<void>;
  updateAnswer: (key: string, value: string) => void;
  saveDraft: () => Promise<void>;
  completeWizard: (authorized: boolean) => Promise<void>;
  closeWizard: () => void;
};

/* ======================================================
 * Stable Question Registry (LOCKED)
 * ====================================================== */

const WIZARD_QUESTIONS: WizardQuestion[] = [
  {
    key: "outcome",
    prompt: "What outcome are you trying to achieve?",
    example:
      "For example: Create a clear, investor ready business plan that includes positioning, pricing, and a launch path.",
  },
  {
    key: "scope",
    prompt: "What’s included, and what’s explicitly out of scope?",
    example:
      "For example: Include market analysis, product definition, and financial projections. Exclude branding, pitch decks, or legal filings.",
  },
  {
    key: "success",
    prompt: "How will we know this work is complete or successful?",
    example:
      "For example: The work is complete when the plan can be submitted as part of a grant application without additional revisions.",
  },
  {
    key: "constraints",
    prompt: "Are there any constraints I must respect?",
    example:
      "For example: Assume a nonprofit structure, no paid research tools, and a limited operating budget.",
  },
];

const WizardContext = createContext<WizardContextType | null>(null);

export const useWizard = (): WizardContextType => {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used within WizardProvider");
  return ctx;
};

function ensureAllKeys(
  answers: WizardAnswers,
  questions: WizardQuestion[]
): WizardAnswers {
  const next: WizardAnswers = { ...(answers ?? {}) };
  for (const q of questions) {
    if (typeof next[q.key] !== "string") next[q.key] = "";
  }
  return next;
}

export const WizardProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);

  const [questions] = useState(WIZARD_QUESTIONS);
  const [answers, setAnswers] = useState<WizardAnswers>({});
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { conversationId } = useChatContext();

  useEffect(() => {
    // 🔥 HARD RESET ON SESSION CHANGE
    setTaskId(null);
    setIsActive(false);
    setAnswers({});
    setAuthorized(null);
    setError(null);
  }, [conversationId]);

  /* ======================================================
   * HYDRATE FROM SERVER (AUTHORITATIVE)
   * ====================================================== */
  const hydrateFromServer = useCallback(
    async (tid: string) => {
      const res = await fetch(`${API_BASE}/api/wizard/${tid}`);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to load wizard state");
      }

      const data = await res.json();

      const hydratedAnswers = ensureAllKeys(
        data?.answers ?? {},
        questions
      );

      setAnswers(hydratedAnswers);
      setAuthorized(
        typeof data?.authorized === "boolean"
          ? data.authorized
          : null
      );
    },
    [questions]
  );

  /* ======================================================
   * START / REOPEN
   * ====================================================== */
  const startWizard = useCallback(
    async (tid: string) => {
      if (!tid) return;

      // 🔥 HARD RESET BEFORE STARTING NEW WIZARD
      setAnswers({});
      setAuthorized(null);
      setError(null);

      setTaskId(tid);
      setIsActive(true);
      setIsLoading(true);
      setError(null);

      try {
        await hydrateFromServer(tid);
      } catch (e: any) {
        setError(e?.message ?? "Wizard failed to start");
      } finally {
        setIsLoading(false);
      }
    },
    [hydrateFromServer]
  );

  const reloadWizard = useCallback(async () => {
    if (!taskId) return;

    setIsLoading(true);
    setError(null);

    try {
      await hydrateFromServer(taskId);
    } catch (e: any) {
      setError(e?.message ?? "Wizard failed to reload");
    } finally {
      setIsLoading(false);
    }
  }, [taskId, hydrateFromServer]);

  /* ======================================================
   * LOCAL ANSWER UPDATE
   * ====================================================== */
  const updateAnswer = useCallback((key: string, value: string) => {
    setAnswers((prev) => ({ ...(prev ?? {}), [key]: value }));
  }, []);

  /* ======================================================
   * SAVE DRAFT
   * ====================================================== */
  const saveDraft = useCallback(async () => {
    if (!taskId) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/wizard/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: taskId,
          answers,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Wizard save failed");
      }
    } catch (e: any) {
      setError(e?.message ?? "Wizard save failed");
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [taskId, answers]);

  /* ======================================================
   * COMPLETE WIZARD
   * ====================================================== */
  const completeWizard = useCallback(
    async (authorizedFlag: boolean) => {
      if (!taskId) return;

      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE}/api/wizard/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task_id: taskId,
            authorized: authorizedFlag,
            answers,
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Wizard complete failed");
        }

        setAuthorized(authorizedFlag);
        setIsActive(false);
      } catch (e: any) {
        setError(e?.message ?? "Wizard complete failed");
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [taskId, answers]
  );

  /* ======================================================
   * CLOSE
   * ====================================================== */
  const closeWizard = useCallback(() => {
    setIsActive(false);
  }, []);

  const value = useMemo(
    () => ({
      taskId,
      isActive,
      questions,
      answers,
      authorized,
      isLoading,
      error,
      startWizard,
      reloadWizard,
      updateAnswer,
      saveDraft,
      completeWizard,
      closeWizard,
    }),
    [
      taskId,
      isActive,
      questions,
      answers,
      authorized,
      isLoading,
      error,
      startWizard,
      reloadWizard,
      updateAnswer,
      saveDraft,
      completeWizard,
      closeWizard,
    ]
  );

  return (
    <WizardContext.Provider value={value}>
      {children}
    </WizardContext.Provider>
  );
};
