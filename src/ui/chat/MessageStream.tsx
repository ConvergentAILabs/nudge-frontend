import React, { useEffect, useRef } from "react";
import { useChatContext } from "../../context/ChatContext";
import { useWizard } from "../../context/WizardContext";
import { ExecutionBubble } from "./ExecutionBubble";
import ReactMarkdown from "react-markdown";

const API_BASE = import.meta.env.VITE_API_BASE;
interface MessageStreamProps {
  chatZoom: number;
  zoomChatIn: () => void;
  zoomChatOut: () => void;
}

export const MessageStream: React.FC<MessageStreamProps> = ({
  chatZoom,
  zoomChatIn,
  zoomChatOut,
}) => {
  const {
    messages,
    wizardOfferTaskId,
    wizardUnlockedTaskId,
    elonState,
    consumeWizardOffer,
    activeAssets,          // ✅ ADDED
    toggleAsset,           // ✅ ADDED
  } = useChatContext();

  const wizard = useWizard();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const normalizeText = (raw: string): string => {
    if (!raw) return raw;

    if (
      raw.includes("## ") ||
      raw.includes("### ") ||
      raw.includes("- ") ||
      raw.includes("\n#")
    ) {
      return raw;
    }

    let text = raw;

    if (text.includes("Sections:")) {
      text = text.replace("Sections:", "## Sections\n");
      text = text.replace(/•\s*/g, "\n- ");
    }

    text = text.replace(/^(Artifact Type:.*)$/gm, "### $1");
    text = text.replace(/^(Objective:.*)$/gm, "### $1");
    text = text.replace(/^(Success Criteria:.*)$/gm, "### $1");

    return text;
  };

  const canShowWizardButton =
    elonState?.accepted === true &&
    wizardUnlockedTaskId !== null &&
    !wizard.isActive;

  const buttonLabel =
    wizard.authorized === null
      ? "Open Execution Blueprint"
      : "Reopen Execution Blueprint";

  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        background: "var(--chat-bg)",
        color: "var(--chat-text)",
      }}
    >
      {/* Zoom Controls */}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 10,
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 8px",
          borderRadius: 6,
          background: "rgba(42,42,42,0.65)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
        }}
      >
        <button
          onClick={zoomChatOut}
          style={{
            border: "1px solid rgba(255,255,255,0.15)",
            background: "var(--chat-bubble)",
            color: "#e6e6e6",
            borderRadius: 4,
            width: 22,
            height: 22,
            cursor: "pointer",
          }}
        >
          -
        </button>

        <div
          style={{
            minWidth: 38,
            textAlign: "center",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {Math.round(chatZoom * 100)}%
        </div>

        <button
          onClick={zoomChatIn}
          style={{
            border: "1px solid rgba(255,255,255,0.15)",
            background: "var(--chat-bubble)",
            color: "#e6e6e6",
            borderRadius: 4,
            width: 22,
            height: 22,
            cursor: "pointer",
          }}
        >
          +
        </button>
      </div>

      {/* Scroll container */}
      <div className="p-5 overflow-y-auto h-full">
        <div style={{ zoom: chatZoom }} className="flex flex-col gap-5">

          {messages.map((message, index) => {
            const isUser = message.role === "user";
            const isSystem = message.role === "system";
            const text = message.content ?? "";

            if (isSystem) {
              return (
                <ExecutionBubble
                  key={`system-${index}`}
                  text={normalizeText(text)}
                  align="left"
                  variant="info"
                />
              );
            }

            if (!isUser && text.startsWith("[asset]")) {
              return null;
            }

            if (isUser) {

              if (text.startsWith("[asset]") && index > 0) {
                const prev = messages[index - 1];
                if (
                  prev?.role === "user" &&
                  prev?.content === text
                ) {
                  return null;
                }
              }

              if (text.startsWith("[asset]")) {
                const raw = text.replace("[asset]", "");
                const [assetId, filename] = raw.split("|");

                const isActive = activeAssets.includes(assetId); // ✅ NEW

                return (
                  <div
                    key={`asset-${index}`}
                    className="self-end max-w-[70%] rounded-xl px-4 py-3"
                    style={{
                      background: "var(--chat-user-bubble)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.45)",

                      // 🔥 ADD THIS (DO NOT create a second style block)
                      fontSize: "13.5px",
                      lineHeight: "1.5"
                    }}
                  >

                    <div style={{ fontWeight: 600 }}>
                      📄 {filename}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        marginTop: 6,
                        fontSize: 12
                      }}
                    >

                      <button
                        style={{
                          background: "transparent",
                          color: "var(--accent-orange)",
                          cursor: "pointer"
                        }}
                        onClick={() => {
                          window.open(`${API_BASE}/api/assets/${assetId}`);
                        }}
                      >
                        Open
                      </button>

                      <button
                        style={{
                          background: "transparent",
                          color: "var(--accent-orange)",
                          cursor: "pointer"
                        }}
                        onClick={() => {
                          window.dispatchEvent(
                            new CustomEvent("nudge-insert-asset", {
                              detail: { assetId, filename }
                            })
                          );
                        }}
                      >
                        Send to Workspace
                      </button>

                      {/* ✅ FIXED BUTTON */}
                      <button
                        style={{
                          background: "transparent",
                          color: "var(--accent-orange)",
                          cursor: "pointer",
                          fontWeight: isActive ? 600 : undefined
                        }}
                        onClick={() => toggleAsset(assetId)}
                      >
                        {isActive ? "Active" : "Activate"}
                      </button>

                    </div>

                  </div>
                );
              }

              return (
                <div
                  key={`user-${index}`}
                  className="self-end max-w-[70%] rounded-xl px-4 py-3"
                  style={{
                  background: "var(--chat-user-bubble)",
                  color: "#ffffff",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRight: "2px solid rgba(246,139,45,0.45)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.45)",
                  fontSize: "16.0px",
                  lineHeight: "1.6"
                }}
                >
                  {text}
                </div>
              );
            }

            return (
              <div
                key={`assistant-${index}`}
                className="self-start w-full flex justify-start"
              >
                <div
                  className="max-w-[760px] w-full rounded-xl px-5 py-4"
                  style={{
                    background: "var(--chat-bubble)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderLeft: "3px solid var(--accent-orange)",
                    color: "#e6e6e6",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.45)"
                  }}
                >
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => (
                        <p
                          style={{
                            marginTop: 0,
                            marginBottom: "12px",
                          }}
                        >
                          {children}
                        </p>
                      ),
                      h2: ({ children }) => (
                        <div
                          style={{
                            marginTop: "18px",
                            marginBottom: "8px",
                            fontWeight: 700,
                            color: "var(--accent-orange)",
                          }}
                        >
                          {children}
                        </div>
                      ),
                      h3: ({ children }) => (
                        <div
                          style={{
                            marginTop: "12px",
                            marginBottom: "4px",
                            fontWeight: 700,
                            color: "#ffffff",
                          }}
                        >
                          {children}
                        </div>
                      ),
                      ul: ({ children }) => (
                        <ul
                          style={{
                            paddingLeft: "22px",
                            marginTop: "10px",
                            marginBottom: "14px",
                          }}
                        >
                          {children}
                        </ul>
                      ),
                      li: ({ children }) => (
                        <li
                          style={{
                            marginBottom: "6px",
                          }}
                        >
                          {children}
                        </li>
                      ),
                      hr: () => (
                        <div
                          style={{
                            borderTop: "1px solid rgba(255,255,255,0.12)",
                            margin: "16px 0",
                          }}
                        />
                      ),
                      em: ({ children }) => (
                        <em
                          style={{
                            opacity: 0.9,
                          }}
                        >
                          {children}
                        </em>
                      ),
                    }}
                  >
                    {normalizeText(text)}
                                    </ReactMarkdown>
                </div>
              </div>
            );
          })}

          {canShowWizardButton && (
            <div
              className="self-start max-w-[70%] rounded-xl px-4 py-3"
              style={{
                background: "var(--surface-subtle)",
                borderLeft: "3px solid var(--accent-orange)",
                border: "1px solid var(--panel-border)",
              }}
            >
              <div
                style={{
                  marginBottom: 8,
                  fontSize: "13px",
                  opacity: 0.8,
                }}
              >
                Blueprint available
              </div>

              <button
                style={{
                  background: "var(--accent-orange)",
                  color: "#ffffff",
                  fontWeight: 600,
                  border: "none",
                  padding: "6px 10px",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--accent-orange-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--accent-orange)";
                }}
                onClick={() => {
                  if (!wizardUnlockedTaskId) return;
                  wizard.startWizard(wizardUnlockedTaskId);
                }}
              >
                {buttonLabel}
              </button>
            </div>
          )}

          <div ref={bottomRef} />

        </div>
      </div>
    </div>
  );
};