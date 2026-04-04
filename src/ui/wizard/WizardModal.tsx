import React, { useEffect, useMemo, useState } from "react";
import { useWizard } from "../../context/WizardContext";

type WizardModalProps = {
  taskId: string;
  onClose: () => void;
};

const WizardModal: React.FC<WizardModalProps> = ({ taskId, onClose }) => {
  const {
    isActive,
    questions,
    answers,
    authorized,
    updateAnswer,
    saveDraft,
    completeWizard,
    closeWizard,
    isLoading,
    error,
    reloadWizard,
    startWizard,
  } = useWizard();

  const [localAuthorized, setLocalAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    setLocalAuthorized(typeof authorized === "boolean" ? authorized : null);
  }, [authorized]);

  const allAnswered = useMemo(() => {
    return questions.every((q) => (answers?.[q.key] ?? "").trim().length > 0);
  }, [questions, answers]);

  if (!isActive) return null;

  const handleClose = async () => {
    try {
      await saveDraft();
    } catch {
      return;
    }
    closeWizard();
    onClose();
  };

  const handleComplete = async () => {
    if (!allAnswered) return;

    try {
      await completeWizard(localAuthorized === true);
    } catch {
      return;
    }
    onClose();
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--wizard-overlay)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div
        style={{
          width: 720,
          maxWidth: "92%",
          background: "var(--wizard-bg)",
          color: "var(--wizard-text)",
          borderRadius: 10,
          padding: "24px 28px",
          boxShadow: "var(--shadow-soft)",
          border: "1px solid var(--wizard-border)",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>
              Execution Blueprint
            </h2>
            <div
              style={{
                fontSize: 12,
                color: "var(--wizard-subtext)",
                marginTop: 4,
              }}
            >
              Provide the information needed to manage this work as a structured task.
            </div>
          </div>

          <button
            onClick={() => {
              closeWizard();
              onClose();
            }}
            style={{ fontSize: 12, color: "var(--wizard-subtext)" }}
            disabled={isLoading}
          >
            Exit
          </button>
        </div>

        {/* ERROR STRIP */}
        {(error || isLoading) && (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid var(--wizard-border)",
              background: "var(--wizard-surface)",
              fontSize: 12,
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div style={{ color: error ? "#f87171" : "var(--wizard-subtext)" }}>
              {error ? `Wizard error: ${error}` : "Loading wizard state"}
            </div>

            <button
              onClick={reloadWizard}
              disabled={isLoading}
              style={{
                fontSize: 12,
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid var(--wizard-border)",
                background: "var(--wizard-bg)",
                cursor: isLoading ? "not-allowed" : "pointer",
              }}
            >
              Retry Load
            </button>
          </div>
        )}

        {/* BODY */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {questions.map((q) => {
            const value = answers?.[q.key] ?? "";
            const placeholder = q.example ?? "";

            return (
              <div key={q.key}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  {q.prompt}
                </div>

                <textarea
                  value={value}
                  onChange={(e) => updateAnswer(q.key, e.target.value)}
                  rows={4}
                  placeholder={value ? "" : placeholder}
                  disabled={isLoading}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    fontSize: 13,
                    borderRadius: 6,
                    border: "1px solid var(--wizard-border)",
                    resize: "vertical",
                    fontStyle: value ? "normal" : "italic",
                    color: value
                      ? "var(--wizard-input-text)"
                      : "var(--wizard-input-placeholder)",
                    background: "var(--wizard-input-bg)",
                    opacity: isLoading ? 0.8 : 1,
                  }}
                />
              </div>
            );
          })}

          {/* AUTH */}
          <div
            style={{
              marginTop: 12,
              paddingTop: 20,
              borderTop: "1px solid var(--wizard-border)",
            }}
          >
            <div style={{ marginBottom: 10 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>
                Autonomous Authorization
              </h2>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--wizard-subtext)",
                  marginTop: 4,
                }}
              >
                Determines whether ELON may act independently or must request guidance.
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 13 }}>
                <input
                  type="radio"
                  name="authorization"
                  checked={localAuthorized === true}
                  onChange={() => setLocalAuthorized(true)}
                  style={{
                    marginRight: 6,
                    accentColor: "var(--accent-orange)",
                  }}
                  disabled={isLoading}
                />
                Yes, proceed autonomously
              </label>

              <label style={{ fontSize: 13 }}>
                <input
                  type="radio"
                  name="authorization"
                  checked={localAuthorized === false}
                  onChange={() => setLocalAuthorized(false)}
                  style={{
                    marginRight: 6,
                    accentColor: "var(--accent-orange)",
                  }}
                  disabled={isLoading}
                />
                No, request guidance
              </label>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 24,
          }}
        >
          <button
            onClick={handleClose}
            disabled={isLoading}
            style={{
              fontSize: 13,
              padding: "8px 14px",
              borderRadius: 6,
              border: "1px solid var(--wizard-border)",
              background: "var(--wizard-button-secondary-bg)",
              color: "var(--wizard-button-secondary-text)",
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            Save Draft
          </button>

          <button
            onClick={handleComplete}
            disabled={isLoading || !allAnswered}
            style={{
              fontSize: 13,
              padding: "9px 16px",
              borderRadius: 6,
              background: "var(--wizard-button-primary-bg)",
              color: "var(--wizard-button-primary-text)",
              opacity: isLoading || !allAnswered ? 0.6 : 1,
              cursor:
                isLoading || !allAnswered ? "not-allowed" : "pointer",
            }}
          >
            Complete Setup
          </button>
        </div>

        {!allAnswered && (
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: "var(--wizard-subtext)",
            }}
          >
            Complete Setup is available after all questions are answered.
          </div>
        )}
      </div>
    </div>
  );
};

export default WizardModal;