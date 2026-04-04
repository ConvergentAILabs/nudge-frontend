import React from "react";
import ReactMarkdown from "react-markdown";

type Variant = "info" | "danger";

export const ExecutionBubble: React.FC<{
  text: string;
  align?: "left" | "right";
  variant?: Variant;
}> = ({ text, align = "left", variant = "info" }) => {
  const isDanger = variant === "danger";

  const normalizedText = text?.replace(/\r\n/g, "\n");

  return (
    <div className={`flex ${align === "right" ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[78%] px-5 py-4"
        style={{
          borderRadius: "8px",
          background: isDanger
            ? "rgba(255, 80, 80, 0.12)"
            : "rgba(246, 139, 45, 0.10)",
          color: "var(--chat-text)",
          border: isDanger
            ? "1px solid rgba(255, 80, 80, 0.40)"
            : "1px solid rgba(246, 139, 45, 0.40)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
          opacity: 0.96,
        }}
      >
        <div
          style={{
            fontSize: "16.0px",
            lineHeight: 1.6,
            opacity: 0.9,
          }}
        >
          <ReactMarkdown
            components={{
              p: ({ children }) => (
                <p
                  style={{
                    marginTop: 0,
                    marginBottom: "10px",
                    lineHeight: "1.5",
                  }}
                >
                  {children}
                </p>
              ),

              h2: ({ children }) => (
                <div
                  style={{
                    marginTop: "18px",
                    marginBottom: "8px",
                    fontWeight: 700,
                    fontSize: "14px",
                    color: "var(--accent-orange)",
                    lineHeight: "1.35",
                  }}
                >
                  {children}
                </div>
              ),

              h3: ({ children }) => (
                <div
                  style={{
                    marginTop: "12px",
                    marginBottom: "4px",
                    fontWeight: 700,
                    fontSize: "13.5px",
                    color: "var(--chat-text)",
                    lineHeight: "1.35",
                  }}
                >
                  {children}
                </div>
              ),

              ul: ({ children }) => (
                <ul
                  style={{
                    paddingLeft: "18px",
                    marginTop: "6px",
                    marginBottom: "12px",
                  }}
                >
                  {children}
                </ul>
              ),

              li: ({ children }) => (
                <li
                  style={{
                    marginBottom: "4px",
                    lineHeight: "1.5",
                  }}
                >
                  {children}
                </li>
              ),

              em: ({ children }) => (
                <em
                  style={{
                    opacity: 0.9,
                  }}
                >
                  {children}
                </em>
              ),

              strong: ({ children }) => (
                <strong
                  style={{
                    fontWeight: 700,
                    color: "var(--chat-text)",
                  }}
                >
                  {children}
                </strong>
              ),

              hr: () => (
                <div
                  style={{
                    borderTop: "1px solid rgba(255,255,255,0.12)",
                    margin: "14px 0",
                  }}
                />
              ),
            }}
          >
            {normalizedText}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};