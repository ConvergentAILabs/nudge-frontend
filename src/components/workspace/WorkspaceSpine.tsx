import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Section {
  section_index: number;
  title: string;
}

interface Props {
  sections: Section[];
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  onSelect: (index: number) => void;
}

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

export default function WorkspaceSpine({
  sections,
  collapsed,
  setCollapsed,
  onSelect,
}: Props) {
  const [activeSection, setActiveSection] = useState<number | null>(null);

  // --------------------------------------------------
  // Detect active section while artifact scrolls
  // --------------------------------------------------

  useEffect(() => {
    const container = document.getElementById("workspace-scroll-container");
    if (!container) return;

    const handler = () => {
      for (let i = sections.length - 1; i >= 0; i--) {
        const id = `section-${sections[i].section_index}`;
        const el = document.getElementById(id);

        if (!el) continue;

        const rect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        if (rect.top <= containerRect.top + 120) {
          setActiveSection(sections[i].section_index);
          return;
        }
      }
    };

    container.addEventListener("scroll", handler);

    return () => {
      container.removeEventListener("scroll", handler);
    };
  }, [sections]);

  // --------------------------------------------------
  // Ensure active section stays visible in the spine
  // --------------------------------------------------

  useEffect(() => {
    if (activeSection === null) return;

    const container = document.getElementById("workspace-spine-scroll");
    const el = document.getElementById(`spine-section-${activeSection}`);
    if (!container || !el) return;

    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    const topOffset = 36;

    const nextTop =
      container.scrollTop + (elRect.top - containerRect.top) - topOffset;

    container.scrollTo({
      top: Math.max(0, nextTop),
      behavior: "smooth",
    });
  }, [activeSection]);

  return (
    <div
      style={{
        width: collapsed ? "26px" : "150px",
        transition: "width 0.2s ease",
        borderRight: "1px solid var(--panel-border)",
        background: "var(--nav-bg-secondary)",
        color: "var(--chat-text)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {/* --------------------------------------------------
          Sticky Collapse Toggle
      -------------------------------------------------- */}

      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 2,
          background: "var(--nav-bg-secondary)",
          padding: collapsed ? "8px 2px" : "12px 8px",
        }}
      >
        <div
          onClick={() => setCollapsed(!collapsed)}
          style={{
            height: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            borderRadius: "6px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--nav-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          {collapsed ? (
            <ChevronRight size={14} color="var(--accent-orange)" />
          ) : (
            <ChevronLeft size={14} color="var(--accent-orange)" />
          )}
        </div>
      </div>

      {/* --------------------------------------------------
          Scrollable Section List
      -------------------------------------------------- */}

      {!collapsed && (
        <div
        id="workspace-spine-scroll"
        style={{
            overflowY: "auto",
            padding: "0 8px 12px 8px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
        }}
        >
          {sections.map((s) => {
            const isActive = activeSection === s.section_index;

            const displayTitle =
              s.title.length > 34 ? s.title.slice(0, 34) + "…" : s.title;

            return (
              <div
                id={`spine-section-${s.section_index}`}
                key={s.section_index}
                onClick={() => {
                  setActiveSection(s.section_index);
                  onSelect(s.section_index);
                }}
                style={{
                  padding: "6px 8px",
                  fontSize: "12px",
                  cursor: "pointer",
                  borderRadius: "6px",
                  opacity: isActive ? 1 : 0.85,
                  color: isActive
                    ? "var(--accent-orange)"
                    : "var(--chat-text)",
                  background: isActive
                    ? "var(--nav-hover)"
                    : "transparent",
                  fontWeight: isActive ? 600 : 400,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "var(--nav-hover)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                {s.section_index + 1} {displayTitle}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}