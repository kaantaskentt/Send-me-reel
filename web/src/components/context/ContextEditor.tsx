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
  const [showPrompt, setShowPrompt] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [importText, setImportText] = useState("");
  const [parsedPreview, setParsedPreview] = useState<ParsedProfile | null>(null);
  const [contextualizing, setContextualizing] = useState(false);

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

  const handleImportChange = (val: string) => {
    setImportText(val);
    if (val.trim()) {
      const parsed = parseAIProfile(val);
      setParsedPreview(parsed);
      if (parsed) {
        setContextualizing(true);
        setTimeout(() => setContextualizing(false), 2200);
      }
    } else {
      setParsedPreview(null);
    }
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
        body: JSON.stringify({ role, goal, content_preferences: preferences, extended_context: extendedContext || null }),
      }),
    ]);
    setSaving(false);
    if (userRes.ok && ctxRes.ok) {
      setSaved(true);
      setContext({ role, goal, content_preferences: preferences, extended_context: extendedContext || null });
      if (!context) setTimeout(() => router.push("/dashboard"), 1500);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    const res = await fetch("/api/context", { method: "DELETE" });
    setClearing(false);
    if (res.ok) {
      setContext(null);
      setRole(""); setGoal(""); setPreferences(""); setExtendedContext("");
      setShowClearConfirm(false); setSaved(false);
    }
  };

  const fillFromParsed = () => {
    if (!parsedPreview) return;
    if (parsedPreview.role) setRole(parsedPreview.role);
    if (parsedPreview.goal) setGoal(parsedPreview.goal);
    if (parsedPreview.preferences) setPreferences(parsedPreview.preferences);
    if (parsedPreview.extended) setExtendedContext(parsedPreview.extended);
    setImportText(""); setParsedPreview(null);
    setShowPasteBox(false); setShowAiHelper(false);
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
    width: "100%", padding: "11px 14px", fontSize: 14,
    border: "1px solid #e7e2d9", borderRadius: 12, outline: "none",
    color: "#1c1917", fontFamily: "'DM Sans', sans-serif",
    boxSizing: "border-box", background: "#faf8f5",
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
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(6px) scale(0.95); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateX(-50%) scale(1); }
          to   { opacity: 0; transform: translateX(-50%) scale(0.95); }
        }
      `}</style>

      {/* Contextualizing toast */}
      {contextualizing && (
        <div style={{
          position: "fixed", bottom: 32, left: "50%",
          transform: "translateX(-50%)",
          background: "#1c1917", color: "#fff",
          padding: "10px 20px", borderRadius: 100,
          fontSize: 13, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 8,
          zIndex: 200, whiteSpace: "nowrap",
          animation: "toastIn 0.25s ease forwards",
          boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
        }}>
          <span>✓</span> Contextualizing...
        </div>
      )}

      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(250,248,245,0.92)", backdropFilter: "blur(16px)", borderBottom: "1px solid #e7e2d9" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 20px", height: 56, maxWidth: 640, margin: "0 auto" }}>
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

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "48px 20px" }}>

        {/* ── AI-FIRST SCREEN ── */}
        {showAiFirstScreen && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", animation: "fadeUp 0.3s ease" }}>

            {/* Icon */}
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: "linear-gradient(135deg, #f97316, #fb923c)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 20, fontSize: 26, boxShadow: "0 4px 16px rgba(249,115,22,0.25)",
            }}>
              ✦
            </div>

            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1c1917", margin: "0 0 12px 0", letterSpacing: "-0.02em" }}>
              30 seconds to a smarter feed
            </h1>
            <p style={{ fontSize: 15, color: "#78716c", lineHeight: 1.65, margin: "0 0 36px 0", maxWidth: 420 }}>
              Paste this prompt into Claude or ChatGPT — it writes your profile from your chat history. Then drop the result below.
            </p>

            {/* Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 380 }}>
              {isMobile ? (
                <>
                  <button
                    onClick={copyPrompt}
                    style={{
                      width: "100%", padding: "15px 24px",
                      background: copied ? "#f0fdf4" : "linear-gradient(135deg, #f97316, #fb923c)",
                      border: copied ? "1px solid #bbf7d0" : "none",
                      borderRadius: 14, fontSize: 15, fontWeight: 700,
                      color: copied ? "#16a34a" : "#fff",
                      cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                      boxShadow: copied ? "none" : "0 4px 14px rgba(249,115,22,0.3)",
                      transition: "all 0.2s",
                    }}
                  >
                    {copied ? "✓ Copied!" : "Copy prompt"}
                  </button>
                  <a
                    href={claudeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowPasteBox(true)}
                    style={{
                      display: "block", width: "100%", padding: "15px 24px",
                      background: "#fff", border: "1.5px solid #e7e2d9",
                      borderRadius: 14, fontSize: 15, fontWeight: 600,
                      color: "#1c1917", textDecoration: "none", textAlign: "center" as const,
                      boxSizing: "border-box" as const,
                    }}
                  >
                    Open in Claude →
                  </a>
                </>
              ) : (
                <div style={{ display: "flex", gap: 10 }}>
                  <a
                    href={claudeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowPasteBox(true)}
                    style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "14px 20px",
                      background: "linear-gradient(135deg, #f97316, #fb923c)",
                      borderRadius: 14, fontSize: 14, fontWeight: 700,
                      color: "#fff", textDecoration: "none",
                      boxShadow: "0 4px 14px rgba(249,115,22,0.3)",
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
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "14px 20px",
                      background: "#fff", border: "1.5px solid #e7e2d9",
                      borderRadius: 14, fontSize: 14, fontWeight: 700,
                      color: "#1c1917", textDecoration: "none",
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

            {/* View prompt toggle */}
            <button
              onClick={() => setShowPrompt(!showPrompt)}
              style={{ marginTop: 20, padding: "4px 0", background: "none", border: "none", fontSize: 12, color: "#a8a29e", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}
            >
              {showPrompt ? "Hide prompt ↑" : "View prompt ↓"}
            </button>

            {showPrompt && (
              <div style={{ width: "100%", maxWidth: 480, marginTop: 8, animation: "fadeUp 0.2s ease" }}>
                <pre style={{
                  fontSize: 11, color: "#78716c", background: "#fff",
                  border: "1px solid #f0ebe4", borderRadius: 14, padding: 16,
                  overflow: "auto", whiteSpace: "pre-wrap", maxHeight: 220,
                  margin: 0, lineHeight: 1.6, textAlign: "left" as const,
                }}>
                  {AI_PROMPT}
                </pre>
              </div>
            )}

            {/* Paste zone */}
            {showPasteBox && (
              <div style={{ width: "100%", maxWidth: 480, marginTop: 28, animation: "fadeUp 0.25s ease" }}>
                <div style={{
                  background: "#fff", border: "1.5px solid #e7e2d9",
                  borderRadius: 18, padding: 24,
                  boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
                }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#44403c", margin: "0 0 4px 0" }}>
                    Paste the output here
                  </p>
                  <p style={{ fontSize: 12, color: "#a8a29e", margin: "0 0 12px 0" }}>
                    Drop what Claude or ChatGPT wrote back
                  </p>
                  <textarea
                    value={importText}
                    onChange={(e) => handleImportChange(e.target.value)}
                    placeholder="Paste here..."
                    rows={6}
                    style={{ ...inputStyle, resize: "vertical", fontSize: 13 }}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />

                  {parsedPreview && (
                    <div style={{ background: "#faf8f5", border: "1px solid #f0ebe4", borderRadius: 12, padding: 14, marginTop: 12, animation: "fadeUp 0.2s ease" }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#a8a29e", textTransform: "uppercase" as const, letterSpacing: "0.07em", margin: "0 0 10px 0" }}>Detected</p>
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
                          marginTop: 12, padding: "10px 24px",
                          background: "linear-gradient(135deg, #f97316, #fb923c)",
                          color: "#fff", fontWeight: 700, fontSize: 13,
                          borderRadius: 100, border: "none", cursor: "pointer",
                          fontFamily: "'DM Sans', sans-serif",
                          boxShadow: "0 2px 10px rgba(249,115,22,0.25)",
                        }}
                      >
                        Fill fields with this →
                      </button>
                    </div>
                  )}

                  {importText.trim() && !parsedPreview && (
                    <p style={{ fontSize: 11, color: "#a8a29e", marginTop: 8 }}>
                      Couldn&apos;t read the format — make sure the output has <code>Role:</code> and <code>Focus:</code> labels.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Footer links */}
            <div style={{ display: "flex", gap: 20, marginTop: 28, alignItems: "center" }}>
              <button
                onClick={() => setShowManualForm(true)}
                style={{ padding: 0, background: "none", border: "none", fontSize: 13, color: "#a8a29e", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
              >
                I&apos;ll write it myself →
              </button>
            </div>
          </div>
        )}

        {/* ── MANUAL FORM (first-timers who chose manual or after auto-fill) ── */}
        {isFirstTimer && showManualForm && (
          <div style={{ animation: "fadeUp 0.25s ease" }}>
            {/* Back link */}
            <button
              onClick={() => setShowManualForm(false)}
              style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 24, padding: 0, background: "none", border: "none", fontSize: 13, color: "#a8a29e", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
              Back to prompt
            </button>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1c1917", margin: "0 0 6px 0" }}>Make it personal</h1>
            <p style={{ fontSize: 14, color: "#78716c", lineHeight: 1.6, margin: "0 0 28px 0" }}>Fill in what you can — even a few words help.</p>
            {renderForm()}
          </div>
        )}

        {/* ── RETURNING USER FORM ── */}
        {!isFirstTimer && (
          <div style={{ animation: "fadeUp 0.25s ease" }}>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1c1917", margin: "0 0 8px 0" }}>Edit your profile</h1>
              <p style={{ fontSize: 14, color: "#78716c", lineHeight: 1.6, margin: 0, maxWidth: 480 }}>
                Your self-portrait, in your own words. We don&apos;t feed this into verdicts — it&apos;s yours.
              </p>
            </div>
            {renderForm()}
          </div>
        )}
      </main>
    </div>
  );

  function renderForm() {
    const inputStyle2: React.CSSProperties = {
      width: "100%", padding: "11px 14px", fontSize: 14,
      border: "1px solid #e7e2d9", borderRadius: 12, outline: "none",
      color: "#1c1917", fontFamily: "'DM Sans', sans-serif",
      boxSizing: "border-box", background: "#faf8f5",
    };

    return (
      <>
        <div style={{ background: "#fff", border: "1px solid #e7e2d9", borderRadius: 18, padding: 24, marginBottom: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#44403c", marginBottom: 6 }}>
                Display name <span style={{ color: "#a8a29e", fontWeight: 400 }}>· what we call you</span>
              </label>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Pulled from Telegram. Edit if needed."
                style={inputStyle2} onFocus={handleFocus} onBlur={handleBlur} />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#44403c", marginBottom: 6 }}>Who you are</label>
              <input type="text" value={role} onChange={(e) => setRole(e.target.value)}
                placeholder="Marketing manager at a startup · 10 words max"
                maxLength={80} style={inputStyle2} onFocus={handleFocus} onBlur={handleBlur} />
              <p style={{ fontSize: 11, margin: "4px 0 0 2px", color: role.length >= 65 ? "#f97316" : "#c4bdb5" }}>{role.length} / 80</p>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#44403c", marginBottom: 6 }}>What you&apos;re working on</label>
              <input type="text" value={goal} onChange={(e) => setGoal(e.target.value)}
                placeholder="Learning how AI fits my career · 10 words max"
                maxLength={80} style={inputStyle2} onFocus={handleFocus} onBlur={handleBlur} />
              <p style={{ fontSize: 11, margin: "4px 0 0 2px", color: goal.length >= 65 ? "#f97316" : "#c4bdb5" }}>{goal.length} / 80</p>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#44403c", marginBottom: 6 }}>
                Interests & topics <span style={{ color: "#a8a29e", fontWeight: 400 }}>· optional</span>
              </label>
              <input type="text" value={preferences} onChange={(e) => setPreferences(e.target.value)}
                placeholder="AI, marketing, startups, design — comma-separated"
                style={inputStyle2} onFocus={handleFocus} onBlur={handleBlur} />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#44403c", marginBottom: 4 }}>
                More about you <span style={{ color: "#a8a29e", fontWeight: 400 }}>· optional</span>
              </label>
              <p style={{ fontSize: 12, color: "#a8a29e", margin: "0 0 8px 0", lineHeight: 1.5 }}>
                The full picture — paste AI output or write it yourself.
              </p>
              <textarea value={extendedContext} onChange={(e) => setExtendedContext(e.target.value)}
                placeholder="Tell me about yourself — what you care about, what a good week looks like..."
                rows={5} style={{ ...inputStyle2, resize: "vertical" }} onFocus={handleFocus} onBlur={handleBlur} />

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
                        <p style={{ fontSize: 12, color: "#78716c", margin: 0 }}>Copy → paste into Claude or ChatGPT → paste result below.</p>
                        <button
                          onClick={copyPrompt}
                          style={{
                            flexShrink: 0, padding: "6px 14px",
                            background: copied ? "#f0fdf4" : "#fff7ed",
                            border: `1px solid ${copied ? "#bbf7d0" : "#fed7aa"}`,
                            borderRadius: 100, fontSize: 12, fontWeight: 600,
                            color: copied ? "#16a34a" : "#f97316",
                            cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
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
                          onChange={(e) => handleImportChange(e.target.value)}
                          placeholder="Paste the formatted profile output..."
                          rows={6} style={{ ...inputStyle2, resize: "vertical", fontSize: 12 }}
                          onFocus={handleFocus} onBlur={handleBlur}
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
                            <button onClick={fillFromParsed}
                              style={{ marginTop: 6, padding: "8px 20px", background: "#f97316", color: "#fff", fontWeight: 700, fontSize: 13, borderRadius: 100, border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                              Fill fields with this →
                            </button>
                          </div>
                        )}
                        {importText.trim() && !parsedPreview && (
                          <p style={{ fontSize: 11, color: "#a8a29e", marginTop: 8 }}>
                            Couldn&apos;t read the format. Make sure the AI output uses <code>Role:</code> / <code>Focus:</code> labels.
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

        {/* Save */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" as const }}>
          <button onClick={handleSave} disabled={saving} style={{
            padding: "13px 32px",
            background: saving ? "#e7e2d9" : "linear-gradient(135deg, #f97316, #fb923c)",
            color: saving ? "#a8a29e" : "#fff",
            fontWeight: 700, fontSize: 15, borderRadius: 100, border: "none",
            cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
            boxShadow: saving ? "none" : "0 3px 12px rgba(249,115,22,0.3)",
          }}>
            {saving ? "Saving..." : context ? "Save" : "Save & Continue"}
          </button>
          {isFirstTimer && (
            <button onClick={() => router.push("/dashboard")} style={{
              padding: "13px 24px", background: "none", color: "#a8a29e",
              fontWeight: 600, fontSize: 14, borderRadius: 100, border: "none",
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}>Skip for now</button>
          )}
          {saved && <span style={{ fontSize: 14, color: "#16a34a", fontWeight: 600 }}>{context ? "Saved." : "Saved — taking you to your dashboard..."}</span>}
        </div>

        {/* Clear (returning users) */}
        {!isFirstTimer && (
          <div style={{ marginTop: 16 }}>
            {!showClearConfirm ? (
              <button onClick={() => setShowClearConfirm(true)} style={{ padding: 0, background: "none", border: "none", fontSize: 13, color: "#dc2626", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", opacity: 0.7 }}>
                Clear profile
              </button>
            ) : (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 14, padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <p style={{ fontSize: 13, color: "#991b1b", margin: 0 }}>This clears all profile fields. You can set them again any time.</p>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => setShowClearConfirm(false)} style={{ padding: "6px 14px", background: "#fff", border: "1px solid #e7e2d9", borderRadius: 100, fontSize: 12, fontWeight: 600, color: "#78716c", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
                  <button onClick={handleClear} disabled={clearing} style={{ padding: "6px 14px", background: "#dc2626", border: "none", borderRadius: 100, fontSize: 12, fontWeight: 600, color: "#fff", cursor: clearing ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                    {clearing ? "Clearing..." : "Clear"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </>
    );
  }
}
