import React, { useEffect, useState } from "react";
import { useChatContext } from "../../context/ChatContext";
import { useElonNudge } from "../../context/ElonNudgeContext";
import { useWizard } from "../../context/WizardContext";

import { MessageStream } from "../chat/MessageStream";
import { ChatInputBar } from "../chat/ChatInputBar";
import { ElonNudgePane } from "../elon/ElonNudgePane";
import WizardModal from "../wizard/WizardModal";
import WorkspacePane from "../../components/workspace/WorkspacePane";
import { ExecutionAuthorizationPanel } from "../elon/ExecutionActionPanel";
import CognitiveControlBar from "./CognitiveControlBar";

const API_BASE = import.meta.env.VITE_API_BASE;

const ZOOM_LEVELS = [0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];

export const CenterPane: React.FC = () => {
  const {
    elonState,
    refreshElonState,
    agentMode,
    setAgentMode,
    activeTaskId,
    executionInstanceId,
    conversationId,
    wizardOfferTaskId,
    consumeWizardOffer,
    authorizationManifestId,
  } = useChatContext();

  const { isVisible } = useElonNudge();
  const { isActive, closeWizard } = useWizard();

  /* ---------------- Workspace State ---------------- */

  const [workspaceHeight, setWorkspaceHeight] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [userHasResized, setUserHasResized] = useState<boolean>(false);

  const dragStartY = React.useRef<number>(0);
  const dragStartHeight = React.useRef<number>(0);
  const chatContainerRef = React.useRef<HTMLDivElement | null>(null);
  const dragStartScrollOffset = React.useRef<number>(0);

  const [workspaceRefreshKey, setWorkspaceRefreshKey] = useState<number>(0);

  /* ---------------- Chat Zoom State ---------------- */

  const storedChatZoom =
    Number(localStorage.getItem("chatZoom")) || 1;

  const [chatZoom, setChatZoom] =
    useState<number>(storedChatZoom);

  const chatZoomIndex = ZOOM_LEVELS.indexOf(chatZoom);

  const zoomChatIn = () => {
    if (chatZoomIndex < ZOOM_LEVELS.length - 1) {
      const next = ZOOM_LEVELS[chatZoomIndex + 1];
      setChatZoom(next);
      localStorage.setItem("chatZoom", String(next));
    }
  };

  const zoomChatOut = () => {
    if (chatZoomIndex > 0) {
      const next = ZOOM_LEVELS[chatZoomIndex - 1];
      setChatZoom(next);
      localStorage.setItem("chatZoom", String(next));
    }
  };

  /* -------------------------------------------------- */
  /* AUTO EXPAND WORKSPACE ON FIRST ARTIFACT ARRIVAL   */
  /* -------------------------------------------------- */

  useEffect(() => {
    if (!executionInstanceId) return;

    if (workspaceHeight === 0 && !userHasResized) {
      setWorkspaceHeight(240);
    }
  }, [executionInstanceId, workspaceHeight, userHasResized]);

  /* -------------------------------------------------- */
  /* NEW SESSION RESET                                  */
  /* -------------------------------------------------- */

  const { startNewSession } = useChatContext();

  /* -------------------------------------------------- */
  /* ELON ACTIONS                                       */
  /* -------------------------------------------------- */

  const callElon = async (path: string) => {
    await fetch(`${API_BASE}/api/elon/${path}`, {
      method: "POST", // or existing method
      headers: {
        "Content-Type": "application/json",
        ...(conversationId ? { "x-conversation-id": conversationId } : {}),
      },
    });

    await refreshElonState();
  };

  useEffect(() => {
    if (!conversationId) return;
    refreshElonState();
  }, [conversationId, refreshElonState]);

  /* ---------------- Workspace Drag Logic ---------------- */

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const container = document.getElementById("center-pane-root");
      if (!container) return;

      const rect = container.getBoundingClientRect();

      const minChat = 200;
      const maxWorkspace = rect.height - minChat - 60;

      const deltaY = e.clientY - dragStartY.current;
      let next = dragStartHeight.current + deltaY;

      const HEADER_HEIGHT = 44;
      const minHeight = executionInstanceId ? HEADER_HEIGHT : 0;

      if (next < minHeight) next = minHeight;
      if (next > maxWorkspace) next = maxWorkspace;

      setWorkspaceHeight(next);

      if (chatContainerRef.current !== null) {
        const el: HTMLDivElement = chatContainerRef.current;

        const bottomOffset = dragStartScrollOffset.current;

        if (bottomOffset <= 2) {
          el.scrollTop = el.scrollHeight;
        } else {
          el.scrollTop =
            el.scrollHeight - el.clientHeight - bottomOffset;
        }
      }
    };

    const handleMouseUp = () => {
      if (isDragging) setUserHasResized(true);
      setIsDragging(false);
      document.body.style.cursor = "";
    };

    if (isDragging) {
      document.body.style.cursor = "row-resize";
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
    };
  }, [isDragging]);

  /* -------------------------------------------------- */
  /* Wizard Handling                                    */
  /* -------------------------------------------------- */

  const handleWizardClose = () => {
    closeWizard();
  };

  const wizardTaskIdToUse = wizardOfferTaskId;
  const shouldRenderWizardModal =
    Boolean(wizardTaskIdToUse);

  return (
    <div id="center-pane-root" style={{ position: "relative", height: "100%" }}>
      <div
        style={{
          height: "100%",
          filter:
            isActive || document.body.classList.contains("center-pane-blur")
              ? "blur(2px)"
              : "none",
          transition: "filter 120ms ease",
        }}
      >
        <div className="center-pane" style={{ display: "flex", flexDirection: "column", height: "100%" }}>

          {/* Cognitive Control Bar */}
          <CognitiveControlBar
            agentMode={agentMode}
            setAgentMode={setAgentMode}
            elonState={elonState}
            conversationId={conversationId ?? ""}
            refreshElonState={refreshElonState}
            startNewSession={startNewSession}
          />

          <ElonNudgePane />

          {/* Workspace */}
          <div
            style={{
              height: workspaceHeight,
              overflow: "hidden",
              transition: isDragging ? "none" : "height 200ms ease",
              background: "var(--workspace-bg)",
              pointerEvents: isDragging ? "none" : "auto",
            }}
          >
            <WorkspacePane executionInstanceId={executionInstanceId} />
          </div>

          {/* Divider */}
          <div
            onMouseDown={(e) => {
              setIsDragging(true);

              dragStartY.current = e.clientY;
              dragStartHeight.current = workspaceHeight;

              if (chatContainerRef.current !== null) {
                const el: HTMLDivElement = chatContainerRef.current;

                dragStartScrollOffset.current =
                  el.scrollHeight - el.clientHeight - el.scrollTop;
              }
            }}
            style={{
              position: "relative",
              height: "6px",
              cursor: "row-resize",
              background: "var(--accent-orange)",
            }}
          >
            <div
              style={{
                position: "absolute",
                right: "12px",
                top: "2px",
                zIndex: 5,
                height: "12px",
                padding: "0 14px",
                display: "flex",
                alignItems: "center",
                background: "var(--accent-orange)",
                borderTopRightRadius: "0px",
                borderBottomLeftRadius: "6px",
                borderBottomRightRadius: "6px",
                fontSize: "10px",
                fontWeight: 600,
                color: "#000000",
                letterSpacing: "0.5px",
                userSelect: "none",
                pointerEvents: "none",
              }}
            >
              SLIDE TO ADJUST
            </div>
          </div>

          {/* Chat */}
          <div
            ref={chatContainerRef}
            style={{
            flex: 1,
            overflow: "hidden",   // ✅ FIX
            overflowAnchor: isDragging ? "none" : "auto",
            contain: "layout size",
            background: "var(--chat-bg)",
            position: "relative",
            boxShadow: "inset 0 6px 12px rgba(0,0,0,0.35)",
          }}
          >
            <div
              style={{
                position: "sticky",
                top: 0,
                left: 0,
                right: 0,
                height: "18px",
                pointerEvents: "none",
                zIndex: 4,
                background: "linear-gradient(to bottom, rgba(0,0,0,0.40), rgba(0,0,0,0))",
              }}
            />

            <MessageStream
              chatZoom={chatZoom}
              zoomChatIn={zoomChatIn}
              zoomChatOut={zoomChatOut}
            />
          </div>

          {/* Execution Authorization */}
          {authorizationManifestId &&
            elonState.permitted &&
            elonState.accepted &&
            elonState.executable && (
              <ExecutionAuthorizationPanel
                manifestId={authorizationManifestId}
                onAuthorized={async () => {
                  await refreshElonState();
                }}
                onReopen={() => {
                  console.log("Reopen requested");
                }}
              />
          )}

          <div>
            <ChatInputBar />
          </div>
        </div>
      </div>

      {shouldRenderWizardModal && wizardTaskIdToUse && (
        <WizardModal taskId={wizardTaskIdToUse} onClose={handleWizardClose} />
      )}
    </div>
  );
};