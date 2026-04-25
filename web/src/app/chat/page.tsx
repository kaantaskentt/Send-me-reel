"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface Analysis {
  id: string;
  platform: string;
  verdict: string | null;
  created_at: string;
  source_url: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ParsedAction {
  type: "add_task" | "save_notion";
  payload?: string;
  raw: string;
}

function parseAction(content: string): { text: string; action: ParsedAction | null } {
  const match = content.match(/\[ACTION:(add_task|save_notion)(?::([^\]]*))?\]/);
  if (!match) return { text: content, action: null };
  return {
    text: content.replace(match[0], "").trim(),
    action: { type: match[1] as ParsedAction["type"], payload: match[2], raw: match[0] },
  };
}

const PLATFORM_ICONS: Record<string, { color: string; label: string }> = {
  instagram: { color: "#ee2a7b", label: "Instagram" },
  tiktok: { color: "#010101", label: "TikTok" },
  x: { color: "#555", label: "X" },
  youtube: { color: "#dc2626", label: "YouTube" },
  linkedin: { color: "#0077b5", label: "LinkedIn" },
  article: { color: "#3b82f6", label: "Article" },
};

function parseTitle(verdict: string | null): string {
  if (!verdict) return "Untitled analysis";
  const match = verdict.match(/🔷\s*(.+)/);
  if (!match) return verdict.slice(0, 50);
  return match[1].split("—")[0]?.trim() || verdict.slice(0, 50);
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const SUGGESTED_PROMPTS = [
  "What's the main point?",
  "What's the smallest thing I could try?",
  "Give me a prompt I can paste into Claude Code.",
  "What would I miss if I just skimmed this?",
];

export default function ChatPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#faf8f5" }} />}>
      <ChatContent />
    </Suspense>
  );
}

function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedId = searchParams.get("analysis");

  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(preselectedId);
  const [chatHistory, setChatHistory] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [loadingAnalyses, setLoadingAnalyses] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Current conversation (derived from map)
  const messages = selectedId ? (chatHistory[selectedId] || []) : [];
  const setMessages = (msgs: Message[]) => {
    if (!selectedId) return;
    setChatHistory((prev) => ({ ...prev, [selectedId]: msgs }));
  };

  // Fetch analyses + user on mount
  useEffect(() => {
    fetch("/api/analyses?limit=50")
      .then((r) => r.json())
      .then((data) => {
        setAnalyses(data.analyses || []);
        setLoadingAnalyses(false);
      })
      .catch(() => setLoadingAnalyses(false));

    fetch("/api/user")
      .then((r) => r.json())
      .then((data) => setIsPremium(!!data.user?.premium))
      .catch(() => setIsPremium(false));
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Switch analysis — preserves existing chat
  const handleSelectAnalysis = (id: string) => {
    setSelectedId(id);
    setSelectorOpen(false);
  };

  const clearChat = () => {
    if (!selectedId) return;
    setChatHistory((prev) => { const next = { ...prev }; delete next[selectedId]; return next; });
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !selectedId || isLoading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text.trim() };
    const currentMsgs = chatHistory[selectedId] || [];
    const newMessages = [...currentMsgs, userMsg];
    setChatHistory((prev) => ({ ...prev, [selectedId]: newMessages }));
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(`/api/analyses/${selectedId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setChatHistory((prev) => ({ ...prev, [selectedId]: [...newMessages, {
          id: crypto.randomUUID(), role: "assistant" as const,
          content: err.error === "Premium required"
            ? "This feature requires Premium. Upgrade at /pricing to chat with your analyses."
            : "Something went wrong. Try again.",
        }] }));
        return;
      }

      const data = await res.json();
      setChatHistory((prev) => ({ ...prev, [selectedId]: [...newMessages, {
        id: crypto.randomUUID(), role: "assistant" as const, content: data.message,
      }] }));
    } catch {
      setChatHistory((prev) => ({ ...prev, [selectedId]: [...newMessages, {
        id: crypto.randomUUID(), role: "assistant" as const, content: "Network error. Please try again.",
      }] }));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [selectedId, chatHistory, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const selectedAnalysis = analyses.find((a) => a.id === selectedId);
  const hasMessages = messages.length > 0;

  // Locked state for free users
  if (isPremium === false) {
    return (
      <div style={{ minHeight: "100vh", background: "#faf8f5", fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column" }}>
        <ChatHeader onBack={() => router.push("/dashboard")} />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 400, textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #f97316, #fb923c)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1c1917", margin: "0 0 8px 0" }}>Chat with your analyses</h2>
            <p style={{ fontSize: 14, color: "#78716c", lineHeight: 1.6, margin: "0 0 24px 0" }}>
              Ask follow-up questions, get advice tailored to your goals, and go deeper into any content you've analyzed.
            </p>
            <a href="/pricing" style={{
              display: "inline-block", padding: "13px 32px", background: "#f97316", color: "#fff",
              fontWeight: 700, fontSize: 15, borderRadius: 100, textDecoration: "none",
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Upgrade to Premium
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100dvh", background: "#faf8f5", fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <ChatHeader onBack={() => router.push("/dashboard")} />

      {/* Analysis Selector */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #e7e2d9", background: "#fff", flexShrink: 0 }}>
        <button
          onClick={() => setSelectorOpen(!selectorOpen)}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10,
            padding: "10px 14px", background: "#faf8f5", border: "1px solid #e7e2d9",
            borderRadius: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            textAlign: "left",
          }}
        >
          {selectedAnalysis ? (
            <>
              <span style={{
                width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                background: PLATFORM_ICONS[selectedAnalysis.platform]?.color || "#a8a29e",
              }} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#1c1917", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {parseTitle(selectedAnalysis.verdict)}
              </span>
              {hasMessages && (
                <button
                  onClick={(e) => { e.stopPropagation(); clearChat(); }}
                  title="Clear chat"
                  style={{ padding: "2px 6px", background: "none", border: "1px solid #e7e2d9", borderRadius: 6, cursor: "pointer", color: "#c4bdb5", fontSize: 11, fontFamily: "'DM Sans', sans-serif", flexShrink: 0, transition: "all 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#ef4444"; e.currentTarget.style.color = "#ef4444"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e7e2d9"; e.currentTarget.style.color = "#c4bdb5"; }}
                >
                  Clear
                </button>
              )}
              {!hasMessages && <span style={{ fontSize: 11, color: "#a8a29e", flexShrink: 0 }}>{timeAgo(selectedAnalysis.created_at)}</span>}
            </>
          ) : (
            <span style={{ flex: 1, fontSize: 13, color: "#a8a29e" }}>
              {loadingAnalyses ? "Loading..." : "Select an analysis to chat about..."}
            </span>
          )}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: selectorOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <AnimatePresence>
          {selectorOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: "hidden" }}
            >
              <div style={{ maxHeight: 240, overflowY: "auto", marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                {analyses.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => handleSelectAnalysis(a.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px", background: a.id === selectedId ? "#fff7ed" : "transparent",
                      border: a.id === selectedId ? "1px solid #fed7aa" : "1px solid transparent",
                      borderRadius: 10, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                      textAlign: "left", width: "100%", transition: "background 0.1s",
                    }}
                  >
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                      background: PLATFORM_ICONS[a.platform]?.color || "#a8a29e",
                    }} />
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: "#1c1917", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {parseTitle(a.verdict)}
                    </span>
                    {chatHistory[a.id]?.length ? (
                      <span style={{ fontSize: 9, fontWeight: 700, color: "#f97316", background: "#fff7ed", border: "1px solid #fed7aa", padding: "1px 6px", borderRadius: 20, flexShrink: 0 }}>
                        {chatHistory[a.id].length}
                      </span>
                    ) : (
                      <span style={{ fontSize: 10, color: "#c4bdb5", flexShrink: 0 }}>{timeAgo(a.created_at)}</span>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Messages Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px" }}>
        {!selectedId ? (
          /* Empty state */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: "0 16px" }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: "linear-gradient(135deg, #f97316, #fb923c)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1c1917", margin: "0 0 6px 0" }}>Chat with your content</h3>
            <p style={{ fontSize: 13, color: "#a8a29e", lineHeight: 1.5, margin: "0 0 24px 0", maxWidth: 280 }}>
              Select an analysis above to start a conversation. Ask questions, get advice tailored to your goals.
            </p>

            {/* Quick-select recent analyses */}
            {analyses.slice(0, 3).map((a) => (
              <button
                key={a.id}
                onClick={() => handleSelectAnalysis(a.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%", maxWidth: 340,
                  padding: "12px 14px", background: "#fff", border: "1px solid #e7e2d9",
                  borderRadius: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  textAlign: "left", marginBottom: 8, transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#f97316"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e7e2d9"; }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                  background: PLATFORM_ICONS[a.platform]?.color || "#a8a29e",
                }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#1c1917", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {parseTitle(a.verdict)}
                </span>
                <span style={{ fontSize: 11, color: "#c4bdb5" }}>{timeAgo(a.created_at)}</span>
              </button>
            ))}
          </div>
        ) : !hasMessages ? (
          /* Selected but no messages — show suggested prompts */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: "0 16px" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fff7ed", border: "1px solid #fed7aa", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#1c1917", margin: "0 0 4px 0" }}>
              {parseTitle(selectedAnalysis?.verdict || null)}
            </p>
            <p style={{ fontSize: 12, color: "#a8a29e", margin: "0 0 24px 0" }}>
              Ask anything about this.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 380 }}>
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  style={{
                    padding: "8px 14px", background: "#fff", border: "1px solid #e7e2d9",
                    borderRadius: 100, fontSize: 12, fontWeight: 500, color: "#78716c",
                    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#f97316"; e.currentTarget.style.color = "#f97316"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e7e2d9"; e.currentTarget.style.color = "#78716c"; }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Message list */
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {messages.map((msg) => {
              const parsed = msg.role === "assistant" ? parseAction(msg.content) : null;
              const displayText = parsed ? parsed.text : msg.content;

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    display: "flex",
                    justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  {msg.role === "assistant" && (
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, background: "#f97316",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, marginRight: 10, marginTop: 2,
                    }}>
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                        <path d="M2.5 7L6 10.5L11.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                  <div style={{ maxWidth: msg.role === "user" ? "75%" : "calc(100% - 38px)" }}>
                    <div style={{
                      padding: "12px 16px",
                      borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      background: msg.role === "user" ? "#f97316" : "#fff",
                      color: msg.role === "user" ? "#fff" : "#44403c",
                      border: msg.role === "assistant" ? "1px solid #e7e2d9" : "none",
                      fontSize: 14,
                      lineHeight: 1.65,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}>
                      {displayText}
                    </div>
                    {parsed?.action && selectedId && (
                      <ActionButton action={parsed.action} analysisId={selectedId} />
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* Typing indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ display: "flex", alignItems: "center", gap: 10 }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 8, background: "#f97316",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7L6 10.5L11.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div style={{ padding: "12px 16px", background: "#fff", border: "1px solid #e7e2d9", borderRadius: "16px 16px 16px 4px" }}>
                  <motion.div
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    style={{ display: "flex", gap: 4 }}
                  >
                    {[0, 1, 2].map((i) => (
                      <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#c4bdb5" }} />
                    ))}
                  </motion.div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      {selectedId && (
        <div style={{
          padding: "12px 16px", paddingBottom: "max(12px, env(safe-area-inset-bottom))",
          borderTop: "1px solid #e7e2d9", background: "#fff", flexShrink: 0,
        }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about this."
              disabled={isLoading}
              style={{
                flex: 1, padding: "12px 16px", fontSize: 14, border: "1px solid #e7e2d9",
                borderRadius: 12, outline: "none", color: "#1c1917",
                fontFamily: "'DM Sans', sans-serif", background: "#faf8f5",
              }}
              onFocus={(e) => { e.target.style.borderColor = "#f97316"; e.target.style.boxShadow = "0 0 0 3px rgba(249,115,22,0.1)"; }}
              onBlur={(e) => { e.target.style.borderColor = "#e7e2d9"; e.target.style.boxShadow = "none"; }}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              style={{
                padding: "12px 18px", background: isLoading || !input.trim() ? "#d6d3d1" : "#f97316",
                color: "#fff", fontWeight: 700, fontSize: 14, borderRadius: 12,
                border: "none", cursor: isLoading ? "wait" : "pointer",
                fontFamily: "'DM Sans', sans-serif", flexShrink: 0,
                transition: "background 0.15s",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function ActionButton({ action, analysisId }: { action: ParsedAction; analysisId: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const execute = async () => {
    setStatus("loading");
    try {
      if (action.type === "add_task" && action.payload) {
        const res = await fetch(`/api/analyses/${analysisId}/todos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: action.payload }),
        });
        if (!res.ok) throw new Error();
      } else if (action.type === "save_notion") {
        const res = await fetch("/api/notion/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ analysisId }),
        });
        if (!res.ok) throw new Error();
      }
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  const labels: Record<string, { idle: string; loading: string; done: string; error: string; icon: string }> = {
    add_task: { idle: `Add task: "${action.payload}"`, loading: "Adding...", done: "Added to tasks", error: "Failed — try again", icon: "+" },
    save_notion: { idle: "Save to Notion", loading: "Saving...", done: "Saved to Notion", error: "Failed — try again", icon: "N" },
  };

  const label = labels[action.type] || labels.add_task;
  const isDone = status === "done";
  const isError = status === "error";

  return (
    <motion.button
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={status === "done" ? undefined : execute}
      disabled={status === "loading" || status === "done"}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        marginTop: 8, padding: "10px 16px",
        background: isDone ? "#f0fdf4" : isError ? "#fef2f2" : "#fff7ed",
        border: `1px solid ${isDone ? "#bbf7d0" : isError ? "#fecaca" : "#fed7aa"}`,
        borderRadius: 10, cursor: isDone ? "default" : "pointer",
        fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
        color: isDone ? "#16a34a" : isError ? "#dc2626" : "#f97316",
        transition: "all 0.15s", width: "100%",
      }}
    >
      {isDone ? "✓" : label.icon} {label[status]}
    </motion.button>
  );
}

function ChatHeader({ onBack }: { onBack: () => void }) {
  return (
    <header style={{
      display: "flex", alignItems: "center", gap: 12, padding: "0 16px", height: 56,
      borderBottom: "1px solid #e7e2d9", background: "rgba(250,248,245,0.88)",
      backdropFilter: "blur(16px)", flexShrink: 0,
    }}>
      <button onClick={onBack} style={{
        padding: 8, background: "none", border: "1px solid #e7e2d9",
        borderRadius: 10, cursor: "pointer", color: "#78716c",
        display: "flex", alignItems: "center",
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "#f97316", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2.5 7L6 10.5L11.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", color: "#1c1917" }}>
          Context<span style={{ color: "#f97316" }}>Drop</span>
        </span>
      </a>
      <span style={{ fontSize: 13, color: "#c4bdb5" }}>/</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: "#78716c" }}>Chat</span>
    </header>
  );
}
