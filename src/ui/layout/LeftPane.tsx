import React, { useState } from "react";
import NavigationSpine, {
  SidebarSection,
} from "../navigation/NavigationSpine";
import NavigationPanel from "../navigation/NavigationPanel";

export default function LeftPane() {
  const [activeSection, setActiveSection] =
    useState<SidebarSection>("home");

  const [collapsed, setCollapsed] = useState(false);
  const [logoHover, setLogoHover] = useState(false);

  const paneWidth = collapsed ? 56 : 270;

  return (
    <div
      style={{
        height: "100%",
        width: `${paneWidth}px`,
        transition: "width 0.2s ease",
        display: "flex",
        flexDirection: "column",
        background: "var(--nav-bg)",
        color: "var(--chat-text)",
        overflow: "hidden",
      }}
    >
      {/* Brand Header */}
      <div
        onMouseEnter={() => setLogoHover(true)}
        onMouseLeave={() => setLogoHover(false)}
        style={{
          height: "72px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background: "var(--nav-bg)",
        }}
      >
        {/* Wordmark */}
        <img
          src={
            logoHover
              ? "/brand/nudge-wordmark-orange.png"
              : "/brand/nudge-wordmark-white.png"
          }
          alt="NUDGE"
          style={{
            height: "52px",
            width: "auto",
            opacity: collapsed ? 0 : 1,
            transition: "opacity 0.2s ease",
            filter:
              "drop-shadow(0 2px 4px rgba(0,0,0,0.7)) drop-shadow(0 0 6px rgba(255,255,255,0.08))",
          }}
        />

        {/* G Icon */}
        <img
          src={
            logoHover
              ? "/brand/nudge-icon-orange.png"
              : "/brand/nudge-icon-white.png"
            }
            alt="NUDGE"
            style={{
              position: "absolute",
              height: "36px",
              width: "36px",
              opacity: collapsed ? 1 : 0,
              pointerEvents: "none",
              transition: "opacity 0.2s ease",
            }}
          />
      </div>

      {/* Sidebar Body */}
      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
        }}
      >
        <NavigationSpine
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />

        {!collapsed && (
          <NavigationPanel
            activeSection={activeSection}
            collapsed={collapsed}
          />
        )}
      </div>
    </div>
  );
}