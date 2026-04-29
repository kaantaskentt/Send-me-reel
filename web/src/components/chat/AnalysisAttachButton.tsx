"use client";

import { useRef, useEffect, useState } from "react";
import { Paperclip } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Analysis {
  id: string;
  platform: string;
  verdict: string | null;
  created_at: string;
}

interface Props {
  analyses: Analysis[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  platformIcons: Record<string, { color: string; label: string }>;
  parseTitle: (verdict: string | null) => string;
  chatHistory: Record<string, unknown[]>;
  loadingAnalyses: boolean;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AnalysisAttachButton({
  analyses,
  selectedId,
  onSelect,
  platformIcons,
  parseTitle,
  chatHistory,
  loadingAnalyses,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  const isSelected = !!selectedId;

  return (
    <div ref={wrapperRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Attach a reel"
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          border: `1px solid ${isSelected ? "#fed7aa" : "#e7e2d9"}`,
          background: isSelected ? "#fff7ed" : "#faf8f5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: isSelected ? "#f97316" : "#a8a29e",
          transition: "color 0.15s, background 0.15s, border-color 0.15s",
          flexShrink: 0,
        }}
      >
        <Paperclip size={14} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              bottom: "calc(100% + 8px)",
              left: 0,
              background: "#fff",
              border: "1px solid #e7e2d9",
              borderRadius: 12,
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              overflow: "hidden",
              maxHeight: 280,
              overflowY: "auto",
              zIndex: 40,
              minWidth: 280,
              maxWidth: 320,
            }}
          >
            {loadingAnalyses ? (
              <div style={{ padding: "12px 16px", fontSize: 12, color: "#a8a29e" }}>
                Loading…
              </div>
            ) : analyses.length === 0 ? (
              <div style={{ padding: "12px 16px", fontSize: 12, color: "#a8a29e" }}>
                No analyses yet
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: 8 }}>
                {analyses.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => { onSelect(a.id); setOpen(false); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      background: a.id === selectedId ? "#fff7ed" : "transparent",
                      border: a.id === selectedId ? "1px solid #fed7aa" : "1px solid transparent",
                      borderRadius: 10,
                      cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                      textAlign: "left",
                      width: "100%",
                      transition: "background 0.1s",
                    }}
                  >
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: platformIcons[a.platform]?.color || "#a8a29e",
                    }} />
                    <span style={{
                      flex: 1,
                      fontSize: 12,
                      fontWeight: 500,
                      color: "#1c1917",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {parseTitle(a.verdict)}
                    </span>
                    {(chatHistory[a.id]?.length ?? 0) > 0 ? (
                      <span style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: "#f97316",
                        background: "#fff7ed",
                        border: "1px solid #fed7aa",
                        padding: "1px 6px",
                        borderRadius: 20,
                        flexShrink: 0,
                      }}>
                        {chatHistory[a.id].length}
                      </span>
                    ) : (
                      <span style={{ fontSize: 10, color: "#c4bdb5", flexShrink: 0 }}>
                        {timeAgo(a.created_at)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
