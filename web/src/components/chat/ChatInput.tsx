"use client";

import { useRef, useEffect, type KeyboardEvent, type RefObject } from "react";
import { Square, ArrowUp } from "lucide-react";
import AnalysisAttachButton from "./AnalysisAttachButton";

interface Analysis {
  id: string;
  platform: string;
  verdict: string | null;
  created_at: string;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  isStreaming: boolean;
  isLocked: boolean;
  abortRef: RefObject<AbortController | null>;
  placeholder?: string;
  analyses: Analysis[];
  selectedId: string | null;
  onSelectAnalysis: (id: string | null) => void;
  platformIcons: Record<string, { color: string; label: string }>;
  parseTitle: (verdict: string | null) => string;
  chatHistory: Record<string, unknown[]>;
  loadingAnalyses: boolean;
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  isStreaming,
  isLocked,
  abortRef,
  placeholder = "Ask anything about this...",
  analyses,
  selectedId,
  onSelectAnalysis,
  platformIcons,
  parseTitle,
  chatHistory,
  loadingAnalyses,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
  const selectedAnalysis = analyses.find((a) => a.id === selectedId);

  return (
    <div
      style={{
        background: "#faf8f5",
        border: "1px solid #e7e2d9",
        borderRadius: 14,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Attached reel pill */}
      {selectedId && selectedAnalysis && (
        <div style={{
          display: "flex",
          alignItems: "center",
          paddingBottom: 8,
          borderBottom: "1px solid #f0ebe4",
          marginBottom: 8,
        }}>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            background: "#f5f1eb",
            border: "1px solid #e7e2d9",
            borderRadius: 100,
            padding: "3px 8px 3px 6px",
            fontSize: 12,
            fontWeight: 500,
            color: "#57534e",
            maxWidth: 260,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            <span style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              flexShrink: 0,
              background: platformIcons[selectedAnalysis.platform]?.color || "#a8a29e",
            }} />
            <span style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 200,
            }}>
              {parseTitle(selectedAnalysis.verdict).slice(0, 40)}
              {parseTitle(selectedAnalysis.verdict).length > 40 ? "…" : ""}
            </span>
            <button
              onClick={() => onSelectAnalysis(null)}
              title="Remove"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#a8a29e",
                fontSize: 13,
                lineHeight: 1,
                padding: "0 0 0 2px",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
              }}
            >
              ✕
            </button>
          </span>
        </div>
      )}

      {/* Textarea row */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
        <AnalysisAttachButton
          analyses={analyses}
          selectedId={selectedId}
          onSelect={onSelectAnalysis}
          platformIcons={platformIcons}
          parseTitle={parseTitle}
          chatHistory={chatHistory}
          loadingAnalyses={loadingAnalyses}
        />

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
    </div>
  );
}
