import React, { useState, useEffect } from "react";
import { useChatContext } from "../../context/ChatContext";

const API_BASE = import.meta.env.VITE_API_BASE;

type Asset = {
  id: string;
  name: string;
};

export default function AssetPanel() {
  const { activeAssets, setActiveAssets, conversationId } = useChatContext();
  
  // -----------------------------
  // STATE
  // -----------------------------
  const [sessionAssets, setSessionAssets] = useState<Asset[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [lastAutoActivatedId, setLastAutoActivatedId] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const [archiveAssets, setArchiveAssets] = useState<Asset[]>([
    { id: "doc-3", name: "Assignment Brief.pdf" },
    { id: "doc-4", name: "Old Notes.txt" },
  ]);

  // -----------------------------
  // FETCH SESSION ASSETS
  // -----------------------------
  useEffect(() => {
    const handler = () => {
      if (!conversationId) return;

      fetch(`${API_BASE}/api/assets?session_id=${conversationId}`)
        .then((res) => res.json())
        .then((data) => {
          const assets = (data || []).map((a: any) => ({
            id: a.asset_id || a.id,
            name: a.filename || a.name,
          }));

          setSessionAssets(assets);
        })
        .catch(() => {});
    };

    handler();

    window.addEventListener("assets.updated", handler);

    return () => {
      window.removeEventListener("assets.updated", handler);
    };
  }, [conversationId, activeAssets, setActiveAssets]);

  // -----------------------------
  // AUTO-ACTIVATE ON UPLOAD
  // -----------------------------
  useEffect(() => {
    const handler = (event: any) => {
      const assetId = event?.detail?.assetId;
      if (!assetId) return;

      console.log("🔥 FORCE AUTO ACTIVATE:", assetId);

      if (!activeAssets.includes(assetId)) {
        setActiveAssets([...activeAssets, assetId]);
      }
    };

    window.addEventListener("asset.uploaded", handler);

    return () => {
      window.removeEventListener("asset.uploaded", handler);
    };
  }, [setActiveAssets, activeAssets]);

  // -----------------------------
  // ACTIONS
  // -----------------------------
  const activate = (id: string) => {
    if (activeAssets.includes(id)) return;

    console.log("🔥 ACTIVATE:", id);

    setActiveAssets([id]);
  };

  const deactivate = (id: string) => {
    console.log("🔥 DEACTIVATE:", id);

    setLastAutoActivatedId(null);

    const next = activeAssets.filter((assetId) => assetId !== id);
    setActiveAssets(next);
  };

  const addToSession = (asset: Asset) => {
    setSessionAssets((prev) => [...prev, asset]);
    setArchiveAssets((prev) =>
      prev.filter((a) => a.id !== asset.id)
    );
  };

  const removeFromSession = (asset: Asset) => {
    if (asset.id === "task-artifact") return;

    setSessionAssets((prev) =>
      prev.filter((a) => a.id !== asset.id)
    );

    setArchiveAssets((prev) => [asset, ...prev]);

    const next = activeAssets.filter((id) => id !== asset.id);
    setActiveAssets(next);
  };

  // -----------------------------
  // ROW COMPONENT
  // -----------------------------
  const Row = ({
    asset,
    isActive,
    isSession,
  }: {
    asset: Asset;
    isActive: boolean;
    isSession: boolean;
  }) => {
    const isHovered = hoveredId === asset.id;

    const label = isActive
      ? isHovered
        ? "Deactivate"
        : "Active"
      : "Activate";

    const color =
      isActive || isHovered
        ? "var(--accent-orange)"
        : undefined;

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "6px 8px",
          borderRadius: 6,
          fontSize: 12,
          gap: 8,
        }}
      >
        {/* ✅ FIXED: Truncating filename */}
        <div
          style={{
            opacity: 0.9,
            flex: 1,
            minWidth: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            paddingRight: 8,
          }}
          title={asset.name}
        >
          {asset.name}
        </div>

        {/* ✅ FIXED: Buttons locked in place */}
        <div
          style={{
            display: "flex",
            gap: 10,
            flexShrink: 0,
          }}
        >
          {isSession ? (
            <>
              <div
                onMouseEnter={() => setHoveredId(asset.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => {
                  if (isActive) {
                    deactivate(asset.id);
                  } else {
                    activate(asset.id);
                  }
                }}
                style={{
                  cursor: "pointer",
                  fontSize: 11,
                  color,
                  fontWeight: isActive ? 600 : undefined,
                  opacity: isActive ? 1 : 0.75,
                }}
              >
                {label}
              </div>

              {asset.id !== "task-artifact" && (
                <div
                  onClick={() => removeFromSession(asset)}
                  style={{
                    cursor: "pointer",
                    fontSize: 11,
                    opacity: 0.45,
                  }}
                >
                  Remove
                </div>
              )}
            </>
          ) : (
            <div
              onClick={() => addToSession(asset)}
              style={{
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              + Add
            </div>
          )}
        </div>
      </div>
    );
  };

  // -----------------------------
  // RENDER
  // -----------------------------
  return (
    <div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        FILES
      </div>

      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          opacity: 0.6,
          marginBottom: 6,
        }}
      >
        SESSION
      </div>

      {/* SESSION SCROLL + LIMIT */}
      <div
        style={{
          maxHeight: 160,
          overflowY: "auto",
          paddingRight: 4,
        }}
      >
        {sessionAssets.map((asset) => (
          <Row
            key={asset.id}
            asset={asset}
            isActive={activeAssets.includes(asset.id)}
            isSession
          />
        ))}
      </div>

      {/* ARCHIVE HEADER (COLLAPSIBLE) */}
      <div
        onClick={() => setArchiveOpen(!archiveOpen)}
        style={{
          fontSize: 11,
          fontWeight: 600,
          opacity: 0.6,
          marginTop: 14,
          marginBottom: 6,
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>ARCHIVE</span>
        <span>{archiveOpen ? "▾" : "▸"}</span>
      </div>

      {/* ARCHIVE CONTENT */}
      {archiveOpen && (
        <div
          style={{
            maxHeight: 160,
            overflowY: "auto",
            paddingRight: 4,
          }}
        >
          {archiveAssets.map((asset) => (
            <Row
              key={asset.id}
              asset={asset}
              isActive={false}
              isSession={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}