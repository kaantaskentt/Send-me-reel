/**
 * Tasks — ContextDrop
 * Design: Premium card-style task list inspired by Things 3 + Notion + ContextDrop warmth
 * - Card rows with left platform accent border + soft shadow
 * - Circular progress ring in header
 * - Ticking: orange check, strikethrough, slides to bottom
 * - Inline edit on click, inline add at top
 */

import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";

interface Task {
  id: string;
  text: string;
  done: boolean;
  sourceTitle: string;
  platform: "instagram" | "tiktok" | "x" | "linkedin";
  dueToday?: boolean;
  completedAt?: number;
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#ee2a7b",
  tiktok: "#010101",
  x: "#555",
  linkedin: "#0077b5",
};

const PLATFORM_BG: Record<string, string> = {
  instagram: "linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)",
  tiktok: "#010101",
  x: "#333",
  linkedin: "#0077b5",
};

const INITIAL_TASKS: Task[] = [
  { id: "t1", text: "Set up rate limiting with Convex", done: false, sourceTitle: "App Launch Checklist (With Convex)", platform: "instagram", dueToday: true },
  { id: "t2", text: "Review RLS setup before launch", done: false, sourceTitle: "App Launch Checklist (With Convex)", platform: "instagram" },
  { id: "t3", text: "Try the Claude Code avatar pipeline", done: false, sourceTitle: "Claude Code Skill for AI Talking Head Clones", platform: "instagram", dueToday: true },
  { id: "t4", text: "I want to do this on tuesday", done: false, sourceTitle: "Claude Code Skill for AI Talking Head Clones", platform: "instagram" },
  { id: "t5", text: "Build the Make.com client onboarding flow", done: false, sourceTitle: "No-Code Agency Workflow Automation", platform: "x" },
  { id: "t6", text: "Test Graphify on the landing repo", done: false, sourceTitle: "Graphify — Visual Knowledge Graph", platform: "instagram" },
  { id: "t7", text: "Share the Convex checklist with the team", done: true, sourceTitle: "App Launch Checklist (With Convex)", platform: "instagram", completedAt: Date.now() - 1000 },
  { id: "t8", text: "Test Airtable CRM template", done: true, sourceTitle: "No-Code Agency Workflow Automation", platform: "x", completedAt: Date.now() - 2000 },
];

/** Circular SVG progress ring */
function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const pct = total === 0 ? 0 : done / total;
  const dash = pct * circ;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" style={{ flexShrink: 0 }}>
      <circle cx="28" cy="28" r={r} fill="none" stroke="#f0ede8" strokeWidth="4" />
      <circle
        cx="28" cy="28" r={r} fill="none"
        stroke="#f97316" strokeWidth="4"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 28 28)"
        style={{ transition: "stroke-dasharray 0.5s cubic-bezier(0.4,0,0.2,1)" }}
      />
      <text x="28" y="33" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1c1917">
        {done}/{total}
      </text>
    </svg>
  );
}

function PlatformPill({ platform, title, done }: { platform: Task["platform"]; title: string; done: boolean }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: done ? "#f5f3f0" : "#faf8f5",
      border: "1px solid #ede9e4",
      borderRadius: 20, padding: "3px 10px 3px 6px",
      maxWidth: 280, overflow: "hidden",
    }}>
      <div style={{ width: 10, height: 10, borderRadius: 3, background: PLATFORM_BG[platform], flexShrink: 0 }} />
      <span style={{
        fontSize: 11, fontWeight: 500,
        color: done ? "#c4bfbb" : "#78716c",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {title}
      </span>
    </div>
  );
}

function TaskCard({
  task, onToggle, onDelete, onEdit,
}: {
  task: Task; onToggle: () => void; onDelete: () => void; onEdit: (t: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [justDone, setJustDone] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.text);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) editRef.current?.focus(); }, [editing]);

  function handleToggle() {
    if (!task.done) {
      setJustDone(true);
      setTimeout(() => { setJustDone(false); onToggle(); }, 340);
    } else {
      onToggle();
    }
  }

  function commitEdit() {
    const t = editValue.trim();
    if (t && t !== task.text) onEdit(t);
    else setEditValue(task.text);
    setEditing(false);
  }

  const accentColor = task.done ? "#e7e5e4" : PLATFORM_COLORS[task.platform] || "#f97316";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        padding: "16px 18px 14px",
        borderRadius: 14,
        background: editing ? "#fff" : task.done ? "#fafaf9" : "#fff",
        border: editing
          ? "1.5px solid #fb923c"
          : `1.5px solid ${hovered && !task.done ? "#ede9e4" : "#f0ede8"}`,
        borderLeft: `4px solid ${accentColor}`,
        boxShadow: task.done
          ? "none"
          : hovered
            ? "0 4px 16px rgba(0,0,0,0.07)"
            : "0 1px 4px rgba(0,0,0,0.04)",
        transition: "box-shadow 0.18s, border-color 0.15s, background 0.12s",
        marginBottom: 10,
        opacity: task.done ? 0.7 : 1,
      }}
    >
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        style={{
          width: 24, height: 24, borderRadius: 8, flexShrink: 0, marginTop: 1,
          border: task.done ? "none" : "2px solid #d6d3d1",
          background: task.done || justDone ? "#f97316" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.22s cubic-bezier(0.34,1.56,0.64,1)",
          transform: justDone ? "scale(1.25)" : "scale(1)",
          boxShadow: task.done ? "0 2px 8px rgba(249,115,22,0.3)" : "none",
        }}
      >
        {(task.done || justDone) && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            ref={editRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") { setEditValue(task.text); setEditing(false); }
            }}
            onBlur={commitEdit}
            style={{
              width: "100%", border: "none", outline: "none", background: "transparent",
              fontSize: 15, fontWeight: 600, color: "#1c1917", fontFamily: "inherit", lineHeight: 1.4,
            }}
          />
        ) : (
          <div
            onClick={() => { if (!task.done) { setEditValue(task.text); setEditing(true); } }}
            style={{
              fontSize: 15, fontWeight: task.done ? 400 : 600,
              color: task.done ? "#a8a29e" : "#1c1917",
              textDecoration: task.done ? "line-through" : "none",
              textDecorationColor: "#c4bfbb",
              lineHeight: 1.4, cursor: task.done ? "default" : "text",
              transition: "color 0.2s",
            }}
          >
            {task.text}
          </div>
        )}

        {/* Source row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7 }}>
          <span style={{
            fontSize: 9, fontWeight: 800, color: "#c4bfbb",
            textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0,
          }}>From</span>
          <PlatformPill platform={task.platform} title={task.sourceTitle} done={task.done} />
          {task.dueToday && !task.done && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: "#f97316",
              background: "#fff7ed", border: "1px solid #fed7aa",
              padding: "1px 8px", borderRadius: 20, flexShrink: 0,
            }}>
              Today
            </span>
          )}
        </div>
      </div>

      {/* Actions on hover */}
      {!editing && (
        <div style={{
          display: "flex", alignItems: "center", gap: 2,
          opacity: hovered ? 1 : 0, transition: "opacity 0.15s",
          marginTop: 2,
        }}>
          {!task.done && (
            <button
              onClick={() => { setEditValue(task.text); setEditing(true); }}
              title="Edit"
              style={{
                background: "#f5f3f0", border: "none", cursor: "pointer",
                color: "#a8a29e", padding: "5px 6px", borderRadius: 7,
                display: "flex", alignItems: "center",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          )}
          <button
            onClick={onDelete}
            title="Delete"
            style={{
              background: "#f5f3f0", border: "none", cursor: "pointer",
              color: "#c4bfbb", padding: "5px 6px", borderRadius: 7,
              display: "flex", alignItems: "center",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6M14 11v6"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

function AddTaskBar({ onAdd }: { onAdd: (text: string) => void }) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    const t = value.trim();
    if (!t) return;
    onAdd(t);
    setValue("");
  }

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "14px 18px",
        borderRadius: 14,
        border: `1.5px solid ${focused ? "#fb923c" : "#ede9e4"}`,
        background: "#fff",
        boxShadow: focused ? "0 0 0 3px rgba(249,115,22,0.08), 0 2px 8px rgba(0,0,0,0.05)" : "0 1px 4px rgba(0,0,0,0.04)",
        transition: "border-color 0.15s, box-shadow 0.15s",
        marginBottom: 20,
      }}
    >
      <div style={{
        width: 24, height: 24, borderRadius: 8, flexShrink: 0,
        border: "2px dashed #d6d3d1",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#c4bfbb" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </div>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Add a task…"
        style={{
          flex: 1, border: "none", outline: "none", background: "transparent",
          fontSize: 15, fontWeight: 500, color: "#1c1917", fontFamily: "inherit",
        }}
      />
      {value.trim() && (
        <button
          onClick={submit}
          style={{
            background: "#f97316", color: "#fff", border: "none",
            borderRadius: 9, padding: "6px 16px", fontSize: 12,
            fontWeight: 700, cursor: "pointer", flexShrink: 0,
            boxShadow: "0 2px 8px rgba(249,115,22,0.3)",
          }}
        >
          Add
        </button>
      )}
    </div>
  );
}

function NavItem({ icon, label, count, active, onClick }: {
  icon: React.ReactNode; label: string; count?: number; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%",
        padding: "8px 12px", borderRadius: 8,
        background: active ? "#fff7ed" : "transparent",
        border: "none", cursor: "pointer", textAlign: "left", transition: "background 0.12s",
      }}
    >
      <span style={{ color: active ? "#f97316" : "#78716c", display: "flex" }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 13, fontWeight: active ? 600 : 500, color: active ? "#f97316" : "#44403c" }}>
        {label}
      </span>
      {count !== undefined && count > 0 && (
        <span style={{
          fontSize: 11, fontWeight: 700,
          background: active ? "#fed7aa" : "#f5f3f0",
          color: active ? "#ea580c" : "#a8a29e",
          padding: "1px 7px", borderRadius: 20,
        }}>
          {count}
        </span>
      )}
    </button>
  );
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [connectorsOpen, setConnectorsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "today">("all");

  function toggleTask(id: string) {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === id);
      if (!task) return prev;
      const updated = { ...task, done: !task.done, completedAt: !task.done ? Date.now() : undefined };
      const rest = prev.filter((t) => t.id !== id);
      if (updated.done) {
        const doneItems = rest.filter((t) => t.done);
        const activeItems = rest.filter((t) => !t.done);
        return [...activeItems, ...doneItems, updated];
      } else {
        const doneItems = rest.filter((t) => t.done);
        const activeItems = rest.filter((t) => !t.done);
        return [updated, ...activeItems, ...doneItems];
      }
    });
  }

  function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function editTask(id: string, newText: string) {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, text: newText } : t));
  }

  function addTask(text: string) {
    const newTask: Task = {
      id: `t${Date.now()}`,
      text,
      done: false,
      sourceTitle: "My Tasks",
      platform: "instagram",
    };
    setTasks((prev) => {
      const doneItems = prev.filter((t) => t.done);
      const activeItems = prev.filter((t) => !t.done);
      return [newTask, ...activeItems, ...doneItems];
    });
  }

  const displayed = filter === "today"
    ? tasks.filter((t) => t.dueToday || t.done)
    : tasks;

  const activeCount = tasks.filter((t) => !t.done).length;
  const todayCount = tasks.filter((t) => t.dueToday && !t.done).length;
  const doneCount = tasks.filter((t) => t.done).length;
  const total = tasks.length;

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f7f5f2", fontFamily: "'DM Sans', 'Inter', sans-serif" }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: 240, flexShrink: 0, borderRight: "1px solid #ede9e4",
        background: "#fff", display: "flex", flexDirection: "column",
        padding: "20px 12px", overflowY: "auto",
      }}>
        {/* Logo */}
        <Link href="/">
          <a style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 12px", marginBottom: 20, textDecoration: "none" }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "#f97316", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span style={{ fontWeight: 800, fontSize: 15, color: "#1c1917" }}>ContextDrop</span>
          </a>
        </Link>

        {/* Profile */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#fb923c,#ea580c)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
            KT
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>Kaan Taskentt</div>
            <div style={{ fontSize: 11, color: "#a8a29e" }}>@kaantaskentt</div>
          </div>
        </div>

        {/* Credits */}
        <div style={{ margin: "4px 12px 16px", padding: "10px 12px", background: "#fafaf8", borderRadius: 10, border: "1px solid #f0ede8" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "#78716c", fontWeight: 500 }}>Monthly credits</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#f97316" }}>47 / 100</span>
          </div>
          <div style={{ height: 4, background: "#f0ede8", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: "47%", height: "100%", background: "linear-gradient(90deg,#fb923c,#f97316)", borderRadius: 2 }} />
          </div>
          <div style={{ fontSize: 10, color: "#a8a29e", marginTop: 5 }}>1 credit = 1 analysis · Resets in 14 days</div>
        </div>

        {/* Nav */}
        <Link href="/dashboard">
          <a style={{ textDecoration: "none" }}>
            <NavItem
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
              label="My Feed" active={false} onClick={() => {}}
            />
          </a>
        </Link>
        <NavItem
          icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>}
          label="Tasks" count={activeCount} active={true} onClick={() => {}}
        />
        <Link href="/chat">
          <a style={{ textDecoration: "none" }}>
            <NavItem
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>}
              label="Ask AI" active={false} onClick={() => {}}
            />
          </a>
        </Link>

        <div style={{ height: 1, background: "#f5f3f0", margin: "8px 12px 12px" }} />

        <div style={{ padding: "0 12px", marginBottom: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#c4bfbb", marginBottom: 6 }}>Filter</div>
        </div>
        <NavItem
          icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>}
          label="All Tasks" count={activeCount} active={filter === "all"} onClick={() => setFilter("all")}
        />
        <NavItem
          icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
          label="Today" count={todayCount} active={filter === "today"} onClick={() => setFilter("today")}
        />

        <div style={{ flex: 1 }} />

        {/* Connectors */}
        <div style={{ borderTop: "1px solid #f5f3f0", paddingTop: 12, marginTop: 8 }}>
          <button
            onClick={() => setConnectorsOpen((v) => !v)}
            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 12px", background: "transparent", border: "none", cursor: "pointer", borderRadius: 8 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#78716c" strokeWidth="2" strokeLinecap="round">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
            </svg>
            <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: "#78716c", textAlign: "left" }}>Connectors</span>
            <span style={{ fontSize: 10, fontWeight: 700, background: "#dcfce7", color: "#16a34a", padding: "1px 6px", borderRadius: 20 }}>1</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#c4bfbb" strokeWidth="2" strokeLinecap="round"
              style={{ transition: "transform 0.2s", transform: connectorsOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {connectorsOpen && (
            <div style={{ padding: "4px 12px 8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "#fafaf8", borderRadius: 8, marginBottom: 6 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "#fff", fontSize: 10, fontWeight: 800 }}>N</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#1c1917" }}>Notion</div>
                  <div style={{ fontSize: 10, color: "#a8a29e" }}>My Workspace</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
                  <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 600 }}>On</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "#fafaf8", borderRadius: 8, marginBottom: 6 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: "#db4035", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "#fff", fontSize: 9, fontWeight: 800 }}>T</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#1c1917" }}>Todoist</div>
                  <div style={{ fontSize: 10, color: "#a8a29e" }}>Connect to sync tasks</div>
                </div>
                <button style={{ fontSize: 10, fontWeight: 700, color: "#f97316", background: "#fff7ed", border: "1px solid #fed7aa", padding: "3px 8px", borderRadius: 20, cursor: "pointer" }}>
                  Connect
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "#fafaf8", borderRadius: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 8, background: "#fff", border: "1px solid #e7e5e4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="18" rx="2" stroke="#4285f4" strokeWidth="2"/>
                    <line x1="16" y1="2" x2="16" y2="6" stroke="#4285f4" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="8" y1="2" x2="8" y2="6" stroke="#4285f4" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="3" y1="10" x2="21" y2="10" stroke="#4285f4" strokeWidth="2"/>
                    <text x="12" y="18" textAnchor="middle" fontSize="7" fontWeight="700" fill="#ea4335">G</text>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#1c1917" }}>Google Calendar</div>
                  <div style={{ fontSize: 10, color: "#a8a29e" }}>Schedule tasks from content</div>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#a8a29e", background: "#f5f5f4", padding: "3px 7px", borderRadius: 20 }}>Soon</span>
              </div>
            </div>
          )}
          <button style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 12px", background: "transparent", border: "none", cursor: "pointer", borderRadius: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#78716c" strokeWidth="2" strokeLinecap="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#78716c" }}>Send a video to analyse</span>
          </button>
          <Link href="/">
            <a style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", textDecoration: "none", borderRadius: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="2" strokeLinecap="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              </svg>
              <span style={{ fontSize: 12, color: "#a8a29e" }}>Back to site</span>
            </a>
          </Link>
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "52px 36px 80px" }}>

          {/* Header with progress ring */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 36 }}>
            <ProgressRing done={doneCount} total={total} />
            <div>
              <h1 style={{ fontSize: 30, fontWeight: 800, color: "#1c1917", margin: 0, letterSpacing: "-0.5px" }}>
                {filter === "today" ? "Today" : "My Tasks"}
              </h1>
              <p style={{ fontSize: 13, color: "#a8a29e", margin: "4px 0 0" }}>
                {activeCount > 0
                  ? `${activeCount} remaining${doneCount > 0 ? ` · ${doneCount} completed` : ""}`
                  : "All done! 🎉"}
              </p>
            </div>
          </div>

          {/* Add task */}
          <AddTaskBar onAdd={addTask} />

          {/* Task list */}
          {displayed.length === 0 ? (
            <div style={{ textAlign: "center", padding: "56px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#44403c", marginBottom: 6 }}>All clear!</div>
              <div style={{ fontSize: 13, color: "#a8a29e" }}>No tasks yet. Add one above or analyse a video to get started.</div>
            </div>
          ) : (
            <div>
              {displayed.map((task, i) => {
                const prevDone = i > 0 && displayed[i - 1].done;
                const showDivider = !prevDone && task.done && doneCount > 0;
                return (
                  <div key={task.id}>
                    {showDivider && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0 14px" }}>
                        <div style={{ flex: 1, height: 1, background: "#ede9e4" }} />
                        <span style={{ fontSize: 10, color: "#c4bfbb", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                          Completed
                        </span>
                        <div style={{ flex: 1, height: 1, background: "#ede9e4" }} />
                      </div>
                    )}
                    <TaskCard
                      task={task}
                      onToggle={() => toggleTask(task.id)}
                      onDelete={() => deleteTask(task.id)}
                      onEdit={(newText) => editTask(task.id, newText)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
