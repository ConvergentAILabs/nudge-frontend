import React, { useState } from "react";
import { useChatContext } from "../../context/ChatContext";

const API_BASE = import.meta.env.VITE_API_BASE;

type Props = {
  manifestId: string;
  onAuthorized: () => void;
  onReopen: () => void;
};

export const ExecutionAuthorizationPanel: React.FC<Props> = ({
  manifestId,
  onAuthorized,
  onReopen,
}) => {
  const { elonState, conversationId, refreshElonState } = useChatContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!manifestId) return null;

  if (!elonState.permitted || !elonState.accepted || !elonState.executable) {
    return null;
  }

  const handleAuthorize = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${API_BASE}/api/manifest/v3/${manifestId}/authorize`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(conversationId ? { "x-conversation-id": conversationId } : {}),
          },
          body: JSON.stringify({
            authorized_by: conversationId,
            authorization_scope: "FULL_EXECUTION",
          }),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        console.error("Authorization failed:", text);
        setIsSubmitting(false);
        return;
      }

      await refreshElonState();
      onAuthorized();
    } catch (err) {
      console.error("Authorization error:", err);
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        marginTop: "16px",
        padding: "18px",
        background: "var(--ea-bg)",
        borderLeft: "4px solid var(--ea-border-accent)",
        borderRadius: "8px",
        boxShadow: "var(--shadow-soft)", // ✅ subtle elevation
      }}
    >
      <div
        style={{
          fontWeight: 600,
          fontSize: "14px",
          marginBottom: "12px",
          color: "var(--ea-text)",
        }}
      >
        🟠 Execution Authorization
      </div>

      <div style={{ fontSize: "13px", lineHeight: 1.6, marginBottom: "14px", color: "var(--ea-text)" }}>
        <p>
          <strong>Execution is ready.</strong>
        </p>

        <p>
          This task has been finalized with a locked objective, scope,
          constraints, and success criteria.
        </p>

        <p>
          If authorized, ELON will begin deterministic execution under the
          defined contract and may:
        </p>

        <ul style={{ marginLeft: "18px" }}>
          <li>Perform multi step actions</li>
          <li>Persist progress across sessions</li>
          <li>Continue until completion or explicitly blocked</li>
        </ul>

        <p>No scope expansion will occur without explicit approval.</p>

        <p>
          <strong>Do you authorize execution to begin?</strong>
        </p>
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={handleAuthorize}
          disabled={isSubmitting}
          style={{
            background: "var(--ea-button-primary)",
            color: "#ffffff",
            border: "none",
            padding: "8px 14px",
            borderRadius: "6px",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            fontSize: "13px",
            fontWeight: 500,
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          {isSubmitting ? "Authorizing..." : "Authorize Execution"}
        </button>

        <button
          onClick={onReopen}
          disabled={isSubmitting}
          style={{
            background: "var(--ea-button-secondary-bg)",
            color: "var(--ea-button-secondary-text)",
            border: "1px solid var(--ea-button-secondary-border)",
            padding: "8px 14px",
            borderRadius: "6px",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            fontSize: "13px",
          }}
        >
          Reopen and Modify Blueprint
        </button>
      </div>
    </div>
  );
};