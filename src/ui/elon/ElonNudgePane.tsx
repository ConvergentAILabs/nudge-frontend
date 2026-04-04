import React, { useEffect, useState } from "react";
import { useElonNudge } from "../../context/ElonNudgeContext";

export const ElonNudgePane: React.FC = () => {
  const { isVisible, dismiss, stage } = useElonNudge();

  // Internal state to allow smooth slide animation
  const [rendered, setRendered] = useState(false);

  // ----------------------------------------
  // Mount / Unmount Control
  // ----------------------------------------

  useEffect(() => {
    if (isVisible) {
      setRendered(true);
    } else {
      // allow slide-up animation before unmount
      const timer = setTimeout(() => {
        setRendered(false);
      }, 250); // match transition duration
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  // ----------------------------------------
  // Auto Dismiss After 15s
  // ----------------------------------------

  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(() => {
      dismiss();
    }, 15000);

    return () => clearTimeout(timer);
  }, [isVisible, dismiss]);

  if (!rendered) return null;

  return (
    <div
      style={{
        padding: "10px 12px",
        background: "var(--nudge-bg)",
        borderBottom: "1px solid var(--nudge-border)",
        color: "var(--nudge-text)",
        fontSize: "13px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "12px",

        // Slide Animation
        maxHeight: isVisible ? 200 : 0,
        opacity: isVisible ? 1 : 0,
        overflow: "hidden",
        transform: isVisible ? "translateY(0)" : "translateY(-10px)",
        transition:
          "max-height 250ms ease, opacity 250ms ease, transform 250ms ease",
      }}
    >
      <div style={{ lineHeight: "1.4" }}>
        {stage === "discovery" && (
          <>
            <strong style={{ color: "var(--nudge-accent)" }}>
              This type of work can be managed over time.
            </strong>
            <br />
            Tasks like this often evolve across multiple steps and sessions.  
            Task Manager can help you track progress, stay organized, and pick up where you left off.
            <br />
            <br />
            You can enable it anytime using the controls above.
          </>
        )}

        {stage === "activation" && (
          <>
            <strong style={{ color: "var(--nudge-accent)" }}>
              Task Manager is available.
            </strong>
            <br />
            If you’d like this work tracked and managed over time,  
            you can turn it on at any point using the controls above.
          </>
        )}
      </div>

      <button
        onClick={dismiss}
        style={{
          fontSize: "12px",
          color: "var(--nudge-accent)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Dismiss
      </button>
    </div>
  );
};