"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Stance =
  | "curious_not_started"
  | "watching_not_doing"
  | "tried_gave_up"
  | "using_want_more";

interface UserData {
  first_name: string | null;
  stance: Stance | null;
  intention: string | null;
  pattern_to_stop: string | null;
}

const STANCE_LABELS: Record<Stance, string> = {
  curious_not_started: "🌱 Curious, haven't really started",
  watching_not_doing: "🪞 Watching, not yet doing",
  tried_gave_up: "🌀 Tried, got overwhelmed, gave up",
  using_want_more: "🛠 Using a bit, want to use more on purpose",
};

// Phase 4 reflection helper — replaces the old Role/Focus/Tools profile prompt.
// Anchored to strategy.md §5 + transformation-plan §17. Produces stance +
// one small commitment + one thing to stop. No professional identity.
const REFLECTION_PROMPT = `I'm setting up an account on ContextDrop, a tool that helps me actually try things from the AI content I save instead of just watching reels. They asked me to think about three things, and I want your help being honest with myself.

Based on our recent conversations, help me answer these. Don't make me sound more advanced than I am. If I'm overwhelmed, say that. If I've been all-talk-no-action, say that.

1. Where am I with AI right now? Pick the closest:
   🌱 curious but I haven't really started
   🪞 I keep watching stuff but never actually try anything
   🌀 I tried, got overwhelmed, kind of gave up
   🛠 I use it a bit, but want to use it more on purpose

2. ONE small commitment for the next two weeks. Not a goal. A specific thing I'd actually do. (e.g. "use Claude to draft one work email a day" — not "get good at AI")

3. ONE thing I want to STOP doing. The pattern I'm tired of. (e.g. "stop saving AI agent reels I'll never come back to")

Keep all three answers under 25 words each. No corporate language. No "leverage" or "synergize" or "actionable." Talk like I'd talk.`;

export default function ContextEditor() {
  const router = useRouter();
  const [initial, setInitial] = useState<UserData | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [stance, setStance] = useState<Stance | null>(null);
  const [intention, setIntention] = useState("");
  const [patternToStop, setPatternToStop] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [showHelper, setShowHelper] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/user")
      .then((r) => r.json())
      .then((data) => {
        const u = data.user;
        if (u) {
          const ud: UserData = {
            first_name: u.first_name ?? null,
            stance: (u.stance as Stance | null) ?? null,
            intention: u.intention ?? null,
            pattern_to_stop: u.pattern_to_stop ?? null,
          };
          setInitial(ud);
          setDisplayName(ud.first_name ?? "");
          setStance(ud.stance);
          setIntention(ud.intention ?? "");
          setPatternToStop(ud.pattern_to_stop ?? "");
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const copyHelper = async () => {
    await navigator.clipboard.writeText(REFLECTION_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const save = async () => {
    setSaving(true);
    setSavedFlash(false);
    const res = await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: displayName,
        stance: stance ?? null,
        intention,
        pattern_to_stop: patternToStop,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
      // Refresh local "initial" so dirty-checks reset
      setInitial({
        first_name: displayName.trim() || null,
        stance,
        intention: intention.trim() || null,
        pattern_to_stop: patternToStop.trim() || null,
      });
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

  const card: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #e7e2d9",
    borderRadius: 14,
    padding: 18,
  };
  const label: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#78716c",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 10,
  };
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
  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    resize: "vertical",
    minHeight: 64,
    lineHeight: 1.55,
  };
  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = "#6B8E6F";
    e.target.style.boxShadow = "0 0 0 3px rgba(107,142,111,0.15)";
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = "#e7e2d9";
    e.target.style.boxShadow = "none";
  };

  return (
    <div style={{ minHeight: "100vh", background: "#faf8f5", fontFamily: "'DM Sans', sans-serif" }}>
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
          <span style={{ fontSize: 13, color: "#a8a29e", marginLeft: 4 }}>/ Where you are</span>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1c1917", margin: "0 0 8px 0", letterSpacing: "-0.02em" }}>
            Where you are with AI
          </h1>
          <p style={{ fontSize: 14, color: "#78716c", lineHeight: 1.65, margin: 0, maxWidth: 540 }}>
            Three small things you can keep updated. They help me calibrate the action line for the stuff you save — gentler when you&apos;re just starting, more direct when you&apos;re ready. None of them is required.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
          {/* Display name */}
          <div style={card}>
            <span style={label}>Display name</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="What I should call you"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
            <p style={{ fontSize: 12, color: "#a8a29e", margin: "8px 0 0 0", lineHeight: 1.5 }}>
              Pulled from Telegram by default. Edit if it picked up a nickname or typo.
            </p>
          </div>

          {/* Stance */}
          <div style={card}>
            <span style={label}>Where you are with AI</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(Object.keys(STANCE_LABELS) as Stance[]).map((s) => {
                const active = stance === s;
                return (
                  <button
                    key={s}
                    onClick={() => setStance(active ? null : s)}
                    style={{
                      padding: "12px 14px",
                      fontSize: 14,
                      fontWeight: 500,
                      textAlign: "left",
                      color: active ? "#1c1917" : "#57534e",
                      background: active ? "#f0fdf4" : "#fafaf9",
                      border: `1px solid ${active ? "#bbf7d0" : "#e7e2d9"}`,
                      borderRadius: 12,
                      cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                      transition: "all 0.15s",
                    }}
                  >
                    {STANCE_LABELS[s]}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 12, color: "#a8a29e", margin: "10px 0 0 0", lineHeight: 1.5 }}>
              Used only to calibrate tone. Never shown to you in verdicts.
            </p>
          </div>

          {/* Intention */}
          <div style={card}>
            <span style={label}>
              Your two-week intention <span style={{ color: "#a8a29e", textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>· optional</span>
            </span>
            <textarea
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              placeholder='e.g. "Use Claude to draft one work email a day."'
              rows={2}
              maxLength={280}
              style={textareaStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
            <p style={{ fontSize: 12, color: "#a8a29e", margin: "8px 0 0 0", lineHeight: 1.5 }}>
              One small commitment. Not a goal. A specific thing you&apos;d actually do.
            </p>
          </div>

          {/* Pattern to stop */}
          <div style={card}>
            <span style={label}>
              The pattern you&apos;re stepping away from <span style={{ color: "#a8a29e", textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>· optional</span>
            </span>
            <textarea
              value={patternToStop}
              onChange={(e) => setPatternToStop(e.target.value)}
              placeholder='e.g. "Saving AI agent reels I&apos;ll never come back to."'
              rows={2}
              maxLength={280}
              style={textareaStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
            <p style={{ fontSize: 12, color: "#a8a29e", margin: "8px 0 0 0", lineHeight: 1.5 }}>
              One thing you want to stop doing. Helps me notice when a save matches the pattern.
            </p>
          </div>

          {/* Reflection helper */}
          <div style={card}>
            <button
              onClick={() => setShowHelper(!showHelper)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                fontSize: 14,
                fontWeight: 600,
                color: "#6B8E6F",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {showHelper ? "Hide reflection helper" : "Need help thinking about these? →"}
            </button>
            {showHelper && (
              <div style={{ marginTop: 14 }}>
                <p style={{ fontSize: 13, color: "#57534e", margin: "0 0 12px 0", lineHeight: 1.6 }}>
                  Paste this into Claude or ChatGPT — it&apos;ll talk you through the three answers in your own voice.
                </p>
                <button
                  onClick={copyHelper}
                  style={{
                    padding: "7px 16px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: copied ? "#15803d" : "#6B8E6F",
                    background: copied ? "#f0fdf4" : "#fafaf9",
                    border: `1px solid ${copied ? "#bbf7d0" : "#e7e2d9"}`,
                    borderRadius: 100,
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    marginBottom: 12,
                  }}
                >
                  {copied ? "Copied" : "Copy reflection prompt"}
                </button>
                <pre style={{ fontSize: 11, color: "#78716c", background: "#faf8f5", border: "1px solid #f0ebe4", borderRadius: 10, padding: 12, overflow: "auto", whiteSpace: "pre-wrap", maxHeight: 220, margin: 0, lineHeight: 1.55 }}>
                  {REFLECTION_PROMPT}
                </pre>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <button
            onClick={save}
            disabled={saving}
            style={{
              padding: "13px 32px",
              background: saving ? "#e7e2d9" : "#6B8E6F",
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
            {saving ? "Saving…" : "Save"}
          </button>
          {!initial && (
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
          {savedFlash && (
            <span style={{ fontSize: 14, color: "#15803d", fontWeight: 600 }}>
              Saved.
            </span>
          )}
        </div>
      </main>
    </div>
  );
}
