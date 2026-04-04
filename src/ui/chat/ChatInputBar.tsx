import React, { useState, useRef, useEffect } from "react";
import { useChatContext } from "../../context/ChatContext";

const API_BASE = import.meta.env.VITE_API_BASE;

/**
 * Post-recovery presentation polish
 *
 * - White input
 * - Dark text
 * - Minimal visual noise
 */

export const ChatInputBar: React.FC = () => {
  const { sendUserMessage, inputDisabled, conversationId, injectMessage, isWizardOpen } = useChatContext() as any;

  const [value, setValue] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 🔥 Input focus ref
  const inputRef = useRef<HTMLInputElement | null>(null);

  const submit = () => {
    if (!value.trim() || inputDisabled) return;

    sendUserMessage(value);
    setValue("");

    // 🔥 CRITICAL FIX: restore focus after send
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(
          `${API_BASE}/api/assets/upload?session_id=${conversationId}`,
          {
            method: "POST",
            body: formData
          }
        );

        const result = await response.json();

        console.log("Asset uploaded:", result);

        if (result.asset_id) {
          const assetMessage = `[asset]${result.asset_id}|${file.name}`;

          injectMessage({
            role: "user",
            content: assetMessage,
            optimistic: true
          });

          sendUserMessage(assetMessage);
        }
      }

      window.dispatchEvent(new Event("assets.updated"));
      e.target.value = "";
    } catch (err) {
      console.error("Upload failed", err);
    }
  };

  // 🔥 FIXED: only refocus when disabled → enabled
  useEffect(() => {
    if (isWizardOpen) return;

    if (!inputDisabled) {
      inputRef.current?.focus();
    }
  }, [inputDisabled, isWizardOpen]);

  return (
    <div
      className="flex gap-2 p-3 items-center"
      style={{
        borderTop: "1px solid var(--panel-border)",
        background: "var(--nav-bg)"
      }}
    >
      {/* Upload Button */}
      <button
        type="button"
        onClick={triggerUpload}
        disabled={inputDisabled}
        className="rounded-lg px-3 py-2 text-sm disabled:opacity-50"
        style={{
          border: "1px solid var(--panel-border)",
          background: "var(--workspace-bg)",
          color: "var(--workspace-text)"
        }}
        onMouseEnter={(e)=>e.currentTarget.style.background="var(--accent-orange)"}
        onMouseLeave={(e)=>e.currentTarget.style.background="var(--workspace-bg)"}
      >
        +
      </button>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={handleFileSelected}
      />

      {/* Chat Input */}
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        disabled={inputDisabled}
        className="flex-1 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 disabled:opacity-50"
        style={{
          border: "1px solid var(--panel-border)",
          background: "var(--workspace-bg)",
          color: "var(--workspace-text)"
        }}
        placeholder={
          inputDisabled ? "Thinking..." : "Type your message…"
        }
      />

      {/* Send Button */}
      <button
        type="button"
        onClick={submit}
        disabled={inputDisabled}
        className="rounded-lg px-4 py-2 text-sm disabled:opacity-50"
        style={{
          background: "var(--accent-orange)",
          color: "#ffffff"
        }}
        onMouseEnter={(e)=>e.currentTarget.style.background="var(--accent-orange-hover)"}
        onMouseLeave={(e)=>e.currentTarget.style.background="var(--accent-orange)"}
      >
        Send
      </button>
    </div>
  );
};