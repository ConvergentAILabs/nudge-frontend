import React, { useState, useRef, useEffect } from "react";
import { useChatContext } from "../../context/ChatContext";

const API_BASE = import.meta.env.VITE_API_BASE;
interface WorkspaceHeaderProps {
  executionInstanceId: string | null;
  onSave: () => void;
  isModified: boolean;
  loading: boolean;
  onLoadVersion?: (body: string) => void;
  versions: any[];

  workspaceZoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;

  artifactOptions: { key: string; label: string }[];
  activeArtifactKey: string;
  onSelectArtifact: (key: string) => void;

  // 🔥 NEW — rename sync to parent
  onRenameTitle?: (key: string, title: string) => void;
}

const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  executionInstanceId,
  onSave,
  isModified,
  loading,
  onLoadVersion,
  versions,
  workspaceZoom,
  onZoomIn,
  onZoomOut,
  artifactOptions,
  activeArtifactKey,
  onSelectArtifact
}) => {
  const { executionState, pausedSectionIndex, abortExecution } = useChatContext();

  const [resumeLoading, setResumeLoading] = useState<boolean>(false);

  const [showVersions, setShowVersions] = useState(false);
  const [versionHover, setVersionHover] = useState(false);

  const [showArtifacts, setShowArtifacts] = useState(false);
  const [artifactHover, setArtifactHover] = useState(false);

  const [saveHover, setSaveHover] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");

  const menuRef = useRef<HTMLDivElement | null>(null);
  const artifactMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowVersions(false);
      }

      if (artifactMenuRef.current && !artifactMenuRef.current.contains(event.target as Node)) {
        setShowArtifacts(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const current = artifactOptions.find(a => a.key === activeArtifactKey)?.label;
    if (current) {
      setTitleValue(current);
    }
  }, [activeArtifactKey, artifactOptions]);

  const formatTime = (ts: any) => {
    if (!ts) return "";

    try {
      const num = Number(ts);
      if (Number.isNaN(num)) return "";

      const d =
        num < 1000000000000
          ? new Date(num * 1000)
          : new Date(num);

      return d.toLocaleString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const renderStatusLabel = () => {
    if (!executionState) return "";

    let label = "";

    if (executionState === "RUNNING") label = "Running";
    if (executionState === "PAUSED") label = "Paused";
    if (executionState === "COMPLETED") label = "Completed";
    if (executionState === "ABORTED") label = "Aborted";

    if (executionState === "PAUSED" && pausedSectionIndex !== null) {
      label += ` at Section ${pausedSectionIndex}`;
    }

    return label;
  };

  const showAbort =
    executionState === "RUNNING" || executionState === "PAUSED";

  const showResume = executionState === "PAUSED";

  const handleResume = async () => {
    if (!executionInstanceId) return;

    try {
      setResumeLoading(true);

      await fetch(`${API_BASE}/api/execution/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ execution_instance_id: executionInstanceId })
      });

    } finally {
      setResumeLoading(false);
    }
  };

  const handleRename = async () => {
    if (!activeArtifactKey || !activeArtifactKey.startsWith("workspace-")) {
      setIsEditingTitle(false);
      return;
    }

    const docId = activeArtifactKey.replace("workspace-", "");

    try {
      await fetch(`${API_BASE}/api/workspace/${docId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: titleValue,
        }),
      });
    } catch (err) {
      console.error("Rename failed", err);
    }

    setIsEditingTitle(false);
  };

  const handleVersionClick = (body: string) => {
    if (onLoadVersion) onLoadVersion(body);
    setShowVersions(false);
  };

  const zoomPercent = Math.round(workspaceZoom * 100);

  return (
    <div
      style={{
        padding: "8px 14px",
        borderBottom: "1px solid var(--panel-border)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "var(--nav-bg)",
      }}
    >
      {/* LEFT SIDE */}
      <div
        style={{
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: "0.08em",
          color: "var(--accent-orange)",
        }}
      >
        WORKSPACE:
        <span style={{ marginLeft: 6, fontWeight: 600 }}>
          {renderStatusLabel()}
        </span>
      </div>

      {/* RIGHT SIDE */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>

        {/* 🔥 ARTIFACT SELECTOR (NEW) */}
        <div ref={artifactMenuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setShowArtifacts(!showArtifacts)}
            onMouseEnter={() => setArtifactHover(true)}
            onMouseLeave={() => setArtifactHover(false)}
            style={{
              padding: "4px 10px",
              fontSize: 12,
              borderRadius: "4px",
              border: "1px solid var(--accent-orange)",
              background: "var(--nav-bg)",
              color: artifactHover ? "var(--accent-orange)" : "#cfcfcf",
              cursor: "pointer",
            }}
          >
            {isEditingTitle ? (
              <input
                value={titleValue}
                autoFocus
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                }}
                style={{
                  fontSize: 12,
                  background: "transparent",
                  border: "1px solid var(--panel-border)",
                  color: "var(--workspace-text)",
                  padding: "2px 4px",
                  borderRadius: 4,
                  width: 120,
                }}
              />
            ) : (
              <span
                onDoubleClick={() => setIsEditingTitle(true)}
                title="Double-click to rename"
              >
                {titleValue || "Artifact"} ▾
              </span>
            )}
          </button>

          {showArtifacts && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 28,
                background: "var(--nav-bg)",
                border: "1px solid var(--panel-border)",
                borderRadius: 4,
                minWidth: 180,
                maxHeight: 200,
                overflowY: "auto",
                zIndex: 1000,
              }}
            >
              {artifactOptions.map((opt) => (
                <div
                  key={opt.key}
                  onClick={() => {
                    onSelectArtifact(opt.key);
                    setShowArtifacts(false);
                  }}
                  style={{
                    padding: "6px 10px",
                    fontSize: 12,
                    cursor: "pointer",
                    borderBottom: "1px solid var(--panel-border)",
                  }}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* VERSIONS */}
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setShowVersions(!showVersions)}
            onMouseEnter={() => setVersionHover(true)}
            onMouseLeave={() => setVersionHover(false)}
            style={{
              padding: "4px 10px",
              fontSize: 12,
              borderRadius: "4px",
              border: "1px solid var(--accent-orange)",
              background: "var(--nav-bg)",
              color: versionHover ? "var(--accent-orange)" : "#cfcfcf",
              cursor: "pointer",
            }}
          >
            Versions ▾
          </button>

          {showVersions && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 28,
                background: "var(--nav-bg)",
                border: "1px solid var(--panel-border)",
                borderRadius: 4,
                minWidth: 180,
                maxHeight: 200,
                overflowY: "auto",
                zIndex: 1000,
              }}
            >
              {versions.length === 0 && (
                <div style={{ padding: 8, fontSize: 12, opacity: 0.6 }}>
                  No versions yet
                </div>
              )}

              {versions.map((v, i) => {
                const time =
                  formatTime(v.created_at) ||
                  formatTime(v.timestamp) ||
                  formatTime(v.created_ts);

                return (
                  <div
                    key={i}
                    onClick={() => handleVersionClick(v.artifact_body)}
                    style={{
                      padding: "6px 10px",
                      fontSize: 12,
                      cursor: "pointer",
                      borderBottom: "1px solid var(--panel-border)",
                    }}
                  >
                    Version {versions.length - i}
                    {time && (
                      <span style={{ opacity: 0.6 }}>
                        {" "}
                        — {time}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RESUME */}
        {showResume && (
          <button
            onClick={handleResume}
            disabled={resumeLoading}
            style={{
              padding: "4px 10px",
              fontSize: 12,
              borderRadius: "4px",
              border: "1px solid rgba(0,0,0,0.15)",
              background: resumeLoading
                ? "rgba(246,139,45,0.35)"
                : "var(--accent-orange)",
              color: "#ffffff",
              cursor: resumeLoading ? "not-allowed" : "pointer",
            }}
          >
            {resumeLoading ? "Resuming..." : "Resume"}
          </button>
        )}

        {/* ABORT */}
        {showAbort && (
          <button
            onClick={abortExecution}
            style={{
              padding: "4px 10px",
              fontSize: 12,
              borderRadius: "4px",
              border: "1px solid #dc2626",
              background: "var(--nav-bg)",
              color: "#dc2626",
              cursor: "pointer",
            }}
          >
            Abort
          </button>
        )}

        {/* SAVE */}
        <button
          onClick={onSave}
          disabled={!isModified || loading}
          onMouseEnter={() => setSaveHover(true)}
          onMouseLeave={() => setSaveHover(false)}
          style={{
            padding: "4px 10px",
            fontSize: 12,
            borderRadius: "4px",
            border: "1px solid var(--accent-orange)",
            background: "var(--nav-bg)",
            color: saveHover ? "var(--accent-orange)" : "#cfcfcf",
            cursor: isModified ? "pointer" : "not-allowed",
          }}
        >
          {loading ? "Saving..." : "Save"}
        </button>

        {/* ZOOM */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={onZoomOut}>-</button>
          <div style={{ fontSize: 12, width: 36, textAlign: "center" }}>
            {zoomPercent}%
          </div>
          <button onClick={onZoomIn}>+</button>
        </div>

      </div>
    </div>
  );
};

export default WorkspaceHeader;