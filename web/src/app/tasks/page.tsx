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
  return match ? match[1].trim() : verdict.slice(0, 50);
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const pct = total === 0 ? 0 : done / total;
  const dash = pct * circ;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" style={{ flexShrink: 0 }}>
      <circle cx="28" cy="28" r={r} fill="none" stroke="#f0ede8" strokeWidth="4" />
      <circle cx="28" cy="28" r={r} fill="none" stroke="#f97316" strokeWidth="4" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 28 28)" style={{ transition: "stroke-dasharray 0.5s cubic-bezier(0.4,0,0.2,1)" }} />
      <text x="28" y="33" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1c1917" fontFamily="'DM Sans', sans-serif">{done}/{total}</text>
    </svg>
  );
}

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskWithSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/tasks")
      .then((r) => { if (!r.ok) { router.push("/login"); return null; } return r.json(); })
      .then((data) => { if (data?.tasks) setTasks(data.tasks); setLoading(false); })
      .catch(() => setLoading(false));
  }, [router]);

  const handleToggle = async (task: TaskWithSource) => {
    const newCompleted = !task.completed;
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null } : t));

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

  const pending = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);
  const total = tasks.length;
  const doneCount = completed.length;

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
      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(250,248,245,0.88)", backdropFilter: "blur(16px)", borderBottom: "1px solid #e7e2d9" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 20px", height: 56, maxWidth: 720, margin: "0 auto" }}>
          <a href="/dashboard" style={{ color: "#78716c", textDecoration: "none", display: "flex", alignItems: "center", padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </a>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>
            Context<span style={{ color: "#f97316" }}>Drop</span>
          </span>
          <span style={{ fontSize: 13, color: "#a8a29e", marginLeft: 4 }}>/ Tasks</span>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px" }}>
        {/* Title + progress ring */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <ProgressRing done={doneCount} total={total} />
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1c1917", margin: 0, letterSpacing: "-0.02em" }}>My Tasks</h1>
            <p style={{ fontSize: 13, color: "#a8a29e", margin: "4px 0 0 0" }}>
              {pending.length} remaining · {doneCount} completed
            </p>
          </div>
        </div>

        {/* Empty state */}
        {tasks.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <p style={{ fontSize: 15, color: "#78716c", marginBottom: 8 }}>No tasks yet.</p>
            <p style={{ fontSize: 13, color: "#a8a29e" }}>Open an analysis on your dashboard and add a task from there.</p>
            <a href="/dashboard" style={{ display: "inline-block", marginTop: 16, fontSize: 13, fontWeight: 600, color: "#f97316", textDecoration: "none" }}>Go to dashboard →</a>
          </div>
        )}

        {/* Pending tasks */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {pending.map((task) => (
            <TaskCard key={task.id} task={task} onToggle={() => handleToggle(task)} onDelete={() => handleDelete(task)} />
          ))}
        </div>

        {/* Completed */}
        {completed.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "28px 0 12px" }}>
              <div style={{ flex: 1, height: 1, background: "#e7e2d9" }} />
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#c4bdb5" }}>Completed</span>
              <div style={{ flex: 1, height: 1, background: "#e7e2d9" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {completed.map((task) => (
                <TaskCard key={task.id} task={task} onToggle={() => handleToggle(task)} onDelete={() => handleDelete(task)} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function TaskCard({ task, onToggle, onDelete }: { task: TaskWithSource; onToggle: () => void; onDelete: () => void }) {
  const [hovered, setHovered] = useState(false);
  const platform = task.analyses?.platform || "article";
  const sourceTitle = parseTitle(task.analyses?.verdict || null);
  const borderColor = PLATFORM_COLORS[platform] || "#e7e2d9";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "white",
        borderRadius: 14,
        border: "1px solid #e7e2d9",
        borderLeft: `3px solid ${task.completed ? "#d6d3d1" : borderColor}`,
        padding: "14px 16px",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        transition: "box-shadow 0.15s, transform 0.15s",
        boxShadow: hovered && !task.completed ? "0 4px 16px rgba(0,0,0,0.06)" : "0 1px 4px rgba(0,0,0,0.03)",
        transform: hovered && !task.completed ? "translateY(-1px)" : "none",
        opacity: task.completed ? 0.6 : 1,
      }}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        style={{
          width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
          border: task.completed ? "none" : "2px solid #d6d3d1",
          background: task.completed ? "#f97316" : "white",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s", padding: 0,
        }}
      >
        {task.completed && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 14, fontWeight: 600, color: task.completed ? "#c4bdb5" : "#1c1917",
          textDecoration: task.completed ? "line-through" : "none",
          margin: 0, lineHeight: 1.4,
        }}>
          {task.title}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.06em" }}>From</span>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: task.completed ? "#f5f3f0" : "#faf8f5", border: "1px solid #ede9e4", borderRadius: 20, padding: "2px 10px 2px 6px", maxWidth: 260, overflow: "hidden" }}>
            <div style={{ width: 8, height: 8, borderRadius: 3, background: borderColor, flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: task.completed ? "#c4bdb5" : "#78716c", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {sourceTitle}
            </span>
          </div>
        </div>
      </div>

      {/* Delete */}
      {hovered && (
        <button
          onClick={onDelete}
          style={{ padding: 4, background: "none", border: "none", cursor: "pointer", color: "#d6d3d1", flexShrink: 0, transition: "color 0.15s" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#d6d3d1"; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
        </button>
      )}
    </div>
  );
}
