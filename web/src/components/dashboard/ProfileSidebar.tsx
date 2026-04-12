"use client";

import type { UserProfile } from "@/lib/types";
import { BookOpen, ExternalLink, LogOut, Home, CheckSquare, MessageSquare } from "lucide-react";

interface Props { profile: UserProfile; }

// Extract a clean short label from potentially long text
function shortLabel(text: string, max: number): string {
  // Take first sentence or first N chars
  const firstLine = text.split(/[.\n]/)[0].trim();
  if (firstLine.length <= max) return firstLine;
  return firstLine.slice(0, max).trim() + "...";
}

export default function ProfileSidebar({ profile }: Props) {
  const { user, context, credits } = profile;
  const initials = (user.first_name || user.telegram_username || "U").slice(0, 2).toUpperCase();
  const creditsUsed = credits?.lifetime_used ?? 0;
  const creditsTotal = (credits?.balance ?? 0) + creditsUsed;
  const creditsPct = creditsTotal > 0 ? Math.min(100, Math.round((creditsUsed / creditsTotal) * 100)) : 0;
  const notionConnected = !!user.notion_access_token;

  const handleManageSubscription = () => {
    fetch("/api/stripe/portal", { method: "POST" })
      .then((r) => r.json())
      .then((data) => { if (data.url) window.location.href = data.url; });
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#f97316,#fb923c)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#1c1917", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{user.first_name || user.telegram_username}</p>
          {user.telegram_username && <p style={{ fontSize: 12, color: "#a8a29e", margin: 0 }}>@{user.telegram_username}</p>}
        </div>
      </div>

      {/* Context — clean short labels */}
      {context?.role && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 12, color: "#78716c", margin: "0 0 4px 0", lineHeight: 1.5 }}>
            {shortLabel(context.role, 60)}
          </p>
          {context.goal && (
            <p style={{ fontSize: 11, color: "#a8a29e", margin: 0, lineHeight: 1.5 }}>
              {shortLabel(context.goal, 70)}
            </p>
          )}
          <a href="/context" style={{ display: "inline-block", fontSize: 11, color: "#f97316", textDecoration: "none", fontWeight: 600, marginTop: 6 }}>
            Edit profile →
          </a>
        </div>
      )}

      <div style={{ height: 1, background: "#f0ebe4", margin: "14px 0" }} />

      {/* Nav items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 14 }}>
        <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 600, color: "#f97316", background: "rgba(249,115,22,0.06)", textDecoration: "none", padding: "8px 10px", borderRadius: 10, fontFamily: "'DM Sans', sans-serif" }}>
          <Home style={{ width: 15, height: 15 }} /> All verdicts
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#a8a29e" }}>{creditsUsed || ""}</span>
        </a>
        <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 500, color: "#78716c", textDecoration: "none", padding: "8px 10px", borderRadius: 10, fontFamily: "'DM Sans', sans-serif", transition: "background 0.15s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#f5f1eb"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <CheckSquare style={{ width: 15, height: 15 }} /> Tasks
        </a>
        <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 500, color: "#78716c", textDecoration: "none", padding: "8px 10px", borderRadius: 10, fontFamily: "'DM Sans', sans-serif", transition: "background 0.15s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#f5f1eb"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <MessageSquare style={{ width: 15, height: 15 }} /> Ask AI
          {user.premium && <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 700, background: "#fff7ed", color: "#f97316", border: "1px solid #fed7aa", padding: "2px 6px", borderRadius: 20 }}>NEW</span>}
        </a>
      </div>

      <div style={{ height: 1, background: "#f0ebe4", margin: "14px 0" }} />

      {/* Credits */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#c4bdb5", margin: 0 }} title="1 credit = 1 analysis">Credits</p>
          <span style={{ fontSize: 11, color: "#a8a29e" }}>{credits?.balance ?? 0} remaining</span>
        </div>
        <div style={{ height: 6, background: "#f0ebe4", borderRadius: 100, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${creditsPct}%`, background: creditsPct > 80 ? "#ef4444" : "linear-gradient(90deg,#f97316,#fb923c)", borderRadius: 100, transition: "width 0.4s" }} />
        </div>
        <p style={{ fontSize: 11, color: "#c4bdb5", margin: "6px 0 0 0" }}>1 credit = 1 analysis</p>
        {!user.premium && (
          <a href="/pricing" style={{ display: "block", fontSize: 12, color: "#f97316", textDecoration: "none", fontWeight: 600, marginTop: 6 }}>Get more credits →</a>
        )}
      </div>

      <div style={{ height: 1, background: "#f0ebe4", margin: "14px 0" }} />

      {/* Premium section */}
      {user.premium ? (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, background: "linear-gradient(135deg, #fbbf24, #f97316)", color: "#fff", padding: "3px 12px", borderRadius: 100 }}>Premium</span>
          </div>
          <p style={{ fontSize: 11, color: "#a8a29e", margin: "0 0 4px 0" }}>Unlimited analyses, AI Q&A, action items</p>
          <button
            onClick={handleManageSubscription}
            style={{ fontSize: 11, color: "#78716c", background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textDecoration: "underline", textUnderlineOffset: 2 }}
          >
            Manage subscription →
          </button>
        </div>
      ) : (
        <a href="/pricing" style={{ display: "block", textDecoration: "none", marginBottom: 14 }}>
          <div style={{ background: "#faf8f5", border: "1px solid #e7e2d9", borderRadius: 12, padding: "12px 14px" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#1c1917", margin: "0 0 4px 0" }}>Upgrade to Premium</p>
            <p style={{ fontSize: 11, color: "#a8a29e", margin: 0 }}>AI Q&A, 200 credits/mo, priority support</p>
          </div>
        </a>
      )}

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
        <a href="https://t.me/contextdrop2027bot" target="_blank" rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#78716c", textDecoration: "none", padding: "8px 10px", borderRadius: 10 }}>
          <ExternalLink style={{ width: 14, height: 14 }} /> Open bot
        </a>
        <button
          onClick={() => {
            fetch("/api/auth/logout", { method: "POST" }).then(() => {
              window.location.href = "/login";
            });
          }}
          style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#a8a29e", background: "none", border: "none", cursor: "pointer", padding: "8px 10px", borderRadius: 10, fontFamily: "'DM Sans', sans-serif", width: "100%", textAlign: "left" }}
        >
          <LogOut style={{ width: 14, height: 14 }} /> Sign out
        </button>
      </div>
    </div>
  );
}
