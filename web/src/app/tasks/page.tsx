"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface TaskWithSource {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
  completed_at: string | null;
  analysis_id: string;
  analyses: { source_url: string; platform: string; verdict: string | null } | null;
}

interface StarredAnalysis {
  id: string;
  platform: string;
  verdict: string | null;
  caption: string | null;
  starred_at: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#ee2a7b",
  tiktok: "#010101",
  x: "#555",
  linkedin: "#0077b5",
  youtube: "#dc2626",
  article: "#3b82f6",
};

function parseTitle(verdict: string | null): string {
  if (!verdict) return "Untitled analysis";
  const match = verdict.match(/🔷\s*(.+)/);
  return match ? match[1].trim() : verdict.slice(0, 60);
}

function parseStarredTitle(a: StarredAnalysis): string {
  if (a.verdict) {
    const match = a.verdict.match(/🔷\s*(.+)/);
    if (match) return match[1].trim().slice(0, 72);
    const lines = a.verdict.split("\n").filter((l) => l.trim());
    if (lines[0]) return lines[0].replace(/^[📍🌱🍵🪜#*\s]+/, "").slice(0, 72);
  }
  if (a.caption) return a.caption.slice(0, 72);
  return "Untitled";
}

type Tab = "all" | "active" | "done";

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskWithSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [starred, setStarred] = useState<StarredAnalysis[]>([]);
  const [tab, setTab] = useState<Tab>("active");

  useEffect(() => {
    fetch("/api/tasks")
      .then((r) => { if (!r.ok) { router.push("/login"); return null; } return r.json(); })
      .then((data) => { if (data?.tasks) setTasks(data.tasks); setLoading(false); })
      .catch(() => setLoading(false));

    fetch("/api/analyses?starred=true&limit=20")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.analyses) setStarred(data.analyses); })
      .catch(() => {});
  }, [router]);

  const handleMarkDone = async (id: string) => {
    setStarred((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/analyses/${id}/state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: "tried" }),
    });
  };

  const handleToggle = async (task: TaskWithSource) => {
    const newCompleted = !task.completed;
    setTasks((prev) => prev.map((t) => t.id === task.id
      ? { ...t, completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null }
      : t
    ));
    await fetch(`/api/analyses/${task.analysis_id}/todos`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ todoId: task.id, completed: newCompleted }),
    });
  };

  const handleDelete = async (task: TaskWithSource) => {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    await fetch(`/api/analyses/${task.analysis_id}/todos`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ todoId: task.id }),
    });
  };

  const handleEdit = async (task: TaskWithSource, newTitle: string) => {
    if (!newTitle.trim() || newTitle.trim() === task.title) return;
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, title: newTitle.trim() } : t));
    await fetch(`/api/analyses/${task.analysis_id}/todos`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ todoId: task.id, title: newTitle.trim() }),
    });
  };

  const active = tasks.filter((t) => !t.completed);
  const done = tasks.filter((t) => t.completed);
  const pct = tasks.length === 0 ? 0 : Math.round((done.length / tasks.length) * 100);

  const visibleTasks = tab === "active" ? active : tab === "done" ? done : tasks;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#faf8f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, border: "3px solid #f0ebe4", borderTopColor: "#f97316", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#faf8f5", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .task-card { animation: fadeSlideIn 0.2s ease forwards; }
      `}</style>

      {/* Header */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(250,248,245,0.92)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid #e7e2d9",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 20px", height: 56, maxWidth: 760, margin: "0 auto" }}>
          <a href="/dashboard" style={{ color: "#a8a29e", textDecoration: "none", display: "flex", alignItems: "center", padding: 6, borderRadius: 8, transition: "background 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#f0ebe4"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </a>
          <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "#f97316", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M2.5 7L6 10.5L11.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.02em", color: "#1c1917" }}>
              Context<span style={{ color: "#f97316" }}>Drop</span>
            </span>
          </a>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d6d3d1" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#78716c" }}>Tasks</span>
        </div>
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px 64px" }}>

        {/* Hero stat bar */}
        <div style={{
          background: "#fff",
          border: "1px solid #e7e2d9",
          borderRadius: 20,
          padding: "24px 28px",
          marginBottom: 28,
          display: "flex",
          alignItems: "center",
          gap: 24,
        }}>
          {/* Progress ring */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="26" fill="none" stroke="#f5f1eb" strokeWidth="5" />
              <circle
                cx="32" cy="32" r="26" fill="none" stroke="#f97316" strokeWidth="5"
                strokeDasharray={`${(pct / 100) * 2 * Math.PI * 26} ${2 * Math.PI * 26}`}
                strokeLinecap="round"
                transform="rotate(-90 32 32)"
                style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1)" }}
              />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#1c1917" }}>{pct}%</span>
            </div>
          </div>

          {/* Stats */}
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1c1917", margin: "0 0 4px", letterSpacing: "-0.02em" }}>My Tasks</h1>
            <p style={{ fontSize: 13, color: "#a8a29e", margin: 0 }}>
              {active.length === 0
                ? done.length > 0 ? "All done — great work." : "Nothing here yet."
                : `${active.length} left to do · ${done.length} completed`}
            </p>
          </div>

          {/* Mini stat pills */}
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <div style={{ textAlign: "center", padding: "8px 14px", background: "#faf8f5", borderRadius: 12, border: "1px solid #ede9e4" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#1c1917" }}>{active.length}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.06em" }}>Active</div>
            </div>
            <div style={{ textAlign: "center", padding: "8px 14px", background: "#faf8f5", borderRadius: 12, border: "1px solid #ede9e4" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#f97316" }}>{done.length}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.06em" }}>Done</div>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#f0ebe4", borderRadius: 12, padding: 4 }}>
          {([ ["active", "Active", active.length], ["done", "Done", done.length], ["all", "All", tasks.length] ] as [Tab, string, number][]).map(([value, label, count]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              style={{
                flex: 1,
                padding: "7px 12px",
                fontSize: 13,
                fontWeight: 600,
                color: tab === value ? "#1c1917" : "#a8a29e",
                background: tab === value ? "#fff" : "transparent",
                border: "none",
                borderRadius: 9,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.15s",
                boxShadow: tab === value ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {label}
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: tab === value ? (value === "done" ? "#f97316" : "#78716c") : "#c4bdb5",
                background: tab === value ? (value === "done" ? "#fff7ed" : "#f5f1eb") : "transparent",
                padding: "1px 6px", borderRadius: 20,
                transition: "all 0.15s",
              }}>{count}</span>
            </button>
          ))}
        </div>

        {/* Up next — starred analyses (only in active/all tab) */}
        {starred.length > 0 && tab !== "done" && (
          <div style={{
            background: "linear-gradient(135deg, #fff7ed 0%, #fff 60%)",
            border: "1px solid #fed7aa",
            borderRadius: 18,
            padding: "18px 20px",
            marginBottom: 20,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#f97316" stroke="none">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#f97316" }}>Up next</span>
              <span style={{ fontSize: 11, color: "#fbd38d", marginLeft: 2 }}>— analyses you starred</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {starred.map((a) => {
                const color = PLATFORM_COLORS[a.platform] || "#e7e2d9";
                return (
                  <div key={a.id} style={{
                    background: "#fff",
                    borderRadius: 12,
                    border: "1px solid #ede9e4",
                    borderLeft: `3px solid ${color}`,
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                    <a href={`/dashboard?expand=${a.id}`} style={{ flex: 1, minWidth: 0, textDecoration: "none" }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#1c1917", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {parseStarredTitle(a)}
                      </p>
                      <p style={{ fontSize: 11, color: "#a8a29e", margin: "2px 0 0", textTransform: "capitalize" }}>{a.platform}</p>
                    </a>
                    <button
                      onClick={() => handleMarkDone(a.id)}
                      style={{
                        fontSize: 11, fontWeight: 700,
                        color: "#15803d",
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        borderRadius: 20,
                        padding: "5px 14px",
                        cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#dcfce7"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "#f0fdf4"; }}
                    >
                      Mark done ✓
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Task list */}
        {visibleTasks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "56px 20px" }}>
            {tab === "done" ? (
              <>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#78716c", marginBottom: 6 }}>Nothing done yet.</p>
                <p style={{ fontSize: 13, color: "#a8a29e" }}>Check off tasks as you complete them — they&apos;ll show up here.</p>
              </>
            ) : tasks.length === 0 ? (
              <>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#78716c", marginBottom: 6 }}>No tasks yet.</p>
                <p style={{ fontSize: 13, color: "#a8a29e" }}>Open an analysis on your feed and add a task from there.</p>
                <a href="/dashboard" style={{ display: "inline-block", marginTop: 16, fontSize: 13, fontWeight: 700, color: "#f97316", textDecoration: "none" }}>Go to Feed →</a>
              </>
            ) : (
              <>
                <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#78716c", marginBottom: 6 }}>All done!</p>
                <p style={{ fontSize: 13, color: "#a8a29e" }}>Every task is completed. Nice.</p>
              </>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {visibleTasks.map((task, i) => (
              <TaskCard
                key={task.id}
                task={task}
                index={i}
                onToggle={() => handleToggle(task)}
                onDelete={() => handleDelete(task)}
                onEdit={(t) => handleEdit(task, t)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function TaskCard({
  task, index, onToggle, onDelete, onEdit,
}: {
  task: TaskWithSource; index: number; onToggle: () => void; onDelete: () => void; onEdit: (title: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(task.title);
  const editRef = useRef<HTMLInputElement>(null);
  const platform = task.analyses?.platform || "article";
  const sourceTitle = parseTitle(task.analyses?.verdict || null);
  const borderColor = PLATFORM_COLORS[platform] || "#e7e2d9";

  useEffect(() => {
    if (editing && editRef.current) editRef.current.focus();
  }, [editing]);

  const commitEdit = () => {
    if (editText.trim() && editText.trim() !== task.title) {
      onEdit(editText.trim());
    } else {
      setEditText(task.title);
    }
    setEditing(false);
  };

  return (
    <div
      className="task-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: task.completed ? "#faf8f5" : "#fff",
        borderRadius: 16,
        border: `1px solid ${hovered && !task.completed ? "#d6cfc7" : "#e7e2d9"}`,
        borderLeft: `3px solid ${task.completed ? "#e7e2d9" : borderColor}`,
        padding: "16px 20px",
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        transition: "box-shadow 0.15s, border-color 0.15s, transform 0.15s",
        boxShadow: hovered && !task.completed ? "0 4px 20px rgba(0,0,0,0.07)" : "0 1px 3px rgba(0,0,0,0.03)",
        transform: hovered && !task.completed ? "translateY(-1px)" : "none",
        opacity: task.completed ? 0.65 : 1,
        animationDelay: `${index * 0.03}s`,
      }}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        style={{
          width: 22, height: 22, borderRadius: 7, flexShrink: 0, marginTop: 2,
          border: task.completed ? "none" : "2px solid #d6d3d1",
          background: task.completed ? "#f97316" : "#fff",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s", padding: 0,
          boxShadow: task.completed ? "0 2px 8px rgba(249,115,22,0.3)" : "none",
        }}
        onMouseEnter={(e) => { if (!task.completed) e.currentTarget.style.borderColor = "#f97316"; }}
        onMouseLeave={(e) => { if (!task.completed) e.currentTarget.style.borderColor = "#d6d3d1"; }}
      >
        {task.completed && (
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            ref={editRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") { setEditText(task.title); setEditing(false); }
            }}
            style={{
              width: "100%", fontSize: 15, fontWeight: 600, color: "#1c1917",
              border: "1.5px solid #f97316", borderRadius: 8, padding: "4px 10px",
              outline: "none", fontFamily: "'DM Sans', sans-serif",
              boxShadow: "0 0 0 3px rgba(249,115,22,0.12)",
              background: "#fff",
            }}
          />
        ) : (
          <p
            onClick={() => { if (!task.completed) setEditing(true); }}
            style={{
              fontSize: 15, fontWeight: 600,
              color: task.completed ? "#c4bdb5" : "#1c1917",
              textDecoration: task.completed ? "line-through" : "none",
              textDecorationColor: "#d6d3d1",
              margin: 0, lineHeight: 1.45,
              cursor: task.completed ? "default" : "text",
            }}
          >
            {task.title}
          </p>
        )}

        {/* Source chip */}
        <a
          href={`/dashboard?expand=${task.analysis_id}`}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            marginTop: 8,
            background: task.completed ? "transparent" : "#faf8f5",
            border: `1px solid ${task.completed ? "transparent" : "#ede9e4"}`,
            borderRadius: 20,
            padding: "3px 10px 3px 7px",
            maxWidth: "100%",
            overflow: "hidden",
            textDecoration: "none",
            transition: "border-color 0.15s, background 0.15s",
          }}
          onMouseEnter={(e) => {
            if (!task.completed) {
              e.currentTarget.style.borderColor = "#f97316";
              e.currentTarget.style.background = "#fff7ed";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = task.completed ? "transparent" : "#ede9e4";
            e.currentTarget.style.background = task.completed ? "transparent" : "#faf8f5";
          }}
        >
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: task.completed ? "#d6d3d1" : borderColor, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: task.completed ? "#c4bdb5" : "#78716c", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {sourceTitle}
          </span>
        </a>
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        style={{
          padding: 6, background: "none", border: "none",
          cursor: "pointer", color: hovered ? "#d6d3d1" : "transparent",
          flexShrink: 0, borderRadius: 8,
          transition: "color 0.15s, background 0.15s",
          marginTop: 1,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "#fef2f2"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = hovered ? "#d6d3d1" : "transparent"; e.currentTarget.style.background = "transparent"; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
        </svg>
      </button>
    </div>
  );
}
