"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface ContextData {
  role: string;
  goal: string;
  content_preferences?: string;
  extended_context: string | null;
}

interface ParsedProfile {
  role: string;
  goal: string;
  preferences: string;
  extended: string;
}

function parseAIProfile(raw: string): ParsedProfile | null {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const map: Record<string, string> = {};

  for (const line of lines) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).toLowerCase().trim().replace(/^[-–—*#\s]+/, "");
    const val = line.slice(colon + 1).trim();
    if (val && !val.startsWith("[")) map[key] = val;
  }

  if (Object.keys(map).length === 0) return null;

  return {
    role: map["role"] ?? "",
    goal: map["focus"] ?? map["current focus"] ?? "",
    preferences: map["interests"] ?? map["interests & topics"] ?? "",
    extended: map["context"] ?? "",
  };
}

const AI_PROMPT = `Hey — I'm setting up a profile on a tool called ContextDrop. It helps me actually try things from the AI / tech / business content I save.

Use everything you know about me from our conversation history — what I do, what I'm focused on, what topics I follow, how I think about things — and write me a short profile in the format below.

If you have enough history with me, fill it in directly. If this is a fresh session with no history at all, ask me 3 quick questions first:
1. What do you do day-to-day? (job, study, side project — anything)
2. What are you focused on right now?
3. What topics or ideas do you follow?

Then write the profile using my answers.

Output format:

---
Role: [10 words max — what you do + context. "Marketing manager at a tech startup" / "CS student exploring agentic systems" / "Freelance designer curious about AI tools"]
Focus: [10 words max — what you're on right now. "Figuring out what AI means for my career" / "Launching a newsletter, learning Notion"]
Interests: [comma-separated list of specific topics — not generic categories. "AI tools, startup culture, content strategy, no-code" not "technology, business"]
Context: [2–3 sentences. Written like a friend describing me — what kind of person am I, what do I actually care about, what does a good week look like for me. No buzzwords, no recruiter language.]
---

Hard rules:
- Role and Focus must be 10 words or fewer. No full sentences.
- If you genuinely don't know something, write [I don't know — fill this in] rather than guessing.
- No words like "passionate", "innovative", "leverage", "synergy".`;

const claudeUrl = `https://claude.ai/new?q=${encodeURIComponent(AI_PROMPT)}`;
const chatgptUrl = `https://chat.openai.com/?q=${encodeURIComponent(AI_PROMPT)}`;

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
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [importText, setImportText] = useState("");
  const [parsedPreview, setParsedPreview] = useState<ParsedProfile | null>(null);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
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
    setShowPasteBox(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

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

  const fillFromParsed = () => {
    if (!parsedPreview) return;
    if (parsedPreview.role) setRole(parsedPreview.role);
    if (parsedPreview.goal) setGoal(parsedPreview.goal);
    if (parsedPreview.preferences) setPreferences(parsedPreview.preferences);
    if (parsedPreview.extended) setExtendedContext(parsedPreview.extended);
    setImportText("");
    setParsedPreview(null);
    setShowPasteBox(false);
    setShowAiHelper(false);
    setShowManualForm(true);
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

  const isFirstTimer = !context;
  const showAiFirstScreen = isFirstTimer && !showManualForm;

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

        {/* ── AI-FIRST SCREEN (first-timers only) ── */}
        {showAiFirstScreen && (
          <>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1c1917", margin: "0 0 8px 0" }}>
                30 seconds to a smarter feed
              </h1>
              <p style={{ fontSize: 14, color: "#78716c", lineHeight: 1.6, margin: 0, maxWidth: 500 }}>
                Paste this prompt into Claude or ChatGPT — it&apos;ll write your profile from your chat history. Then drop the output below.
              </p>
            </div>

            <div style={{ background: "#fff", border: "1px solid #e7e2d9", borderRadius: 18, padding: 24, marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
              {isMobile ? (
                /* Mobile: copy button + single Claude link */
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <button
                    onClick={copyPrompt}
                    style={{
                      width: "100%",
                      padding: "14px 24px",
                      background: copied ? "#f0fdf4" : "#f97316",
                      border: copied ? "1px solid #bbf7d0" : "none",
                      borderRadius: 14,
                      fontSize: 15,
                      fontWeight: 700,
                      color: copied ? "#16a34a" : "#fff",
                      cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                      transition: "all 0.15s",
                    }}
                  >
                    {copied ? "Copied ✓" : "Copy prompt"}
                  </button>
                  <a
                    href={claudeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowPasteBox(true)}
                    style={{ fontSize: 13, color: "#f97316", fontWeight: 600, textDecoration: "none", textAlign: "center" as const }}
                  >
                    Open in Claude →
                  </a>
                </div>
              ) : (
                /* Desktop: two pre-filled URL buttons */
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const }}>
                  <a
                    href={claudeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowPasteBox(true)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "13px 24px",
                      background: "#f97316",
                      borderRadius: 100,
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#fff",
                      textDecoration: "none",
                      transition: "opacity 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    Open in Claude ↗
                  </a>
                  <a
                    href={chatgptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowPasteBox(true)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "13px 24px",
                      background: "#fff",
                      border: "1px solid #e7e2d9",
                      borderRadius: 100,
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#1c1917",
                      textDecoration: "none",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f1eb")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                  >
                    Open in ChatGPT ↗
                  </a>
                </div>
              )}
            </div>

            {/* Paste zone — appears after clicking a button */}
            {showPasteBox && (
              <div style={{ background: "#fff", border: "1px solid #e7e2d9", borderRadius: 18, padding: 24, marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#44403c", margin: "0 0 10px 0" }}>
                  Paste the output here →
                </p>
                <textarea
                  value={importText}
                  onChange={(e) => {
                    setImportText(e.target.value);
                    setParsedPreview(e.target.value.trim() ? parseAIProfile(e.target.value) : null);
                  }}
                  placeholder="Paste what Claude or ChatGPT wrote back..."
                  rows={7}
                  style={{ ...inputStyle, resize: "vertical", fontSize: 13 }}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />

                {parsedPreview && (
                  <div style={{ background: "#faf8f5", border: "1px solid #f0ebe4", borderRadius: 12, padding: 14, marginTop: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#a8a29e", textTransform: "uppercase" as const, letterSpacing: "0.06em", margin: "0 0 10px 0" }}>Detected</p>
                    {[
                      { label: "Who you are", val: parsedPreview.role },
                      { label: "Working on", val: parsedPreview.goal },
                      { label: "Interests", val: parsedPreview.preferences },
                      { label: "Context", val: parsedPreview.extended },
                    ].filter((f) => f.val).map((f) => (
                      <div key={f.label} style={{ marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#78716c" }}>{f.label}: </span>
                        <span style={{ fontSize: 11, color: "#44403c" }}>{f.val.slice(0, 120)}{f.val.length > 120 ? "…" : ""}</span>
                      </div>
                    ))}
                    <button
                      onClick={fillFromParsed}
                      style={{
                        marginTop: 10,
                        padding: "9px 22px",
                        background: "#f97316",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 13,
                        borderRadius: 100,
                        border: "none",
                        cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      Fill fields with this →
                    </button>
                  </div>
                )}

                {importText.trim() && !parsedPreview && (
                  <p style={{ fontSize: 11, color: "#a8a29e", marginTop: 8 }}>
                    Couldn&apos;t read the format. Make sure the AI output uses the <code>Role:</code> / <code>Focus:</code> labels from the prompt.
                  </p>
                )}
              </div>
            )}

            {/* Escape hatch */}
            <button
              onClick={() => setShowManualForm(true)}
              style={{ padding: 0, background: "none", border: "none", fontSize: 13, color: "#a8a29e", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
            >
              I&apos;ll write it myself →
            </button>
          </>
        )}

        {/* ── FORM (returning users always; first-timers after choosing manual or filling from AI) ── */}
        {(!showAiFirstScreen || showManualForm) && (
          <>
            {/* Hero for returning users */}
            {!isFirstTimer && (
              <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1c1917", margin: "0 0 8px 0" }}>Edit your profile</h1>
                <p style={{ fontSize: 14, color: "#78716c", lineHeight: 1.6, margin: 0, maxWidth: 520 }}>
                  Your self-portrait, in your own words. This stays on your dashboard — we don&apos;t feed it into verdicts.
                </p>
              </div>
            )}

            {/* Hero for first-timers who chose manual */}
            {isFirstTimer && showManualForm && (
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1c1917", margin: "0 0 6px 0" }}>Make it personal</h1>
                <p style={{ fontSize: 14, color: "#78716c", lineHeight: 1.6, margin: 0, maxWidth: 500 }}>
                  Fill in what you can — even a few words help.
                </p>
              </div>
            )}

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
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#44403c", marginBottom: 6 }}>Who you are</label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Marketing manager at a startup · 10 words max"
                    maxLength={80}
                    style={inputStyle}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                  <p style={{ fontSize: 11, margin: "4px 0 0 2px", color: role.length >= 65 ? "#f97316" : "#c4bdb5" }}>
                    {role.length} / 80
                  </p>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#44403c", marginBottom: 6 }}>What you&apos;re working on</label>
                  <input
                    type="text"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="Learning how AI fits my career · 10 words max"
                    maxLength={80}
                    style={inputStyle}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                  <p style={{ fontSize: 11, margin: "4px 0 0 2px", color: goal.length >= 65 ? "#f97316" : "#c4bdb5" }}>
                    {goal.length} / 80
                  </p>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#44403c", marginBottom: 6 }}>
                    Interests & topics <span style={{ color: "#a8a29e", fontWeight: 400 }}>· optional</span>
                  </label>
                  <input
                    type="text"
                    value={preferences}
                    onChange={(e) => setPreferences(e.target.value)}
                    placeholder="AI, marketing, startups, design — comma-separated"
                    style={inputStyle}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                </div>

                {/* More about you */}
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#44403c", marginBottom: 4 }}>
                    More about you <span style={{ color: "#a8a29e", fontWeight: 400 }}>· optional</span>
                  </label>
                  <p style={{ fontSize: 12, color: "#a8a29e", margin: "0 0 8px 0", lineHeight: 1.5 }}>
                    The full picture — paste AI output here or write it yourself.
                  </p>
                  <textarea
                    value={extendedContext}
                    onChange={(e) => setExtendedContext(e.target.value)}
                    placeholder="Tell me about yourself — what you care about, what a good week looks like, what kind of content actually helps you..."
                    rows={6}
                    style={{ ...inputStyle, resize: "vertical" }}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />

                  {/* Refresh with AI (returning users) */}
                  {!isFirstTimer && (
                    <>
                      <button
                        onClick={() => setShowAiHelper(!showAiHelper)}
                        style={{ marginTop: 8, padding: "4px 0", background: "none", border: "none", fontSize: 12, color: "#f97316", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}
                      >
                        {showAiHelper ? "Hide AI helper" : "Refresh with AI →"}
                      </button>

                      {showAiHelper && (
                        <div style={{ background: "#faf8f5", border: "1px solid #f0ebe4", borderRadius: 14, padding: 16, marginTop: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                            <p style={{ fontSize: 12, color: "#78716c", margin: 0 }}>
                              Copy → paste into Claude or ChatGPT → paste the result below.
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
                              {copied ? "Copied ✓" : "Copy Prompt"}
                            </button>
                          </div>
                          <pre style={{ fontSize: 11, color: "#78716c", background: "#fff", border: "1px solid #f0ebe4", borderRadius: 10, padding: 12, overflow: "auto", whiteSpace: "pre-wrap", maxHeight: 180, margin: "0 0 12px 0", lineHeight: 1.55 }}>
                            {AI_PROMPT}
                          </pre>

                          <div style={{ borderTop: "1px solid #f0ebe4", paddingTop: 12 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: "#44403c", margin: "0 0 8px 0" }}>Paste the AI output here →</p>
                            <textarea
                              value={importText}
                              onChange={(e) => {
                                setImportText(e.target.value);
                                setParsedPreview(e.target.value.trim() ? parseAIProfile(e.target.value) : null);
                              }}
                              placeholder="Paste the formatted profile output from Claude or ChatGPT..."
                              rows={6}
                              style={{ ...inputStyle, resize: "vertical", fontSize: 12 }}
                              onFocus={handleFocus}
                              onBlur={handleBlur}
                            />

                            {parsedPreview && (
                              <div style={{ background: "#fff", border: "1px solid #e7e2d9", borderRadius: 12, padding: 14, marginTop: 10 }}>
                                <p style={{ fontSize: 11, fontWeight: 700, color: "#a8a29e", textTransform: "uppercase" as const, letterSpacing: "0.06em", margin: "0 0 10px 0" }}>Detected fields</p>
                                {[
                                  { label: "Who you are", val: parsedPreview.role },
                                  { label: "Working on", val: parsedPreview.goal },
                                  { label: "Interests", val: parsedPreview.preferences },
                                  { label: "More about you", val: parsedPreview.extended },
                                ].filter((f) => f.val).map((f) => (
                                  <div key={f.label} style={{ marginBottom: 8 }}>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: "#78716c" }}>{f.label}: </span>
                                    <span style={{ fontSize: 11, color: "#44403c" }}>{f.val.slice(0, 120)}{f.val.length > 120 ? "…" : ""}</span>
                                  </div>
                                ))}
                                <button
                                  onClick={fillFromParsed}
                                  style={{ marginTop: 6, padding: "8px 20px", background: "#f97316", color: "#fff", fontWeight: 700, fontSize: 13, borderRadius: 100, border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                                >
                                  Fill fields with this →
                                </button>
                              </div>
                            )}

                            {importText.trim() && !parsedPreview && (
                              <p style={{ fontSize: 11, color: "#a8a29e", marginTop: 8 }}>
                                Couldn&apos;t read the format. Make sure the AI output uses the <code>Role:</code> / <code>Focus:</code> labels.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Save + Skip + Clear */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" as const }}>
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
              {isFirstTimer && (
                <button
                  onClick={() => router.push("/dashboard")}
                  style={{ padding: "13px 24px", background: "none", color: "#a8a29e", fontWeight: 600, fontSize: 14, borderRadius: 100, border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
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

            {/* Clear profile (returning users only) */}
            {!isFirstTimer && (
              <div style={{ marginTop: 16 }}>
                {!showClearConfirm ? (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    style={{ padding: 0, background: "none", border: "none", fontSize: 13, color: "#dc2626", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", opacity: 0.7 }}
                  >
                    Clear profile
                  </button>
                ) : (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 14, padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <p style={{ fontSize: 13, color: "#991b1b", margin: 0 }}>
                      This clears the role / focus / interests / more-about-you fields. You can set them again any time.
                    </p>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={() => setShowClearConfirm(false)}
                        style={{ padding: "6px 14px", background: "#fff", border: "1px solid #e7e2d9", borderRadius: 100, fontSize: 12, fontWeight: 600, color: "#78716c", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleClear}
                        disabled={clearing}
                        style={{ padding: "6px 14px", background: "#dc2626", border: "none", borderRadius: 100, fontSize: 12, fontWeight: 600, color: "#fff", cursor: clearing ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {clearing ? "Clearing..." : "Clear"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
