import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
} from "react";
import { useChatContext } from "../../context/ChatContext";

export const ChatComposer: React.FC = () => {
  const { sendUserMessage } = useChatContext();
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const shouldRestoreFocusRef = useRef(false);

  const MAX_HEIGHT = 96; // ~3 lines

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, MAX_HEIGHT) + "px";
  }, [text]);

  useLayoutEffect(() => {
    if (!shouldRestoreFocusRef.current) return;
    if (text !== "") return;

    shouldRestoreFocusRef.current = false;

    const focusTextarea = () => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      const end = el.value.length;
      el.setSelectionRange(end, end);
    };

    focusTextarea();

    const rafId = window.requestAnimationFrame(() => {
      focusTextarea();
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [text]);

  const handleSend = () => {
    if (!text.trim()) return;

    shouldRestoreFocusRef.current = true;
    sendUserMessage(text);
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2 bg-white px-2 py-2 border-t border-gray-200">
      <button className="h-11 w-11 flex items-center justify-center rounded-full border border-gray-300 text-xl">
        +
      </button>

      <textarea
        ref={textareaRef}
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message MAX..."
        className="flex-1 resize-none px-4 py-2 rounded-2xl border border-gray-300 focus:outline-none"
      />

      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleSend}
        className="h-11 px-5 rounded-full bg-blue-600 text-white"
      >
        Send
      </button>
    </div>
  );
};