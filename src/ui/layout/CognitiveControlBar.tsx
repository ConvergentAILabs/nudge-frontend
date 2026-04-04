import React, { useState, useRef, useEffect } from "react";
import { ElonState } from "../../context/ChatContext";

import { useChatContext } from "../../context/ChatContext";
import { useWizard } from "../../context/WizardContext";

const API_BASE = import.meta.env.VITE_API_BASE;

type AgentMode = "MAX" | "ELON";

interface CognitiveControlBarProps {
  agentMode: AgentMode;
  setAgentMode: (mode: AgentMode) => void;
  elonState: ElonState | null;
  conversationId: string;
  refreshElonState: () => Promise<void>;
  startNewSession: () => void;
}

interface Prompt {
  id: string;
  title: string;
  prompt: string;
}

const CognitiveControlBar: React.FC<CognitiveControlBarProps> = ({
  agentMode,
  setAgentMode,
  elonState,
  conversationId,
  refreshElonState,
  startNewSession,
}) => {

const { wizardUnlockedTaskId } = useChatContext();
const { startWizard } = useWizard();

  const callElon = async (path: string) => {
    await fetch(`${API_BASE}/api/elon/${path}`, {
      method: "POST",
      headers: { "x-conversation-id": conversationId },
    });
    await refreshElonState();
  };

  /* ---------------- PROMPT STATE ---------------- */

  const [missionPrompts, setMissionPrompts] = useState<Prompt[]>([]);
  const [personaPrompts, setPersonaPrompts] = useState<Prompt[]>([]);

  const [activeMission, setActiveMission] = useState<string | null>(
    () => localStorage.getItem("nudge-active-mission")
  );

  const [activePersona, setActivePersona] = useState<string | null>(
    () => localStorage.getItem("nudge-active-persona")
  );

  const [openPopover, setOpenPopover] = useState<"mission" | "persona" | null>(null);

  const [editingPrompt, setEditingPrompt] = useState<{
    type: "mission" | "persona";
    prompt?: Prompt;
  } | null>(null);

  const popoverRef = useRef<HTMLDivElement | null>(null);

  /* -------- LOAD PROMPTS FROM STORAGE -------- */

  useEffect(() => {

    const savedMission = localStorage.getItem("nudge-mission-prompts");
    const savedPersona = localStorage.getItem("nudge-persona-prompts");

    if (savedMission) {
      setMissionPrompts(JSON.parse(savedMission));
    }

    if (savedPersona) {
      setPersonaPrompts(JSON.parse(savedPersona));
    }

  }, []);

  /* -------- CLOSE POPOVER ON OUTSIDE CLICK -------- */

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpenPopover(null);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* -------- SAVE PROMPTS TO STORAGE -------- */

  useEffect(() => {
    localStorage.setItem(
      "nudge-mission-prompts",
      JSON.stringify(missionPrompts)
    );
  }, [missionPrompts]);

  useEffect(() => {
    localStorage.setItem(
      "nudge-persona-prompts",
      JSON.stringify(personaPrompts)
    );
  }, [personaPrompts]);

    /* -------- SAVE ACTIVE PROMPT SELECTION -------- */

  useEffect(() => {
    if (activeMission) {
      localStorage.setItem("nudge-active-mission", activeMission);
    } else {
      localStorage.removeItem("nudge-active-mission");
    }
  }, [activeMission]);

  useEffect(() => {
    if (activePersona) {
      localStorage.setItem("nudge-active-persona", activePersona);
    } else {
      localStorage.removeItem("nudge-active-persona");
    }
  }, [activePersona]);

  /* ---------------- HELPERS ---------------- */
  
  const getActiveMission = missionPrompts.find(p => p.id === activeMission);
  const getActivePersona = personaPrompts.find(p => p.id === activePersona);

  const savePrompt = (type: "mission" | "persona", prompt: Prompt) => {
    if (type === "mission") {
      setMissionPrompts(prev => {
        const exists = prev.find(p => p.id === prompt.id);
        if (exists) return prev.map(p => p.id === prompt.id ? prompt : p);
        return [...prev, prompt];
      });
    } else {
      setPersonaPrompts(prev => {
        const exists = prev.find(p => p.id === prompt.id);
        if (exists) return prev.map(p => p.id === prompt.id ? prompt : p);
        return [...prev, prompt];
      });
    }
  };

  /* ---------------- PROMPT BUTTON ---------------- */

  const renderPromptButton = (type: "mission" | "persona") => {

    const active = type === "mission" ? getActiveMission : getActivePersona;

    return (
      <button
        onClick={() => setOpenPopover(openPopover === type ? null : type)}
        style={{
          padding: "6px 10px",
          fontSize: "12px",
          borderRadius: "6px",
          border: "2px solid var(--panel-border)",
          background: "var(--nav-bg)",
          cursor: "pointer",
          textAlign: "left"
        }}
      >
        {active ? (
          <>
            {type.toUpperCase()}:{" "}
            <span style={{ color: "var(--accent-orange)" }}>
              {active.title}
            </span>
          </>
        ) : (
          type === "mission" ? "Mission Prompt" : "Persona Prompt"
        )}
      </button>
    );
  };

  /* ---------------- POPOVER ---------------- */

  const renderPopover = () => {

    if (!openPopover) return null;

    const prompts = openPopover === "mission" ? missionPrompts : personaPrompts;
    const active = openPopover === "mission" ? activeMission : activePersona;

    const setActive = (id: string) => {
      if (openPopover === "mission") setActiveMission(id);
      else setActivePersona(id);
      setOpenPopover(null);
    };

    return (
      <div
        ref={popoverRef}
        style={{
          position: "absolute",
          top: "60px",
          left: "12px",
          width: "240px",
          background: "var(--nav-bg)",
          border: "1px solid var(--panel-border)",
          borderRadius: "8px",
          padding: "6px",
          zIndex: 50,
          boxShadow: "0 4px 12px rgba(0,0,0,0.35)"
        }}
      >

        <div
          onClick={() => {
            if (openPopover === "mission") setActiveMission(null);
            else setActivePersona(null);
            setOpenPopover(null);
          }}
          style={{
            padding: "6px 8px",
            fontSize: "12px",
            cursor: "pointer"
          }}
        >
          None
        </div>

        {prompts.map(p => (
          <div
            key={p.id}
            onClick={() => setActive(p.id)}
            style={{
              padding: "6px 8px",
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            {p.title}

            {p.id === active && (
              <span style={{ color: "var(--accent-orange)" }}>
                ✓
              </span>
            )}
          </div>
        ))}

        {prompts.length < 5 && (
          <div
            onClick={() => {
              setEditingPrompt({ type: openPopover });
              setOpenPopover(null);
            }}
            style={{
              padding: "6px 8px",
              fontSize: "12px",
              cursor: "pointer",
              borderTop: "1px solid var(--panel-border)",
              marginTop: "4px"
            }}
          >
            + Add Prompt
          </div>
        )}

      </div>
    );
  };

  /* ---------------- PROMPT EDITOR ---------------- */

  const PromptEditor = () => {

    if (!editingPrompt) return null;

    const isMission = editingPrompt.type === "mission";

    const sampleTitle = isMission
      ? "Strategic Advisor"
      : "Startup Founder";

    const samplePrompt = isMission
      ? "NUDGE should approach problems through structured system design. Focus on architecture, scalability, dependencies, and long term stability."
      : "The user is an early stage startup founder seeking strategic guidance on product, growth, and funding.";

    const [title, setTitle] = useState(sampleTitle);
    const [prompt, setPrompt] = useState(samplePrompt);

    const [titleTouched, setTitleTouched] = useState(false);
    const [promptTouched, setPromptTouched] = useState(false);

    const save = () => {

      if (!title.trim() || !prompt.trim()) return;

      savePrompt(editingPrompt.type, {
        id: crypto.randomUUID(),
        title,
        prompt
      });

      setEditingPrompt(null);
    };

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.35)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "flex-start",
          paddingTop: "120px",
          paddingLeft: "calc(18% + 20px)",
          zIndex: 100
        }}
      >

        <div
          style={{
            width: "420px",
            background: "var(--workspace-bg)",
            border: "1px solid var(--panel-border)",
            borderRadius: "8px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          }}
        >

          <strong style={{ color: "var(--accent-orange)" }}>
            {isMission ? "Mission Prompt" : "Persona Prompt"}
          </strong>

          <input
            value={title}
            onFocus={() => {
              if (!titleTouched) {
                setTitle("");
                setTitleTouched(true);
              }
            }}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              padding: "6px",
              borderRadius: "6px",
              border: "1px solid var(--panel-border)",
              fontSize: "12px",
              background: "var(--nav-bg)",
              color: "var(--chat-text)",
              
              fontStyle: !titleTouched ? "italic" : "normal",
              opacity: !titleTouched ? 0.7 : 1
            }}
          />

          <textarea
            value={prompt}
            onFocus={() => {
              if (!promptTouched) {
                setPrompt("");
                setPromptTouched(true);
              }
            }}
            onChange={(e) => setPrompt(e.target.value)}
            rows={6}
            style={{
              padding: "6px",
              borderRadius: "6px",
              border: "1px solid var(--panel-border)",
              fontSize: "12px",
              background: "var(--nav-bg)",
              color: "var(--chat-text)",
              fontStyle: !promptTouched ? "italic" : "normal",
              opacity: !promptTouched ? 0.7 : 1
            }}
          />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <button onClick={() => setEditingPrompt(null)}>
              Cancel
            </button>

            <button onClick={save}>
              Save
            </button>
          </div>

        </div>
      </div>
    );
  };

  /* ---------------- RENDER ---------------- */

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        background: "var(--nav-bg)",
        color: "var(--chat-text)",
        borderBottom: "1px solid var(--panel-border)",
        position: "relative"
      }}
    >

      {/* CONTEXT COLUMN */}
      <div
        style={{
          width: "33.33%",
          padding: "10px 12px",
          borderRight: "1px solid var(--nav-bg)",
          display: "flex",
          flexDirection: "column",
          gap: "6px"
        }}
      >

        {renderPromptButton("mission")}
        {renderPromptButton("persona")}

        {renderPopover()}

      </div>


      {/* CENTER COLUMN — SYSTEM */}
      <div
        style={{
          width: "33.33%",
          padding: "8px 12px",
          borderRight: "1px solid var(--nav-bg)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: "9px",
          fontSize: "12px",
          marginTop: "4px"

        }}
      >

        <button
          onClick={() => {
            if (!elonState?.accepted) callElon("accept");
            else callElon("unaccept");
          }}
          style={{
            fontSize: "11px",
            padding: "6px 12px",
            borderRadius: "6px",
            border: "1px solid var(--panel-border)",
            background: "var(--nav-surface)",
            cursor: "pointer"
          }}
        >
          <span style={{ fontWeight: 600 }}>
            TASK MANAGER:{" "}
            {!elonState?.accepted && "OFF"}

            {elonState?.accepted && !elonState?.executable && (
              <span style={{ color: "var(--accent-orange)" }}>ON</span>
            )}

            {elonState?.accepted && elonState?.executable && "READY"}
          </span>
        </button>

        <button
          disabled
          style={{
            fontSize: "11px",
            padding: "6px 12px",
            borderRadius: "6px",
            border: "1px solid var(--panel-border)",
            background: "var(--nav-bg-secondary)",
            opacity: 0.6,
            cursor: "not-allowed"
          }}
        >
          PROJECT MANAGER: Coming Soon
        </button>

        <div style={{ height: "24px" }} />

      </div>

      {/* RIGHT COLUMN — ACTIONS */}
      <div
        style={{
          width: "33.33%",
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "flex-end"
        }}
      >

        <div>
          <button
            onClick={async () => {
              await startNewSession();

              window.dispatchEvent(new Event("sessions:reload"));
            }}
            style={{
              padding: "6px 14px",
              fontSize: "12px",
              borderRadius: "6px",
              border: "1px solid var(--panel-border)",
              background: "var(--nav-surface)",
              cursor: "pointer"
            }}
          >
            + New Chat
          </button>
        </div>

        <div />

        <div style={{ display: "flex", gap: "8px" }}>
          {wizardUnlockedTaskId && (
            <button
              onClick={() => {
                startWizard(wizardUnlockedTaskId);
              }}
              style={{
                padding: "6px 14px",
                fontSize: "12px",
                borderRadius: "6px",
                border: "1px solid rgba(246,139,45,0.45)",
                background: "var(--accent-orange)",
                color: "#ffffff",
                fontWeight: 600,
                boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
                cursor: "pointer"
              }}
            >
              Blueprint
            </button>
          )}
        </div>

      </div>

      <PromptEditor />

      </div>
  );
};

export default CognitiveControlBar;

export const useMasterPrompts = () => {
  const savedMission = localStorage.getItem("nudge-mission-prompts");
  const savedPersona = localStorage.getItem("nudge-persona-prompts");

  const missions = savedMission ? JSON.parse(savedMission) : [];
  const personas = savedPersona ? JSON.parse(savedPersona) : [];

  const activeMissionId = localStorage.getItem("nudge-active-mission");
  const activePersonaId = localStorage.getItem("nudge-active-persona");

  const activeMission = missions.find((m: any) => m.id === activeMissionId);
  const activePersona = personas.find((p: any) => p.id === activePersonaId);

  return {
    missionPrompt: activeMission?.prompt || null,
    personaPrompt: activePersona?.prompt || null,
  };
};