"use client";

import { PanelLeft, Plus, MessageSquare } from "lucide-react";

interface Thread {
  id: string;
  title: string;
  updated_at: string;
  message_count: number;
}

interface Props {
  open: boolean;
  onToggle: () => void;
  threads: Thread[];
  activeThreadId: string | null;
  loadingThreads: boolean;
  onSelectThread: (threadId: string) => void;
  onNewChat: () => void;
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
}: Props) {
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
                  return (
                    <button
                      key={t.id}
                      onClick={() => onSelectThread(t.id)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "none",
                        background: isActive ? "#f5f1eb" : "transparent",
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: "var(--font-dm-sans), sans-serif",
                        marginBottom: 2,
                      }}
                    >
                      <MessageSquare
                        size={12}
                        style={{ color: "#a8a29e", marginTop: 2, flexShrink: 0 }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: isActive ? 600 : 400,
                            color: isActive ? "#1c1917" : "#44403c",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: 160,
                          }}
                        >
                          {t.title.length > 36 ? t.title.slice(0, 36) + "…" : t.title}
                        </div>
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
