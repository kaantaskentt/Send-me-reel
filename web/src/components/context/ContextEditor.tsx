"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface ContextData {
  role: string;
  goal: string;
  content_preferences: string;
  extended_context: string | null;
}

const AI_PROMPT = `I'm setting up my ContextDrop profile. ContextDrop is an AI that analyzes social media content (Reels, TikToks, articles) and gives me personalized insights based on who I am.

Please help me create a rich profile by asking me these questions one at a time. Wait for my answer before moving to the next question:

1. What's your role? (job title, experience level, industry)
2. What are you currently building or working on?
3. What tools and technologies do you use daily?
4. What are your top 3 learning priorities right now?
5. What type of content actually changes how you work? (tutorials, case studies, tool reviews, etc.)
6. Any specific topics the AI should always pay extra attention to?

After I answer all questions, compile everything into a clean profile that starts with "CONTEXTDROP PROFILE" — use short bullet points, no fluff.`;

export default function ContextEditor() {
  const router = useRouter();
  const [context, setContext] = useState<ContextData | null>(null);
  const [extendedContext, setExtendedContext] = useState("");
  const [role, setRole] = useState("");
  const [goal, setGoal] = useState("");
  const [preferences, setPreferences] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/context")
      .then((r) => r.json())
      .then((data) => {
        if (data.context) {
          setContext(data.context);
          setRole(data.context.role || "");
          setGoal(data.context.goal || "");
          setPreferences(data.context.content_preferences || "");
          setExtendedContext(data.context.extended_context || "");
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(AI_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    const res = await fetch("/api/context", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        goal,
        content_preferences: preferences,
        extended_context: extendedContext || null,
      }),
    });

    setSaving(false);

    if (res.ok) {
      setSaved(true);
      // If this is a new profile (no prior context), redirect to dashboard after a moment
      if (!context) {
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      }
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
            The more ContextDrop knows about you, the better your verdicts get.
            Two people can send the same Reel and get completely different
            insights — one tailored to their AI agent project, the other to
            their marketing funnel.
          </p>
        </div>

        {/* Basic Profile */}
        <div style={{ background: "#fff", border: "1px solid #e7e2d9", borderRadius: 18, padding: 24, marginBottom: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#c4bdb5", margin: "0 0 16px 0" }}>Basic Profile</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#44403c", marginBottom: 6 }}>Role</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. AI Engineer, Product Manager, CS Student..."
                style={{ width: "100%", padding: "11px 14px", fontSize: 14, border: "1px solid #e7e2d9", borderRadius: 12, outline: "none", color: "#1c1917", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box", background: "#faf8f5" }}
                onFocus={(e) => { e.target.style.borderColor = "#f97316"; e.target.style.boxShadow = "0 0 0 3px rgba(249,115,22,0.1)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e7e2d9"; e.target.style.boxShadow = "none"; }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#44403c", marginBottom: 6 }}>Current Focus</label>
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Building an AI-powered SaaS, Learning React..."
                style={{ width: "100%", padding: "11px 14px", fontSize: 14, border: "1px solid #e7e2d9", borderRadius: 12, outline: "none", color: "#1c1917", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box", background: "#faf8f5" }}
                onFocus={(e) => { e.target.style.borderColor = "#f97316"; e.target.style.boxShadow = "0 0 0 3px rgba(249,115,22,0.1)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e7e2d9"; e.target.style.boxShadow = "none"; }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#44403c", marginBottom: 6 }}>Priority Topics</label>
              <input
                type="text"
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                placeholder="e.g. AI tools, startup growth, web development..."
                style={{ width: "100%", padding: "11px 14px", fontSize: 14, border: "1px solid #e7e2d9", borderRadius: 12, outline: "none", color: "#1c1917", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box", background: "#faf8f5" }}
                onFocus={(e) => { e.target.style.borderColor = "#f97316"; e.target.style.boxShadow = "0 0 0 3px rgba(249,115,22,0.1)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e7e2d9"; e.target.style.boxShadow = "none"; }}
              />
            </div>
          </div>
        </div>

        {/* Deep Profile */}
        <div style={{ background: "#fff", border: "1px solid #e7e2d9", borderRadius: 18, padding: 24, marginBottom: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#c4bdb5", margin: "0 0 4px 0" }}>Deep Profile</h2>
          <p style={{ fontSize: 12, color: "#a8a29e", margin: "0 0 16px 0", lineHeight: 1.5 }}>
            Optional — have ChatGPT or Claude interview you and paste the result here for even better verdicts.
          </p>

          {/* Copy prompt card */}
          <div style={{ background: "#faf8f5", border: "1px solid #f0ebe4", borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#44403c", margin: 0 }}>Step 1: Copy this prompt</p>
                <p style={{ fontSize: 11, color: "#a8a29e", margin: "2px 0 0 0" }}>Paste it into ChatGPT or Claude. Answer the questions.</p>
              </div>
              <button
                onClick={copyPrompt}
                style={{ flexShrink: 0, padding: "6px 14px", background: copied ? "#f0fdf4" : "#fff7ed", border: `1px solid ${copied ? "#bbf7d0" : "#fed7aa"}`, borderRadius: 100, fontSize: 12, fontWeight: 600, color: copied ? "#16a34a" : "#f97316", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
              >
                {copied ? "Copied!" : "Copy Prompt"}
              </button>
            </div>
            <pre style={{ fontSize: 11, color: "#a8a29e", background: "#fff", border: "1px solid #f0ebe4", borderRadius: 10, padding: 12, overflow: "auto", whiteSpace: "pre-wrap", maxHeight: 100, margin: 0 }}>
              {AI_PROMPT}
            </pre>
          </div>

          {/* Paste area */}
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#44403c", margin: "0 0 8px 0" }}>Step 2: Paste the AI-generated profile here</p>
            <textarea
              value={extendedContext}
              onChange={(e) => setExtendedContext(e.target.value)}
              placeholder="Paste your CONTEXTDROP PROFILE here..."
              rows={8}
              style={{ width: "100%", padding: "11px 14px", fontSize: 14, border: "1px solid #e7e2d9", borderRadius: 12, outline: "none", color: "#1c1917", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box", background: "#faf8f5", resize: "vertical" }}
              onFocus={(e) => { e.target.style.borderColor = "#f97316"; e.target.style.boxShadow = "0 0 0 3px rgba(249,115,22,0.1)"; }}
              onBlur={(e) => { e.target.style.borderColor = "#e7e2d9"; e.target.style.boxShadow = "none"; }}
            />
          </div>
        </div>

        {/* Save button */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={handleSave}
            disabled={saving || !role || !goal || !preferences}
            style={{
              padding: "13px 32px",
              background: saving || !role || !goal || !preferences ? "#e7e2d9" : "#f97316",
              color: saving || !role || !goal || !preferences ? "#a8a29e" : "#fff",
              fontWeight: 700,
              fontSize: 15,
              borderRadius: 100,
              border: "none",
              cursor: saving || !role || !goal || !preferences ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.15s",
            }}
          >
            {saving ? "Saving..." : context ? "Save Profile" : "Save & Continue"}
          </button>
          {saved && (
            <span style={{ fontSize: 14, color: "#16a34a", fontWeight: 600 }}>
              {context ? "Profile saved!" : "Profile saved! Taking you to your dashboard..."}
            </span>
          )}
        </div>

        {/* Current profile preview (only for returning users) */}
        {context && (
          <div style={{ marginTop: 32, background: "#fff", border: "1px solid #e7e2d9", borderRadius: 18, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
            <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#c4bdb5", margin: "0 0 14px 0" }}>Current Profile</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
              <p style={{ margin: 0 }}><span style={{ color: "#a8a29e" }}>Role:</span> <span style={{ color: "#1c1917" }}>{context.role}</span></p>
              <p style={{ margin: 0 }}><span style={{ color: "#a8a29e" }}>Focus:</span> <span style={{ color: "#1c1917" }}>{context.goal}</span></p>
              <p style={{ margin: 0 }}><span style={{ color: "#a8a29e" }}>Priorities:</span> <span style={{ color: "#1c1917" }}>{context.content_preferences}</span></p>
              {context.extended_context && (
                <>
                  <div style={{ height: 1, background: "#f0ebe4", margin: "6px 0" }} />
                  <p style={{ color: "#a8a29e", fontSize: 12, margin: 0 }}>Deep Profile:</p>
                  <p style={{ color: "#78716c", fontSize: 12, whiteSpace: "pre-wrap", margin: 0 }}>{context.extended_context}</p>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
