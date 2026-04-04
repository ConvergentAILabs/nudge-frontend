import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { StreamingClient } from "../lib/sse/StreamingClient";

// 🔥 API BASE (PRODUCTION BACKEND)
const API_BASE = import.meta.env.VITE_API_BASE;

if (!API_BASE) {
  throw new Error("VITE_API_BASE is NOT set");
}

// 🔥 GLOBAL INIT LOCK (prevents duplicate /conversation/init per session)
const INIT_LOCK: Record<string, boolean> = {};

type Role = "user" | "assistant" | "system";

export type ChatMessage = {
  role: Role;
  content: string;
  beginWizard?: boolean;
  optimistic?: boolean; // ← ADD THIS LINE
};

export type ElonState = {
  available: boolean;
  permitted: boolean;
  accepted: boolean;
  executable: boolean;
};

type ExecutionState =
  | "IDLE"
  | "RUNNING"
  | "PAUSED"
  | "COMPLETED"
  | "ABORTED";

type AgentMode = "MAX" | "ELON";

type ChatContextType = {
  conversationId: string | null;

  setConversationId: (id: string) => void;

  messages: ChatMessage[];
  sendUserMessage: (text: string) => Promise<void>;
  switchConversation: (id: string) => Promise<void>; // 🔥 ADD THIS
  abortExecution: () => Promise<void>;
  resumeExecution: () => Promise<void>; 
  inputDisabled: boolean;
  isWorking: boolean;

  elonState: ElonState;
  refreshElonState: () => Promise<void>;

  agentMode: AgentMode;
  setAgentMode: (mode: AgentMode) => void;

  activeTaskId: string | null;
  executionInstanceId: string | null;

  executionState: ExecutionState;
  pausedSectionIndex: number | null;

  wizardOfferTaskId: string | null;
  wizardUnlockedTaskId: string | null;
  consumeWizardOffer: () => void;
  startNewSession: () => Promise<string | null>;

  authorizationManifestId: string | null;
  activeAssets: string[];
  setActiveAssets: (ids: string[]) => void;
  toggleAsset: (assetId: string) => void;

  artifact: string;
};

function getOrCreateConversationId(): string {
  return localStorage.getItem("nudgesession") || "";
}

const BEGIN_WIZARD_TOKEN = "[[BEGIN_WIZARD]]";

const DEFAULT_ELON_STATE: ElonState = {
  available: true,
  permitted: false,
  accepted: false,
  executable: false,
};

const ChatContext = createContext<ChatContextType | null>(null);

function normalizeElonState(payload: any): ElonState {
  const candidate = payload?.elon ?? payload;

  
  return {
    available:
      typeof candidate?.available === "boolean"
        ? candidate.available
        : DEFAULT_ELON_STATE.available,
    permitted:
      typeof candidate?.permitted === "boolean"
        ? candidate.permitted
        : DEFAULT_ELON_STATE.permitted,
    accepted:
      typeof candidate?.accepted === "boolean"
        ? candidate.accepted
        : DEFAULT_ELON_STATE.accepted,
    executable:
      typeof candidate?.executable === "boolean"
        ? candidate.executable
        : DEFAULT_ELON_STATE.executable,
  };
}

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({
  
  children,
}) => {
  const [conversationId, setConversationId] = useState<string | null>(
    getOrCreateConversationId() || null
  );

  const [messageMap, setMessageMap] = useState<Record<string, ChatMessage[]>>({});
  const messages = conversationId
    ? messageMap[conversationId] || []
    : [];
  const [inputDisabled, setInputDisabled] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [taskSummaries, setTaskSummaries] = useState<any[]>([]);
  const [elonState, setElonState] = useState<ElonState>(DEFAULT_ELON_STATE);
  const [agentMode, setAgentMode] = useState<AgentMode>("MAX");
  const [taskMap, setTaskMap] = useState<Record<string, string | null>>({});
  const activeTaskId = conversationId ? taskMap[conversationId] || null : null;

  const [executionInstanceMap, setExecutionInstanceMap] = useState<Record<string, string | null>>({});
  const executionInstanceId = conversationId
    ? executionInstanceMap[conversationId] || null
    : null;
  const [executionStateMap, setExecutionStateMap] = useState<Record<string, ExecutionState>>({});
  const [artifactMap, setArtifactMap] = useState<Record<string, string>>({});
  
  const executionState = conversationId
    ? executionStateMap[conversationId] || "IDLE"
    : "IDLE";

    const artifact = conversationId
      ? artifactMap[conversationId] || ""
      : "";

  const [pausedSectionIndex, setPausedSectionIndex] =
    useState<number | null>(null);
  const [wizardOfferTaskId, setWizardOfferTaskId] = useState<string | null>(null);
  const [wizardMap, setWizardMap] = useState<Record<string, string | null>>({});
  const wizardUnlockedTaskId = conversationId ? wizardMap[conversationId] || null : null;
  const isWizardOpen =
    !!wizardOfferTaskId ||
    !!wizardUnlockedTaskId;

  const [authorizationManifestId, setAuthorizationManifestId] = useState<string | null>(null);

  // ✅ Active Assets (FILES panel → MAX context)
  const [activeAssets, setActiveAssetsState] = useState<string[]>([]);
  const activeAssetsRef = useRef<string[]>([]);

  const setActiveAssets = useCallback((ids: string[]) => {
    activeAssetsRef.current = ids;
    setActiveAssetsState(ids);
  }, []);

  const toggleAsset = useCallback((assetId: string) => {
    const prev = activeAssetsRef.current;

    const next = prev.includes(assetId)
      ? prev.filter((id) => id !== assetId)
      : [...prev, assetId];

    activeAssetsRef.current = next;
    setActiveAssetsState(next);
  }, []);

  useEffect(() => {
    console.log("🔥 CONTEXT ACTIVE ASSETS UPDATED:", activeAssets);
  }, [activeAssets]);

  useEffect(() => {
  if (!conversationId) return;

}, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;

    const currentSessionId = conversationId;

    if (lastLoadedSessionRef.current === currentSessionId) return;
    lastLoadedSessionRef.current = currentSessionId;

    console.log("📥 LOADING HISTORY FOR:", conversationId);

    // 🔥 cancel mechanism for duplicate effects
    let cancelled = false;

    // 🔥 HARD RUNTIME RESET (conversation boundary)
    if (clientRef.current) {
      try {
        clientRef.current.offAll();
        clientRef.current.close();
      } catch (e) {
        console.warn("SSE cleanup error", e);
      }
      clientRef.current = null;
    }

    activeAssistantIndexRef.current = null;
    streamingRef.current = false;
    allowStreamingRef.current = false;
    lastDeltaRef.current = null;
    queuedSystemNoticesRef.current = [];

    const loadHistory = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/chat/history?session_id=${encodeURIComponent(currentSessionId)}`
        );

        if (!res.ok) return;

        const data = await res.json();

        const messages = Array.isArray(data) ? data : data?.messages;

        if (!cancelled && Array.isArray(messages)) {
          setMessageMap(prev => ({
            ...prev,
            [currentSessionId]: messages
          }));
          // 🔥 RESTORE ACTIVE TASK FOR THIS SESSION (data.db truth)
          try {
            const taskRes = await fetch(
              `${API_BASE}/api/task/active?session_id=${encodeURIComponent(currentSessionId)}`
            );

            if (taskRes.ok) {
              const taskData = await taskRes.json();

              if (!cancelled) {
                if (taskData?.task_id) {
                  setTaskMap(prev => ({
                    ...prev,
                    [currentSessionId]: taskData.task_id
                  }));

                  // 🔥 LOAD EXECUTION FOR THIS TASK (CORRECT PATH)
                  try {
                    const execRes = await fetch(
                      `${API_BASE}/api/execution/active?session_id=${encodeURIComponent(currentSessionId)}`
                    );

                    if (execRes.ok) {
                      const execData = await execRes.json();

                      setExecutionInstanceMap(prev => ({
                        ...prev,
                        [currentSessionId]: execData?.execution_instance_id || null
                      }));
                    }
                  } catch (err) {
                    console.warn("Failed to load execution for session", err);
                  }

                } else {
                  setTaskMap(prev => ({
                    ...prev,
                    [currentSessionId]: null
                  }));


                }
              }
            }
          } catch (err) {
            if (!cancelled) {
              console.warn("Failed to restore task state", err);
            }
          }
          allowStreamingRef.current = false;
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load history", err);
        }
      }
    };

    loadHistory();

    fetch(`${API_BASE}/api/execution/active?session_id=${encodeURIComponent(currentSessionId)}`)
      .then(res => res.json())
      .then(async data => {
        const executionId = data.execution_instance_id || null;

                // 🔥 TASK SUMMARY (ACTIVE ONLY - V1)
        if (executionId) {
          setTaskSummaries([
            {
              task_id: executionId,
              status: "RUNNING",
              updated_at: Date.now(),
            },
          ]);
        } else {
          setTaskSummaries([]);
        }

        setExecutionInstanceMap(prev => ({
          ...prev,
          [currentSessionId]: executionId
        }));

        // 🔥 ADD THIS BLOCK (artifact rehydration)
        if (executionId) {
          try {
            const res = await fetch(`${API_BASE}/api/execution/artifact/${executionId}`);
            if (res.ok) {
              const artifactData = await res.json();

              setArtifactMap(prev => ({
                ...prev,
                [currentSessionId]: artifactData?.artifact_body || ""
              }));
            }
          } catch (err) {
            console.warn("Artifact rehydrate failed", err);
          }
        }
      })
      .catch(err => {
        console.warn("Failed to rehydrate execution", err);
      });

    return () => {
      // 🔥 THIS is the key — kills duplicate effect results
      cancelled = true;
    };
  }, [conversationId]);

  const activeAssistantIndexRef = useRef<number | null>(null);
  const streamingRef = useRef<boolean>(false);
  const lastDeltaRef = useRef<string | null>(null);
  const allowStreamingRef = useRef(false);
  const clientRef = useRef<StreamingClient | null>(null);
  const lastExecutionLoadRef = useRef<string | null>(null);
  const lastLoadedSessionRef = useRef<string | null>(null);

  const activeConnectionIdRef = useRef<number>(0);

  const unlockTimerRef = useRef<number | null>(null);
  const queuedSystemNoticesRef = useRef<string[]>([]);
 

  const isStartingSessionRef = useRef(false);

  const startNewSession = useCallback(async () => {
    // 🔥 HARD BLOCK if already running OR if chat is active
    if (isStartingSessionRef.current) {
      console.warn("🚫 BLOCK DUPLICATE startNewSession");
      return null;
    }

    if (streamingRef.current) {
      console.warn("🚫 BLOCK startNewSession DURING STREAM");
      return null;
    }

    isStartingSessionRef.current = true;

    console.warn("🔥 startNewSession CALLED");

    const newId = crypto.randomUUID();

    try {
      const res = await fetch(`${API_BASE}/api/conversation/init`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-conversation-id": newId,
        },
        body: JSON.stringify({ conversation_id: newId }),
      });

      if (!res.ok) {
        console.error("Failed to create conversation");
        return null;
      }

      const data = await res.json();

      const confirmedId =
        data?.conversation_id ||
        data?.id ||
        data?.session_id ||
        newId;

      await fetch(`${API_BASE}/api/sessions/${confirmedId}/activate`, {
        method: "POST",
      });

      localStorage.setItem("nudgesession", confirmedId);

      setConversationId(confirmedId);

      setPausedSectionIndex(null);

      setWizardOfferTaskId(null);

      setElonState(DEFAULT_ELON_STATE);
      setAgentMode("MAX");
      setAuthorizationManifestId(null);
      setActiveAssets([]);

      streamingRef.current = false;
      setIsWorking(false);
      setInputDisabled(false);

      return confirmedId;
    } catch (err) {
      console.error("startNewSession failed", err);
      return null;
    } finally {
      setTimeout(() => {
        isStartingSessionRef.current = false;
      }, 0);
    }
  }, [setActiveAssets]);


  const clearUnlockTimer = () => {
    if (unlockTimerRef.current !== null) {
      window.clearTimeout(unlockTimerRef.current);
      unlockTimerRef.current = null;
    }
  };

  const armUnlockTimer = () => {
    clearUnlockTimer();
    unlockTimerRef.current = window.setTimeout(() => {
      streamingRef.current = false;
      setIsWorking(false);
      setInputDisabled(false);
    }, 8000);
  };

  const refreshElonState = useCallback(async () => {
    if (!conversationId || conversationId.trim().length === 0) return;

    try {
      const res = await fetch(`${API_BASE}/api/elon/state`, {
        headers: {
          "x-conversation-id": conversationId,
        },
      });

      if (res.status === 400) {
        // 🔥 RETRY ONCE AFTER SHORT DELAY (backend not ready yet)
        setTimeout(() => {
          refreshElonState();
        }, 300);
        return;
      }

      if (!res.ok) throw new Error("elon state fetch failed");

      const data = await res.json();
      setElonState(normalizeElonState(data));
    } catch {
      setElonState(DEFAULT_ELON_STATE);
    }
  }, [conversationId]);

  const initRanRef = useRef<string | null>(null);

  useEffect(() => {
  if (!conversationId) return;

  // 🚫 DO NOT call ELON state on init
  // let SSE / user actions drive it instead

  if (initRanRef.current === conversationId) {
    return;
  }

  initRanRef.current = conversationId;
}, [conversationId]);

  
  useEffect(() => {
    if (!conversationId) return;

    const currentSessionId = conversationId;

    if (clientRef.current) {
      console.warn("🔥 REPLACING EXISTING SSE CONNECTION");

      try {
        clientRef.current.offAll();
        clientRef.current.close();
      } catch (e) {
        console.warn("SSE cleanup error", e);
      }

      clientRef.current = null;
    }

  // 🔥 CREATE NEW CONNECTION ID (keep number type)
  activeConnectionIdRef.current += 1;
  const connectionId = activeConnectionIdRef.current;

  // 🔥 CREATE CLIENT
  const client = new StreamingClient();
 

  console.warn("🧠 NEW SSE CLIENT CREATED", Date.now());


  client.offAll(); // 🔥 CRITICAL: remove any existing handlers BEFORE adding new ones
  
  clientRef.current = client;
    
    client.on("message.start", (data) => {
      if (connectionId !== activeConnectionIdRef.current) return;

      const role = data?.role ?? "assistant";
      const isAssistant = role === "assistant";
      const isSystem = role === "system";

      if (!allowStreamingRef.current && !isAssistant && !isSystem) {
        console.warn("🚫 BLOCK START (not allowed)");
        return;
      }

      console.log("🔥 START EVENT", Date.now(), data);

      clearUnlockTimer();

      // 🚫 BLOCK duplicate start events
      if (streamingRef.current) {
        console.warn("🚫 BLOCK DUPLICATE START");
        return;
      }

      setMessageMap(prev => {
        const existing = prev[currentSessionId] || [];

        const next = [
          ...existing,
          { role: "assistant" as Role, content: "" }
        ];

        activeAssistantIndexRef.current = next.length - 1;

        return {
          ...prev,
          [currentSessionId]: next
        };
      });

      streamingRef.current = true;
      setIsWorking(true);
      setInputDisabled(true);
    });

    client.on("message.delta", (data) => {
      if (connectionId !== activeConnectionIdRef.current) return;

      if (!streamingRef.current) return;

      clearUnlockTimer();

      const content = data?.content ?? "";

      // 🔥 HARD DEDUPE — block identical consecutive deltas
      if (content && lastDeltaRef.current === content) {
        return;
      }

      lastDeltaRef.current = content;

      // 🔥 DETECT ASSET MESSAGE
      if (content.startsWith("[asset]")) {
        const parts = content.replace("[asset]", "").split("|");
        const assetId = parts[0];

        console.log("🔥 ASSET DETECTED IN CHAT:", assetId);

        window.dispatchEvent(
          new CustomEvent("asset.uploaded", {
            detail: { assetId },
          })
        );
      }
      const incoming = data?.content ?? "";
            setMessageMap(prev => {
              const existing = prev[currentSessionId] || [];
              const next = [...existing];

              const index = activeAssistantIndexRef.current;
              if (index === null || index < 0 || index >= next.length) return prev;

              const incoming = data?.content ?? "";
              if (!incoming.length) return prev;

              const currentContent = next[index].content || "";
              const newContent = currentContent + incoming;

              if (newContent.length <= currentContent.length) return prev;

              next[index].content = newContent;

              return {
                ...prev,
                [currentSessionId]: next,
              };
            });
          });

          client.on("message.complete", () => {
            if (connectionId !== activeConnectionIdRef.current) return;

      clearUnlockTimer();
      streamingRef.current = false;
      setIsWorking(false);
      setInputDisabled(false);

      setMessageMap(prev => {
        const existing = prev[currentSessionId] || [];
        const next = [...existing];

        const index = activeAssistantIndexRef.current;
        if (index === null || index < 0 || index >= next.length) return prev;

        const msg = next[index];

        if (
          msg.content &&
          msg.content.includes(BEGIN_WIZARD_TOKEN)
        ) {
          msg.content = msg.content.replace(BEGIN_WIZARD_TOKEN, "").trim();
          msg.beginWizard = true;
        }

        return {
          ...prev,
          [currentSessionId]: next
        };
      });

      // 🔥 CRITICAL: clear pointer after completion

      if (queuedSystemNoticesRef.current.length > 0) {
        const notices = queuedSystemNoticesRef.current.map((msg) => ({
          role: "system" as const,
          content: msg,
        }));

        setMessageMap(prev => {
          const existing = prev[currentSessionId] || [];

          return {
            ...prev,
            [currentSessionId]: [...existing, ...notices]
          };
        });

        queuedSystemNoticesRef.current = [];
      }
    });

    client.on("system.notice", (data) => {
      if (connectionId !== activeConnectionIdRef.current) return;

      // 🔥 HANDLE EXECUTION COMPLETION → TRIGGER MAX (removed currently)

      if (data?.type === "BEGIN_WIZARD" && data?.task_id) {
        setWizardOfferTaskId(data.task_id);

        setWizardMap(prev => ({
          ...prev,
          [currentSessionId]: data.task_id
        }));
      }

      if (data?.type === "MANIFEST_FINALIZED") {
        if (!conversationId) return;
        refreshElonState();
      }

      if (data?.type === "EXECUTION_AUTHORIZATION_AVAILABLE") {
        setAuthorizationManifestId(data?.manifest_id ?? null);
        setElonState((prev) => ({
          ...prev,
          executable: true,
        }));
      }

      const message = data?.message;
      if (!message) return;

      if (streamingRef.current) {
        queuedSystemNoticesRef.current.push(message);
        return;
      }

      setMessageMap(prev => {
        const existing = prev[currentSessionId] || [];
        return {
          ...prev,
          [currentSessionId]: [...existing, { role: "system", content: message }]
        };
      });
    });

    client.on("execution.artifact", async (data) => {
      if (connectionId !== activeConnectionIdRef.current) return;

      console.log("ARTIFACT EVENT RECEIVED:", data);

      // 🔥 BACKFILL SAFETY: ANY artifact means task is complete

      if (data?.execution_instance_id) {
        setTaskSummaries((prev) =>
          prev.map((t) =>
            t.task_id === data.execution_instance_id
              ? { ...t, status: "COMPLETED", updated_at: Date.now() }
              : t
          )
        );
      }

      // 🔥 MARK TASK AS COMPLETED WHEN FINAL ARTIFACT ARRIVES

      if (
        data?.artifact_type === "execution_final" ||
        data?.artifact_type === "execution_final_polished"
      ) {
        setTaskSummaries((prev) =>
          prev.map((t) =>
            t.task_id === data.execution_instance_id
              ? { ...t, status: "COMPLETED", updated_at: Date.now() }
              : t
          )
        );
      }

      const executionId = data?.execution_instance_id;
      if (!executionId) return;

      setExecutionInstanceMap(prev => ({
        ...prev,
        [currentSessionId]: executionId
      }));

      try {
        const res = await fetch(`${API_BASE}/api/execution/artifact/${executionId}`);
        if (!res.ok) return;

        const artifact = await res.json();

        console.log("ARTIFACT DATA:", artifact);

        setArtifactMap(prev => ({
          ...prev,
          [currentSessionId]: artifact?.artifact_body || ""
        }));
      } catch (err) {
        console.error("Artifact fetch failed", err);
      }
    });

    
    client.on("execution.lifecycle", (data) => {
      console.log("LIFECYCLE DATA:", data);
      console.log("CONVERSATION ID AT LIFECYCLE:", conversationId);
      if (connectionId !== activeConnectionIdRef.current) return;

      console.log("🔥 LIFECYCLE EVENT RECEIVED:", data);

      const event = data?.event;

      // 🔥 FIRST: set execution ID (anchor UI)
      if (
        data?.execution_instance_id &&
        data?.status !== "COMPLETED" &&
        data?.status !== "ABORTED"
      ) {
        setExecutionInstanceMap(prev => ({
          ...prev,
          [currentSessionId]: data.execution_instance_id
        }));
      }

      // 🔥 THEN: clear artifact for new execution
      if (event === "EXECUTION_RUNNING" && data?.execution_instance_id) {
        setArtifactMap(prev => ({
          ...prev,
          [currentSessionId]: ""
        }));
      }

      const lifecycleMap: Record<string, ExecutionState> = {
        EXECUTION_RUNNING: "RUNNING",
        EXECUTION_PAUSED: "PAUSED",
        EXECUTION_COMPLETED: "COMPLETED",
        EXECUTION_CANCELLED: "ABORTED",
        EXECUTION_ABORTED: "ABORTED",
        EXECUTION_BLOCKED: "PAUSED",
      };

      const nextState = lifecycleMap[event];

      // 🔥 TASK REPORT SYNC (ACTIVE + RECENT)

      if (nextState && data?.execution_instance_id) {
        setTaskSummaries(prev => {
          const existing = prev.filter(
            t => t.task_id !== data.execution_instance_id
          );

          let status = "RUNNING";

          if (nextState === "COMPLETED") status = "COMPLETED";
          else if (nextState === "ABORTED") status = "FAILED";
          else if (nextState === "PAUSED") status = "PAUSED";

          return [
            {
              task_id: data.execution_instance_id,
              session_id: conversationId,   // 🔥 ADD THIS LINE
              status,
              updated_at: Date.now(),
            },
            ...existing,
          ];
        });
      }

      if (!nextState) return;

      setExecutionStateMap(prev => ({
      ...prev,
      [currentSessionId]: nextState
    }));
      
      if (nextState === "ABORTED" || nextState === "COMPLETED") {
        setPausedSectionIndex(null);
      }

      if (nextState === "PAUSED") {
        setPausedSectionIndex(
          typeof data?.section_index === "number"
            ? data.section_index
            : null
        );
      } else {
        setPausedSectionIndex(null);
      }
    });

    client.connect(
      `${API_BASE}/api/chat/events?session_id=${encodeURIComponent(currentSessionId)}`
    );

    return () => {
      clearUnlockTimer();

      client.offAll();
      client.close();

      if (clientRef.current === client) {
        clientRef.current = null;
      }

      // 🔥 allow future connections

    };
  }, [conversationId]);

  const sendUserMessage = useCallback(
    async (text: string) => {
      if (!conversationId) return;
      
      if (!text.trim()) return;
      // 🚫 only block if actively streaming AND input is disabled
      if (streamingRef.current && inputDisabled) return;

      setMessageMap(prev => {
        const existing = prev[conversationId!] || [];

        const isDuplicateOptimistic =
          text.startsWith("[asset]") &&
          existing.some(
            (m) => m.optimistic && m.content === text
          );

        if (isDuplicateOptimistic) {
          return prev;
        }

        const next: ChatMessage[] = [
          ...existing,
          { role: "user", content: text },
        ];

        activeAssistantIndexRef.current = null;

        return {
          ...prev,
          [conversationId!]: next
        };
      });
      setInputDisabled(true);
      armUnlockTimer();

      const missionPrompts = JSON.parse(
        localStorage.getItem("nudge-mission-prompts") || "[]"
      );

      const personaPrompts = JSON.parse(
        localStorage.getItem("nudge-persona-prompts") || "[]"
      );

      const activeMissionId = localStorage.getItem("nudge-active-mission");
      const activePersonaId = localStorage.getItem("nudge-active-persona");

      const activeMission = missionPrompts.find((p: any) => p.id === activeMissionId);
      const activePersona = personaPrompts.find((p: any) => p.id === activePersonaId);
      
      // use latest active assets from context
      const latestAssets = [...activeAssetsRef.current];
      allowStreamingRef.current = true;
      console.log("🔥 SEND CALLED:", text);
      console.warn("🚨 FETCH /chat/send START", Date.now());

      const res = await fetch(`${API_BASE}/api/chat/send`, {
        
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        session_id: conversationId,
        message: text,
        missionPrompt: activeMission?.prompt || null,
        personaPrompt: activePersona?.prompt || null,
        active_asset_ids: latestAssets,
      }),
      });

      if (!res.ok) {
        clearUnlockTimer();
        streamingRef.current = false;
        setIsWorking(false);
        setInputDisabled(false);
        return;
      }

      const data = await res.json();
    },
    [conversationId, inputDisabled]
  );

  const consumeWizardOffer = useCallback(() => {
    setWizardOfferTaskId(null);
  }, []);

  const abortExecution = useCallback(async () => {
    if (!executionInstanceId) return;

    try {
      await fetch(`${API_BASE}/api/execution/abort`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          execution_instance_id: executionInstanceId,
          session_id: conversationId,
        }),
      });
    } catch (err) {
      console.error("Abort failed", err);
    }
  }, [executionInstanceId, conversationId]);
  const resumeExecution = useCallback(async () => {
  if (!executionInstanceId) return;

  try {
    await fetch(`${API_BASE}/api/execution/resume`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        execution_instance_id: executionInstanceId,
        session_id: conversationId,
      }),
    });
  } catch (err) {
    console.error("Resume failed", err);
  }
}, [executionInstanceId, conversationId]);

const switchConversation = async (id: string) => {
  console.warn("🔄 SWITCHING TO:", id);

  // 🔥 HARD KILL any existing SSE connection BEFORE anything else
  if (clientRef.current) {
    console.warn("🔥 HARD KILL SSE BEFORE SWITCH");

    try {
      clientRef.current.offAll();
      clientRef.current.close();
    } catch (e) {
      console.warn("SSE close error", e);
    }

    clientRef.current = null;
  }

  try {
    // 🔥 sync backend active session
    await fetch(`${API_BASE}/api/sessions/${id}/activate`, {
      method: "POST",
    });

    // 🔥 persist session
    localStorage.setItem("nudgesession", id);

    // 🔥 FULL RESET of chat + execution state
    // 🔥 preload execution FIRST (no UI gap)
    let executionId: string | null = null;

    try {
      const res = await fetch(`${API_BASE}/api/execution/active?session_id=${id}`);
      if (res.ok) {
        const data = await res.json();
        executionId = data.execution_instance_id || null;

        // 🔥 ARTIFACT PRELOAD (tied to execution)

      }
    } catch (err) {
      console.warn("Execution preload failed", err);
    }

    activeAssistantIndexRef.current = null;
    streamingRef.current = false;
    allowStreamingRef.current = false;
    lastDeltaRef.current = null;

    setPausedSectionIndex(null);

    // 🔥 set execution BEFORE switching
    setExecutionInstanceMap(prev => ({
      ...prev,
      [id]: executionId
    }));

    // 🔥 switch conversation ONCE
    setConversationId(id);

    if (executionId) {
      try {
        const res = await fetch(`${API_BASE}/api/execution/artifact/${executionId}`);
        if (res.ok) {
          const artifactData = await res.json();

          setArtifactMap(prev => ({
            ...prev,
            [id]: artifactData?.artifact_body || ""
          }));
        }
      } catch (err) {
        console.warn("Artifact load after switch failed", err);
      }
    }

  } catch (err) {
    console.error("Switch failed", err);
  }
};

const injectMessage = useCallback((msg: ChatMessage) => {
  // 🔥 CRITICAL: DO NOT inject assistant messages (streaming already handles them)
  if (msg.role === "assistant") {
    console.warn("🚫 BLOCKED ASSISTANT INJECTION");
    return;
  }

  if (!conversationId) return;

  setMessageMap(prev => {
    const existing = prev[conversationId] || [];
    const last = existing[existing.length - 1];

    if (
      last &&
      last.role === msg.role &&
      last.content === msg.content
    ) {
      return prev;
    }

    return {
      ...prev,
      [conversationId]: [...existing, msg],
    };
  });
}, [conversationId]);

const value = useMemo(
  () => ({
    conversationId,
    setConversationId,
    messages,
    sendUserMessage,
    injectMessage,
    switchConversation,
    isWizardOpen,
    abortExecution,
    resumeExecution,
    inputDisabled,
    isWorking,
    elonState,
    refreshElonState,
    agentMode,
    setAgentMode,
    activeTaskId,
    executionInstanceId,
    executionState,
    taskSummaries,
    pausedSectionIndex,
    wizardOfferTaskId,
    wizardUnlockedTaskId,
    consumeWizardOffer,
    startNewSession,
    authorizationManifestId,
    activeAssets,
    setActiveAssets,
    toggleAsset,
    artifact, 
  }),
  [
    conversationId,
    messages,
    sendUserMessage,
    isWizardOpen,
    abortExecution,
    resumeExecution,
    inputDisabled,
    isWorking,
    elonState,
    refreshElonState,
    agentMode,
    activeTaskId,
    executionInstanceId,
    executionState,
    pausedSectionIndex,
    wizardOfferTaskId,
    wizardUnlockedTaskId,
    consumeWizardOffer,
    startNewSession,
    authorizationManifestId,
    activeAssets,
    setActiveAssets,
    toggleAsset,
    artifact,
  ]
);

  useEffect(() => {
    (window as any).switchChat = switchConversation;
  }, [switchConversation]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChatContext = (): ChatContextType => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider");
  return ctx;
};