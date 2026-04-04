import React, { useEffect, useState, useMemo, useRef } from "react";
import { useChatContext } from "../../context/ChatContext";
import WorkspaceHeader from "./WorkspaceHeader";
import WorkspaceEditor from "./WorkspaceEditor";
import WorkspaceSpine from "./WorkspaceSpine";

const API_BASE = import.meta.env.VITE_API_BASE;
const RENDERABLE_ARTIFACT_TYPES = new Set([
  "execution_projection", 
  "execution_section",
  "execution_final",
  "execution_final_polished",
]);

/* ---------------- Zoom Levels ---------------- */

const ZOOM_LEVELS = [0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];

interface WorkspacePaneProps {
  executionInstanceId: string | null;
}

const WorkspacePane: React.FC<WorkspacePaneProps> = ({ executionInstanceId }) => {
  const { conversationId, artifact } = useChatContext();

  console.log("🧠 WorkspacePane executionInstanceId:", executionInstanceId);

  /* ---------------- Zoom State ---------------- */

  const storedZoom =
    Number(localStorage.getItem("workspaceZoom")) || 1;

  const [workspaceZoom, setWorkspaceZoom] =
    useState<number>(storedZoom);

  const zoomIndex = ZOOM_LEVELS.indexOf(workspaceZoom);

  const zoomIn = () => {
    if (zoomIndex < ZOOM_LEVELS.length - 1) {
      const next = ZOOM_LEVELS[zoomIndex + 1];
      setWorkspaceZoom(next);
      localStorage.setItem("workspaceZoom", String(next));
    }
  };

  const zoomOut = () => {
    if (zoomIndex > 0) {
      const next = ZOOM_LEVELS[zoomIndex - 1];
      setWorkspaceZoom(next);
      localStorage.setItem("workspaceZoom", String(next));
    }
  };

  /* ---------------- Existing State ---------------- */
  const [artifactBody, setArtifactBody] = useState<string>("");
  const [artifactMap, setArtifactMap] = useState<Record<string, string>>({});
  const [artifactType, setArtifactType] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isModified, setIsModified] = useState<boolean>(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [spineCollapsed, setSpineCollapsed] = useState(false);
  const [manualArtifact, setManualArtifact] = useState<string | null>(null);  
  
  const [workspaceDocId, setWorkspaceDocId] = useState<string | null>(null);
  const [activeArtifactKey, setActiveArtifactKey] = useState<string | null>(null);

    useEffect(() => {
    if (!artifact) return;

    // only update execution artifact
    setArtifactMap(prev => ({
      ...prev,
      execution: artifact
    }));

    // only set active if not overridden by workspace/doc
    if (!activeArtifactKey || activeArtifactKey === "execution") {
      setActiveArtifactKey("execution");
      setArtifactBody(artifact);
      setArtifactType("execution_projection"); // safe default
      setIsModified(false);
    }

    if (executionInstanceId) {
      loadVersions(executionInstanceId);
    }
  }, [artifact, activeArtifactKey]);

  const applyArtifact = (key: string, body: string, type: string | null) => {
    setArtifactMap(prev => {
      if (prev[key] === body) return prev;
      return { ...prev, [key]: body };
    });

    setActiveArtifactKey(key);
    setArtifactBody(body);
    setArtifactType(type);
    setIsModified(false);
  };

  const sections = useMemo(() => {
    const lines = artifactBody.split("\n");

    const parsed: { section_index: number; title: string }[] = [];
    let headingIndex = 0;

    lines.forEach((line) => {
      const trimmed = line.trim();

      if (!trimmed) return;

      if (
        trimmed.startsWith("# ") ||
        trimmed.startsWith("## ") ||
        trimmed.startsWith("### ")
      ) {
        const title = trimmed.replace(/^#+\s+/, "").trim();
        if (!title) return;

        parsed.push({
          section_index: headingIndex,
          title,
        });

        headingIndex++;
      }
    });

    return parsed;
  }, [artifactBody]);

  const loadVersions = async (id: string, isWorkspace = false) => {
    try {
      const url = isWorkspace
        ? `${API_BASE}/api/workspace/versions/${id}`
        : `${API_BASE}/api/execution/artifact_versions/${id}`;

      const versionRes = await fetch(url);

      if (versionRes.ok) {
        const versionData = await versionRes.json();
        setVersions(versionData?.versions ?? []);
      }
    } catch (err) {
      console.warn("Failed to load versions");
    }
  };

  /* ---------------- Send to Workspace ---------------- */

  useEffect(() => {
    const handler = async (e: any) => {
      const { assetId } = e.detail || {};
      if (!assetId) return;

      try {
        setLoading(true);

        const res = await fetch(`${API_BASE}/api/assets/${assetId}/text`);
        if (!res.ok) {
          setLoading(false);
          return;
        }

        const data = await res.json();
        const text = data?.text || "";
        const filename = data?.filename || "Document";

        const key = `doc-${assetId}`;
        const titleKey = `title-${key}`;

        setArtifactMap(prev => ({
          ...prev,
          [key]: text,
          [titleKey]: filename,
        }));

        setManualArtifact(text);
        applyArtifact(key, text, "document");
        setVersions([]);

        setLoading(false);

      } catch (err) {
        console.error("Send to Workspace failed", err);
        setLoading(false);
      }
    };

    window.addEventListener("nudge-insert-asset", handler);

    return () => {
      window.removeEventListener("nudge-insert-asset", handler);
    };
  }, []);

  useEffect(() => {
    if (!executionInstanceId) {
      setManualArtifact(null);
      setActiveArtifactKey(null);
      setArtifactBody("");
      setArtifactType(null);
      setIsModified(false);
      setVersions([]);
      setLoading(false);
    }
  }, [executionInstanceId]);

  useEffect(() => {
    if (!conversationId) return;
    if (executionInstanceId) return;

    const loadWorkspace = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/workspace/list`, {
          headers: {
            "x-conversation-id": conversationId || "",
          },
        });

        if (!res.ok) return;

        const data = await res.json();
        const docs = data.documents || [];

        if (docs.length === 0) return;

        const doc = docs[0];

        const key = `workspace-${doc.id}`;
        const titleKey = `title-${key}`;

        setWorkspaceDocId(doc.id);

        setArtifactMap(prev => ({
          ...prev,
          [key]: doc.body || "",
          [titleKey]: doc.title || "Workspace",
        }));

        // Only set active if nothing is active yet
        if (!activeArtifactKey && !executionInstanceId) {
          applyArtifact(
            key,
            doc.body && doc.body.length > 0 ? doc.body : " ",
            "workspace"
          );
        }
        loadVersions(doc.id, true);

      } catch (err) {
        console.error("Workspace load failed", err);
      }
    };

    loadWorkspace();
  }, [conversationId, activeArtifactKey]);

  const createWorkspace = async () => {
    if (!conversationId) return;

    try {
      const res = await fetch(`${API_BASE}/api/workspace/create`, {
        method: "POST",
        headers: {
          "x-conversation-id": conversationId || "",
        },
      });

      if (!res.ok) return;

      const doc = await res.json();

      const key = `workspace-${doc.id}`;
      const titleKey = `title-${key}`;

      setWorkspaceDocId(doc.id);

      setArtifactMap(prev => ({
        ...prev,
        [key]: doc.body || "",
        [titleKey]: doc.title || "Workspace",
      }));

      applyArtifact(key, doc.body || "", "workspace");

    } catch (err) {
      console.error("Create workspace failed", err);
    }
  };

  const handleSave = async () => {
    // 🔷 WORKSPACE SAVE
    if (activeArtifactKey && activeArtifactKey.startsWith("workspace-")) {
      if (!workspaceDocId) return;

      try {
        setLoading(true);

        const res = await fetch(`${API_BASE}/api/workspace/${workspaceDocId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            body: artifactBody,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error("WORKSPACE SAVE FAILED:", res.status, errorText);
          setLoading(false);
          return;
        }

        // 🔥 reload versions after save
        if (activeArtifactKey?.startsWith("workspace-")) {
          const docId = activeArtifactKey.replace("workspace-", "");
          loadVersions(docId, true);
        }

        setIsModified(false);
        setLoading(false);

      } catch (err) {
        console.error("Workspace save error", err);
        setLoading(false);
      }

      return;
    }

    // 🔷 EXECUTION SAVE (UNCHANGED)
    if (!executionInstanceId) return;

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/api/execution/artifact/${executionInstanceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          artifact_body: String(artifactBody ?? ""),
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("SAVE FAILED:", res.status, errorText);
        setLoading(false);
        return;
      }

      setIsModified(false);

      await loadVersions(executionInstanceId);

      setLoading(false);

    } catch (err) {
      console.error("Workspace save error", err);
      setLoading(false);
    }
  };

    const hasExecutionArtifact =
      !!executionInstanceId && !!artifact;

    if (!hasExecutionArtifact && !workspaceDocId) {
      return (
        <div style={{ padding: 16, textAlign: "center" }}>
          <button
            onClick={createWorkspace}
            style={{
              padding: "10px 16px",
              borderRadius: "6px",
              border: "1px solid var(--panel-border)",
              background: "var(--nav-surface)",
              cursor: "pointer",
            }}
          >
            + Create Workspace
          </button>
        </div>
      );
    }

    const isExecutionActive =
      !!executionInstanceId && !!artifact;

    const isAutonomous =
      typeof artifact === "string" &&
      artifact.includes('"autonomy_mode": "AUTONOMOUS"');

    const isRunning =
      isExecutionActive &&
      isAutonomous &&
      artifactType !== "execution_final" &&
      artifactType !== "execution_final_polished";

    const artifactAvailable =
    
      !!executionInstanceId ||
      (activeArtifactKey && activeArtifactKey.startsWith("workspace-")) ||
      (artifactBody && artifactBody.length > 0);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--workspace-bg)",
        color: "var(--workspace-text)",
      }}
    >
      {(activeArtifactKey || workspaceDocId) && (
      <WorkspaceHeader
        executionInstanceId={executionInstanceId}
        onSave={handleSave}
        isModified={isModified}
        loading={loading}
        versions={versions}
        workspaceZoom={workspaceZoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}

        artifactOptions={[
          { key: "execution", label: "Task Artifact" },
          ...Object.keys(artifactMap)
            .filter(k => k !== "execution" && !k.startsWith("title-"))
            .map((key, i) => ({
              key,
              label: artifactMap[`title-${key}`] || `Doc ${i + 1}`
            }))
        ]}

        activeArtifactKey={activeArtifactKey || "execution"}

        onSelectArtifact={(key) => {
          setActiveArtifactKey(key);
          setArtifactBody(artifactMap[key] || "");
          setIsModified(false);

          if (key === "execution" && executionInstanceId) {
            loadVersions(executionInstanceId);
          } else if (key.startsWith("workspace-")) {
            const docId = key.replace("workspace-", "");
            loadVersions(docId, true);
          } else {
            setVersions([]);
          }
        }}

        onLoadVersion={(body) => {
          setArtifactBody(body);
          setIsModified(false);

          if (executionInstanceId) {
            loadVersions(executionInstanceId);
          }
        }}
      />
    )}

      {(!artifactAvailable || isRunning) ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            opacity: 0.7,
          }}
        >
          Aritfact is under contruction…
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flex: 1,
            overflow: "hidden",
          }}
        >
          <WorkspaceSpine
            sections={sections}
            collapsed={spineCollapsed}
            setCollapsed={setSpineCollapsed}
            onSelect={(index) => {
              const el = document.getElementById(`section-${index}`);
              const container = document.getElementById(
                "workspace-scroll-container"
              );

              if (!el || !container) return;

              const top =
                el.getBoundingClientRect().top -
                container.getBoundingClientRect().top +
                container.scrollTop;

              container.scrollTo({
                top,
                behavior: "smooth",
              });
            }}
          />

          <div
            id="workspace-scroll-container"
            style={{
              flex: 1,
              overflow: "auto",
            }}
          >
            {/* ZOOM WRAPPER (only addition) */}
            <div
              style={{
                transform: `scale(${workspaceZoom})`,
                transformOrigin: "top left",
                width: `${100 / workspaceZoom}%`,
              }}
            >
              <WorkspaceEditor
                value={artifactBody}
                onChange={(val) => {
                  setArtifactBody(val);

                  if (activeArtifactKey) {
                    setArtifactMap(prev => ({
                      ...prev,
                      [activeArtifactKey]: val,
                    }));
                  }

                  setIsModified(true);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspacePane;