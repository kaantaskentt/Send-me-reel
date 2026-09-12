"use client";

/**
 * ProfileSetup — multi-step profile onboarding
 * Steps: 0 intro → 1 copy prompt → 2 paste output → 3 review/edit → 4 done
 * On mount: if profile already exists, jumps to step 3 (edit mode)
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// ─── prompt ────────────────────────────────────────────────────────────────

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

const CLAUDE_URL = `https://claude.ai/new?q=${encodeURIComponent(AI_PROMPT)}`;
const CHATGPT_URL = `https://chat.openai.com/?q=${encodeURIComponent(AI_PROMPT)}`;

// ─── types ──────────────────────────────────────────────────────────────────

interface Profile {
  name: string;
  whoYouAre: string;
  workingOn: string;
  interests: string;
  bio: string;
}

const EMPTY_PROFILE: Profile = { name: "", whoYouAre: "", workingOn: "", interests: "", bio: "" };

// ─── animation ──────────────────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
};
const transition = { type: "spring" as const, damping: 28, stiffness: 280 };

// ─── progress dots ──────────────────────────────────────────────────────────

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-10">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === step ? 20 : 6,
            height: 6,
            background:
              i === step
                ? "#F97316"
                : i < step
                ? "rgba(249,115,22,0.35)"
                : "#e7e2d9",
          }}
        />
      ))}
    </div>
  );
}

// ─── step 0: intro ──────────────────────────────────────────────────────────

function StepIntro({ onAI, onManual }: { onAI: () => void; onManual: () => void }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#F97316", fontFamily: "JetBrains Mono, monospace" }}>
        Step 1 of 3
      </p>
      <h1 className="text-3xl font-black mb-3 leading-tight" style={{ color: "#1c1917", letterSpacing: "-0.02em" }}>
        Build your context.
      </h1>
      <p className="text-base mb-8 max-w-sm leading-relaxed" style={{ color: "#78716c" }}>
        ContextDrop uses your profile to filter what matters. The more specific you are, the sharper your feed.
      </p>

      <div className="space-y-3">
        <button
          onClick={onAI}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all duration-150 hover:brightness-110 active:scale-[0.99]"
          style={{ background: "#F97316", boxShadow: "0 0 32px rgba(249,115,22,0.25)" }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.15)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm">Use Claude or ChatGPT</p>
            <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.7)" }}>Fastest — AI writes your profile from your chat history</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={onManual}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all duration-150"
          style={{ background: "#fff", border: "1px solid #e7e2d9", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#f5f1eb" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm" style={{ color: "#1c1917" }}>Write it myself</p>
            <p className="text-xs mt-0.5" style={{ color: "#78716c" }}>Fill in the fields manually</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c4bdb5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── step 1: copy prompt + open AI ──────────────────────────────────────────

function StepCopyPrompt({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [copied, setCopied] = useState(false);
  const [opened, setOpened] = useState<"claude" | "chatgpt" | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(AI_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpen = (which: "claude" | "chatgpt") => {
    setOpened(which);
    window.open(which === "claude" ? CLAUDE_URL : CHATGPT_URL, "_blank");
  };

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#F97316", fontFamily: "JetBrains Mono, monospace" }}>
        Step 1 of 3
      </p>
      <h2 className="text-2xl font-black mb-2 leading-tight" style={{ color: "#1c1917", letterSpacing: "-0.02em" }}>
        Open Claude or ChatGPT.
      </h2>
      <p className="text-sm mb-6 leading-relaxed" style={{ color: "#78716c" }}>
        We&apos;ll send a prompt. The AI writes your profile from your chat history — takes about 30 seconds.
      </p>

      <div className="rounded-2xl mb-5 overflow-hidden" style={{ background: "#fff", border: "1px solid #e7e2d9" }}>
        <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid #f0ebe4" }}>
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#a8a29e", fontFamily: "JetBrains Mono, monospace" }}>
            Prompt
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition-all duration-150"
            style={{
              background: copied ? "rgba(249,115,22,0.08)" : "#f5f1eb",
              color: copied ? "#F97316" : "#78716c",
              border: copied ? "1px solid rgba(249,115,22,0.3)" : "1px solid transparent",
            }}
          >
            {copied ? (
              <>
                <svg width="11" height="11" viewBox="0 0 10 10" fill="none"><path d="M1.5 5L4 7.5L8.5 2.5" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Copied
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
        <p className="px-4 py-3 text-xs leading-relaxed line-clamp-4" style={{ color: "#78716c", fontFamily: "JetBrains Mono, monospace" }}>
          {AI_PROMPT}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <button
          onClick={() => handleOpen("claude")}
          className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all duration-150 hover:brightness-110 active:scale-[0.98]"
          style={{
            background: opened === "claude" ? "rgba(249,115,22,0.08)" : "#F97316",
            color: opened === "claude" ? "#F97316" : "white",
            border: opened === "claude" ? "1px solid rgba(249,115,22,0.3)" : "none",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
            <circle cx="12" cy="12" r="2"/>
            <rect x="11" y="2" width="2" height="5" rx="1"/>
            <rect x="11" y="17" width="2" height="5" rx="1"/>
            <rect x="17" y="11" width="5" height="2" rx="1"/>
            <rect x="2" y="11" width="5" height="2" rx="1"/>
            <rect x="16.95" y="3.64" width="2" height="5" rx="1" transform="rotate(45 17.95 4.64)"/>
            <rect x="4.64" y="15.95" width="2" height="5" rx="1" transform="rotate(45 5.64 16.95)"/>
            <rect x="15.95" y="16.95" width="5" height="2" rx="1" transform="rotate(45 18.45 17.95)"/>
            <rect x="3.64" y="4.64" width="5" height="2" rx="1" transform="rotate(45 6.14 5.64)"/>
          </svg>
          <span>Open Claude</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </button>

        <button
          onClick={() => handleOpen("chatgpt")}
          className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all duration-150 active:scale-[0.98]"
          style={{
            background: opened === "chatgpt" ? "rgba(16,163,127,0.08)" : "#fff",
            color: opened === "chatgpt" ? "#10a37f" : "#1c1917",
            border: opened === "chatgpt" ? "1px solid rgba(16,163,127,0.3)" : "1px solid #e7e2d9",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
            <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
          </svg>
          <span>Open ChatGPT</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </button>
      </div>

      {opened && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)" }}
        >
          <div className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ background: "#F97316" }} />
          <p className="text-sm" style={{ color: "#44403c" }}>
            Opened in a new tab. Come back here once you have the output.
          </p>
        </motion.div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={onNext}
          className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-150 hover:brightness-110 active:scale-[0.98]"
          style={{ background: "#F97316", boxShadow: "0 0 24px rgba(249,115,22,0.2)" }}
        >
          I have the output →
        </button>
        <button onClick={onBack} className="text-sm" style={{ color: "#a8a29e" }}>
          Back
        </button>
      </div>
    </div>
  );
}

// ─── step 2: paste AI output ─────────────────────────────────────────────────

function StepPasteOutput({ onNext, onBack }: { onNext: (raw: string) => void; onBack: () => void }) {
  const [raw, setRaw] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#F97316", fontFamily: "JetBrains Mono, monospace" }}>
        Step 2 of 3
      </p>
      <h2 className="text-2xl font-black mb-2 leading-tight" style={{ color: "#1c1917", letterSpacing: "-0.02em" }}>
        Paste what it wrote.
      </h2>
      <p className="text-sm mb-5 leading-relaxed" style={{ color: "#78716c" }}>
        Copy the full response from Claude or ChatGPT and drop it here. We&apos;ll parse it automatically.
      </p>

      <div className="rounded-2xl overflow-hidden mb-5" style={{ background: "#fff", border: "1px solid #e7e2d9" }}>
        <textarea
          ref={textareaRef}
          value={raw}
          onChange={e => setRaw(e.target.value)}
          placeholder="Paste the AI's response here…"
          rows={10}
          className="w-full bg-transparent text-sm outline-none resize-none px-4 py-4 leading-relaxed"
          style={{ color: "#1c1917", fontFamily: "Inter, sans-serif", caretColor: "#F97316" }}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => raw.trim() && onNext(raw)}
          disabled={!raw.trim()}
          className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-150 hover:brightness-110 active:scale-[0.98] disabled:opacity-35"
          style={{ background: "#F97316", boxShadow: raw.trim() ? "0 0 24px rgba(249,115,22,0.2)" : "none" }}
        >
          Parse & continue →
        </button>
        <button onClick={onBack} className="text-sm" style={{ color: "#a8a29e" }}>
          Back
        </button>
      </div>
    </div>
  );
}

// ─── step 3: review & edit ───────────────────────────────────────────────────

function StepEditProfile({
  profile,
  onChange,
  onSave,
  onBack,
  saving,
}: {
  profile: Profile;
  onChange: (p: Profile) => void;
  onSave: () => void;
  onBack: () => void;
  saving: boolean;
}) {
  const fieldStyle = {
    background: "#faf8f5",
    border: "1px solid #e7e2d9",
    color: "#1c1917",
    fontFamily: "Inter, sans-serif",
    caretColor: "#F97316",
  };

  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = "#f97316";
    e.target.style.boxShadow = "0 0 0 3px rgba(249,115,22,0.1)";
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = "#e7e2d9";
    e.target.style.boxShadow = "none";
  };

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#F97316", fontFamily: "JetBrains Mono, monospace" }}>
        Step 3 of 3
      </p>
      <h2 className="text-2xl font-black mb-2 leading-tight" style={{ color: "#1c1917", letterSpacing: "-0.02em" }}>
        Looks right?
      </h2>
      <p className="text-sm mb-6 leading-relaxed" style={{ color: "#78716c" }}>
        We parsed the AI output. Edit anything that&apos;s off — this is your self-portrait.
      </p>

      {/* Display name */}
      <div className="mb-5">
        <div className="flex items-baseline justify-between mb-1.5">
          <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#78716c", fontFamily: "JetBrains Mono, monospace" }}>Display name</label>
        </div>
        <input
          type="text"
          value={profile.name}
          onChange={e => onChange({ ...profile, name: e.target.value })}
          placeholder="Your name"
          maxLength={60}
          className="w-full text-sm outline-none rounded-xl px-4 py-3 transition-all duration-150"
          style={fieldStyle}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        <p className="text-[10px] mt-1 text-right" style={{ color: "#c4bdb5" }}>{profile.name.length} / 60</p>
      </div>

      {/* Who you are */}
      <div className="mb-5">
        <div className="flex items-baseline justify-between mb-1.5">
          <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#78716c", fontFamily: "JetBrains Mono, monospace" }}>Who you are</label>
          <span className="text-[10px]" style={{ color: "#c4bdb5" }}>1 sentence · 80 chars</span>
        </div>
        <input
          type="text"
          value={profile.whoYouAre}
          onChange={e => onChange({ ...profile, whoYouAre: e.target.value })}
          placeholder="Founder, designer, researcher…"
          maxLength={80}
          className="w-full text-sm outline-none rounded-xl px-4 py-3 transition-all duration-150"
          style={fieldStyle}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        <p className="text-[10px] mt-1 text-right" style={{ color: "#c4bdb5" }}>{profile.whoYouAre.length} / 80</p>
      </div>

      {/* Working on */}
      <div className="mb-5">
        <div className="flex items-baseline justify-between mb-1.5">
          <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#78716c", fontFamily: "JetBrains Mono, monospace" }}>What you&apos;re working on</label>
          <span className="text-[10px]" style={{ color: "#c4bdb5" }}>1 sentence · 80 chars</span>
        </div>
        <input
          type="text"
          value={profile.workingOn}
          onChange={e => onChange({ ...profile, workingOn: e.target.value })}
          placeholder="The thing taking most of your time right now"
          maxLength={80}
          className="w-full text-sm outline-none rounded-xl px-4 py-3 transition-all duration-150"
          style={fieldStyle}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        <p className="text-[10px] mt-1 text-right" style={{ color: "#c4bdb5" }}>{profile.workingOn.length} / 80</p>
      </div>

      {/* Interests */}
      <div className="mb-5">
        <div className="flex items-baseline justify-between mb-1.5">
          <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#78716c", fontFamily: "JetBrains Mono, monospace" }}>Interests & topics</label>
          <span className="text-[10px]" style={{ color: "#c4bdb5" }}>comma-separated</span>
        </div>
        <input
          type="text"
          value={profile.interests}
          onChange={e => onChange({ ...profile, interests: e.target.value })}
          placeholder="AI, design, startups, philosophy…"
          maxLength={200}
          className="w-full text-sm outline-none rounded-xl px-4 py-3 transition-all duration-150"
          style={fieldStyle}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        <p className="text-[10px] mt-1 text-right" style={{ color: "#c4bdb5" }}>{profile.interests.length} / 200</p>
      </div>

      {/* Bio */}
      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-1.5">
          <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#78716c", fontFamily: "JetBrains Mono, monospace" }}>More about you</label>
          <span className="text-[10px]" style={{ color: "#c4bdb5" }}>optional</span>
        </div>
        <textarea
          value={profile.bio}
          onChange={e => onChange({ ...profile, bio: e.target.value })}
          placeholder="The full picture — paste AI output or write it yourself"
          rows={4}
          className="w-full text-sm outline-none resize-none rounded-xl px-4 py-3 leading-relaxed transition-all duration-150"
          style={fieldStyle}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={!profile.name.trim() || !profile.whoYouAre.trim() || saving}
          className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-150 hover:brightness-110 active:scale-[0.98] disabled:opacity-35"
          style={{ background: "#F97316", boxShadow: "0 0 24px rgba(249,115,22,0.2)" }}
        >
          {saving ? "Saving…" : "Save profile →"}
        </button>
        <button onClick={onBack} className="text-sm" style={{ color: "#a8a29e" }}>
          Back
        </button>
      </div>
    </div>
  );
}

// ─── step 4: done ────────────────────────────────────────────────────────────

function StepDone({ name }: { name: string }) {
  return (
    <div className="text-center py-6">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 18, stiffness: 260, delay: 0.1 }}
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
        style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)" }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <h2 className="text-2xl font-black mb-2" style={{ color: "#1c1917", letterSpacing: "-0.02em" }}>
          You&apos;re set{name ? `, ${name.split(" ")[0]}` : ""}.
        </h2>
        <p className="text-sm mb-8 max-w-xs mx-auto leading-relaxed" style={{ color: "#78716c" }}>
          Your feed will now filter for what actually matters to you. Drop a link to try it.
        </p>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white text-sm transition-all duration-150 hover:brightness-110 active:scale-[0.98]"
          style={{ background: "#F97316", boxShadow: "0 0 28px rgba(249,115,22,0.25)" }}
        >
          Go to dashboard
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </motion.div>
    </div>
  );
}

// ─── parser ──────────────────────────────────────────────────────────────────

function parseAIOutput(raw: string): Partial<Profile> {
  const parsed: Partial<Profile> = {};
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).toLowerCase().trim().replace(/^[-–—*#\s]+/, "");
    const val = line.slice(colon + 1).trim();
    if (!val || val.startsWith("[")) continue;

    if (key === "role") parsed.whoYouAre = val.slice(0, 80);
    else if (key === "focus" || key === "current focus") parsed.workingOn = val.slice(0, 80);
    else if (key === "interests" || key === "interests & topics") parsed.interests = val.slice(0, 200);
    else if (key === "context") parsed.bio = val.slice(0, 600);
  }

  // Fallback: if context wasn't on one line, grab the last substantial paragraph
  if (!parsed.bio) {
    const paragraphs = raw.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 60);
    if (paragraphs.length > 0) parsed.bio = paragraphs[paragraphs.length - 1].slice(0, 600);
  }

  return parsed;
}

// ─── main ────────────────────────────────────────────────────────────────────

export default function ProfileSetup() {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [aiMode, setAiMode] = useState(true);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load existing profile — if found, jump straight to edit
  useEffect(() => {
    Promise.all([
      fetch("/api/user").then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("/api/context").then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([userRes, ctxRes]) => {
      const existing: Partial<Profile> = {};
      if (userRes?.user?.first_name) existing.name = userRes.user.first_name;
      if (ctxRes?.context) {
        const c = ctxRes.context;
        if (c.role) existing.whoYouAre = c.role;
        if (c.goal) existing.workingOn = c.goal;
        if (c.content_preferences) existing.interests = c.content_preferences;
        if (c.extended_context) existing.bio = c.extended_context;
      }
      if (existing.whoYouAre || existing.workingOn) {
        setProfile(prev => ({ ...prev, ...existing }));
        setStep(3);
      } else if (existing.name) {
        setProfile(prev => ({ ...prev, name: existing.name! }));
      }
      setLoading(false);
    });
  }, []);

  const go = (next: number) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
  };

  const handleParseAndContinue = (raw: string) => {
    const parsed = parseAIOutput(raw);
    setProfile(prev => ({ ...prev, ...parsed }));
    go(3);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        fetch("/api/user", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ display_name: profile.name }),
        }),
        fetch("/api/context", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: profile.whoYouAre,
            goal: profile.workingOn,
            content_preferences: profile.interests,
            extended_context: profile.bio || null,
          }),
        }),
      ]);
      go(4);
    } catch {
      // keep on step 3, user can retry
    } finally {
      setSaving(false);
    }
  };

  // dot progress: 0=intro, 1=copy prompt, 2=paste, 3=edit, 4=done
  const totalDots = aiMode ? 5 : 3;
  const dotStep = step === 0 ? 0 : step === 1 ? 1 : step === 2 ? 2 : step === 3 ? (aiMode ? 3 : 1) : (aiMode ? 4 : 2);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#faf8f5" }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(249,115,22,0.2)", borderTopColor: "#F97316" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#faf8f5" }}>
      {/* Nav */}
      <nav className="flex items-center px-5 sm:px-6 py-4" style={{ borderBottom: "1px solid #e7e2d9" }}>
        <Link href="/" className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          <span className="text-sm font-semibold" style={{ color: "#1c1917" }}>
            Context<span style={{ color: "#F97316" }}>Drop</span>
          </span>
          <span className="text-sm" style={{ color: "#c4bdb5" }}>/</span>
          <span className="text-sm" style={{ color: "#78716c" }}>Your Profile</span>
        </Link>
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-5 sm:px-6 py-12">
        <div className="w-full max-w-md">
          {step < 4 && <StepDots step={dotStep} total={totalDots} />}

          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
            >
              {step === 0 && (
                <StepIntro
                  onAI={() => { setAiMode(true); go(1); }}
                  onManual={() => { setAiMode(false); go(3); }}
                />
              )}
              {step === 1 && (
                <StepCopyPrompt onNext={() => go(2)} onBack={() => go(0)} />
              )}
              {step === 2 && (
                <StepPasteOutput onNext={handleParseAndContinue} onBack={() => go(1)} />
              )}
              {step === 3 && (
                <StepEditProfile
                  profile={profile}
                  onChange={setProfile}
                  onSave={handleSave}
                  onBack={() => go(aiMode ? 2 : 0)}
                  saving={saving}
                />
              )}
              {step === 4 && <StepDone name={profile.name} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
