"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface ContextData {
  role: string;
  goal: string;
  content_preferences?: string;
  extended_context: string | null;
}

// Restored from pre-Phase-4c. The 8-field profile output produces richer
// context than the 3-field reflection version did — Kaan flagged Apr 25.
// One small addition vs the original: an optional "Short-term goal" field
// (this month / next 2 weeks). Profile is the user's self-portrait — it is
// NOT injected into the verdict / Deep Dive / Ask / Chat prompts (those stay
// profile-blind per the pivot). It lives on the user's own dashboard.
const AI_PROMPT = `Hey — you know me well from our past conversations. I'm setting up a profile on a tool called ContextDrop, which helps me actually try things from the AI / tech / business stuff I save instead of just watching reels.

Use everything you already know about me from our chat history — my work, my interests, the projects I've talked about, the tools I use, what I'm building, what I'm curious about, the kind of content that actually clicks for me — and write me a profile in the format below.

Don't ask me questions. Just write it. Go on what you remember.

Output format (fill in based on what you know about me):

---
Role: [my actual role + the world I work in, in 1-2 sentences. Include seniority if you know it.]
Focus: [what I'm currently building, working on, or learning right now]
Short-term goal: [one specific thing I'm aiming at over the next 2 weeks or this month — keep it concrete, not "get better at AI"]
Audience: [who my work serves — clients, users, my team, myself]
Interests: [the topics, fields, and ideas I'm actually drawn to — be specific to me, not generic categories]
Tools: [the tools, platforms, and AI models I actually use day-to-day]
Learning priorities: [what I'm actively trying to get better at]
Content that clicks for me: [the kinds of content that actually help me — case studies, tool walkthroughs, opinion pieces, frameworks, etc.]
Style preferences: [how I like information delivered — concise vs detailed, technical vs accessible, examples vs theory]
---

Be factual and specific. Skip filler words like "passionate" or "innovative." If you don't actually know something about me, leave that line as [unknown — I'll fill in] rather than guessing.

If this is a fresh chat with no memory of me at all, say so honestly and produce the format above with [bracketed placeholders] I can fill in myself.`;

export default function ContextEditor() {
  const router = useRouter();
  const [context, setContext] = useState<ContextData | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [extendedContext, setExtendedContext] = useState("");
  const [role, setRole] = useState("");
  const [goal, setGoal] = useState("");
  const [preferences, setPreferences] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAiHelper, setShowAiHelper] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    // Phase 5+ — load both /api/user (display_name) and /api/context (profile)
    Promise.all([
      fetch("/api/user").then((r) => r.json()).catch(() => null),
      fetch("/api/context").then((r) => r.json()).catch(() => null),
    ]).then(([userRes, contextRes]) => {
      if (userRes?.user?.first_name) setDisplayName(userRes.user.first_name);
      if (contextRes?.context) {
        setContext(contextRes.context);
        setRole(contextRes.context.role || "");
        setGoal(contextRes.context.goal || "");
        setPreferences(contextRes.context.content_preferences || "");
        setExtendedContext(contextRes.context.extended_context || "");
      }
      setLoading(false);
    });
  }, []);

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(AI_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    // Phase 5+ — save both the display name (PATCH /api/user) and the profile
    // fields (PUT /api/context). Run in parallel so a slow one doesn't block.
    const [userRes, ctxRes] = await Promise.all([
      fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName }),
      }),
      fetch("/api/context", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          goal,
          content_preferences: preferences,
          extended_context: extendedContext || null,
        }),
      }),
    ]);

    setSaving(false);

    if (userRes.ok && ctxRes.ok) {
      setSaved(true);
      setContext({
        role,
        goal,
        content_preferences: preferences,
        extended_context: extendedContext || null,
      });
      if (!context) {
        setTimeout(() => router.push("/dashboard"), 1500);
      }
    }
  };

  const handleClear = async () => {
    setClearing(true);
    const res = await fetch("/api/context", { method: "DELETE" });
    setClearing(false);

    if (res.ok) {
      setContext(null);
      setRole("");
      setGoal("");
      setPreferences("");
      setExtendedContext("");
      setShowClearConfirm(false);
      setSaved(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#faf8f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, border: "3px solid #f0ebe4", borderTopColor: "#f97316", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    fontSize: 14,
    border: "1px solid #e7e2d9",
    borderRadius: 12,
    outline: "none",
    color: "#1c1917",
    fontFamily: "'DM Sans', sans-serif",
    boxSizing: "border-box",
    background: "#faf8f5",
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = "#f97316";
    e.target.style.boxShadow = "0 0 0 3px rgba(249,115,22,0.1)";
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = "#e7e2d9";
    e.target.style.boxShadow = "none";
  };

  return (
    <div style={{ minHeight: "100vh", background: "#faf8f5", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(250,248,245,0.88)", backdropFilter: "blur(16px)", borderBottom: "1px solid #e7e2d9" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 20px", height: 56, maxWidth: 720, margin: "0 auto" }}>
          <a href="/dashboard" style={{ color: "#78716c", textDecoration: "none", display: "flex", alignItems: "center", padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </a>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>
            Context<span style={{ color: "#f97316" }}>Drop</span>
          </span>
          <span style={{ fontSize: 13, color: "#a8a29e", marginLeft: 4 }}>/ Your Profile</span>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px" }}>
        {/* Hero */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1c1917", margin: "0 0 8px 0" }}>
            {context ? "Edit your profile" : "Make it personal"}
          </h1>
          <p style={{ fontSize: 14, color: "#78716c", lineHeight: 1.6, margin: 0, maxWidth: 520 }}>
            Your self-portrait, in your own words. We don&apos;t feed this into the verdict —
            verdicts stay profile-blind. This is for you to keep — context for your own dashboard
            and your future self.
          </p>
        </div>

        {/* Profile Form */}
        <div style={{ background: "#fff", border: "1px solid #e7e2d9", borderRadius: 18, padding: 24, marginBottom: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Display name */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#44403c", marginBottom: 6 }}>
                Display name <span style={{ color: "#a8a29e", fontWeight: 400 }}>· what we call you</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Pulled from Telegram by default. Edit if it picked up a nickname."
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#44403c", marginBottom: 6 }}>Role</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. AI Engineer, Product Manager, CS Student..."
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#44403c", marginBottom: 6 }}>Current Focus</label>
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Building an AI-powered SaaS, Learning React..."
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#44403c", marginBottom: 6 }}>
                Interests & topics <span style={{ color: "#a8a29e", fontWeight: 400 }}>· optional</span>
              </label>
              <input
                type="text"
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                placeholder="e.g. AI research, philosophy, no-code tools, startup culture..."
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>

            {/* More about you — prominent textarea */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#44403c", marginBottom: 4 }}>
                More about you <span style={{ color: "#a8a29e", fontWeight: 400 }}>· optional</span>
              </label>
              <p style={{ fontSize: 12, color: "#a8a29e", margin: "0 0 8px 0", lineHeight: 1.5 }}>
                The full self-portrait. Paste the formatted output from the helper prompt below, or write it yourself.
              </p>
              <textarea
                value={extendedContext}
                onChange={(e) => setExtendedContext(e.target.value)}
                placeholder="Tell me about yourself — what you're building, what tools you use, what kind of content actually helps you..."
                rows={8}
                style={{ ...inputStyle, resize: "vertical" }}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
              {/* AI helper toggle */}
              <button
                onClick={() => setShowAiHelper(!showAiHelper)}
                style={{
                  marginTop: 8,
                  padding: "4px 0",
                  background: "none",
                  border: "none",
                  fontSize: 12,
                  color: "#f97316",
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 500,
                }}
              >
                {showAiHelper ? "Hide AI helper" : "Get it from ChatGPT / Claude →"}
              </button>

              {/* Collapsible AI prompt helper */}
              {showAiHelper && (
                <div style={{ background: "#faf8f5", border: "1px solid #f0ebe4", borderRadius: 14, padding: 16, marginTop: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                    <p style={{ fontSize: 12, color: "#78716c", margin: 0 }}>
                      Copy this prompt, paste it into ChatGPT or Claude, then paste the result in the box above.
                    </p>
                    <button
                      onClick={copyPrompt}
                      style={{
                        flexShrink: 0,
                        padding: "6px 14px",
                        background: copied ? "#f0fdf4" : "#fff7ed",
                        border: `1px solid ${copied ? "#bbf7d0" : "#fed7aa"}`,
                        borderRadius: 100,
                        fontSize: 12,
                        fontWeight: 600,
                        color: copied ? "#16a34a" : "#f97316",
                        cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {copied ? "Copied" : "Copy Prompt"}
                    </button>
                  </div>
                  <pre style={{ fontSize: 11, color: "#78716c", background: "#fff", border: "1px solid #f0ebe4", borderRadius: 10, padding: 12, overflow: "auto", whiteSpace: "pre-wrap", maxHeight: 240, margin: 0, lineHeight: 1.55 }}>
                    {AI_PROMPT}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Save + Skip + Clear */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "13px 32px",
              background: saving ? "#e7e2d9" : "#f97316",
              color: saving ? "#a8a29e" : "#fff",
              fontWeight: 700,
              fontSize: 15,
              borderRadius: 100,
              border: "none",
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.15s",
            }}
          >
            {saving ? "Saving..." : context ? "Save" : "Save & Continue"}
          </button>
          {!context && (
            <button
              onClick={() => router.push("/dashboard")}
              style={{
                padding: "13px 24px",
                background: "none",
                color: "#a8a29e",
                fontWeight: 600,
                fontSize: 14,
                borderRadius: 100,
                border: "none",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Skip for now
            </button>
          )}
          {saved && (
            <span style={{ fontSize: 14, color: "#16a34a", fontWeight: 600 }}>
              {context ? "Saved." : "Saved — taking you to your dashboard..."}
            </span>
          )}
        </div>

        {/* Clear profile option (only for returning users) */}
        {context && (
          <div style={{ marginTop: 16 }}>
            {!showClearConfirm ? (
              <button
                onClick={() => setShowClearConfirm(true)}
                style={{
                  padding: 0,
                  background: "none",
                  border: "none",
                  fontSize: 13,
                  color: "#dc2626",
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  opacity: 0.7,
                }}
              >
                Clear profile
              </button>
            ) : (
              <div style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 14,
                padding: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}>
                <p style={{ fontSize: 13, color: "#991b1b", margin: 0 }}>
                  This clears the role / focus / interests / more-about-you fields. You can set them again any time.
                </p>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    style={{
                      padding: "6px 14px",
                      background: "#fff",
                      border: "1px solid #e7e2d9",
                      borderRadius: 100,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#78716c",
                      cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClear}
                    disabled={clearing}
                    style={{
                      padding: "6px 14px",
                      background: "#dc2626",
                      border: "none",
                      borderRadius: 100,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#fff",
                      cursor: clearing ? "not-allowed" : "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {clearing ? "Clearing..." : "Clear"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
