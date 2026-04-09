/*
 * Chat — ContextDrop web chat interface
 * Design: Warm cream base, orange accent, DM Sans
 * Layout: Fixed top nav + scrollable chat area + sticky input bar at bottom
 * Mimics Telegram bot UX but in the browser — paste link, get verdict
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  Send,
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  BookOpen,
  Zap,
  X,
  RotateCcw,
  ChevronDown,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageRole = "user" | "bot" | "typing" | "verdict";
type Intent = "learn" | "apply" | "skip";

interface BaseMessage {
  id: string;
  role: MessageRole;
  timestamp: Date;
}

interface UserMessage extends BaseMessage {
  role: "user";
  text: string;
}

interface BotMessage extends BaseMessage {
  role: "bot";
  text: string;
}

interface TypingMessage extends BaseMessage {
  role: "typing";
  stage: "fetching" | "transcribing" | "generating";
}

interface VerdictMessage extends BaseMessage {
  role: "verdict";
  platform: string;
  url: string;
  title: string;
  whatIsIt: string;
  whatsInside: string;
  realWorldContext: string;
  tags: string[];
  intent: Intent;
}

type Message = UserMessage | BotMessage | TypingMessage | VerdictMessage;

// ─── Mock verdicts ────────────────────────────────────────────────────────────

const MOCK_VERDICTS: Record<string, Omit<VerdictMessage, "id" | "role" | "timestamp">> = {
  default: {
    platform: "instagram",
    url: "https://www.instagram.com/reel/DFnVBmxx2Lj/",
    title: "How to build an Obsidian knowledge base that actually works",
    whatIsIt: "A practical walkthrough of a mature Obsidian vault using Maps of Content (MOCs) instead of nested folders. The creator shows their exact structure after 3 years of daily use.",
    whatsInside: "MOC structure demo, folder-free navigation, backlink strategy, daily note template, tag taxonomy, and a live search walkthrough across 3,000+ notes.",
    realWorldContext: "If you're drowning in saved notes you never revisit, this is the system fix. Directly applicable to any knowledge worker or founder who reads a lot but retains little.",
    tags: ["obsidian", "pkm", "knowledge base", "second brain"],
    intent: "apply",
  },
};

function detectPlatform(url: string): string {
  if (url.includes("instagram.com")) return "instagram";
  if (url.includes("tiktok.com")) return "tiktok";
  if (url.includes("twitter.com") || url.includes("x.com")) return "x";
  if (url.includes("linkedin.com")) return "linkedin";
  return "web";
}

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return ["instagram.com", "tiktok.com", "twitter.com", "x.com", "linkedin.com"]
      .some(d => url.hostname.includes(d));
  } catch { return false; }
}

// ─── Platform icon ────────────────────────────────────────────────────────────

function PlatformIcon({ platform, size = 16 }: { platform: string; size?: number }) {
  if (platform === "instagram") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs><linearGradient id="igc" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f09433"/><stop offset="50%" stopColor="#e6683c"/><stop offset="100%" stopColor="#bc1888"/></linearGradient></defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#igc)"/>
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="white" strokeWidth="1.5"/>
      <circle cx="17.5" cy="6.5" r="1" fill="white"/>
    </svg>
  );
  if (platform === "linkedin") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#0A66C2"/>
      <path d="M7.5 9.5h-2v8h2v-8zm-1-3a1.25 1.25 0 1 0 0 2.5A1.25 1.25 0 0 0 6.5 6.5zm10.5 3c-1.2 0-2 .5-2.5 1.2V9.5h-2v8h2v-4.2c0-1.1.6-1.8 1.5-1.8s1.5.7 1.5 1.8v4.2h2v-4.5c0-2.2-1.2-3.5-2.5-3.5z" fill="white"/>
    </svg>
  );
  if (platform === "x") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#000"/>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="white"/>
    </svg>
  );
  if (platform === "tiktok") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#010101"/>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.53V6.77a4.85 4.85 0 01-1.02-.08z" fill="white"/>
    </svg>
  );
  return null;
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

const STAGES = ["fetching", "transcribing", "generating"] as const;
const STAGE_LABELS: Record<string, string> = {
  fetching: "Fetching video…",
  transcribing: "Transcribing…",
  generating: "Generating verdict…",
};

function TypingBubble({ stage }: { stage: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="flex items-end gap-2 max-w-sm"
    >
      {/* Bot avatar */}
      <div className="w-7 h-7 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center flex-shrink-0 mb-0.5">
        <div className="w-2 h-2 rounded-full bg-orange-500" />
      </div>
      <div className="bg-white border border-stone-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-orange-400"
                animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
          <span className="text-xs text-stone-400 font-500">{STAGE_LABELS[stage]}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Verdict card bubble ──────────────────────────────────────────────────────

function VerdictBubble({ msg }: { msg: VerdictMessage }) {
  const [intent, setIntent] = useState<Intent>(msg.intent);
  const [notionState, setNotionState] = useState<"idle" | "loading" | "saved">("idle");
  const [copied, setCopied] = useState(false);

  function intentStyle(i: Intent) {
    if (i === "learn") return "bg-sky-50 text-sky-600 border-sky-200";
    if (i === "apply") return "bg-orange-50 text-orange-600 border-orange-200";
    return "bg-stone-100 text-stone-400 border-stone-200";
  }

  function handleNotion() {
    if (notionState !== "idle") return;
    setNotionState("loading");
    setTimeout(() => setNotionState("saved"), 1400);
  }

  function handleCopy() {
    navigator.clipboard.writeText(msg.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-end gap-2 max-w-lg w-full"
    >
      {/* Bot avatar */}
      <div className="w-7 h-7 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center flex-shrink-0 mb-0.5">
        <div className="w-2 h-2 rounded-full bg-orange-500" />
      </div>

      <div className="flex-1 min-w-0">
        {/* Platform + intent header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-full px-2.5 py-1">
            <PlatformIcon platform={msg.platform} size={13} />
            <span className="text-xs font-600 text-stone-600 capitalize">{msg.platform}</span>
          </div>
          <span className={`text-[11px] font-700 uppercase tracking-wide px-2.5 py-0.5 rounded-full border ${intentStyle(intent)}`}>
            {intent}
          </span>
        </div>

        {/* Main card */}
        <div className="bg-white border border-stone-200 rounded-2xl rounded-tl-sm shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            <div className="font-700 text-sm text-stone-800 leading-snug mb-3">{msg.title}</div>

            <div className="space-y-2.5">
              <div>
                <div className="text-[10px] font-700 uppercase tracking-widest text-stone-400 mb-0.5">What it is</div>
                <div className="text-xs text-stone-600 leading-relaxed">{msg.whatIsIt}</div>
              </div>
              <div>
                <div className="text-[10px] font-700 uppercase tracking-widest text-stone-400 mb-0.5">What's inside</div>
                <div className="text-xs text-stone-600 leading-relaxed">{msg.whatsInside}</div>
              </div>
              <div>
                <div className="text-[10px] font-700 uppercase tracking-widest text-stone-400 mb-0.5">Why it matters to you</div>
                <div className="text-xs text-stone-700 leading-relaxed font-500">{msg.realWorldContext}</div>
              </div>
            </div>

            {/* Tags */}
            <div className="flex gap-1.5 flex-wrap mt-3">
              {msg.tags.map(tag => (
                <span key={tag} className="text-[10px] text-stone-400 bg-stone-50 border border-stone-200 px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Action row */}
          <div className="border-t border-stone-100 px-4 py-3 flex gap-2 flex-wrap">
            {/* Intent buttons */}
            <div className="flex gap-1.5 mr-auto">
              {(["learn", "apply", "skip"] as Intent[]).map(i => (
                <button
                  key={i}
                  onClick={() => setIntent(i)}
                  className={`flex items-center gap-1 text-[11px] font-700 px-2.5 py-1.5 rounded-lg border transition-all capitalize ${
                    intent === i
                      ? i === "learn" ? "bg-sky-500 text-white border-sky-500"
                        : i === "apply" ? "bg-orange-500 text-white border-orange-500"
                        : "bg-stone-500 text-white border-stone-500"
                      : "bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  {i === "learn" && <BookOpen size={10} />}
                  {i === "apply" && <Zap size={10} />}
                  {i === "skip" && <X size={10} />}
                  {i}
                </button>
              ))}
            </div>

            {/* Utility buttons */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[11px] font-600 text-stone-500 hover:text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 px-2.5 py-1.5 rounded-lg transition-all"
            >
              {copied ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
              {copied ? "Copied" : "Share"}
            </button>

            <button
              onClick={handleNotion}
              className={`flex items-center gap-1 text-[11px] font-600 px-2.5 py-1.5 rounded-lg border transition-all ${
                notionState === "saved"
                  ? "bg-green-50 text-green-600 border-green-200"
                  : notionState === "loading"
                  ? "bg-stone-50 text-stone-400 border-stone-200 cursor-wait"
                  : "bg-stone-50 text-stone-500 hover:bg-stone-100 border-stone-200"
              }`}
            >
              {notionState === "loading" ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  className="w-2.5 h-2.5 border-2 border-stone-300 border-t-stone-600 rounded-full"
                />
              ) : notionState === "saved" ? (
                <Check size={10} />
              ) : (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933z"/>
                </svg>
              )}
              {notionState === "saved" ? "Saved" : notionState === "loading" ? "Saving…" : "Notion"}
            </button>

            <a
              href={msg.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] font-600 text-stone-500 hover:text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 px-2.5 py-1.5 rounded-lg transition-all"
            >
              <ExternalLink size={10} />
              View
            </a>
          </div>
        </div>

        {/* Sign-in nudge */}
        <div className="mt-2 text-xs text-stone-400 px-1">
          <Link href="/dashboard" className="text-orange-500 hover:text-orange-600 font-600 underline underline-offset-2">
            Sign in
          </Link>
          {" "}to save this to your feed →
        </div>
      </div>
    </motion.div>
  );
}

// ─── User bubble ──────────────────────────────────────────────────────────────

function UserBubble({ text }: { text: string }) {
  const platform = detectPlatform(text);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="flex justify-end"
    >
      <div className="max-w-sm">
        <div className="bg-orange-500 text-white rounded-2xl rounded-br-sm px-4 py-2.5 shadow-sm">
          <div className="flex items-center gap-2">
            {platform !== "web" && <PlatformIcon platform={platform} size={14} />}
            <span className="text-sm font-500 break-all">{text}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Bot text bubble ──────────────────────────────────────────────────────────

function parseBold(text: string) {
  // Render **bold** markdown as <strong>
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} className="font-700 text-stone-800">{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );
}

function BotBubble({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-end gap-2 max-w-sm"
    >
      <div className="w-7 h-7 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center flex-shrink-0 mb-0.5">
        <div className="w-2 h-2 rounded-full bg-orange-500" />
      </div>
      <div className="bg-white border border-stone-200 rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
        <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">{parseBold(text)}</p>
      </div>
    </motion.div>
  );
}

// ─── Main Chat page ───────────────────────────────────────────────────────────

const INITIAL_MESSAGES: Message[] = [
  {
    id: "welcome",
    role: "bot",
    text: "Hey 👋 **I don't do chat — I do verdicts.**\n\nDrop any TikTok, Instagram Reel, YouTube Short, or LinkedIn video here.\n\nI'll tell you **what it is**, **what's inside**, and **whether it's worth your time** — in 60 seconds.",
    timestamp: new Date(),
  },
];

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [typingStage, setTypingStage] = useState<"fetching" | "transcribing" | "generating">("fetching");
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleScroll() {
    const el = scrollAreaRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 120);
  }

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function handleSubmit() {
    const url = input.trim();
    if (!url || isAnalyzing) return;

    if (!isValidUrl(url)) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "bot",
        text: "🤔 That doesn't look like a link I can analyse.\n\nTry sending a **TikTok**, **Instagram Reel**, **YouTube Short**, **LinkedIn post**, or **X thread**.",
        timestamp: new Date(),
      }]);
      setInput("");
      return;
    }

    // Add user message
    const userMsg: UserMessage = { id: Date.now().toString(), role: "user", text: url, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsAnalyzing(true);

    // Simulate analysis stages
    setTypingStage("fetching");
    await new Promise(r => setTimeout(r, 1200));
    setTypingStage("transcribing");
    await new Promise(r => setTimeout(r, 1400));
    setTypingStage("generating");
    await new Promise(r => setTimeout(r, 1600));

    // Add verdict
    const verdict = MOCK_VERDICTS.default;
    const verdictMsg: VerdictMessage = {
      id: (Date.now() + 1).toString(),
      role: "verdict",
      timestamp: new Date(),
      ...verdict,
      url,
      platform: detectPlatform(url),
    };
    setMessages(prev => [...prev, verdictMsg]);
    setIsAnalyzing(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleReset() {
    setMessages(INITIAL_MESSAGES);
    setInput("");
    setIsAnalyzing(false);
    inputRef.current?.focus();
  }

  return (
    <div className="flex flex-col h-screen bg-[#FAFAF8]">

      {/* ── Top bar ── */}
      <header className="flex-shrink-0 bg-white border-b border-stone-200 px-4 h-14 flex items-center gap-3 shadow-sm">
        <Link href="/">
          <button className="p-2 rounded-xl hover:bg-stone-100 text-stone-500 transition-colors">
            <ArrowLeft size={18} />
          </button>
        </Link>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          </div>
          <div>
            <div className="font-700 text-sm text-stone-800 leading-none">ContextDrop</div>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-[11px] text-stone-400">Online</span>
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-600 text-stone-500 hover:text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 px-3 py-2 rounded-xl transition-all"
          >
            <RotateCcw size={12} />
            New chat
          </button>
          <Link href="/dashboard">
            <button className="text-xs font-700 text-white bg-orange-500 hover:bg-orange-600 px-3 py-2 rounded-xl transition-all shadow-sm">
              My feed →
            </button>
          </Link>
        </div>
      </header>

      {/* ── Chat area ── */}
      <div
        ref={scrollAreaRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-6"
      >
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          <AnimatePresence initial={false}>
            {messages.map(msg => {
              if (msg.role === "user") return <UserBubble key={msg.id} text={(msg as UserMessage).text} />;
              if (msg.role === "bot") return <BotBubble key={msg.id} text={(msg as BotMessage).text} />;
              if (msg.role === "verdict") return <VerdictBubble key={msg.id} msg={msg as VerdictMessage} />;
              return null;
            })}
          </AnimatePresence>

          {/* Typing indicator */}
          <AnimatePresence>
            {isAnalyzing && (
              <TypingBubble key="typing" stage={typingStage} />
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToBottom}
            className="fixed bottom-24 right-6 w-9 h-9 bg-white border border-stone-200 rounded-full shadow-md flex items-center justify-center text-stone-500 hover:bg-stone-50 transition-all z-10"
          >
            <ChevronDown size={16} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Input bar ── */}
      <div className="flex-shrink-0 bg-white border-t border-stone-200 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          {/* Suggestion chips (shown when empty) */}
          <AnimatePresence>
            {!input && messages.length <= 1 && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="flex gap-2 mb-3 overflow-x-auto pb-1"
              >
                {[
                  "instagram.com/reel/…",
                  "tiktok.com/@…",
                  "x.com/…/status/…",
                ].map(placeholder => (
                  <button
                    key={placeholder}
                    onClick={() => setInput("https://www." + placeholder.split("…")[0])}
                    className="flex-shrink-0 text-xs text-stone-400 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-full hover:bg-stone-100 hover:text-stone-600 transition-all font-500"
                  >
                    {placeholder}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2 items-center">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="url"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Paste an Instagram, TikTok, or X link…"
                disabled={isAnalyzing}
                className="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 focus:bg-white placeholder:text-stone-400 transition-all disabled:opacity-50"
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isAnalyzing}
              className="w-11 h-11 flex-shrink-0 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-200 disabled:cursor-not-allowed text-white rounded-2xl flex items-center justify-center transition-all shadow-sm hover:shadow-orange-200 hover:shadow-md"
            >
              <Send size={16} />
            </button>
          </div>
          <div className="text-center mt-2">
            <span className="text-[11px] text-stone-400">Works with Instagram · TikTok · X · LinkedIn</span>
          </div>
        </div>
      </div>
    </div>
  );
}
