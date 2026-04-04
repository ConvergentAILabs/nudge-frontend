import React, { useState, useEffect } from "react";
import LeftPane from "./LeftPane";
import { CenterPane } from "./CenterPane";
import RightPane from "./RightPane";

export const Surface: React.FC = () => {
  const [rightPaneCollapsed, setRightPaneCollapsed] = useState(false);

  // ✅ NEW: resizable width (persisted)
  const [rightPaneWidth, setRightPaneWidth] = useState<number>(() => {
    const saved = localStorage.getItem("rightPaneWidth");
    return saved ? Number(saved) : 288;
  });

  const [isDragging, setIsDragging] = useState(false);

  // ✅ DRAG LOGIC
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const min = 240;
      const max = 600;

      const newWidth = Math.min(
        Math.max(window.innerWidth - e.clientX, min),
        max
      );

      setRightPaneWidth(newWidth);
      localStorage.setItem("rightPaneWidth", String(newWidth));
    };

    const stop = () => setIsDragging(false);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", stop);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", stop);
    };
  }, [isDragging]);

  const computedWidth = rightPaneCollapsed ? 28 : rightPaneWidth;

  return (
    <div
      className="h-screen w-screen flex overflow-hidden"
      style={{
        background: "var(--chat-bg)",
        color: "var(--chat-text)",
      }}
    >
      {/* LEFT PANE */}
      <div
        style={{
          flexShrink: 0,
          borderRight: "1px solid var(--nav-bg)",
          background: "var(--nav-bg)",
        }}
      >
        <LeftPane />
      </div>

      {/* CENTER */}
      <div
        className="flex-1 min-w-0"
        style={{
          background: "var(--chat-bg)",
        }}
      >
        <CenterPane />
      </div>

      {/* ✅ RESIZE HANDLE (ONLY WHEN OPEN) */}
      {!rightPaneCollapsed && (
        <div
          onMouseDown={() => setIsDragging(true)}
          style={{
            width: "4px",
            cursor: "col-resize",
            background: "transparent", // ✅ invisible by default
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--accent-orange)";
            e.currentTarget.style.opacity = "0.6";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        />
      )}

      {/* RIGHT PANE */}
      <div
        style={{
          width: `${computedWidth}px`,
          transition: isDragging ? "none" : "width 0.2s ease",
          overflow: "hidden",
          borderLeft: rightPaneCollapsed
            ? "none"
            : "1px solid var(--nav-bg)",
          background: "var(--nav-bg)",
        }}
      >
        <RightPane
          collapsed={rightPaneCollapsed}
          setCollapsed={setRightPaneCollapsed}
        />
      </div>
    </div>
  );
};