"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Todo } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  analysisId: string;
  initialTodos?: Todo[];
  prefillTitle?: string;
  onFirstTodoAdded?: () => void;
}

export default function TodoList({ analysisId, initialTodos, prefillTitle, onFirstTodoAdded }: Props) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos || []);
  const [newTitle, setNewTitle] = useState(prefillTitle || "");
  const [adding, setAdding] = useState(false);
  const [showInput, setShowInput] = useState(!!(prefillTitle));
  const inputRef = useRef<HTMLInputElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  // Load todos on mount if not provided
  useEffect(() => {
    if (initialTodos) return;
    fetch(`/api/analyses/${analysisId}/todos`)
      .then((r) => r.json())
      .then((data) => { if (data.todos) setTodos(data.todos); })
      .catch(() => {});
  }, [analysisId, initialTodos]);

  // Focus add input when shown
  useEffect(() => {
    if (showInput && inputRef.current) inputRef.current.focus();
  }, [showInput]);

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingId && editRef.current) editRef.current.focus();
  }, [editingId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newTitle.trim() || adding) return;

    const wasEmpty = todos.length === 0;
    setAdding(true);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      const data = await res.json();
      if (data.todo) {
        setTodos((prev) => [...prev, data.todo]);
        setNewTitle("");
        setShowInput(false);
        if (wasEmpty) onFirstTodoAdded?.();
      }
    } catch {
      // Keep input for retry
    }
    setAdding(false);
  };

  const handleToggle = async (todo: Todo) => {
    const newCompleted = !todo.completed;
    setTodos((prev) =>
      prev.map((t) =>
        t.id === todo.id
          ? { ...t, completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null }
          : t,
      ),
    );
    try {
      await fetch(`/api/analyses/${analysisId}/todos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ todoId: todo.id, completed: newCompleted }),
      });
    } catch {
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, completed: todo.completed, completed_at: todo.completed_at } : t)),
      );
    }
  };

  const handleDelete = async (e: React.MouseEvent, todoId: string) => {
    e.stopPropagation();
    setTodos((prev) => prev.filter((t) => t.id !== todoId));
    try {
      await fetch(`/api/analyses/${analysisId}/todos`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ todoId }),
      });
    } catch {}
  };

  const handleEdit = async (todoId: string, title: string) => {
    if (!title.trim()) return;
    setTodos((prev) => prev.map((t) => t.id === todoId ? { ...t, title: title.trim() } : t));
    setEditingId(null);
    await fetch(`/api/analyses/${analysisId}/todos`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ todoId, title: title.trim() }),
    }).catch(() => {});
  };

  const commitEdit = (todoId: string, originalTitle: string) => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== originalTitle) handleEdit(todoId, trimmed);
    else { setEditingId(null); setEditText(""); }
  };

  const completedCount = todos.filter((t) => t.completed).length;
  const hasAny = todos.length > 0;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: hasAny ? "#fff" : "transparent",
        border: hasAny ? "1px solid #e7e2d9" : "none",
        borderRadius: 14,
        padding: hasAny ? 16 : 0,
      }}
    >
      {/* Header — only when there are todos */}
      {hasAny && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <p style={{ fontSize: 10, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, margin: 0 }}>
            Tasks
          </p>
          {completedCount > 0 && (
            <span style={{ fontSize: 10, color: "#a8a29e" }}>
              {completedCount}/{todos.length} done
            </span>
          )}
        </div>
      )}

      {/* Todo items */}
      <AnimatePresence initial={false}>
        {todos.map((todo) => (
          <motion.div
            key={todo.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 0",
              }}
            >
              {/* Checkbox — 44px touch target for mobile */}
              <button
                onClick={() => handleToggle(todo)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  padding: 0,
                  margin: "-4px -4px -4px -4px",
                }}
              >
                <div style={{
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  border: todo.completed ? "none" : "1.5px solid #d6d3d1",
                  background: todo.completed ? "#f97316" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s",
                  flexShrink: 0,
                }}>
                  {todo.completed && (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </button>

              {/* Title — click to edit (not allowed when completed) */}
              {editingId === todo.id ? (
                <input
                  ref={editRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={() => commitEdit(todo.id, todo.title)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); commitEdit(todo.id, todo.title); }
                    if (e.key === "Escape") { setEditingId(null); setEditText(""); }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    flex: 1,
                    fontSize: 16, // 16px prevents iOS Safari auto-zoom
                    color: "#1c1917",
                    border: "1.5px solid #f97316",
                    borderRadius: 7,
                    padding: "3px 8px",
                    outline: "none",
                    fontFamily: "'DM Sans', sans-serif",
                    background: "#fff",
                    boxShadow: "0 0 0 3px rgba(249,115,22,0.10)",
                    lineHeight: 1.4,
                  }}
                />
              ) : (
                <span
                  onClick={() => {
                    if (!todo.completed) {
                      setEditingId(todo.id);
                      setEditText(todo.title);
                    }
                  }}
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: todo.completed ? "#c4bdb5" : "#44403c",
                    textDecoration: todo.completed ? "line-through" : "none",
                    lineHeight: 1.4,
                    transition: "all 0.15s",
                    cursor: todo.completed ? "default" : "text",
                    wordBreak: "break-word",
                  }}
                >
                  {todo.title}
                </span>
              )}

              {/* Delete — 36px touch target */}
              <button
                onClick={(e) => handleDelete(e, todo.id)}
                style={{
                  width: 36,
                  height: 36,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#d6d3d1",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  transition: "color 0.15s",
                  margin: "-4px -8px -4px 0",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#d6d3d1"; }}
              >
                <Trash2 style={{ width: 13, height: 13 }} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Zero-tasks prompt when prefillTitle is set */}
      {!hasAny && prefillTitle && (
        <p style={{ fontSize: 11, color: "#a8a29e", margin: "0 0 8px 0", lineHeight: 1.5 }}>
          ↳ Add the action above as a task, or write your own:
        </p>
      )}

      {/* Add input — show when toggled or no todos yet */}
      {showInput || !hasAny ? (
        <form
          onSubmit={handleAdd}
          style={{
            display: "flex",
            gap: 8,
            marginTop: hasAny ? 8 : 0,
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add a task..."
            style={{
              flex: 1,
              padding: "8px 12px",
              fontSize: 16, // 16px prevents iOS Safari auto-zoom
              border: "1px solid #e7e2d9",
              borderRadius: 10,
              outline: "none",
              color: "#1c1917",
              fontFamily: "'DM Sans', sans-serif",
              background: hasAny ? "#faf8f5" : "#fff",
            }}
            onFocus={(e) => { e.target.style.borderColor = "#f97316"; }}
            onBlur={(e) => { e.target.style.borderColor = "#e7e2d9"; }}
          />
          <button
            type="submit"
            disabled={adding || !newTitle.trim()}
            style={{
              padding: "8px 14px",
              background: adding || !newTitle.trim() ? "#e7e2d9" : "#f97316",
              color: adding || !newTitle.trim() ? "#a8a29e" : "#fff",
              fontWeight: 600,
              fontSize: 13,
              borderRadius: 10,
              border: "none",
              cursor: adding || !newTitle.trim() ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              flexShrink: 0,
              minHeight: 44,
            }}
          >
            {adding ? "..." : "Add"}
          </button>
        </form>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginTop: 8,
            padding: "8px 0",
            background: "none",
            border: "none",
            fontSize: 12,
            color: "#a8a29e",
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
            minHeight: 44,
          }}
        >
          <Plus style={{ width: 12, height: 12 }} /> Add task
        </button>
      )}
    </div>
  );
}
