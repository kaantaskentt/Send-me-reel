"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ChatMessage from "@/components/chat/ChatMessage";
import ChatInput from "@/components/chat/ChatInput";
import ChatSidebar from "@/components/chat/ChatSidebar";

interface Analysis {
  id: string;
  platform: string;
  verdict: string | null;
  created_at: string;
  source_url: string;
}

interface Thread {
  id: string;
  title: string;
  updated_at: string;
  message_count: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Apr 26 — tool-use lifecycle for streamed assistant messages.
   *  "searching" = web_search in progress; "done" = search completed (we keep
   *  the badge visible briefly after for context). undefined for non-streaming
   *  messages. */
  toolState?: "searching" | "done";
  /** True while tokens are still arriving for this message. */
  streaming?: boolean;
  /** True if the user aborted the stream mid-flight. Message is client-only — not saved to DB. */
  stopped?: boolean;
}

interface ParsedAction {
  type: "add_task" | "save_notion";
  payload?: string;
  raw: string;
}

interface ChatUsage {
  limit: number | null;
  remaining: number | null;
  resetAt: string | null;
  locked: boolean;
}

function formatResetIn(resetAt: string | null): string {
  if (!resetAt) return "";
  const ms = Date.parse(resetAt) - Date.now();
  if (ms <= 0) return "soon";
  const hours = Math.ceil(ms / (60 * 60 * 1000));
  if (hours <= 1) return "1 hour";
  if (hours < 24) return `${hours} hours`;
  return "tomorrow";
}

function parseAction(content: string): { text: string; action: ParsedAction | null } {
  const match = content.match(/\[ACTION:(add_task|save_notion)(?::([^\]]*))?\]/);
  if (!match) return { text: content, action: null };
  return {
    text: content.replace(match[0], "").trim(),
    action: { type: match[1] as ParsedAction["type"], payload: match[2], raw: match[0] },
  };
}

// Apr 26 — SSE event parsing for the streamed chat endpoint.
type SseEvent = { event: string; data: unknown };
function parseSseBlock(block: string): SseEvent | null {
  const lines = block.split("\n");
  let event = "message";
  let dataRaw = "";
  for (const line of lines) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataRaw += line.slice(5).trim();
  }
  if (!dataRaw) return null;
  try {
    return { event, data: JSON.parse(dataRaw) };
  } catch {
    return null;
  }
}
function handleSseEvent(
  ev: SseEvent,
  ctx: {
    appendAssistantText: (delta: string) => void;
    patchAssistant: (patch: Partial<Message>) => void;
    onThreadId?: (threadId: string) => void;
  },
) {
  switch (ev.event) {
    case "text_delta": {
      const delta = (ev.data as { delta?: string })?.delta;
      if (typeof delta === "string") ctx.appendAssistantText(delta);
      return;
    }
    case "tool_start":
    case "tool_searching":
      ctx.patchAssistant({ toolState: "searching" });
      return;
    case "tool_done":
      ctx.patchAssistant({ toolState: "done" });
      return;
    case "done": {
      const threadId = (ev.data as { thread_id?: string })?.thread_id;
      if (threadId && ctx.onThreadId) ctx.onThreadId(threadId);
      ctx.patchAssistant({ streaming: false });
      return;
    }
    case "error": {
      const msg = (ev.data as { message?: string })?.message ?? "Something broke.";
      ctx.patchAssistant({ content: msg, streaming: false, toolState: undefined });
      return;
    }
  }
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
  // Map of analysisId → server-assigned threadId. Captured from the `done` SSE
  // event after the first message so subsequent turns in the same session
  // append to the same chat_threads row.
  const [threadIds, setThreadIds] = useState<Record<string, string>>({});
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [chatUsage, setChatUsage] = useState<ChatUsage | null>(null);
  const [loadingAnalyses, setLoadingAnalyses] = useState(true);
  const [firstName, setFirstName] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Current conversation (derived from map)
  const messages = selectedId ? (chatHistory[selectedId] || []) : [];
  const setMessages = (msgs: Message[]) => {
    if (!selectedId) return;
    setChatHistory((prev) => ({ ...prev, [selectedId]: msgs }));
  };
  void setMessages; // referenced by clearChat below

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
      .then((data) => {
        setIsPremium(!!data.user?.premium);
        setChatUsage(data.chat_usage ?? null);
        setFirstName(data.user?.first_name ?? "");
      })
      .catch(() => setIsPremium(false));
  }, []);

  // Load thread list when analysis changes
  const loadThreadsForAnalysis = useCallback(async (analysisId: string) => {
    setLoadingThreads(true);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/chat/threads`);
      if (res.ok) {
        const data = await res.json();
        setThreads(data.threads ?? []);
      }
    } finally {
      setLoadingThreads(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) loadThreadsForAnalysis(selectedId);
    else setThreads([]);
  }, [selectedId, loadThreadsForAnalysis]);

  // Load a past thread's messages into the chat history
  const loadThread = useCallback(async (threadId: string) => {
    if (!selectedId) return;
    const res = await fetch(`/api/chat/threads/${threadId}`);
    if (!res.ok) return;
    const data = await res.json();
    const loaded: Message[] = (data.messages ?? []).map((m: { role: string; content: string }) => ({
      id: crypto.randomUUID(),
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    setChatHistory((prev) => ({ ...prev, [selectedId]: loaded }));
    setThreadIds((prev) => ({ ...prev, [selectedId]: threadId }));
  }, [selectedId]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Switch analysis — preserves existing chat
  const handleSelectAnalysis = (id: string) => {
    setSelectedId(id);
  };

  const renameThread = async (threadId: string, newTitle: string) => {
    if (!selectedId) return;
    await fetch(`/api/analyses/${selectedId}/chat/threads/${threadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });
    setThreads((prev) => prev.map((t) => t.id === threadId ? { ...t, title: newTitle } : t));
  };

  const clearChat = () => {
    if (!selectedId) return;
    setChatHistory((prev) => { const next = { ...prev }; delete next[selectedId]; return next; });
    // Drop the thread association so the next message starts a fresh
    // chat_threads row instead of appending to the cleared session.
    setThreadIds((prev) => { const next = { ...prev }; delete next[selectedId]; return next; });
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !selectedId || isLoading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text.trim() };
    const assistantId = crypto.randomUUID();
    const currentMsgs = chatHistory[selectedId] || [];
    const newMessages: Message[] = [
      ...currentMsgs,
      userMsg,
      { id: assistantId, role: "assistant", content: "", streaming: true },
    ];
    setChatHistory((prev) => ({ ...prev, [selectedId]: newMessages }));
    setInput("");
    setIsLoading(true);

    // Helpers to mutate just the streaming assistant message
    const patchAssistant = (patch: Partial<Message>) => {
      setChatHistory((prev) => {
        const cur = prev[selectedId] || [];
        return {
          ...prev,
          [selectedId]: cur.map((m) => (m.id === assistantId ? { ...m, ...patch } : m)),
        };
      });
    };
    const appendAssistantText = (delta: string) => {
      setChatHistory((prev) => {
        const cur = prev[selectedId] || [];
        return {
          ...prev,
          [selectedId]: cur.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + delta } : m,
          ),
        };
      });
    };

    try {
      const existingThreadId = threadIds[selectedId];
      abortRef.current = new AbortController();
      const res = await fetch(`/api/analyses/${selectedId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Send the conversation WITHOUT the empty assistant placeholder
          messages: [...currentMsgs, userMsg].map((m) => ({ role: m.role, content: m.content })),
          ...(existingThreadId ? { thread_id: existingThreadId } : {}),
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Something went wrong" }));
        if (res.status === 429 && err?.error === "daily_limit") {
          setChatUsage({
            limit: err.limit ?? null,
            remaining: 0,
            resetAt: err.resetAt ?? null,
            locked: true,
          });
          patchAssistant({
            content:
              err.message ||
              "You've used your daily chats. Reset soon, or upgrade for unlimited.",
            streaming: false,
            toolState: undefined,
          });
          return;
        }
        patchAssistant({
          content: err.error || err.message || "Something went wrong. Try again.",
          streaming: false,
          toolState: undefined,
        });
        return;
      }

      // Optimistically decrement the local counter for free users so the
      // header pill updates without waiting for a refetch. Server is the
      // source of truth — we'll re-sync on next /api/user.
      setChatUsage((prev) => {
        if (!prev || prev.remaining === null) return prev;
        const next = Math.max(0, prev.remaining - 1);
        return { ...prev, remaining: next, locked: next <= 0 };
      });

      // SSE consumer — parse `event:` / `data:` blocks separated by blank lines
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Drain complete events from the buffer
        let nl = buffer.indexOf("\n\n");
        while (nl !== -1) {
          const block = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 2);
          const ev = parseSseBlock(block);
          if (ev) handleSseEvent(ev, {
            appendAssistantText,
            patchAssistant,
            onThreadId: (tid) => setThreadIds((prev) => prev[selectedId] === tid ? prev : { ...prev, [selectedId]: tid }),
          });
          nl = buffer.indexOf("\n\n");
        }
      }
      patchAssistant({ streaming: false });
      // Refresh sidebar thread list after message completes
      loadThreadsForAnalysis(selectedId);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // User stopped the stream — mark message as stopped, do not save to DB
        patchAssistant({ streaming: false, stopped: true });
        return;
      }
      patchAssistant({
        content: "Network error. Please try again.",
        streaming: false,
        toolState: undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedId, chatHistory, isLoading, threadIds, loadThreadsForAnalysis]);

  const selectedAnalysis = analyses.find((a) => a.id === selectedId);
  const hasMessages = messages.length > 0;

  // Daily-limit-reached state for free users. Premium users (chatUsage.limit
  // === null) never hit this. Note that we still render the chat once the
  // window resets — the gate is per-day, not per-account.
  const dailyLimitReached =
    isPremium === false &&
    chatUsage !== null &&
    chatUsage.limit !== null &&
    chatUsage.locked;

  if (dailyLimitReached) {
    const resetIn = formatResetIn(chatUsage?.resetAt ?? null);
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
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1c1917", margin: "0 0 8px 0" }}>You&apos;ve used your daily chats</h2>
            <p style={{ fontSize: 14, color: "#78716c", lineHeight: 1.6, margin: "0 0 24px 0" }}>
              {resetIn ? `Resets in ${resetIn}` : "Resets soon"} — or upgrade for unlimited chat with every analysis.
            </p>
            <a href="/pricing" style={{
              display: "inline-block", padding: "13px 32px", background: "#f97316", color: "#fff",
              fontWeight: 700, fontSize: 15, borderRadius: 100, textDecoration: "none",
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Upgrade for unlimited
            </a>
          </div>
        </div>
      </div>
    );
  }

  const showUsagePill =
    isPremium === false &&
    chatUsage !== null &&
    chatUsage.limit !== null &&
    chatUsage.remaining !== null;

  const greeting = firstName ? `Hi ${firstName} —` : "Ask anything —";

  return (
    <div style={{ height: "100dvh", background: "#faf8f5", fontFamily: "'DM Sans', sans-serif", display: "flex", overflow: "hidden" }}>
      {/* Sidebar */}
      <ChatSidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        threads={threads}
        activeThreadId={selectedId ? (threadIds[selectedId] ?? null) : null}
        loadingThreads={loadingThreads}
        onSelectThread={loadThread}
        onNewChat={() => {
          clearChat();
          if (selectedId) loadThreadsForAnalysis(selectedId);
        }}
        onRenameThread={renameThread}
      />

      {/* Main panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* Header */}
        <ChatHeader
          onBack={() => router.push("/dashboard")}
          usagePill={
            showUsagePill && chatUsage
              ? { remaining: chatUsage.remaining ?? 0, limit: chatUsage.limit ?? 0 }
              : null
          }
        />

        {/* Messages Area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px" }}>
          {!selectedId ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: "0 16px" }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: "linear-gradient(135deg, #f97316, #fb923c)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1c1917", margin: "0 0 6px 0" }}>Chat with your content</h3>
              <p style={{ fontSize: 13, color: "#a8a29e", lineHeight: 1.5, margin: "0 0 24px 0", maxWidth: 280 }}>
                Attach a reel using the paperclip button below to start chatting.
              </p>
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
                  <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: PLATFORM_ICONS[a.platform]?.color || "#a8a29e" }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#1c1917", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {parseTitle(a.verdict)}
                  </span>
                  <span style={{ fontSize: 11, color: "#c4bdb5" }}>{timeAgo(a.created_at)}</span>
                </button>
              ))}
            </div>
          ) : !hasMessages ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: "0 16px" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fff7ed", border: "1px solid #fed7aa", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#1c1917", margin: "0 0 4px 0" }}>
                {greeting} what do you want to know?
              </p>
              <p style={{ fontSize: 12, color: "#a8a29e", margin: "0 0 24px 0" }}>
                {parseTitle(selectedAnalysis?.verdict || null)}
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
            <div style={{ display: "flex", flexDirection: "column", maxWidth: 720, margin: "0 auto", width: "100%" }}>
              {messages.map((msg) => {
                const parsed = msg.role === "assistant" ? parseAction(msg.content) : null;
                const displayContent = parsed ? parsed.text : msg.content;
                return (
                  <div key={msg.id}>
                    <ChatMessage message={{ ...msg, content: displayContent }} />
                    {parsed?.action && selectedId && (
                      <div style={{ display: "flex", justifyContent: "flex-start", paddingLeft: 0, marginBottom: 8 }}>
                        <ActionButton action={parsed.action} analysisId={selectedId} />
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{
          padding: "12px 16px", paddingBottom: "max(12px, env(safe-area-inset-bottom))",
          borderTop: "1px solid #e7e2d9", background: "#fff", flexShrink: 0,
          overflow: "visible",
        }}>
          <div style={{ maxWidth: 720, margin: "0 auto", overflow: "visible" }}>
            <ChatInput
              value={input}
              onChange={setInput}
              onSend={() => sendMessage(input)}
              isStreaming={isLoading}
              isLocked={dailyLimitReached}
              abortRef={abortRef}
              analyses={analyses}
              selectedId={selectedId}
              onSelectAnalysis={(id) => id === null ? setSelectedId(null) : handleSelectAnalysis(id)}
              platformIcons={PLATFORM_ICONS}
              parseTitle={parseTitle}
              chatHistory={chatHistory}
              loadingAnalyses={loadingAnalyses}
            />
          </div>
        </div>
      </div>
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

function ChatHeader({
  onBack,
  usagePill,
}: {
  onBack: () => void;
  usagePill?: { remaining: number; limit: number } | null;
}) {
  return (
    <header style={{
      display: "flex", alignItems: "center", gap: 12, padding: "0 16px 0 52px", height: 56,
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
      {usagePill && (
        <a
          href="/pricing"
          title="Upgrade for unlimited chat"
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 10px",
            background: usagePill.remaining <= 1 ? "#fef2f2" : "#fff7ed",
            border: `1px solid ${usagePill.remaining <= 1 ? "#fecaca" : "#fed7aa"}`,
            borderRadius: 100,
            fontSize: 11,
            fontWeight: 700,
            color: usagePill.remaining <= 1 ? "#dc2626" : "#f97316",
            textDecoration: "none",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {usagePill.remaining}/{usagePill.limit} left today
        </a>
      )}
    </header>
  );
}
