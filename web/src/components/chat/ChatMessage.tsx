"use client";

import { motion } from "framer-motion";
import Markdown from "./Markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolState?: "searching" | "done";
  streaming?: boolean;
  stopped?: boolean;
}

interface Props {
  message: Message;
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}
      >
        <div
          style={{
            maxWidth: "75%",
            background: "#f5f1eb",
            borderRadius: "18px 18px 4px 18px",
            padding: "10px 16px",
            fontSize: 13,
            color: "#1c1917",
            lineHeight: 1.65,
            fontFamily: "var(--font-dm-sans), sans-serif",
          }}
        >
          {message.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      style={{ display: "flex", flexDirection: "column", marginBottom: 16, maxWidth: "85%" }}
    >
      {message.toolState === "searching" && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 8,
            fontSize: 11,
            color: "#78716c",
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#f97316",
              display: "inline-block",
              animation: "cd-pulse-dot 1.2s ease-in-out infinite",
            }}
          />
          Searching web
        </div>
      )}

      <div style={{ fontSize: 13, color: "#1c1917", lineHeight: 1.65 }}>
        <Markdown>{message.content}</Markdown>
        {message.streaming && (
          <span
            style={{
              display: "inline-block",
              width: 2,
              height: 13,
              background: "#1c1917",
              marginLeft: 2,
              verticalAlign: "middle",
              animation: "cd-typingBounce 1s step-end infinite",
            }}
          />
        )}
        {message.stopped && (
          <span
            style={{
              fontSize: 11,
              color: "#a8a29e",
              marginLeft: 6,
              fontStyle: "italic",
            }}
          >
            — stopped
          </span>
        )}
      </div>
    </motion.div>
  );
}
