/**
 * Dashboard2 — ContextDrop upgraded dashboard
 * Design: Warm cream (#FAFAF8), orange accent (#f97316), DM Sans
 *
 * New features vs Dashboard v1:
 * - Redesigned sidebar: cleaner profile block with bio + Edit profile,
 *   Credits bar (label left, count right), Premium badge, Notion status,
 *   Folders/collections (like MS To Do left nav) with item counts,
 *   Open bot + Sign out at bottom
 * - Per-card inline TASKS section: add tasks, tick → strikethrough →
 *   smooth slide to bottom of list, delete task
 * - Deep Dive button (yellow/amber, full-width) inside expanded card
 * - Ask input ("Ask about this content…") with orange Ask button
 * - Card footer: View · Share · Notion · Delete as pill buttons
 * - Platform filter pills at top (All / Instagram / TikTok / X / Articles)
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Link } from "wouter";
import {
  ExternalLink,
  Share2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
  Zap,
  MessageCircle,
  Folder,
  FolderOpen,
  Home,
  Settings,
  LogOut,
  BookOpen,
  Send,
  Check,
  X,
  Copy,
  AlertCircle,
  Pencil,
  MoreHorizontal,
  CheckSquare,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

// ─── Types ────────────────────────────────────────────────────────────────────

type Intent = "learn" | "apply" | "skip";
type Platform = "instagram" | "tiktok" | "x" | "linkedin" | "youtube" | "articles";
type PlatformFilter = Platform | "all";

interface Task {
  id: string;
  text: string;
  done: boolean;
}

interface VerdictCard {
  id: string;
  platform: Platform;
  title: string;
  summary: string;
  whatItIs: string;
  whatsInside: string;
  realWorldContext: string;
  intent: Intent;
  tags: string[];
  url: string;
  timestamp: string;
  analysisTime: string;
  tasks: Task[];
  folderId: string | null;
}

interface Folder {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

// ─── Mock folders ─────────────────────────────────────────────────────────────

const INITIAL_FOLDERS: Folder[] = [
  { id: "ai-tools", name: "AI Tools", emoji: "🤖", color: "#f97316" },
  { id: "productivity", name: "Productivity", emoji: "⚡", color: "#8b5cf6" },
  { id: "building", name: "Building", emoji: "🔨", color: "#0ea5e9" },
];

// ─── Mock data ────────────────────────────────────────────────────────────────

const INITIAL_CARDS: VerdictCard[] = [
  {
    id: "1",
    platform: "instagram",
    title: "App Launch Checklist (With Convex)",
    summary: "3 non-negotiables for production-ready SaaS/AI apps",
    whatItIs:
      "This is a practical checklist for backend essentials: rate limiting, caching, and row-level security. It's aimed at makers building apps (especially AI-powered ones), and shows how to use Convex (a backend-as-a-service) to fast-track these must-haves.",
    whatsInside: "Inside: Quick breakdowns of rate limiting patterns, caching strategies, and RLS setup with Convex.",
    realWorldContext:
      "Especially relevant for anyone bootstrapping AI apps solo and wanting to skip boilerplate — but still ship with sane defaults for abuse prevention and security.",
    intent: "apply",
    tags: ["💰 Paid (Convex)", "💻 Code snippets shown"],
    url: "https://www.instagram.com/reel/DWuGQ3OEX",
    timestamp: "about 24 hours ago",
    analysisTime: "35s",
    tasks: [{ id: "t1", text: "I want to do this on tuesday", done: false }],
    folderId: "building",
  },
  {
    id: "2",
    platform: "instagram",
    title: "Claude Code Skill for AI Talking Head Clones",
    summary: "Step-by-step demo of using Claude Code to generate a personalized AI video avatar",
    whatItIs:
      "A walkthrough of using Claude Code to script, generate, and fine-tune an AI talking head clone using open-source models. Shows the full pipeline from prompt to video.",
    whatsInside:
      "Script generation, model selection, lip-sync pipeline, and a live demo of the output. Includes the exact prompts used.",
    realWorldContext:
      "If you're building content pipelines or want to automate video creation, this is a concrete starting point. The Claude Code integration makes it reproducible.",
    intent: "learn",
    tags: ["🎥 Video walkthrough", "🤖 AI tools"],
    url: "https://www.instagram.com/reel/example2",
    timestamp: "1 day ago",
    analysisTime: "28s",
    tasks: [],
    folderId: "ai-tools",
  },
  {
    id: "3",
    platform: "instagram",
    title: "Algoverse AI Research",
    summary: "Program for publishing AI research papers as a student",
    whatItIs:
      "Algoverse is a structured program that helps students publish peer-reviewed AI research. Shows the application process, mentorship model, and example published papers.",
    whatsInside:
      "Program overview, application tips, mentorship structure, example research topics, and timeline from application to publication.",
    realWorldContext:
      "If you're a student wanting to break into AI research, this is a direct path. The structured mentorship removes the biggest barrier — not knowing where to start.",
    intent: "learn",
    tags: ["🎓 Academic", "🔬 Research"],
    url: "https://www.instagram.com/reel/example3",
    timestamp: "1 day ago",
    analysisTime: "42s",
    tasks: [],
    folderId: null,
  },
  {
    id: "4",
    platform: "x",
    title: "No-Code Agency Workflow Automation",
    summary: "How to use make.com, Airtable, and no-code tools for agencies",
    whatItIs:
      "A thread showing how a solo agency owner automated their entire client workflow using Make.com, Airtable, and a few other no-code tools. Covers onboarding, project tracking, and invoicing.",
    whatsInside:
      "Make.com scenario walkthrough, Airtable base structure, client onboarding automation, invoice trigger setup, and a cost breakdown.",
    realWorldContext:
      "If you're running a small agency or freelance operation, this is a direct template. The Make.com + Airtable combo is the highest-leverage starting point.",
    intent: "apply",
    tags: ["⚙️ Automation", "🏢 Agency"],
    url: "https://x.com/example4",
    timestamp: "3 days ago",
    analysisTime: "31s",
    tasks: [],
    folderId: "productivity",
  },
  {
    id: "5",
    platform: "tiktok",
    title: "Microsoft VibeVoice",
    summary: "Open-source, long-form voice AI for transcription & speech synthesis",
    whatItIs:
      "Microsoft's open-source voice AI model that handles both transcription and speech synthesis at scale. Demo shows real-time transcription and voice cloning.",
    whatsInside:
      "Model architecture overview, transcription demo, voice cloning walkthrough, API access instructions, and benchmark comparisons.",
    realWorldContext:
      "If you're building voice features into any product, this is worth evaluating before committing to a paid API. The open-source license is a significant advantage.",
    intent: "learn",
    tags: ["🔊 Voice AI", "📖 Open source"],
    url: "https://tiktok.com/example5",
    timestamp: "2 days ago",
    analysisTime: "38s",
    tasks: [],
    folderId: "ai-tools",
  },
  {
    id: "6",
    platform: "instagram",
    title: "Graphify",
    summary: "Instantly turn any folder (code, notes, research) into a visual, queryable knowledge graph",
    whatItIs:
      "Graphify is a tool that takes any folder of files and generates an interactive knowledge graph. Shows connections between concepts, files, and ideas automatically.",
    whatsInside:
      "Demo of folder ingestion, graph generation, query interface, and export options. Includes a live walkthrough on a real codebase.",
    realWorldContext:
      "If you're drowning in notes or a large codebase and need to understand relationships quickly, this is worth a test. The query interface alone could save hours.",
    intent: "apply",
    tags: ["🗂️ Knowledge management", "🔍 Search"],
    url: "https://instagram.com/reel/example6",
    timestamp: "3 days ago",
    analysisTime: "29s",
    tasks: [],
    folderId: "productivity",
  },
];

// ─── Platform helpers ─────────────────────────────────────────────────────────

function PlatformIcon({ platform, size = 16 }: { platform: Platform; size?: number }) {
  const s = size;
  if (platform === "instagram") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <defs><linearGradient id="ig2" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f09433"/><stop offset="50%" stopColor="#e6683c"/><stop offset="100%" stopColor="#bc1888"/></linearGradient></defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig2)"/>
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="white" strokeWidth="1.5"/>
      <circle cx="17.5" cy="6.5" r="1" fill="white"/>
    </svg>
  );
  if (platform === "tiktok") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#010101"/>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.53V6.77a4.85 4.85 0 01-1.02-.08z" fill="white"/>
    </svg>
  );
  if (platform === "x") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#000"/>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="white"/>
    </svg>
  );
  if (platform === "linkedin") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#0A66C2"/>
      <path d="M7.5 9.5h-2v8h2v-8zm-1-3a1.25 1.25 0 1 0 0 2.5A1.25 1.25 0 0 0 6.5 6.5zm10.5 3c-1.2 0-2 .5-2.5 1.2V9.5h-2v8h2v-4.2c0-1.1.6-1.8 1.5-1.8s1.5.7 1.5 1.8v4.2h2v-4.5c0-2.2-1.2-3.5-2.5-3.5z" fill="white"/>
    </svg>
  );
  if (platform === "youtube") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#FF0000"/>
      <path d="M21.8 8s-.2-1.4-.8-2c-.8-.8-1.6-.8-2-.9C16.7 5 12 5 12 5s-4.7 0-7 .1c-.4.1-1.2.1-2 .9-.6.6-.8 2-.8 2S2 9.6 2 11.2v1.5c0 1.6.2 3.2.2 3.2s.2 1.4.8 2c.8.8 1.8.8 2.2.9C6.7 19 12 19 12 19s4.7 0 7-.1c.4-.1 1.2-.1 2-.9.6-.6.8-2 .8-2s.2-1.6.2-3.2v-1.5C22 9.6 21.8 8 21.8 8zM9.7 14.5V9.5l5.5 2.5-5.5 2.5z" fill="white"/>
    </svg>
  );
  return <div style={{ width: s, height: s, borderRadius: 4, background: "#e7e5e4" }} />;
}

function intentBorderColor(intent: Intent) {
  if (intent === "apply") return "#f97316";
  if (intent === "learn") return "#38bdf8";
  return "#d6d3d1";
}

function intentBadgeClass(intent: Intent) {
  if (intent === "apply") return "bg-orange-50 text-orange-600 border-orange-200";
  if (intent === "learn") return "bg-sky-50 text-sky-600 border-sky-200";
  return "bg-stone-100 text-stone-400 border-stone-200";
}

// ─── Task Item ────────────────────────────────────────────────────────────────

function TaskItem({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -8, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-3 py-2 group"
    >
      {/* Custom checkbox */}
      <button
        onClick={onToggle}
        className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
          task.done
            ? "bg-orange-500 border-orange-500"
            : "border-stone-300 hover:border-orange-400 bg-white"
        }`}
      >
        <AnimatePresence>
          {task.done && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Check size={11} className="text-white" strokeWidth={3} />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Task text */}
      <span
        className={`flex-1 text-sm transition-all duration-300 ${
          task.done ? "line-through text-stone-300" : "text-stone-700"
        }`}
      >
        {task.text}
      </span>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-stone-300 hover:text-red-400 p-0.5"
      >
        <Trash2 size={13} />
      </button>
    </motion.div>
  );
}

// ─── Task List ────────────────────────────────────────────────────────────────

function TaskList({
  tasks,
  onUpdate,
}: {
  tasks: Task[];
  onUpdate: (tasks: Task[]) => void;
}) {
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  function addTask() {
    const text = newText.trim();
    if (!text) { setAdding(false); return; }
    const task: Task = { id: `t${Date.now()}`, text, done: false };
    onUpdate([...tasks, task]);
    setNewText("");
    setAdding(false);
  }

  function toggleTask(id: string) {
    // Move done tasks to bottom
    const updated = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    const active = updated.filter(t => !t.done);
    const done = updated.filter(t => t.done);
    onUpdate([...active, ...done]);
  }

  function deleteTask(id: string) {
    onUpdate(tasks.filter(t => t.id !== id));
  }

  return (
    <div className="border border-stone-200 rounded-xl overflow-hidden bg-white">
      <div className="px-4 pt-3 pb-1">
        <span className="text-[10px] font-700 uppercase tracking-widest text-stone-400">Tasks</span>
      </div>
      <div className="px-4 divide-y divide-stone-100">
        <AnimatePresence mode="popLayout">
          {tasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={() => toggleTask(task.id)}
              onDelete={() => deleteTask(task.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Add task */}
      <div className="px-4 pb-3 pt-1">
        {adding ? (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") addTask();
                if (e.key === "Escape") { setAdding(false); setNewText(""); }
              }}
              onBlur={addTask}
              placeholder="What do you want to do?"
              className="flex-1 text-sm text-stone-700 placeholder:text-stone-300 bg-transparent outline-none border-b border-orange-300 pb-0.5 focus:border-orange-500 transition-colors"
            />
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-orange-500 transition-colors pt-1"
          >
            <Plus size={14} />
            Add task
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Ask Box ──────────────────────────────────────────────────────────────────

function AskBox({ cardTitle }: { cardTitle: string }) {
  const [value, setValue] = useState("");
  const [asked, setAsked] = useState(false);

  function handleAsk() {
    if (!value.trim()) return;
    setAsked(true);
    setTimeout(() => { setAsked(false); setValue(""); }, 2000);
  }

  return (
    <div className="flex items-center gap-2 border border-stone-200 rounded-xl bg-white px-4 py-3">
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === "Enter" && handleAsk()}
        placeholder="Ask about this content…"
        className="flex-1 text-sm text-stone-700 placeholder:text-stone-400 bg-transparent outline-none"
      />
      <button
        onClick={handleAsk}
        className={`text-sm font-700 px-4 py-1.5 rounded-lg transition-all ${
          asked
            ? "bg-green-500 text-white"
            : "bg-orange-500 hover:bg-orange-600 text-white"
        }`}
      >
        {asked ? "Sent!" : "Ask"}
      </button>
    </div>
  );
}

// ─── Analysis Card ────────────────────────────────────────────────────────────

function AnalysisCard({
  card,
  isOpen,
  onToggle,
  onDelete,
  onUpdateTasks,
}: {
  card: VerdictCard;
  isOpen: boolean;
  onToggle: () => void;
  onDelete: (id: string) => void;
  onUpdateTasks: (id: string, tasks: Task[]) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notionSaved, setNotionSaved] = useState(false);

  const pendingTasks = card.tasks.filter(t => !t.done).length;

  function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(card.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className={`bg-white rounded-2xl overflow-hidden transition-shadow ${
        isOpen ? "shadow-md" : "shadow-sm hover:shadow-md"
      }`}
      style={{
        border: `1px solid ${isOpen ? "#e7e5e4" : "#f0ede8"}`,
        borderLeft: `3px solid ${intentBorderColor(card.intent)}`,
      }}
    >
      {/* Header — always visible */}
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4 flex items-start gap-3 group hover:bg-stone-50/50 transition-colors"
      >
        <div className="flex-shrink-0 mt-1">
          <PlatformIcon platform={card.platform} size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="font-700 text-[15px] text-stone-800 leading-snug">{card.title}</span>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2 mt-0.5">
              {pendingTasks > 0 && !isOpen && (
                <span className="text-[10px] font-700 bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                  {pendingTasks} task{pendingTasks > 1 ? "s" : ""}
                </span>
              )}
              <span className="text-xs text-stone-400 whitespace-nowrap">{card.timestamp}</span>
              <div className="text-stone-300 group-hover:text-stone-500 transition-colors">
                {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </div>
            </div>
          </div>
          <div className="text-[13px] text-stone-400 italic line-clamp-2 leading-relaxed mb-1.5">{card.summary}</div>
          {!isOpen && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-stone-300 font-500">⚡ Deep Dive</span>
              <span className="text-stone-200 text-[10px]">·</span>
              <span className="text-[10px] text-stone-300 font-500">💬 Ask</span>
            </div>
          )}
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-6 border-t border-stone-100">
              {/* Verdict sections */}
              <div className="space-y-5 pt-5 mb-5">
                <div className="bg-stone-50 rounded-xl p-4">
                  <div className="text-[10px] font-700 uppercase tracking-widest text-stone-400 mb-2 flex items-center gap-1.5">
                    🧠 What it is
                  </div>
                  <div className="text-sm text-stone-600 leading-relaxed">{card.whatItIs}</div>
                </div>
                <div className="bg-stone-50 rounded-xl p-4">
                  <div className="text-[10px] font-700 uppercase tracking-widest text-stone-400 mb-2 flex items-center gap-1.5">
                    🔧 What's inside
                  </div>
                  <div className="text-sm text-stone-600 leading-relaxed">{card.whatsInside}</div>
                </div>
                <div className="bg-stone-50 rounded-xl p-4">
                  <div className="text-[10px] font-700 uppercase tracking-widest text-stone-400 mb-2 flex items-center gap-1.5">
                    💡 Real-world context
                  </div>
                  <div className="text-sm text-stone-600 leading-relaxed">{card.realWorldContext}</div>
                </div>
              </div>

              {/* URL + Tags row */}
              <div className="flex flex-col gap-3 mb-5">
                <a
                  href={card.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1.5 text-sm text-orange-500 hover:text-orange-600 transition-colors"
                >
                  <ExternalLink size={13} />
                  <span className="truncate">{card.url}</span>
                </a>
                <div className="flex gap-2 flex-wrap">
                  {card.tags.map(tag => (
                    <span key={tag} className="text-[11px] text-stone-500 bg-white border border-stone-200 px-2.5 py-1 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Deep Dive button */}
              <button className="w-full flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-700 text-sm py-3.5 rounded-xl transition-all mb-5">
                <Zap size={15} className="text-amber-500" />
                Deep Dive
              </button>

              {/* Tasks */}
              <div className="mb-5">
                <TaskList
                  tasks={card.tasks}
                  onUpdate={tasks => onUpdateTasks(card.id, tasks)}
                />
              </div>

              {/* Ask */}
              <div className="mb-5">
                <AskBox cardTitle={card.title} />
              </div>

              {/* Analysis time */}
              <div className="text-xs text-stone-300 mb-4">{card.analysisTime}</div>

              {/* Footer actions */}
              {confirmDelete ? (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <span className="text-sm text-red-600 font-500 flex-1">Delete this analysis?</span>
                  <button
                    onClick={() => onDelete(card.id)}
                    className="text-xs font-700 text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs font-600 text-stone-500 hover:text-stone-700 px-2 py-1.5 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {[
                    {
                      icon: <ExternalLink size={13} />,
                      label: "View",
                      action: () => window.open(card.url, "_blank"),
                    },
                    {
                      icon: copied ? <Check size={13} className="text-green-500" /> : <Share2 size={13} />,
                      label: copied ? "Copied!" : "Share",
                      action: (e: React.MouseEvent) => handleShare(e),
                    },
                    {
                      icon: notionSaved ? <Check size={13} className="text-green-500" /> : (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933z"/>
                        </svg>
                      ),
                      label: notionSaved ? "Saved!" : "Notion",
                      action: () => { setNotionSaved(true); setTimeout(() => setNotionSaved(false), 2000); },
                    },
                    {
                      icon: <Trash2 size={13} />,
                      label: "Delete",
                      action: () => setConfirmDelete(true),
                      danger: true,
                    },
                  ].map(btn => (
                    <button
                      key={btn.label}
                      onClick={btn.action as any}
                      className={`flex items-center justify-center gap-1.5 text-xs font-600 py-2.5 rounded-xl border transition-all ${
                        btn.danger
                          ? "text-stone-400 hover:text-red-500 bg-white hover:bg-red-50 border-stone-200 hover:border-red-200"
                          : "text-stone-500 hover:text-stone-700 bg-white hover:bg-stone-50 border-stone-200"
                      }`}
                    >
                      {btn.icon}
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Connectors section ─────────────────────────────────────────────────────

const CONNECTORS = [
  {
    id: "notion",
    name: "Notion",
    description: "My Workspace",
    connected: true,
    icon: (
      <div className="w-6 h-6 rounded bg-stone-800 flex items-center justify-center flex-shrink-0">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="white">
          <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933z"/>
        </svg>
      </div>
    ),
  },
  {
    id: "todoist",
    name: "Todoist",
    description: "Connect to sync tasks",
    connected: false,
    icon: (
      <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.707 7.293l-5.657 5.657a1 1 0 01-1.414 0l-2.829-2.829 1.414-1.414 2.122 2.122 4.95-4.95 1.414 1.414z"/>
        </svg>
      </div>
    ),
  },
];

function ConnectorsSection() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-600 text-stone-400 hover:text-stone-600 hover:bg-stone-50 transition-all"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
        </svg>
        <span className="flex-1 text-left">Connectors</span>
        <span className="text-[10px] bg-emerald-100 text-emerald-600 font-700 px-1.5 py-0.5 rounded-full">1 connected</span>
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-1 px-1 pt-1 pb-2">
              {CONNECTORS.map(c => (
                <div
                  key={c.id}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-stone-50 border border-stone-100"
                >
                  {c.icon}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-600 text-stone-700">{c.name}</div>
                    <div className="text-[10px] text-stone-400 truncate">{c.description}</div>
                  </div>
                  {c.connected ? (
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[10px] font-600 text-emerald-500">On</span>
                    </div>
                  ) : (
                    <button className="text-[10px] font-700 text-orange-500 hover:text-orange-600 bg-orange-50 hover:bg-orange-100 px-2 py-0.5 rounded-full transition-colors">
                      Connect
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  cards,
  folders,
  activeFolderId,
  onFolderSelect,
  onClose,
}: {
  cards: VerdictCard[];
  folders: Folder[];
  activeFolderId: string | null;
  onFolderSelect: (id: string | null) => void;
  onClose?: () => void;
}) {
  const [addingFolder, setAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingFolder) folderInputRef.current?.focus();
  }, [addingFolder]);

  const totalTasks = cards.reduce((sum, c) => sum + c.tasks.filter(t => !t.done).length, 0);

  return (
    <div className="flex flex-col h-full py-5 px-4 gap-0 overflow-y-auto">
      {/* Logo */}
      <Link href="/" onClick={onClose}>
        <div className="flex items-center gap-2 px-2 mb-5 cursor-pointer">
          <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-800 text-sm text-stone-800">ContextDrop</span>
        </div>
      </Link>

      {/* Profile block */}
      <div className="px-2 mb-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            KA
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-700 text-sm text-stone-800 truncate">Kaan</div>
            <div className="text-xs text-stone-400 truncate leading-snug">Hello, my name is Kaan</div>
          </div>
        </div>
        <div className="text-xs text-stone-400 line-clamp-2 mb-2 leading-relaxed">
          Currently, I am working closely on Claude Code and building stuff, wor…
        </div>
        <button className="text-xs font-600 text-orange-500 hover:text-orange-600 transition-colors flex items-center gap-1">
          <Pencil size={10} />
          Edit profile →
        </button>
      </div>

      <div className="border-t border-stone-100 mb-4" />

      {/* Credits */}
      <div className="px-2 mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-600 uppercase tracking-wide text-stone-400">Credits</span>
          <span className="text-xs font-700 text-stone-600">235 remaining</span>
        </div>
        <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden mb-1">
          <div className="h-full bg-orange-400 rounded-full" style={{ width: "78%" }} />
        </div>
        <div className="text-[10px] text-stone-400">1 credit = 1 analysis</div>
      </div>

      {/* Premium badge */}
      <div className="px-2 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-orange-500 text-white text-[11px] font-700 px-2.5 py-0.5 rounded-full">Premium</span>
        </div>
        <div className="text-[11px] text-stone-400 leading-relaxed">Unlimited analyses, AI Q&amp;A, action items</div>
        <button className="text-[11px] font-600 text-stone-400 hover:text-stone-600 transition-colors mt-0.5 flex items-center gap-0.5">
          Manage subscription →
        </button>
      </div>

      <div className="border-t border-stone-100 mb-4" />

      {/* Navigation — All feed */}
      <nav className="flex flex-col gap-0.5 mb-3">
        <button
          onClick={() => { onFolderSelect(null); onClose?.(); }}
          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-500 transition-all w-full text-left ${
            activeFolderId === null
              ? "bg-orange-50 text-orange-600 font-600"
              : "text-stone-500 hover:bg-stone-50 hover:text-stone-700"
          }`}
        >
          <Home size={15} />
          <span className="flex-1">All verdicts</span>
          <span className="text-xs text-stone-400">{cards.length}</span>
        </button>

        <Link href="/tasks">
          <button className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-500 text-stone-500 hover:bg-stone-50 hover:text-stone-700 transition-all w-full text-left">
            <CheckSquare size={15} />
            <span className="flex-1">Tasks</span>
            {totalTasks > 0 && (
              <span className="text-xs font-700 text-orange-500">{totalTasks}</span>
            )}
          </button>
        </Link>
      </nav>

      {/* Folders */}
      <div className="mb-2">
        <div className="flex items-center justify-between px-3 mb-1">
          <span className="text-[10px] font-700 uppercase tracking-widest text-stone-400">Folders</span>
          <button
            onClick={() => setAddingFolder(true)}
            className="text-stone-300 hover:text-orange-500 transition-colors"
          >
            <Plus size={13} />
          </button>
        </div>

        <div className="flex flex-col gap-0.5">
          {folders.map(folder => {
            const count = cards.filter(c => c.folderId === folder.id).length;
            const isActive = activeFolderId === folder.id;
            return (
              <button
                key={folder.id}
                onClick={() => { onFolderSelect(folder.id); onClose?.(); }}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-500 transition-all w-full text-left ${
                  isActive
                    ? "bg-stone-100 text-stone-800 font-600"
                    : "text-stone-500 hover:bg-stone-50 hover:text-stone-700"
                }`}
              >
                <span className="text-base leading-none">{folder.emoji}</span>
                <span className="flex-1 truncate">{folder.name}</span>
                <span className="text-xs text-stone-400">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Add folder inline */}
        <AnimatePresence>
          {addingFolder && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3 mt-1"
            >
              <input
                ref={folderInputRef}
                type="text"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    // In a real app, add folder to state
                    setAddingFolder(false);
                    setNewFolderName("");
                  }
                  if (e.key === "Escape") {
                    setAddingFolder(false);
                    setNewFolderName("");
                  }
                }}
                onBlur={() => { setAddingFolder(false); setNewFolderName(""); }}
                placeholder="Folder name…"
                className="w-full text-sm text-stone-700 placeholder:text-stone-300 bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-300 transition-colors"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom */}
      <div className="mt-auto pt-4 border-t border-stone-100 flex flex-col gap-1">
        {/* Connectors */}
        <ConnectorsSection />

        <div className="border-t border-stone-100 my-1" />

        <a
          href="https://t.me/contextdrop2027bot"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-500 text-stone-500 hover:bg-stone-50 hover:text-stone-700 transition-all"
        >
          <Send size={14} />
          Open bot
        </a>
        <button
          onClick={() => { window.location.href = "/"; }}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-500 text-stone-400 hover:bg-red-50 hover:text-red-500 transition-all w-full text-left"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const PLATFORM_FILTERS: { value: PlatformFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "x", label: "X" },
  { value: "articles", label: "Articles" },
];

export default function Dashboard2() {
  const [cards, setCards] = useState<VerdictCard[]>(INITIAL_CARDS);
  const [folders] = useState<Folder[]>(INITIAL_FOLDERS);
  const [openCardId, setOpenCardId] = useState<string | null>("1");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleDelete(id: string) {
    setCards(prev => prev.filter(c => c.id !== id));
    if (openCardId === id) setOpenCardId(null);
  }

  function handleUpdateTasks(cardId: string, tasks: Task[]) {
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, tasks } : c));
  }

  function toggleCard(id: string) {
    setOpenCardId(prev => prev === id ? null : id);
  }

  const filtered = cards.filter(c => {
    if (activeFolderId && c.folderId !== activeFolderId) return false;
    if (platformFilter !== "all" && c.platform !== platformFilter) return false;
    return true;
  });

  const activeFolder = folders.find(f => f.id === activeFolderId);

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 border-r border-stone-150 bg-white sticky top-0 h-screen">
        <Sidebar
          cards={cards}
          folders={folders}
          activeFolderId={activeFolderId}
          onFolderSelect={setActiveFolderId}
        />
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-white z-50 lg:hidden border-r border-stone-150 overflow-y-auto"
            >
              <Sidebar
                cards={cards}
                folders={folders}
                activeFolderId={activeFolderId}
                onFolderSelect={setActiveFolderId}
                onClose={() => setSidebarOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-[#FAFAF8]/90 backdrop-blur-md border-b border-stone-150 px-4 lg:px-8 h-14 flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-stone-100 text-stone-500 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 flex-1">
            <span className="font-600 text-sm text-stone-700">
              {activeFolder ? (
                <span className="flex items-center gap-1.5">
                  <span>{activeFolder.emoji}</span>
                  <span>{activeFolder.name}</span>
                </span>
              ) : (
                "All verdicts"
              )}
            </span>
            {filtered.length > 0 && (
              <span className="text-xs text-stone-400">· {filtered.length}</span>
            )}
          </div>

          {/* Analyse new video CTA */}
          <a
            href="https://t.me/contextdrop2027bot"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-700 px-4 py-2 rounded-xl transition-all shadow-sm"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.026 9.54c-.148.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.26 14.4l-2.95-.924c-.64-.203-.654-.64.136-.948l11.527-4.444c.534-.194 1.001.13.589.164z"/>
            </svg>
            <span className="hidden sm:inline">+ Analyse new video</span>
            <span className="sm:hidden">+</span>
          </a>
        </header>

        {/* Platform filter pills */}
        <div className="px-4 lg:px-8 pt-4 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {PLATFORM_FILTERS.map(p => (
              <button
                key={p.value}
                onClick={() => setPlatformFilter(p.value)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-500 whitespace-nowrap transition-all border ${
                  platformFilter === p.value
                    ? "bg-stone-800 text-white border-stone-800 font-600"
                    : "bg-white text-stone-500 border-stone-200 hover:border-stone-300 hover:text-stone-700"
                }`}
              >
                {p.value !== "all" && p.value !== "articles" && (
                  <PlatformIcon platform={p.value as Platform} size={14} />
                )}
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Feed */}
        <main className="flex-1 px-4 lg:px-8 py-4 max-w-3xl w-full">
          <div className="flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
              {filtered.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <div className="text-3xl mb-3">📭</div>
                  <div className="font-600 text-stone-600 mb-1">Nothing here yet</div>
                  <div className="text-sm text-stone-400">
                    {activeFolderId ? "No verdicts in this folder." : "Send a link to get started."}
                  </div>
                </motion.div>
              ) : (
                filtered.map(card => (
                  <AnalysisCard
                    key={card.id}
                    card={card}
                    isOpen={openCardId === card.id}
                    onToggle={() => toggleCard(card.id)}
                    onDelete={handleDelete}
                    onUpdateTasks={handleUpdateTasks}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
