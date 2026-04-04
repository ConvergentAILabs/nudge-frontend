// frontend/src/components/workspace/WorkspaceEditor.tsx

import React, { useMemo, useRef, useLayoutEffect, useEffect } from "react";

interface WorkspaceEditorProps {
  value: string;
  onChange: (val: string) => void;
}

interface ParsedBlock {
  type: "h1" | "h2" | "h3" | "p";
  text: string;
  id?: string;
}

const WorkspaceEditor: React.FC<WorkspaceEditorProps> = ({ value, onChange }) => {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
  }, []);

  const caretRef = useRef<{
    node: Node | null;
    offset: number;
  } | null>(null);

  const blocks = useMemo(() => {
    const lines = value.split("\n");
    const parsed: ParsedBlock[] = [];
    let headingIndex = 0;

    lines.forEach((line) => {
      const trimmed = line.trim();

      if (!trimmed) {
        parsed.push({
          type: "p",
          text: "",
        });
        return;
      }

      if (trimmed.startsWith("### ")) {
        parsed.push({
          type: "h3",
          text: trimmed.replace(/^###\s+/, ""),
          id: `section-${headingIndex++}`,
        });
        return;
      }

      if (trimmed.startsWith("## ")) {
        parsed.push({
          type: "h2",
          text: trimmed.replace(/^##\s+/, ""),
          id: `section-${headingIndex++}`,
        });
        return;
      }

      if (trimmed.startsWith("# ")) {
        parsed.push({
          type: "h1",
          text: trimmed.replace(/^#\s+/, ""),
          id: `section-${headingIndex++}`,
        });
        return;
      }

      parsed.push({
        type: "p",
        text: trimmed,
      });
    });

    return parsed;
  }, [value]);

  useLayoutEffect(() => {
    if (!caretRef.current) return;

    requestAnimationFrame(() => {
      const selection = window.getSelection();
      if (!selection) return;

      try {
        const range = document.createRange();
        if (!caretRef.current?.node) return;

        range.setStart(caretRef.current.node, caretRef.current.offset);
        range.collapse(true);

        selection.removeAllRanges();
        selection.addRange(range);
      } catch {
        // silent fail
      }
    });
  }, [value]);

  const scrollCaretIntoView = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (!rect) return;

    const container = document.getElementById("workspace-scroll-container");
    if (!container) return;

    const containerRect = container.getBoundingClientRect();

    const offsetTop = rect.top - containerRect.top;
    const offsetBottom = rect.bottom - containerRect.bottom;

    if (offsetTop < 0) {
      container.scrollTop += offsetTop - 20;
    } else if (offsetBottom > 0) {
      container.scrollTop += offsetBottom + 20;
    }
  };

  const handleInput = () => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      caretRef.current = {
        node: range.startContainer,
        offset: range.startOffset,
      };
    }

    const nextLines: string[] = [];

    Array.from(editorRef.current.children).forEach((node) => {
      const el = node as HTMLElement;
      const text = el.innerText.trim();

      if (!text) return;

      if (el.tagName === "H1") {
        nextLines.push(`# ${text}`);
        return;
      }

      if (el.tagName === "H2") {
        nextLines.push(`## ${text}`);
        return;
      }

      if (el.tagName === "H3") {
        nextLines.push(`### ${text}`);
        return;
      }

      nextLines.push(text);
    });

    const nextValue = nextLines.join("\n\n");

    if (!nextValue.trim()) {
      return;
    }

    if (nextValue !== value) {
      onChange(nextValue);

      requestAnimationFrame(() => {
        scrollCaretIntoView();
      });
    }
  };

  const isEmpty = !value || value.trim() === "";

  return (
    <div style={{ position: "relative", flex: 1 }}>
      
      {/* 🔥 PLACEHOLDER */}
      {isEmpty && (
        <div
          style={{
            position: "absolute",
            top: 28,
            left: 28,
            pointerEvents: "none",
            opacity: 0.35,
            fontStyle: "italic",
            color: "var(--workspace-text)",
          }}
        >
          Start typing...
        </div>
      )}

      {/* 🔥 EDITOR */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={(e) => {
          e.preventDefault();

          let text = e.clipboardData.getData("text/plain");
          text = text.replace(/\r\n/g, "\n");

          document.execCommand("insertText", false, text);

          requestAnimationFrame(() => {
            handleInput();
          });
        }}
        style={{
          flex: 1,
          padding: 28,
          overflow: "auto",
          background: "var(--workspace-bg)",
          color: "var(--workspace-text)",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: 14,
          lineHeight: 1.75,
          letterSpacing: "0.01em",
          outline: "none",
          cursor: "text",
        }}
      >
        {blocks.map((block, index) => {
          if (block.type === "h1") {
            return (
              <h1
                key={`${block.type}-${block.id || index}-${block.text.slice(0, 20)}`}
                id={block.id}
                style={{
                  fontSize: 28,
                  fontWeight: 650,
                  marginTop: 28,
                  marginBottom: 14,
                  color: "var(--workspace-text)",
                }}
              >
                {block.text}
              </h1>
            );
          }

          if (block.type === "h2") {
            return (
              <h2
                key={`${block.type}-${index}`}
                id={block.id}
                style={{
                  fontSize: 21,
                  fontWeight: 600,
                  marginTop: 24,
                  marginBottom: 12,
                  color: "var(--workspace-text)",
                }}
              >
                {block.text}
              </h2>
            );
          }

          if (block.type === "h3") {
            return (
              <h3
                key={`${block.type}-${index}`}
                id={block.id}
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  marginTop: 18,
                  marginBottom: 8,
                  color: "var(--workspace-text)",
                }}
              >
                {block.text}
              </h3>
            );
          }

          return (
            <p
              key={`${block.type}-${index}`}
              style={{
                marginBottom: block.text ? 14 : 10,
                opacity: block.text ? 0.95 : 0.4,
                minHeight: block.text ? undefined : 10,
              }}
            >
              {block.text || "\u00A0"}
            </p>
          );
        })}
      </div>
    </div>
  );
};

export default WorkspaceEditor;