"use client";

import { useState } from "react";
import { PanelLeft, Plus, MessageSquare, Pencil } from "lucide-react";

interface Thread {
  id: string;
  title: string;
  updated_at: string;
  message_count: number;
  analysis_id: string;
  analysis_platform?: string;
  analysis_title?: string;
}

interface Props {
  open: boolean;
  onToggle: () => void;
  threads: Thread[];
  activeThreadId: string | null;
  loadingThreads: boolean;
  onSelectThread: (threadId: string, analysisId: string) => void;
  onNewChat: () => void;
  onRenameThread: (threadId: string, newTitle: string) => Promise<void>;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ChatSidebar({
  open,
  onToggle,
  threads,
  activeThreadId,
  loadingThreads,
  onSelectThread,
  onNewChat,
  onRenameThread,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  async function commitRename(threadId: string) {
    const trimmed = editValue.trim();
    if (trimmed) {
      await onRenameThread(threadId, trimmed);
    }
    setEditingId(null);
  }

  return (
    <>
      {/* Toggle button — always visible */}
      <button
        onClick={onToggle}
        title={open ? "Close sidebar" : "Open sidebar"}
        style={{
          position: "fixed",
          top: 16,
          left: open ? 252 : 12,
          zIndex: 50,
          width: 32,
          height: 32,
          borderRadius: 8,
          border: "1px solid #e7e2d9",
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#78716c",
          transition: "left 0.2s ease",
          flexShrink: 0,
        }}
      >
        <PanelLeft size={14} />
      </button>

      {/* Sidebar panel */}
      <div
        style={{
          width: open ? 240 : 0,
          overflow: "hidden",
          flexShrink: 0,
          transition: "width 0.2s ease",
          borderRight: open ? "1px solid #e7e2d9" : "none",
          background: "#faf8f5",
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          position: "sticky",
          top: 0,
        }}
      >
        {open && (
          <>
            {/* Header */}
            <div
              style={{
                padding: "16px 14px 12px 14px",
                marginTop: 48,
                borderBottom: "1px solid #e7e2d9",
              }}
            >
              <button
                onClick={onNewChat}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid #e7e2d9",
                  background: "#ffffff",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#44403c",
                  cursor: "pointer",
                  fontFamily: "var(--font-dm-sans), sans-serif",
                }}
              >
                <Plus size={13} />
                New chat
              </button>
            </div>

            {/* Thread list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
              {loadingThreads ? (
                <div
                  style={{
                    padding: "12px 6px",
                    fontSize: 11,
                    color: "#a8a29e",
                    textAlign: "center",
                  }}
                >
                  Loading…
                </div>
              ) : threads.length === 0 ? (
                <div
                  style={{
                    padding: "12px 6px",
                    fontSize: 11,
                    color: "#a8a29e",
                    textAlign: "center",
                  }}
                >
                  No past conversations
                </div>
              ) : (
                threads.map((t) => {
                  const isActive = t.id === activeThreadId;
                  const isEditing = editingId === t.id;
                  const isHovered = hoveredId === t.id;

                  return (
                    <div
                      key={t.id}
                      onMouseEnter={() => setHoveredId(t.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        borderRadius: 8,
                        background: isActive ? "#f5f1eb" : "transparent",
                        marginBottom: 2,
                        padding: "2px 2px 2px 0",
                      }}
                    >
                      <button
                        onClick={() => !isEditing && onSelectThread(t.id, t.analysis_id)}
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          padding: "6px 8px",
                          border: "none",
                          background: "transparent",
                          cursor: isEditing ? "default" : "pointer",
                          textAlign: "left",
                          fontFamily: "var(--font-dm-sans), sans-serif",
                          minWidth: 0,
                        }}
                      >
                        <MessageSquare
                          size={12}
                          style={{ color: "#a8a29e", marginTop: 2, flexShrink: 0 }}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          {isEditing ? (
                            <input
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") { e.preventDefault(); commitRename(t.id); }
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              onBlur={() => commitRename(t.id)}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                width: "100%",
                                border: "none",
                                outline: "1px solid #fed7aa",
                                borderRadius: 4,
                                background: "#fff",
                                fontSize: 12,
                                fontWeight: 600,
                                color: "#1c1917",
                                fontFamily: "var(--font-dm-sans), sans-serif",
                                padding: "1px 4px",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: isActive ? 600 : 400,
                                color: isActive ? "#1c1917" : "#44403c",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                maxWidth: 140,
                              }}
                            >
                              {t.title.length > 36 ? t.title.slice(0, 36) + "…" : t.title}
                            </div>
                          )}
                          {t.analysis_title && (
                            <div style={{
                              fontSize: 10,
                              color: "#c4bdb5",
                              marginTop: 1,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: 140,
                            }}>
                              {t.analysis_title.slice(0, 30)}{t.analysis_title.length > 30 ? "…" : ""}
                            </div>
                          )}
                          <div
                            style={{
                              fontSize: 10,
                              color: "#a8a29e",
                              marginTop: 1,
                            }}
                          >
                            {timeAgo(t.updated_at)}
                            {t.message_count > 0 && ` · ${t.message_count} msg`}
                          </div>
                        </div>
                      </button>

                      {/* Pencil rename button */}
                      {!isEditing && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(t.id);
                            setEditValue(t.title);
                          }}
                          title="Rename"
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            border: "none",
                            background: "none",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            color: "#a8a29e",
                            flexShrink: 0,
                            opacity: isHovered || isActive ? 1 : 0,
                            transition: "opacity 0.1s",
                            marginRight: 4,
                          }}
                        >
                          <Pencil size={11} />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
