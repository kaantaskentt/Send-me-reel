/*
 * Dashboard — ContextDrop post-login experience
 * Design: Warm cream base (#FAFAF8), orange accent, DM Sans
 * Layout: Fixed left sidebar (240px) + scrollable main feed
 * Cards: Accordion expand with framer-motion, inline delete confirm
 * Mobile: Sidebar collapses to top sheet via hamburger
 *
 * UX fixes applied:
 * - Bio text fixed to stone-600 (was rendering orange)
 * - Credits bar now has "Upgrade" CTA; turns amber when low
 * - Notion block now has "Open Notion" button
 * - Sidebar footer has proper "Log out" (separate from "Back to site")
 * - Logo in header links back to home
 * - Onboarding banner for new users with 0 items
 * - Intent badge visible on collapsed cards (already present, confirmed)
 * - Settings nav item is now a real link
 * - "Open bot" is now labeled "Send a video to analyse" with Telegram icon
 */

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import {
  Menu,
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Share2,
  Trash2,
  BookOpen,
  Zap,
  X,
  Check,
  Copy,
  Bell,
  Settings,
  LogOut,
  Home,
  LayoutDashboard,
  Sparkles,
  ArrowUpRight,
  Send,
  AlertCircle,
} from "lucide-react";
import { Link } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────

type Intent = "learn" | "apply" | "skip" | "all";
type Platform = "instagram" | "tiktok" | "x" | "linkedin" | "all";

interface VerdictCard {
  id: string;
  platform: Platform;
  title: string;
  summary: string;
  whatIsIt: string;
  whatsInside: string;
  realWorldContext: string;
  intent: "learn" | "apply" | "skip";
  tags: string[];
  url: string;
  timestamp: string;
  savedToNotion: boolean;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_CARDS: VerdictCard[] = [
  {
    id: "1",
    platform: "instagram",
    title: "How to build an Obsidian knowledge base that actually works",
    summary: "MOCs over folders. Every note links to at least two others. 3 years of notes, zero friction.",
    whatIsIt: "A practical walkthrough of a mature Obsidian vault using Maps of Content (MOCs) instead of nested folders. The creator shows their exact structure after 3 years of daily use.",
    whatsInside: "MOC structure demo, folder-free navigation, backlink strategy, daily note template, tag taxonomy, and a live search walkthrough.",
    realWorldContext: "If you're drowning in saved notes you never revisit, this is the system fix. Directly applicable to any knowledge worker or founder who reads a lot but retains little.",
    intent: "apply",
    tags: ["obsidian", "pkm", "knowledge base", "second brain"],
    url: "https://www.instagram.com/reel/DFnVBmxx2Lj/",
    timestamp: "4 min ago",
    savedToNotion: false,
  },
  {
    id: "2",
    platform: "linkedin",
    title: "Top 5 Claude Code skills every developer needs right now",
    summary: "Slash commands, CLAUDE.md, parallel subagents, MCP servers, headless CI mode.",
    whatIsIt: "A rapid-fire demo of 5 advanced Claude Code features that most developers haven't discovered yet, each shown in under 2 minutes.",
    whatsInside: "Custom slash command setup, CLAUDE.md project context files, spawning parallel subagents for batch tasks, connecting MCP servers, and running Claude Code in headless CI pipelines.",
    realWorldContext: "If you're using Claude Code for more than basic autocomplete, these five features will 3x your output. The MCP server integration alone is worth the watch.",
    intent: "learn",
    tags: ["claude code", "ai dev tools", "productivity", "mcp"],
    url: "https://www.linkedin.com/",
    timestamp: "1 hr ago",
    savedToNotion: true,
  },
  {
    id: "3",
    platform: "x",
    title: "Why most SaaS pricing pages fail (a thread)",
    summary: "Opinion thread with no data or frameworks. Interesting perspective but nothing actionable.",
    whatIsIt: "A Twitter/X thread sharing opinions on common SaaS pricing page mistakes, based on personal experience rather than data.",
    whatsInside: "5 opinions on pricing psychology, no frameworks, no data, no concrete examples. Mostly vibes.",
    realWorldContext: "Not worth your time at your current stage. You need pricing experiments, not pricing opinions.",
    intent: "skip",
    tags: ["saas", "pricing"],
    url: "https://x.com/",
    timestamp: "3 hr ago",
    savedToNotion: false,
  },
  {
    id: "4",
    platform: "tiktok",
    title: "The 3-step morning routine that replaced my 2-hour one",
    summary: "Cold water, 10-min walk, no phone for 30 min. Backed by sleep research.",
    whatIsIt: "A founder shares how they cut their morning routine from 2 hours to 25 minutes without losing the productivity benefits, citing sleep science.",
    whatsInside: "Cold water face splash (cortisol spike), 10-minute outdoor walk (circadian reset), 30-minute phone-free window (dopamine baseline). All three backed by specific studies mentioned.",
    realWorldContext: "If you're spending 90+ minutes on morning routines and still feeling sluggish, this is a direct replacement. The phone-free window alone is worth testing this week.",
    intent: "apply",
    tags: ["productivity", "morning routine", "health", "founder"],
    url: "https://www.tiktok.com/",
    timestamp: "5 hr ago",
    savedToNotion: false,
  },
  {
    id: "5",
    platform: "instagram",
    title: "How Notion AI changed the way I manage my team",
    summary: "AI summaries on meeting notes, auto-generated action items, and Q&A on your own docs.",
    whatIsIt: "A product manager demos three specific Notion AI workflows they use daily with a 5-person remote team.",
    whatsInside: "Meeting note summarisation (with action item extraction), Q&A against a project wiki, and AI-generated weekly status updates from task databases.",
    realWorldContext: "If you're running a small team on Notion, these three workflows will save 2-3 hours per week immediately. The meeting summary → action item pipeline is the highest-leverage one.",
    intent: "learn",
    tags: ["notion", "ai", "team management", "productivity"],
    url: "https://www.instagram.com/",
    timestamp: "Yesterday",
    savedToNotion: true,
  },
  {
    id: "6",
    platform: "x",
    title: "Thread: 12 cold email frameworks that actually get replies",
    summary: "PAS, AIDA, and 10 others with real examples and response rates.",
    whatIsIt: "A sales consultant shares 12 cold email frameworks with real examples, claimed response rates, and when to use each one.",
    whatsInside: "PAS (Problem-Agitate-Solution), AIDA, the 'Mutual Connection' opener, the 'Quick Question' format, and 8 others. Each with a real example and a claimed response rate.",
    realWorldContext: "If you're doing outbound for ContextDrop or any other project, this is a direct reference doc. Save it, don't just read it.",
    intent: "apply",
    tags: ["cold email", "sales", "outbound", "growth"],
    url: "https://x.com/",
    timestamp: "2 days ago",
    savedToNotion: false,
  },
];

// ─── Platform helpers ─────────────────────────────────────────────────────────

function PlatformIcon({ platform, size = 16 }: { platform: Platform; size?: number }) {
  const s = size;
  if (platform === "instagram") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <defs><linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f09433"/><stop offset="50%" stopColor="#e6683c"/><stop offset="100%" stopColor="#bc1888"/></linearGradient></defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig)"/>
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="white" strokeWidth="1.5"/>
      <circle cx="17.5" cy="6.5" r="1" fill="white"/>
    </svg>
  );
  if (platform === "linkedin") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#0A66C2"/>
      <path d="M7.5 9.5h-2v8h2v-8zm-1-3a1.25 1.25 0 1 0 0 2.5A1.25 1.25 0 0 0 6.5 6.5zm10.5 3c-1.2 0-2 .5-2.5 1.2V9.5h-2v8h2v-4.2c0-1.1.6-1.8 1.5-1.8s1.5.7 1.5 1.8v4.2h2v-4.5c0-2.2-1.2-3.5-2.5-3.5z" fill="white"/>
    </svg>
  );
  if (platform === "x") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#000"/>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="white"/>
    </svg>
  );
  if (platform === "tiktok") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#010101"/>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.53V6.77a4.85 4.85 0 01-1.02-.08z" fill="white"/>
    </svg>
  );
  return null;
}

function TelegramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.026 9.54c-.148.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.26 14.4l-2.95-.924c-.64-.203-.654-.64.136-.948l11.527-4.444c.534-.194 1.001.13.589.164z"/>
    </svg>
  );
}

function intentColor(intent: "learn" | "apply" | "skip") {
  if (intent === "learn") return "bg-sky-50 text-sky-600 border-sky-200";
  if (intent === "apply") return "bg-orange-50 text-orange-600 border-orange-200";
  return "bg-stone-100 text-stone-400 border-stone-200";
}

function intentLabel(intent: "learn" | "apply" | "skip") {
  if (intent === "learn") return "Learn";
  if (intent === "apply") return "Apply";
  return "Skip";
}

// ─── Credits block ────────────────────────────────────────────────────────────

function CreditsBlock({ used, limit }: { used: number; limit: number }) {
  const pct = Math.round((used / limit) * 100);
  const isLow = pct >= 80;
  const isCritical = pct >= 95;

  return (
    <div className={`rounded-xl p-3 border ${isCritical ? "bg-red-50 border-red-200" : isLow ? "bg-amber-50 border-amber-200" : "bg-stone-50 border-stone-200"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-600 text-stone-500">Monthly credits</span>
          <span
            title="1 credit = 1 analysis"
            className="w-3.5 h-3.5 rounded-full bg-stone-200 text-stone-400 text-[9px] font-700 flex items-center justify-center cursor-help leading-none select-none"
          >
            ?
          </span>
        </div>
        <span className={`text-xs font-700 ${isCritical ? "text-red-500" : isLow ? "text-amber-500" : "text-orange-500"}`}>
          {used} / {limit}
        </span>
      </div>
      <Progress
        value={pct}
        className={`h-1.5 ${isCritical ? "bg-red-100 [&>div]:bg-red-500" : isLow ? "bg-amber-100 [&>div]:bg-amber-500" : "bg-stone-200 [&>div]:bg-orange-500"}`}
      />
      <div className="flex items-center justify-between mt-2">
        {isLow ? (
          <div className="flex items-center gap-1 text-xs text-amber-600 font-500">
            <AlertCircle size={11} />
            Running low
          </div>
        ) : (
          <div className="text-xs text-stone-400">1 credit = 1 analysis · Resets in 14 days</div>
        )}
        <button className="text-xs font-700 text-orange-500 hover:text-orange-600 transition-colors">
          Upgrade →
        </button>
      </div>
    </div>
  );
}

// ─── Notion block ─────────────────────────────────────────────────────────────

function NotionBlock({ connected }: { connected: boolean }) {
  return (
    <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
      <div className="flex items-center gap-3 mb-2.5">
        <div className="w-7 h-7 rounded-lg bg-stone-800 flex items-center justify-center flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
            <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933z"/>
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-600 text-stone-700">Notion</div>
          <div className="text-xs text-stone-400 truncate">{connected ? "My Workspace" : "Not connected"}</div>
        </div>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${connected ? "bg-green-400" : "bg-stone-300"}`} />
      </div>
      {connected ? (
        <a
          href="https://notion.so"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full text-xs font-600 text-stone-600 hover:text-stone-800 bg-white hover:bg-stone-100 border border-stone-200 px-3 py-2 rounded-lg transition-all"
        >
          <ArrowUpRight size={12} />
          Open Notion
        </a>
      ) : (
        <button className="flex items-center justify-center gap-1.5 w-full text-xs font-600 text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-2 rounded-lg transition-all">
          Connect Notion
        </button>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function SidebarContent({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex flex-col h-full py-6 px-4 gap-5">
      {/* Logo */}
      <Link href="/" onClick={onClose}>
        <div className="flex items-center gap-2 px-2 mb-1 cursor-pointer">
          <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-800 text-sm text-stone-800">ContextDrop</span>
        </div>
      </Link>

      {/* Profile */}
      <div className="flex items-center gap-3 px-2">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
          KT
        </div>
        <div className="min-w-0">
          <div className="font-700 text-sm text-stone-800 truncate">Kaan Taskentt</div>
          <div className="text-xs text-stone-400 truncate">@kaantaskentt</div>
        </div>
      </div>

      {/* Credits */}
      <CreditsBlock used={47} limit={100} />

      {/* Nav */}
      <nav className="flex flex-col gap-1">
        <Link href="/dashboard" onClick={onClose}>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-orange-50 text-orange-600 font-600 text-sm cursor-pointer">
            <LayoutDashboard size={16} />
            My Feed
          </div>
        </Link>
        <Link href="/settings" onClick={onClose}>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-stone-500 hover:bg-stone-100 font-500 text-sm cursor-pointer transition-colors">
            <Settings size={16} />
            Settings
          </div>
        </Link>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-stone-500 hover:bg-stone-100 font-500 text-sm cursor-pointer transition-colors">
          <Bell size={16} />
          Notifications
        </div>
      </nav>

      {/* Notion */}
      <NotionBlock connected={true} />

      {/* Send to bot CTA */}
        <a
        href="https://t.me/contextdropbot"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-700 px-4 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-orange-200 hover:shadow-md justify-center"
      >
        <TelegramIcon size={14} />
        Send a video to analyse
      </a>
      <p className="text-center text-[10px] text-stone-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>Telegram · WhatsApp</p>

      {/* Bottom */}
      <div className="mt-auto flex flex-col gap-1">
        <Link href="/" onClick={onClose}>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-600 font-500 text-sm cursor-pointer transition-colors">
            <Home size={15} />
            Back to site
          </div>
        </Link>
        <button
          onClick={() => {
            // logout logic goes here
            window.location.href = "/";
          }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-stone-400 hover:bg-red-50 hover:text-red-500 font-500 text-sm cursor-pointer transition-colors w-full text-left"
        >
          <LogOut size={15} />
          Log out
        </button>
      </div>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

/** Greyed-out ghost card shown in the empty state to hint at what verdicts look like */
function GhostCard() {
  return (
    <div
      className="bg-white border border-stone-150 rounded-2xl overflow-hidden opacity-40 pointer-events-none select-none"
      style={{ borderLeft: "3px solid #f97316" }}
    >
      <div className="px-5 py-4 flex items-start gap-3">
        {/* Platform icon placeholder */}
        <div className="w-5 h-5 rounded bg-stone-200 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-4 w-12 rounded-full bg-orange-200" />
            <div className="h-3 w-10 rounded bg-stone-200" />
          </div>
          <div className="h-4 w-3/4 rounded bg-stone-200 mb-1.5" />
          <div className="h-3 w-full rounded bg-stone-100 mb-1" />
          <div className="h-3 w-2/3 rounded bg-stone-100" />
        </div>
        <div className="w-4 h-4 rounded bg-stone-200 flex-shrink-0 mt-0.5" />
      </div>
    </div>
  );
}

function EmptyFeedState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center text-center py-10"
    >
      {/* Icon */}
      <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center mb-5">
        <Sparkles size={24} className="text-orange-400" />
      </div>

      {/* Headline */}
      <h3 className="font-700 text-lg text-stone-800 mb-2">Your feed is empty.</h3>
      <p className="text-sm text-stone-500 max-w-xs leading-relaxed mb-6">
        Send your first link and your verdict will appear here in{" "}
        <strong className="text-stone-700">30 seconds</strong>.
      </p>

      {/* CTA */}
      <a
        href="https://t.me/contextdrop2027bot"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-700 px-5 py-3 rounded-xl transition-all shadow-sm hover:shadow-orange-200 hover:shadow-md mb-2"
      >
        <TelegramIcon size={15} />
        Send a link on Telegram
      </a>
      <p className="text-xs text-stone-400">Telegram · WhatsApp</p>

      {/* Ghost card */}
      <div className="w-full mt-8">
        <p className="text-[10px] text-stone-300 uppercase tracking-widest font-600 mb-3">Your first verdict will look like this</p>
        <GhostCard />
      </div>
    </motion.div>
  );
}

// ─── Analysis Card ────────────────────────────────────────────────────────────

function AnalysisCard({
  card,
  isOpen,
  onToggle,
  onDelete,
}: {
  card: VerdictCard;
  isOpen: boolean;
  onToggle: () => void;
  onDelete: (id: string) => void;
}) {
  const [notionState, setNotionState] = useState<"idle" | "loading" | "saved">(
    card.savedToNotion ? "saved" : "idle"
  );
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleNotion(e: React.MouseEvent) {
    e.stopPropagation();
    if (notionState === "saved") return;
    setNotionState("loading");
    setTimeout(() => setNotionState("saved"), 1400);
  }

  function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(card.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirmDelete(true);
  }

  function handleConfirmDelete(e: React.MouseEvent) {
    e.stopPropagation();
    onDelete(card.id);
  }

  function handleCancelDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirmDelete(false);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`bg-white border rounded-2xl overflow-hidden transition-shadow relative ${
        isOpen ? "shadow-md border-stone-200" : "shadow-sm border-stone-150 hover:shadow-md hover:border-stone-200"
      } ${card.intent === "skip" ? "opacity-60" : ""}`}
      style={{ borderLeft: card.intent === "apply" ? "3px solid #f97316" : card.intent === "learn" ? "3px solid #38bdf8" : "3px solid #d6d3d1" }}
    >
      {/* Card header — always visible */}
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4 flex items-start gap-3 group"
      >
        <div className="flex-shrink-0 mt-0.5">
          <PlatformIcon platform={card.platform} size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[11px] font-700 uppercase tracking-wide px-2.5 py-0.5 rounded-full border ${intentColor(card.intent)}`}>
              {intentLabel(card.intent)}
            </span>
            <span className="text-xs text-stone-400">{card.timestamp}</span>
          </div>
          <div className="font-600 text-sm text-stone-800 leading-snug pr-4">{card.title}</div>
          <div className="text-xs text-stone-400 mt-1 line-clamp-1">{card.summary}</div>
          {/* Collapsed hints — only visible when card is closed */}
          {!isOpen && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-stone-300 font-500 flex items-center gap-1">
                <span>⚡</span> Deep Dive
              </span>
              <span className="text-stone-200 text-[10px]">·</span>
              <span className="text-[10px] text-stone-300 font-500 flex items-center gap-1">
                <span>💬</span> Ask
              </span>
            </div>
          )}
        </div>
        <div className="flex-shrink-0 text-stone-300 group-hover:text-stone-500 transition-colors mt-0.5">
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-stone-100 pt-4">
              {/* Three verdict sections */}
              <div className="space-y-4 mb-4">
                <div>
                  <div className="text-[10px] font-700 uppercase tracking-widest text-stone-300 mb-1.5">What it is</div>
                  <div className="text-sm text-stone-600 leading-relaxed">{card.whatIsIt}</div>
                </div>
                <div>
                  <div className="text-[10px] font-700 uppercase tracking-widest text-stone-300 mb-1.5">What's inside</div>
                  <div className="text-sm text-stone-600 leading-relaxed">{card.whatsInside}</div>
                </div>
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-3.5">
                  <div className="text-[10px] font-700 uppercase tracking-widest text-orange-400 mb-1.5">Why it matters to you</div>
                  <div className="text-sm text-stone-700 leading-relaxed" style={{ fontWeight: 500 }}>{card.realWorldContext}</div>
                </div>
              </div>

              {/* Tags */}
              <div className="flex gap-2 flex-wrap mb-4">
                {card.tags.map(tag => (
                  <span key={tag} className="text-[11px] text-stone-400 bg-stone-50 border border-stone-200 px-2.5 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <AnimatePresence mode="wait">
                {confirmDelete ? (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3"
                  >
                    <span className="text-sm text-red-600 font-500 flex-1">Delete this analysis?</span>
                    <button
                      onClick={handleConfirmDelete}
                      className="text-xs font-700 text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={handleCancelDelete}
                      className="text-xs font-600 text-stone-500 hover:text-stone-700 px-2 py-1.5 transition-colors"
                    >
                      Cancel
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="actions"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex gap-2 flex-wrap"
                  >
                    <a
                      href={card.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1.5 text-xs font-600 text-stone-500 hover:text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 px-3 py-2 rounded-xl transition-all"
                    >
                      <ExternalLink size={12} />
                      View original
                    </a>
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-1.5 text-xs font-600 text-stone-500 hover:text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 px-3 py-2 rounded-xl transition-all"
                    >
                      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                      {copied ? "Copied!" : "Share"}
                    </button>
                    <button
                      onClick={handleNotion}
                      className={`flex items-center gap-1.5 text-xs font-600 px-3 py-2 rounded-xl border transition-all ${
                        notionState === "saved"
                          ? "text-green-600 bg-green-50 border-green-200"
                          : notionState === "loading"
                          ? "text-stone-400 bg-stone-50 border-stone-200 cursor-wait"
                          : "text-stone-500 hover:text-stone-700 bg-stone-50 hover:bg-stone-100 border-stone-200"
                      }`}
                    >
                      {notionState === "loading" ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                          className="w-3 h-3 border-2 border-stone-300 border-t-stone-600 rounded-full"
                        />
                      ) : notionState === "saved" ? (
                        <Check size={12} />
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933z"/>
                        </svg>
                      )}
                      {notionState === "saved" ? "Saved to Notion" : notionState === "loading" ? "Saving…" : "Save to Notion"}
                    </button>
                    <button
                      onClick={handleDeleteClick}
                      className="flex items-center gap-1.5 text-xs font-600 text-stone-400 hover:text-red-500 bg-stone-50 hover:bg-red-50 border border-stone-200 hover:border-red-200 px-3 py-2 rounded-xl transition-all ml-auto"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [cards, setCards] = useState<VerdictCard[]>(MOCK_CARDS);
  const [openCardId, setOpenCardId] = useState<string | null>("1");
  const [intentFilter, setIntentFilter] = useState<Intent>("all");
  const [platformFilter, setPlatformFilter] = useState<Platform>("all");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Stats
  const total = cards.length;
  const learnCount = cards.filter(c => c.intent === "learn").length;
  const applyCount = cards.filter(c => c.intent === "apply").length;
  const notionCount = cards.filter(c => c.savedToNotion).length;

  // Filtered cards
  const filtered = cards.filter(c => {
    if (intentFilter !== "all" && c.intent !== intentFilter) return false;
    if (platformFilter !== "all" && c.platform !== platformFilter) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.tags.some(t => t.includes(search.toLowerCase()))) return false;
    return true;
  });

  function handleDelete(id: string) {
    setCards(prev => prev.filter(c => c.id !== id));
    if (openCardId === id) setOpenCardId(null);
  }

  function toggleCard(id: string) {
    setOpenCardId(prev => prev === id ? null : id);
  }

  const platforms: { value: Platform; label: string }[] = [
    { value: "all", label: "All" },
    { value: "instagram", label: "Instagram" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "tiktok", label: "TikTok" },
    { value: "x", label: "X" },
  ];

  const intents: { value: Intent; label: string; icon: React.ReactNode }[] = [
    { value: "all", label: "All", icon: null },
    { value: "learn", label: "Learn", icon: <BookOpen size={12} /> },
    { value: "apply", label: "Apply", icon: <Zap size={12} /> },
    { value: "skip", label: "Skip", icon: <X size={12} /> },
  ];

  const isEmpty = cards.length === 0;

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 border-r border-stone-200 bg-white sticky top-0 h-screen overflow-y-auto">
        <SidebarContent />
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Top bar */}
        <header className="sticky top-0 z-50 bg-[#FAFAF8]/90 backdrop-blur-md border-b border-stone-200 px-4 lg:px-8 h-14 flex items-center gap-3">
          {/* Mobile hamburger */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <button className="lg:hidden p-2 rounded-lg hover:bg-stone-100 text-stone-500 transition-colors">
                <Menu size={18} />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-white">
              <SidebarContent onClose={() => setSidebarOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* Mobile logo */}
          <Link href="/" className="lg:hidden">
            <span className="font-800 text-sm text-stone-800">ContextDrop</span>
          </Link>

          {/* Search */}
          <div className="flex-1 relative max-w-sm lg:block hidden">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search your feed…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-4 py-2 text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 placeholder:text-stone-400 transition-all"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <a
              href="https://t.me/contextdropbot"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-700 px-4 py-2 rounded-xl transition-all shadow-sm hover:shadow-orange-200 hover:shadow-md"
            >
              <TelegramIcon size={13} />
              <span className="hidden sm:inline">+ Analyse new video</span>
              <span className="sm:hidden">+</span>
            </a>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 lg:px-8 py-6 max-w-3xl w-full">

          {/* Mobile search */}
          <div className="lg:hidden mb-4 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search your feed…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-4 py-2 text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 placeholder:text-stone-400 transition-all"
            />
          </div>

          {/* Empty feed activation state */}
          <AnimatePresence>
            {isEmpty && <EmptyFeedState />}
          </AnimatePresence>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total saved", value: total, color: "text-stone-700" },
              { label: "To learn", value: learnCount, color: learnCount === 0 ? "text-stone-300" : "text-sky-600" },
              { label: "To apply", value: applyCount, color: applyCount === 0 ? "text-stone-300" : "text-orange-500" },
              { label: "In Notion", value: notionCount, color: notionCount === 0 ? "text-stone-300" : "text-green-600" },
            ].map(stat => (
              <div key={stat.label} className="bg-white border border-stone-200 rounded-2xl px-4 py-3 shadow-sm">
                <div className={`text-2xl font-800 leading-none ${stat.color} mb-1`}>{stat.value}</div>
                <div className="text-xs text-stone-400 font-500">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Filter bar */}
          <div className="flex flex-col sm:flex-row gap-2 mb-5">
            {/* Intent filter */}
            <div className="flex gap-1 bg-white border border-stone-200 rounded-xl p-1 shadow-sm">
              {intents.map(i => (
                <button
                  key={i.value}
                  onClick={() => setIntentFilter(i.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 transition-all ${
                    intentFilter === i.value
                      ? "bg-orange-500 text-white shadow-sm"
                      : "text-stone-500 hover:text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  {i.icon}
                  {i.label}
                </button>
              ))}
            </div>

            {/* Platform filter */}
            <div className="flex gap-1 bg-white border border-stone-200 rounded-xl p-1 shadow-sm overflow-x-auto">
              {platforms.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPlatformFilter(p.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 whitespace-nowrap transition-all ${
                    platformFilter === p.value
                      ? "bg-stone-800 text-white shadow-sm"
                      : "text-stone-500 hover:text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  {p.value !== "all" && <PlatformIcon platform={p.value as Platform} size={12} />}
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Results count */}
          {(intentFilter !== "all" || platformFilter !== "all" || search) && (
            <div className="text-xs text-stone-400 mb-3 font-500">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              {search && ` for "${search}"`}
            </div>
          )}

          {/* Cards */}
          <div className="flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
              {filtered.length === 0 && !isEmpty ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <div className="text-4xl mb-3">🔍</div>
                  <div className="font-600 text-stone-600 mb-1">No results</div>
                  <div className="text-sm text-stone-400">Try a different filter or search term</div>
                </motion.div>
              ) : (
                filtered.map(card => (
                  <AnalysisCard
                    key={card.id}
                    card={card}
                    isOpen={openCardId === card.id}
                    onToggle={() => toggleCard(card.id)}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Add more CTA */}
          {filtered.length > 0 && (
            <div className="mt-8 text-center">
              <a
                href="https://t.me/contextdropbot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-600 text-orange-500 hover:text-orange-600 transition-colors"
              >
                <TelegramIcon size={14} />
                Analyse more videos →
              </a>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
