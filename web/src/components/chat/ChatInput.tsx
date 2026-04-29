"use client";

import { useRef, useEffect, type KeyboardEvent, type RefObject } from "react";
import { Square, ArrowUp } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  isStreaming: boolean;
  isLocked: boolean;
  abortRef: RefObject<AbortController | null>;
  placeholder?: string;
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  isStreaming,
  isLocked,
  abortRef,
  placeholder = "Ask anything about this...",
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea up to ~6 rows.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 144) + "px";
  }, [value]);

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && !isLocked && value.trim()) onSend();
    }
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  const canSend = !isStreaming && !isLocked && value.trim().length > 0;

  return (
    <div
      style={{
        background: "#faf8f5",
        border: "1px solid #e7e2d9",
        borderRadius: 14,
        padding: "12px 14px",
        display: "flex",
        alignItems: "flex-end",
        gap: 10,
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder={isLocked ? "Daily limit reached — resets tomorrow" : placeholder}
        disabled={isLocked}
        rows={1}
        style={{
          flex: 1,
          resize: "none",
          border: "none",
          outline: "none",
          background: "transparent",
          fontSize: 13,
          color: "#1c1917",
          lineHeight: 1.65,
          fontFamily: "var(--font-dm-sans), sans-serif",
          overflowY: "hidden",
          minHeight: 22,
          maxHeight: 144,
        }}
      />

      {isStreaming ? (
        <button
          onClick={handleStop}
          title="Stop generating"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: "1px solid #e7e2d9",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            color: "#44403c",
          }}
        >
          <Square size={13} />
        </button>
      ) : (
        <button
          onClick={onSend}
          disabled={!canSend}
          title="Send"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: "none",
            background: canSend ? "#f97316" : "#e7e2d9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: canSend ? "pointer" : "not-allowed",
            flexShrink: 0,
            color: canSend ? "#ffffff" : "#a8a29e",
            transition: "background 0.15s",
          }}
        >
          <ArrowUp size={14} />
        </button>
      )}
    </div>
  );
}
