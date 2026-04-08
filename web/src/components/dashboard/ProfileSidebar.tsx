"use client";

import type { UserProfile } from "@/lib/types";
import { BookOpen, ExternalLink, Settings } from "lucide-react";

interface Props { profile: UserProfile; }

export default function ProfileSidebar({ profile }: Props) {
  const { user, stats } = profile;
  const initials = (user.name || user.username || "U").slice(0, 2).toUpperCase();
  const creditsUsed = user.credits_used ?? 0;
  const creditsTotal = user.credits_total ?? 100;
  const creditsPct = Math.min(100, Math.round((creditsUsed / creditsTotal) * 100));
  const notionConnected = !!user.notion_access_token;

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#f97316,#fb923c)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#1c1917", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{user.name || user.username}</p>
          {user.username && <p style={{ fontSize: 12, color: "#a8a29e", margin: 0 }}>@{user.username}</p>}
        </div>
      </div>

      {/* Context tags */}
      {(user.role || user.focus) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {user.role && <span style={{ fontSize: 11, background: "#fff7ed", color: "#f97316", border: "1px solid #fed7aa", padding: "3px 10px", borderRadius: 100, fontWeight: 600 }}>{user.role}</span>}
          {user.focus && <span style={{ fontSize: 11, background: "#f5f1eb", color: "#78716c", border: "1px solid #e7e2d9", padding: "3px 10px", borderRadius: 100 }}>{user.focus}</span>}
        </div>
      )}

      <div style={{ height: 1, background: "#f0ebe4", margin: "14px 0" }} />

      {/* Stats */}
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#c4bdb5", marginBottom: 8, marginTop: 0 }}>Your feed</p>
      {[
        { label: "Total saved", value: stats?.total ?? 0, color: "#1c1917" },
        { label: "📚 To learn", value: stats?.learn ?? 0, color: "#3b82f6" },
        { label: "🚀 To apply", value: stats?.apply ?? 0, color: "#f97316" },
        { label: "📥 In Notion", value: stats?.in_notion ?? 0, color: "#10b981" },
      ].map(({ label, value, color }) => (
        <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "#44403c", marginBottom: 6 }}>
          <span>{label}</span><span style={{ fontWeight: 700, color }}>{value}</span>
        </div>
      ))}

      <div style={{ height: 1, background: "#f0ebe4", margin: "14px 0" }} />

      {/* Credits */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#c4bdb5", margin: 0 }}>Credits</p>
          <span style={{ fontSize: 11, color: "#a8a29e" }}>{creditsUsed} / {creditsTotal}</span>
        </div>
        <div style={{ height: 6, background: "#f0ebe4", borderRadius: 100, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${creditsPct}%`, background: creditsPct > 80 ? "#ef4444" : "linear-gradient(90deg,#f97316,#fb923c)", borderRadius: 100, transition: "width 0.4s" }} />
        </div>
      </div>

      <div style={{ height: 1, background: "#f0ebe4", margin: "14px 0" }} />

      {/* Notion */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <BookOpen style={{ width: 15, height: 15, color: notionConnected ? "#10b981" : "#c4bdb5" }} />
        <span style={{ fontSize: 13, color: notionConnected ? "#10b981" : "#a8a29e", fontWeight: 600 }}>
          {notionConnected ? "Notion connected" : "Notion not connected"}
        </span>
        {!notionConnected && (
          <a href="/connect-notion" style={{ marginLeft: "auto", fontSize: 11, color: "#f97316", textDecoration: "none", fontWeight: 700 }}>Connect →</a>
        )}
      </div>

      {/* Links */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <a href="/settings" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#78716c", textDecoration: "none", padding: "8px 10px", borderRadius: 10 }}>
          <Settings style={{ width: 14, height: 14 }} /> Edit profile
        </a>
        <a href="https://t.me/contextdrop2027bot" target="_blank" rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#78716c", textDecoration: "none", padding: "8px 10px", borderRadius: 10 }}>
          <ExternalLink style={{ width: 14, height: 14 }} /> Open bot
        </a>
      </div>
    </div>
  );
}
