import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  MessageSquare,
  Search,
  User,
  Settings,
  CircleHelp,
  Sun,
  Moon
} from "lucide-react";

const iconSize = 20;

const toggleTheme = () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";

  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("nudge-theme", next);
};

export type SidebarSection =
  | "home"
  | "chats"
  | "search"
  | "account"
  | "settings"
  | "help";

interface Props {
  activeSection: SidebarSection;
  setActiveSection: (section: SidebarSection) => void;
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function NavigationSpine({
  activeSection,
  setActiveSection,
  collapsed,
  setCollapsed,
}: Props) {

  const [hovered, setHovered] = useState<SidebarSection | null>(null);
  const [toggleHover, setToggleHover] = useState(false);
  const [themeHover, setThemeHover] = useState(false);
  const [themeSpin, setThemeSpin] = useState(false);

  const isDark =
    document.documentElement.getAttribute("data-theme") === "dark";

  const navItem = (id: SidebarSection, Icon: React.ElementType) => {
    const isActive = activeSection === id;
    const isHover = hovered === id;

    return (
      <div
        key={id}
        onClick={() => setActiveSection(id)}
        onMouseEnter={() => setHovered(id)}
        onMouseLeave={() => setHovered(null)}
        style={{
          height: "44px",
          width: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          position: "relative",
          transition: "all 0.15s ease",
        }}
      >
        {(isActive || isHover) && (
          <div
            style={{
              position: "absolute",
              height: "38px",
              width: "38px",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.04)",
              boxShadow: isActive ? "0 3px 8px rgba(0,0,0,0.45)" : "none",
            }}
          />
        )}

        <Icon
          size={iconSize}
          style={{
            position: "relative",
            color:
              isActive || isHover
                ? "var(--accent-orange)"
                : "var(--chat-text)",
            opacity: isActive ? 1 : 0.65,
          }}
        />
      </div>
    );
  };

  return (
    <div
      style={{
        width: "56px",
        minWidth: "56px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: "10px",
        gap: "10px",
      }}
    >
      {/* Collapse Toggle */}
      <div
        onClick={() => setCollapsed((prev) => !prev)}
        onMouseEnter={() => setToggleHover(true)}
        onMouseLeave={() => setToggleHover(false)}
        style={{
          height: "44px",
          width: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          position: "relative",
          marginBottom: "8px",
        }}
      >
        {toggleHover && (
          <div
            style={{
              position: "absolute",
              height: "38px",
              width: "38px",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.04)",
            }}
          />
        )}

        {collapsed ? (
          <ChevronRight
            size={18}
            style={{
              position: "relative",
              color: toggleHover
                ? "var(--accent-orange)"
                : "var(--chat-text)",
              opacity: toggleHover ? 1 : 0.65,
            }}
          />
        ) : (
          <ChevronLeft
            size={18}
            style={{
              position: "relative",
              color: toggleHover
                ? "var(--accent-orange)"
                : "var(--chat-text)",
              opacity: toggleHover ? 1 : 0.65,
            }}
          />
        )}
      </div>

      {navItem("home", Home)}
      {navItem("chats", MessageSquare)}
      {navItem("search", Search)}

      <div style={{ height: "18px" }} />

      {navItem("account", User)}
      {navItem("settings", Settings)}
      {navItem("help", CircleHelp)}

      {/* Theme Toggle */}
      <div
        onClick={() => {
          setThemeSpin(true);
          toggleTheme();
          setTimeout(() => setThemeSpin(false), 300);
        }}
        onMouseEnter={() => setThemeHover(true)}
        onMouseLeave={() => setThemeHover(false)}
        style={{
          height: "44px",
          width: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          marginTop: "8px",
          position: "relative",
          transition: "all 0.2s ease",
        }}
      >
        {isDark ? (
          <Sun
            size={iconSize}
            style={{
              color: themeHover
                ? "var(--accent-orange)"
                : "var(--chat-text)",
              opacity: themeHover ? 1 : 0.65,
              transform: themeSpin ? "rotate(180deg)" : "rotate(0deg)",
              transition: "all 0.3s ease",
            }}
          />
        ) : (
          <Moon
            size={iconSize}
            style={{
              color: themeHover
                ? "var(--accent-orange)"
                : "var(--chat-text)",
              opacity: themeHover ? 1 : 0.65,
              transform: themeSpin ? "rotate(180deg)" : "rotate(0deg)",
              transition: "all 0.3s ease",
            }}
          />
        )}
      </div>

    </div>
  );
}