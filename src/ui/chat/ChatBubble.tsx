import React from "react";

interface ChatBubbleProps {
  payload: any;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ payload }) => {

  // --------------------------------------------------
  // CORRECT DETECTION (based on real message shape)
  // --------------------------------------------------

  const isSystem =
    payload?.role === "system" ||
    payload?.type === "system.notice" ||
    payload?.event === "system.notice";

  // --------------------------------------------------
  // SYSTEM / ELON BUBBLE
  // --------------------------------------------------

  if (isSystem) {
    const text = payload?.content || payload?.message || "";

    return (
      <div
        className="rounded-lg p-3 shadow"
        style={{
          background: "var(--surface-subtle)",
          borderLeft: "4px solid var(--accent-orange)",
          color: "var(--chat-text)",
          border: "1px solid var(--panel-border)",
          maxWidth: "520px",
        }}
      >
        <div
          style={{
            fontSize: "13.5px",
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            opacity: 0.9,
          }}
        >
          {text}
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // USER / DEFAULT
  // --------------------------------------------------

  return (
    <div
      className="rounded-lg p-4 shadow"
      style={{
        background: "rgba(255,255,255,0.06)",
        color: "var(--chat-text)",
        border: "1px solid rgba(255,255,255,0.08)"
      }}
    >
      <div
        style={{
          fontSize: "13.5px",
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
        }}
      >
        {JSON.stringify(payload, null, 2)}
      </div>
    </div>
  );
};