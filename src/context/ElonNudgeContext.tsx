import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useChatContext } from "./ChatContext";

/* ======================================================
 * 🔒 KILL SWITCHES
 * ====================================================== */

const ENABLE_NUDGE_HEURISTICS = true;
const ENABLE_SEMANTIC_CONFIRMATION = true;

/* ======================================================
 * Heuristic vocabulary (LIGHT)
 * ====================================================== */

const PLANNING_KEYWORDS = [
  "plan",
  "planning",
  "project",
  "organize",
  "organise",
  "steps",
  "phases",
  "milestones",
  "roadmap",
  "timeline",
  "tasks",
  "break down",
];

/* ======================================================
 * Types
 * ====================================================== */

type NudgeStage = "none" | "discovery" | "activation";

type ElonNudgeContextType = {
  isVisible: boolean;
  stage: NudgeStage;
  reason: string | null;
  dismiss: () => void;
};

const ElonNudgeContext = createContext<ElonNudgeContextType | null>(null);

/* ======================================================
 * Heuristic gate
 * ====================================================== */

function passesHeuristicGate(text: string): boolean {
  if (!ENABLE_NUDGE_HEURISTICS) return true;
  const lower = text.toLowerCase();
  return PLANNING_KEYWORDS.some((kw) => lower.includes(kw));
}

/* ======================================================
 * Semantic confirmation (Option A)
 * ====================================================== */

function looksLikeDurableWorkSemantic(text: string): boolean {
  if (!ENABLE_SEMANTIC_CONFIRMATION) return true;

  const lower = text.toLowerCase();

  const semanticSignals = [
    "business plan",
    "strategy",
    "strategic",
    "go to market",
    "gtm",
    "launch",
    "financial",
    "forecast",
    "model",
    "roadmap",
    "milestone",
    "timeline",
    "multi step",
    "over time",
  ];

  if (semanticSignals.some((kw) => lower.includes(kw))) return true;

  if (lower.includes("###") || lower.includes("phase ") || lower.includes("step ")) {
    return true;
  }

  return true;
}

/* ======================================================
 * Provider
 * ====================================================== */

export const ElonNudgeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { messages, elonState, activeTaskId } = useChatContext();

  const [isVisible, setIsVisible] = useState(false);
  const [stage, setStage] = useState<NudgeStage>("none");
  const [reason, setReason] = useState<string | null>(null);

  const lastEvaluatedIndexRef = useRef<number | null>(null);
  const discoveryShownRef = useRef(false);
  const activationShownRef = useRef(false);

  /* -------------------------------------------------- */
  /* Reset on new task                                  */
  /* -------------------------------------------------- */
  useEffect(() => {
    discoveryShownRef.current = false;
    activationShownRef.current = false;
    lastEvaluatedIndexRef.current = null;
    setIsVisible(false);
    setStage("none");
    setReason(null);
  }, [activeTaskId]);

  /* -------------------------------------------------- */
  /* Reset activation on revoke                         */
  /* -------------------------------------------------- */
  useEffect(() => {
    if (!elonState.permitted) {
      activationShownRef.current = false;
    }
  }, [elonState.permitted]);

  /* -------------------------------------------------- */
  /* Message completion observer (CORRECTED)            */
  /* -------------------------------------------------- */
  useEffect(() => {
    if (messages.length === 0) return;

    const lastIndex = messages.length - 1;

    if (
      lastEvaluatedIndexRef.current !== null &&
      lastEvaluatedIndexRef.current === lastIndex
    ) {
      return;
    }

    const lastMessage = messages[lastIndex];
    if (lastMessage.role !== "assistant") return;

    lastEvaluatedIndexRef.current = lastIndex;

    if (isVisible) return;

    const lastUser = [...messages]
      .reverse()
      .find((m) => m.role === "user")?.content;

    const combinedText = `${lastUser ?? ""}\n${lastMessage.content}`.trim();
    if (!combinedText) return;

    if (!passesHeuristicGate(combinedText)) return;
    if (!looksLikeDurableWorkSemantic(combinedText)) return;

    // Discovery
    if (!elonState.permitted && !discoveryShownRef.current) {
      discoveryShownRef.current = true;
      setStage("discovery");
      setReason(
        "**This looks like work that may evolve over time:**\n" +
          "Planning and multi-step efforts often benefit from continuity across sessions. " +
          "ELON can help keep things organized — completely optional."
      );
      setIsVisible(true);
      return;
    }

    // Activation
    if (elonState.permitted && !elonState.accepted && !activationShownRef.current) {
      activationShownRef.current = true;
      setStage("activation");
      setReason(
        "**ELON is available for this work:**\n" +
          "If you’d like this effort tracked and managed over time, you can accept ELON at any point."
      );
      setIsVisible(true);
    }
  }, [messages, elonState, isVisible]);

  /* -------------------------------------------------- */
  /* Dismiss                                           */
  /* -------------------------------------------------- */
  const dismiss = useCallback(() => {
    setIsVisible(false);
  }, []);

  const value = useMemo(
    () => ({ isVisible, stage, reason, dismiss }),
    [isVisible, stage, reason, dismiss]
  );

  return (
    <ElonNudgeContext.Provider value={value}>
      {children}
    </ElonNudgeContext.Provider>
  );
};

export const useElonNudge = () => {
  const ctx = useContext(ElonNudgeContext);
  if (!ctx) {
    throw new Error("useElonNudge must be used within ElonNudgeProvider");
  }
  return ctx;
};
