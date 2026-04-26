"use client";

/*
 * DashboardPreviewSection — Manus "Dark Signal" port (Apr 26)
 *
 * Phase 1: animated link-sent → typing → analysis card → TRY THIS ONCE → auto-add task → dashboard updates
 * Phase 2: dashboard becomes interactive (sidebar tabs, expand cards, add tasks, chat)
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const FEED_ITEMS = [
  {
    id: "ig-1",
    platform: "Instagram",
    platformColor: "#E1306C",
    title: "Kimi K2.6 — Moonshot AI's new coding model",
    summary: "SWE-Bench Pro 58.6. Top-ranked on agentic coding benchmarks. Free tier available.",
    action: "Try it at kimi.com — drop a bug and see if it catches what Cursor misses.",
    tags: ["AI Tools", "Coding"],
    time: "just now",
    isNew: true,
    searchQuery: "Kimi K2 coding model benchmark",
  },
  {
    id: "li-1",
    platform: "LinkedIn",
    platformColor: "#0A66C2",
    title: "How I cut my research time from 4 hours to 20 minutes",
    summary:
      "Stopped reading everything. Started routing links through AI that extracts only decision-relevant parts. The workflow is embarrassingly simple.",
    action: "Pick 3 links you've been meaning to read. Send them to Mr Context. See what you actually needed to know.",
    tags: ["Productivity", "AI Workflow"],
    time: "1h ago",
    isNew: false,
    searchQuery: "AI research workflow productivity",
  },
  {
    id: "x-1",
    platform: "X",
    platformColor: "#FAFAFA",
    title: "Caveman — open-source AI output compressor",
    summary: "Rewrites verbose AI coding agent outputs into terse English. ~75% token reduction.",
    action: "github.com/JuliusBrussee/caveman — add to your Claude Code setup.",
    tags: ["Open Source", "Dev Tools"],
    time: "3h ago",
    isNew: false,
    searchQuery: "Caveman AI output compressor open source",
  },
];

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  Instagram: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="#E1306C">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
    </svg>
  ),
  LinkedIn: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="#0A66C2">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  ),
  X: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="#A1A1AA">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
};

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: "#A1A1AA" }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

function TelegramPanel({ step, item }: { step: number; item: typeof FEED_ITEMS[0] }) {
  return (
    <div
      className="flex flex-col h-full rounded-xl overflow-hidden"
      style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0a0a0a" }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "#F97316" }}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7L6 10.5L11.5 3.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p className="text-white font-semibold text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
            Mr Context
          </p>
          <p className="text-[11px]" style={{ color: "#52525B" }}>bot</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: "#22c55e" }} />
          <span className="text-[11px]" style={{ color: "#52525B" }}>online</span>
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: step >= 0 ? 1 : 0, x: step >= 0 ? 0 : 20 }}
          transition={{ duration: 0.4 }}
          className="flex justify-end"
        >
          <div className="px-3 py-2 rounded-xl rounded-tr-sm max-w-[85%]" style={{ background: "#F97316" }}>
            <p className="text-[11px] text-white break-all" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {item.platform === "Instagram"
                ? "instagram.com/reel/abc123xyz"
                : item.platform === "LinkedIn"
                  ? "linkedin.com/posts/johndoe-abc"
                  : "x.com/user/status/123456"}
            </p>
          </div>
        </motion.div>

        <AnimatePresence>
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-2"
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "#F97316" }}
              >
                <svg width="9" height="9" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7L6 10.5L11.5 3.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div
                className="rounded-xl rounded-tl-sm"
                style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <TypingDots />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {step >= 2 && (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20, y: 10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-start gap-2"
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                style={{ background: "#F97316" }}
              >
                <svg width="9" height="9" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7L6 10.5L11.5 3.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div
                className="rounded-xl rounded-tl-sm p-3 flex-1 min-w-0"
                style={{
                  background: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderLeft: `3px solid ${item.platformColor}`,
                }}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  {PLATFORM_ICONS[item.platform]}
                  <span
                    className="text-[10px] uppercase tracking-wider font-medium"
                    style={{ color: "#71717A", fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {item.platform}
                  </span>
                </div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: step >= 3 ? 1 : 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="font-semibold mb-1.5 leading-snug"
                  style={{ color: "#FAFAFA", fontSize: "12px", fontFamily: "'Inter', sans-serif" }}
                >
                  {item.title}
                </motion.p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: step >= 3 ? 1 : 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="mb-2"
                  style={{ color: "#A1A1AA", fontSize: "11px", lineHeight: 1.6, fontFamily: "'Inter', sans-serif" }}
                >
                  {item.summary}
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: step >= 4 ? 1 : 0, y: step >= 4 ? 0 : 8 }}
                  transition={{ duration: 0.4 }}
                  className="rounded-lg p-2.5 mb-2"
                  style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)" }}
                >
                  <div
                    className="text-[9px] font-semibold uppercase tracking-widest mb-1"
                    style={{ color: "#F97316", fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    TRY THIS ONCE
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: "#D4D4D8" }}>{item.action}</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: step >= 4 ? 1 : 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                  className="flex gap-2"
                >
                  <button
                    className="text-[10px] px-2.5 py-1 rounded-md font-medium"
                    style={{
                      background: "rgba(249,115,22,0.12)",
                      color: "#F97316",
                      border: "1px solid rgba(249,115,22,0.25)",
                    }}
                  >
                    + Add to tasks
                  </button>
                  <button
                    className="text-[10px] px-2.5 py-1 rounded-md font-medium"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      color: "#71717A",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    Chat with it ↗
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

type DashView = "feed" | "tasks" | "chat";

function InteractiveDashboard({
  animStep,
  animItem,
}: {
  animStep: number;
  animItem: typeof FEED_ITEMS[0];
}) {
  const [view, setView] = useState<DashView>("feed");
  const [tasks, setTasks] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [chatItem, setChatItem] = useState<typeof FEED_ITEMS[0] | null>(null);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const animTaskAdded = animStep >= 7;
  const showNewCard = animStep >= 5;

  useEffect(() => {
    if (animTaskAdded && !tasks.includes(animItem.id)) {
      setTasks((prev) => [...prev, animItem.id]);
    }
  }, [animTaskAdded, animItem.id, tasks]);

  const addTask = useCallback((id: string) => {
    setTasks((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const [chatSearchState, setChatSearchState] = useState<"idle" | "searching" | "done">("idle");

  const openChat = useCallback((item: typeof FEED_ITEMS[0]) => {
    setChatItem(item);
    setChatSearchState("idle");
    setView("chat");
    setTimeout(() => {
      setChatSearchState("searching");
      setTimeout(() => setChatSearchState("done"), 2000);
    }, 600);
  }, []);

  const sendChat = useCallback(() => {
    if (!chatInput.trim() || !chatItem) return;
    setChatInput("");
    setChatSearchState("searching");
    setTimeout(() => setChatSearchState("done"), 2000);
  }, [chatInput, chatItem]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const allItems = showNewCard
    ? [animItem, ...FEED_ITEMS.filter((f) => f.id !== animItem.id)]
    : FEED_ITEMS.filter((f) => f.id !== animItem.id);
  const taskItems = FEED_ITEMS.filter((f) => tasks.includes(f.id));

  return (
    <div
      className="flex h-full rounded-xl overflow-hidden"
      style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div
        className="flex flex-col w-[118px] flex-shrink-0"
        style={{ background: "#0a0a0a", borderRight: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div
          className="flex items-center gap-2 px-3 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center"
            style={{ background: "#F97316" }}
          >
            <svg width="9" height="9" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7L6 10.5L11.5 3.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span
            className="text-white font-semibold text-[11px]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Context
          </span>
        </div>

        <div className="flex flex-col gap-0.5 p-2 flex-1">
          {(
            [
              { id: "feed" as DashView, label: "All verdicts", count: allItems.length },
              { id: "tasks" as DashView, label: "Tasks", count: taskItems.length, highlight: taskItems.length > 0 },
              { id: "chat" as DashView, label: "Chat", badge: "NEW" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id !== "chat") setView(item.id);
                else if (chatItem) setView("chat");
              }}
              className="flex items-center justify-between px-2 py-1.5 rounded-md w-full text-left transition-all duration-200"
              style={{
                background: view === item.id ? "rgba(249,115,22,0.1)" : "transparent",
                cursor: "pointer",
              }}
            >
              <span
                className="text-[10px] font-medium"
                style={{
                  color:
                    view === item.id
                      ? "#F97316"
                      : "highlight" in item && item.highlight
                        ? "#F97316"
                        : "#71717A",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {item.label}
              </span>
              {"badge" in item && item.badge ? (
                <span
                  className="text-[8px] px-1 py-0.5 rounded font-bold"
                  style={{ background: "#F97316", color: "white" }}
                >
                  {item.badge}
                </span>
              ) : "count" in item && item.count > 0 ? (
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded-full"
                  style={{
                    background:
                      "highlight" in item && item.highlight
                        ? "rgba(249,115,22,0.2)"
                        : "rgba(255,255,255,0.08)",
                    color: "highlight" in item && item.highlight ? "#F97316" : "#71717A",
                  }}
                >
                  {item.count}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div
          className="p-2 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div
            className="text-[9px] uppercase tracking-wider mb-1 flex items-center justify-between"
            style={{ color: "#52525B", fontFamily: "'JetBrains Mono', monospace" }}
          >
            <span>Credits</span>
            <span style={{ color: "#71717A" }}>187</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="h-full rounded-full" style={{ width: "62%", background: "#F97316" }} />
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {view === "feed" && (
            <motion.div
              key="feed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col h-full"
            >
              <div
                className="flex items-center gap-1 px-3 py-2 flex-shrink-0 overflow-x-auto"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0a0a0a" }}
              >
                {["All", "Instagram", "LinkedIn", "X"].map((p, i) => (
                  <span
                    key={p}
                    className="text-[9px] px-2 py-0.5 rounded-md whitespace-nowrap flex-shrink-0 font-medium"
                    style={{
                      background: i === 0 ? "rgba(249,115,22,0.1)" : "transparent",
                      color: i === 0 ? "#F97316" : "#52525B",
                      border: i === 0 ? "1px solid rgba(249,115,22,0.2)" : "1px solid transparent",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>

              <div className="flex-1 p-2.5 flex flex-col gap-1.5 overflow-y-auto">
                {allItems.map((item, idx) => {
                  const isExpanded = expandedId === item.id;
                  const isTasked = tasks.includes(item.id);
                  const isNew = item.id === animItem.id && showNewCard;
                  return (
                    <motion.div
                      key={item.id}
                      initial={isNew && idx === 0 ? { opacity: 0, y: 12, scale: 0.97 } : { opacity: 1 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="rounded-lg overflow-hidden cursor-pointer"
                      style={{
                        background: "#0a0a0a",
                        border: isNew ? "1px solid rgba(249,115,22,0.2)" : "1px solid rgba(255,255,255,0.05)",
                        borderLeft: `2px solid ${item.platformColor}`,
                        boxShadow: isNew ? "0 0 12px rgba(249,115,22,0.06)" : "none",
                      }}
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    >
                      <div className="flex items-center justify-between px-3 pt-2 pb-1">
                        <div className="flex items-center gap-1.5">
                          {PLATFORM_ICONS[item.platform]}
                          <span
                            className="text-[9px] uppercase tracking-wider"
                            style={{ color: "#71717A", fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            {item.platform}
                          </span>
                          {isNew && (
                            <span
                              className="text-[8px] px-1.5 py-0.5 rounded-full font-semibold"
                              style={{ background: "rgba(249,115,22,0.12)", color: "#F97316" }}
                            >
                              NEW
                            </span>
                          )}
                          {isTasked && (
                            <span
                              className="text-[8px] px-1.5 py-0.5 rounded-full font-semibold"
                              style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}
                            >
                              ✓ Task
                            </span>
                          )}
                        </div>
                        <span className="text-[9px]" style={{ color: "#52525B" }}>{isExpanded ? "▲" : "▼"}</span>
                      </div>
                      <p
                        className="text-[11px] font-semibold px-3 pb-1.5 leading-snug"
                        style={{ color: "#FAFAFA", fontFamily: "'Inter', sans-serif" }}
                      >
                        {item.title}
                      </p>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="px-3 pb-2.5"
                          >
                            <p
                              className="text-[10px] mb-2 leading-relaxed"
                              style={{ color: "#A1A1AA", fontFamily: "'Inter', sans-serif" }}
                            >
                              {item.summary}
                            </p>
                            <div
                              className="rounded-md p-2 mb-2"
                              style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)" }}
                            >
                              <div
                                className="text-[8px] font-semibold uppercase tracking-widest mb-0.5"
                                style={{ color: "#F97316", fontFamily: "'JetBrains Mono', monospace" }}
                              >
                                TRY THIS ONCE
                              </div>
                              <p className="text-[10px] leading-relaxed" style={{ color: "#A1A1AA" }}>
                                {item.action}
                              </p>
                            </div>
                            <div
                              className="flex gap-1.5 mb-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => addTask(item.id)}
                                className="text-[9px] px-2 py-1 rounded-md font-medium transition-all"
                                style={{
                                  background: isTasked ? "rgba(34,197,94,0.12)" : "rgba(249,115,22,0.12)",
                                  color: isTasked ? "#22c55e" : "#F97316",
                                  border: `1px solid ${
                                    isTasked ? "rgba(34,197,94,0.25)" : "rgba(249,115,22,0.25)"
                                  }`,
                                  fontFamily: "'Inter', sans-serif",
                                }}
                              >
                                {isTasked ? "✓ Added" : "+ Add to tasks"}
                              </button>
                              <button
                                onClick={() => openChat(item)}
                                className="text-[9px] px-2 py-1 rounded-md font-medium"
                                style={{
                                  background: "rgba(255,255,255,0.05)",
                                  color: "#A1A1AA",
                                  border: "1px solid rgba(255,255,255,0.08)",
                                  fontFamily: "'Inter', sans-serif",
                                }}
                              >
                                Chat with it
                              </button>
                            </div>
                            {item.tags && (
                              <div className="flex gap-1 flex-wrap">
                                {item.tags.map((tag: string) => (
                                  <span
                                    key={tag}
                                    className="text-[8px] px-2 py-0.5 rounded-full"
                                    style={{
                                      background: "rgba(255,255,255,0.05)",
                                      color: "#71717A",
                                      border: "1px solid rgba(255,255,255,0.06)",
                                      fontFamily: "'Inter', sans-serif",
                                    }}
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {view === "tasks" && (
            <motion.div
              key="tasks"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col h-full"
            >
              <div
                className="px-3 py-2 flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0a0a0a" }}
              >
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: "#F97316", fontFamily: "'JetBrains Mono', monospace" }}
                >
                  TASKS · {taskItems.length}
                </span>
              </div>
              <div className="flex-1 p-2.5 flex flex-col gap-1.5 overflow-y-auto">
                {taskItems.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p
                      className="text-[11px] text-center"
                      style={{ color: "#52525B", fontFamily: "'Inter', sans-serif" }}
                    >
                      No tasks yet.<br />
                      Add one from the feed.
                    </p>
                  </div>
                ) : (
                  taskItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg px-3 py-2.5"
                      style={{
                        background: "#0a0a0a",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderLeft: `2px solid ${item.platformColor}`,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {PLATFORM_ICONS[item.platform]}
                        <span
                          className="text-[9px] uppercase tracking-wider"
                          style={{ color: "#71717A", fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          {item.platform}
                        </span>
                      </div>
                      <p
                        className="text-[10px] font-semibold mb-1.5 leading-snug"
                        style={{ color: "#FAFAFA", fontFamily: "'Inter', sans-serif" }}
                      >
                        {item.title}
                      </p>
                      <div
                        className="rounded-md p-1.5"
                        style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.12)" }}
                      >
                        <p className="text-[9px] leading-relaxed" style={{ color: "#A1A1AA" }}>
                          {item.action}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {view === "chat" && (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col h-full"
            >
              <div
                className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0a0a0a" }}
              >
                <button
                  onClick={() => setView("feed")}
                  className="text-[11px] mr-1"
                  style={{ color: "#71717A" }}
                >
                  ←
                </button>
                <span
                  className="text-[10px] font-semibold truncate"
                  style={{ color: "#FAFAFA", fontFamily: "'Inter', sans-serif" }}
                >
                  {chatItem?.title ?? "Chat"}
                </span>
              </div>

              <div className="flex-1 p-3 flex flex-col gap-3 overflow-y-auto">
                <motion.div
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex justify-end"
                >
                  <div
                    className="px-3 py-2 rounded-xl rounded-tr-sm text-[10px] leading-relaxed"
                    style={{
                      background: "#F97316",
                      color: "white",
                      fontFamily: "'Inter', sans-serif",
                      maxWidth: "85%",
                    }}
                  >
                    What's the most important takeaway from this?
                  </div>
                </motion.div>

                <AnimatePresence>
                  {(chatSearchState === "searching" || chatSearchState === "done") && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)", width: "fit-content" }}
                    >
                      {chatSearchState === "searching" ? (
                        <>
                          <motion.div
                            className="w-3 h-3 rounded-full"
                            style={{ background: "#F97316" }}
                            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          />
                          <span
                            className="text-[10px]"
                            style={{ color: "#A1A1AA", fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            🔍 Searching the web...
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-[10px]" style={{ color: "#22c55e" }}>✓</span>
                          <span
                            className="text-[10px]"
                            style={{ color: "#71717A", fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            Web search complete
                          </span>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {chatSearchState === "done" && chatItem && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="rounded-xl p-3"
                      style={{
                        background: "#1a1a1a",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderLeft: `3px solid ${chatItem.platformColor}`,
                      }}
                    >
                      <div
                        className="text-[9px] font-semibold uppercase tracking-widest mb-2"
                        style={{ color: "#71717A", fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        Analysis · {chatItem.platform}
                      </div>
                      <p
                        className="text-[11px] font-semibold mb-2 leading-snug"
                        style={{ color: "#FAFAFA", fontFamily: "'Inter', sans-serif" }}
                      >
                        {chatItem.title}
                      </p>
                      <p
                        className="text-[10px] leading-relaxed mb-3"
                        style={{ color: "#A1A1AA", fontFamily: "'Inter', sans-serif" }}
                      >
                        {chatItem.summary}
                      </p>
                      <div
                        className="rounded-lg p-2.5 mb-3"
                        style={{ background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.18)" }}
                      >
                        <div
                          className="text-[8px] font-bold uppercase tracking-widest mb-1"
                          style={{ color: "#F97316", fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          TRY THIS ONCE
                        </div>
                        <p className="text-[10px] leading-relaxed" style={{ color: "#D4D4D8" }}>
                          {chatItem.action}
                        </p>
                      </div>
                      <div
                        className="rounded-lg p-2.5"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                      >
                        <p
                          className="text-[9px] mb-2"
                          style={{ color: "#71717A", fontFamily: "'Inter', sans-serif" }}
                        >
                          This is a preview. Sign up to get web search + full analysis on every link you send.
                        </p>
                        <a
                          href="/signup"
                          className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-md text-[10px] font-semibold transition-all"
                          style={{ background: "#F97316", color: "white", fontFamily: "'Inter', sans-serif", textDecoration: "none" }}
                        >
                          Sign up free →
                        </a>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={chatEndRef} />
              </div>

              <div className="flex gap-2 px-3 pb-3 flex-shrink-0">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                  placeholder="Ask another question..."
                  className="flex-1 text-[10px] px-3 py-1.5 rounded-lg outline-none"
                  style={{
                    background: "#1a1a1a",
                    color: "#FAFAFA",
                    border: "1px solid rgba(255,255,255,0.1)",
                    fontFamily: "'Inter', sans-serif",
                  }}
                />
                <button
                  onClick={sendChat}
                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold"
                  style={{ background: "#F97316", color: "white" }}
                >
                  →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const ALL_PLATFORMS = [
  { label: "Instagram", color: "#E1306C" },
  { label: "LinkedIn", color: "#0A66C2" },
  { label: "X", color: "#A1A1AA" },
  { label: "TikTok", color: "#52525B" },
];

export default function DashboardPreviewSection() {
  const [step, setStep] = useState(0);
  const [itemIdx, setItemIdx] = useState(0);
  const [started, setStarted] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  const currentItem = FEED_ITEMS[itemIdx];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.3 },
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;

    const timings = [0, 1000, 2200, 3000, 4000, 5000, 6200, 7200];
    const timeouts = timings.map((t, i) => setTimeout(() => setStep(i), t));

    const unlockTimeout = setTimeout(() => setInteractive(true), 9000);

    const cycleTimeout = setTimeout(() => {
      setItemIdx((prev) => (prev + 1) % FEED_ITEMS.length);
      setStep(0);
      setInteractive(false);
      setStarted(false);
      setTimeout(() => setStarted(true), 300);
    }, 18000);

    return () => {
      timeouts.forEach(clearTimeout);
      clearTimeout(unlockTimeout);
      clearTimeout(cycleTimeout);
    };
  }, [started, itemIdx]);

  return (
    <section
      ref={sectionRef}
      id="preview"
      className="py-24"
      style={{ background: "#0a0a0a", borderTop: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="cd-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <p
            className="text-[11px] font-semibold uppercase tracking-widest mb-4"
            style={{ color: "#F97316", fontFamily: "'JetBrains Mono', monospace" }}
          >
            See it live
          </p>
          <h2
            className="text-white mb-6"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            Send a link. Get a card.
            <br />
            <span style={{ color: "#A1A1AA" }}>It really is that fast.</span>
          </h2>

          <div className="flex items-center justify-center gap-2 flex-wrap">
            {ALL_PLATFORMS.map((p) => {
              const isActive = p.label === currentItem.platform;
              return (
                <div
                  key={p.label}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300"
                  style={{
                    background: isActive ? `${p.color}18` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isActive ? p.color + "44" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  {PLATFORM_ICONS[p.label] ?? (
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                  )}
                  <span
                    className="text-[11px] font-medium"
                    style={{
                      color: isActive ? p.color : "#52525B",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {p.label}
                  </span>
                </div>
              );
            })}
          </div>

          <AnimatePresence>
            {interactive && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="mt-4 text-[11px]"
                style={{ color: "#71717A", fontFamily: "'Inter', sans-serif" }}
              >
                ✦ Dashboard is now interactive — click the cards, tasks, and chat
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="hidden md:grid grid-cols-2 gap-5 max-w-4xl mx-auto" style={{ height: 500 }}>
          <TelegramPanel step={step} item={currentItem} />
          <InteractiveDashboard animStep={step} animItem={currentItem} />
        </div>

        <div className="md:hidden flex flex-col gap-4">
          <div style={{ height: 400 }}>
            <TelegramPanel step={step} item={currentItem} />
          </div>
          <div style={{ height: 400 }}>
            <InteractiveDashboard animStep={step} animItem={currentItem} />
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mt-8">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: step === i ? 20 : 6,
                height: 6,
                background: step === i ? "#F97316" : "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
