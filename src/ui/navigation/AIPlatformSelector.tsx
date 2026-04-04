import React, { useEffect, useState } from "react";

type Platform = "openai" | "anthropic" | "gemini" | "grok";

const STORAGE_KEY = "nudge_platform_config";

const platforms = [
  { id: "openai", label: "OpenAI", enabled: true },
  { id: "anthropic", label: "Claude", enabled: false },
  { id: "gemini", label: "Gemini", enabled: false },
  { id: "grok", label: "Grok", enabled: false },
];

export default function AIPlatformSelector() {
  const [platform, setPlatform] = useState<Platform>("openai");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.primary_platform) {
          setPlatform(parsed.primary_platform);
        }
      } catch {}
    } else {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ primary_platform: "openai" })
      );
    }
  }, []);

  const selectPlatform = (id: Platform) => {
    if (id !== "openai") return;

    setPlatform(id);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        primary_platform: id,
      })
    );
  };

  return (
    <div>

      {/* Header */}
      <div
        style={{
          fontSize: "12px",
          fontWeight: 600,
          opacity: 0.6,
          marginBottom: "14px",
        }}
      >
        AI PLATFORM
      </div>

      {/* Platform List */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        {platforms.map((p) => {
          const active = platform === p.id;
          const disabled = !p.enabled;

          return (
            <div
              key={p.id}
              onClick={() => {
                if (!disabled) selectPlatform(p.id as Platform);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                borderRadius: "8px",
                fontSize: "13px",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.4 : 0.85,
                background: active
                  ? "rgba(255,255,255,0.04)"
                  : "transparent",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {/* Radio indicator */}
                <div
                  style={{
                    height: "10px",
                    width: "10px",
                    borderRadius: "50%",
                    border: "2px solid var(--chat-text)",
                    background: active
                      ? "var(--accent-orange)"
                      : "transparent",
                    transition: "all 0.15s ease",
                  }}
                />

                {p.label}
              </div>

              <div
                style={{
                  fontSize: "11px",
                  opacity: 0.6,
                }}
              >
                {p.enabled ? "Active" : "Coming Soon"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}