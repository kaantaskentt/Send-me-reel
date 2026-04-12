"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Todo } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  analysisId: string;
  initialTodos?: Todo[];
}

export default function TodoList({ analysisId, initialTodos }: Props) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos || []);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load todos on mount if not provided
  useEffect(() => {
    if (initialTodos) return;
    fetch(`/api/analyses/${analysisId}/todos`)
      .then((r) => r.json())
      .then((data) => { if (data.todos) setTodos(data.todos); })
      .catch(() => {});
  }, [analysisId, initialTodos]);

  // Focus input when shown
  useEffect(() => {
    if (showInput && inputRef.current) inputRef.current.focus();
  }, [showInput]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newTitle.trim() || adding) return;

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
      }
    } catch {
      // Keep input for retry
    }
    setAdding(false);
  };

  const handleToggle = async (todo: Todo) => {
    // Optimistic update
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
      // Revert on error
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
    } catch {
      // Already removed visually — acceptable trade-off
    }
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
                gap: 10,
                padding: "6px 0",
              }}
            >
              {/* Checkbox */}
              <button
                onClick={() => handleToggle(todo)}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  border: todo.completed ? "none" : "1.5px solid #d6d3d1",
                  background: todo.completed ? "#f97316" : "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.15s",
                  padding: 0,
                }}
              >
                {todo.completed && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>

              {/* Title */}
              <span
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: todo.completed ? "#c4bdb5" : "#44403c",
                  textDecoration: todo.completed ? "line-through" : "none",
                  lineHeight: 1.4,
                  transition: "all 0.15s",
                }}
              >
                {todo.title}
              </span>

              {/* Delete — always visible on mobile (no hover) */}
              <button
                onClick={(e) => handleDelete(e, todo.id)}
                style={{
                  padding: 4,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#d6d3d1",
                  flexShrink: 0,
                  opacity: 0.4,
                  transition: "opacity 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = "#ef4444"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.4"; e.currentTarget.style.color = "#d6d3d1"; }}
              >
                <Trash2 style={{ width: 12, height: 12 }} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add input — always visible when toggled or no todos yet */}
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
              fontSize: 13,
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
              fontSize: 12,
              borderRadius: 10,
              border: "none",
              cursor: adding || !newTitle.trim() ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              flexShrink: 0,
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
            padding: 0,
            background: "none",
            border: "none",
            fontSize: 12,
            color: "#a8a29e",
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <Plus style={{ width: 12, height: 12 }} /> Add task
        </button>
      )}
    </div>
  );
}
