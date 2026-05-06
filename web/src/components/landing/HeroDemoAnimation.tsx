"use client";

/*
 * HeroDemoAnimation — pile → processing → cards drop in one by one and stay
 * Loops continuously
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PILE_CARDS = [
  { platform: "Instagram", icon: "instagram", title: "3 NYC sushi spots nobody talks about 🍣", tag: "Food" },
  { platform: "X", icon: "x", title: "10 ChatGPT prompts that replace a $5k team", tag: "Marketing" },
  { platform: "LinkedIn", icon: "linkedin", title: "The exact DM I sent to get 3 warm VC intros", tag: "Fundraising" },
  { platform: "TikTok", icon: "tiktok", title: "Easy high-protein meals under 10 minutes", tag: "Health" },
];

const ALL_VERDICTS = [
  {
    platform: "INSTAGRAM",
    icon: "instagram",
    time: "1h ago",
    borderColor: "rgba(225,48,108,0.55)",
    title: "3 NYC sushi spots nobody talks about 🍣",
    summary: "Spot 1: Tanoshi (UES) — omakase $60. Spot 2: Sushi on Me (EV) — open till 2am. Spot 3: Kissaki (LES) — hidden basement entrance.",
    tryThis: "Book Tanoshi for this Friday. It's omakase so no decisions needed — just show up.",
    tags: ["Food", "NYC"],
  },
  {
    platform: "X",
    icon: "x",
    time: "5h ago",
    borderColor: "rgba(255,255,255,0.15)",
    title: "10 ChatGPT prompts that replace my $5k marketing team",
    summary: "Thread covers: landing page copy, email sequences, ad hooks, SEO meta descriptions, and competitor analysis — all from one master prompt chain.",
    tryThis: "Copy the master prompt chain. Feed it your brand voice doc and test on one landing page this week.",
    tags: ["Marketing", "AI"],
  },
  {
    platform: "LINKEDIN",
    icon: "linkedin",
    time: "3h ago",
    borderColor: "#0A66C2",
    title: "The exact DM I sent to get 3 warm VC intros this week",
    summary: "Template: 'Hey [name], saw your portfolio includes [company]. Building something similar, would love 15 min.' Sent 12, got 3 intros.",
    tryThis: "Pick 5 VCs from your target list. Send this DM template today. Personalize the [company] field.",
    tags: ["Fundraising", "Networking"],
  },
  {
    platform: "TIKTOK",
    icon: "tiktok",
    time: "45m ago",
    borderColor: "rgba(255,255,255,0.15)",
    title: "5 high-protein meals you can make in under 10 minutes",
    summary: "Greek yogurt bowl (40g protein). Tuna rice bowl with soy + sriracha (38g). Egg wrap — 4 eggs scrambled in a tortilla with cheese (35g).",
    tryThis: "Buy Greek yogurt and granola today. Tomorrow morning: yogurt + scoop of protein powder + berries. 40g protein, 3 minutes, done.",
    tags: ["Health", "Meal Prep"],
  },
];

function PlatformIcon({ name, size = 14 }: { name: string; size?: number }) {
  switch (name) {
    case "instagram":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#E1306C">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.28 0 .56.04.82.1V9.01a6.37 6.37 0 0 0-.82-.05A6.34 6.34 0 0 0 3.15 15.3a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.98a8.2 8.2 0 0 0 4.76 1.52V7.05a4.84 4.84 0 0 1-1-.36z" />
        </svg>
      );
    case "x":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#0A66C2">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      );
    default:
      return null;
  }
}

function VerdictCard({ card, delay = 0 }: { card: typeof ALL_VERDICTS[0]; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl p-4 flex flex-col text-left"
      style={{
        background: "rgba(15,15,15,0.95)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderLeft: `3px solid ${card.borderColor}`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <PlatformIcon name={card.icon} size={13} />
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#71717A" }}>
            {card.platform}
          </span>
        </div>
        <span className="text-[10px]" style={{ color: "#52525B", fontFamily: "'JetBrains Mono', monospace" }}>
          {card.time}
        </span>
      </div>

      <h3 className="text-white text-sm font-bold leading-tight mb-2">{card.title}</h3>

      <p className="text-[12px] leading-relaxed mb-3 line-clamp-2" style={{ color: "#A1A1AA" }}>{card.summary}</p>

      <div
        className="rounded-lg p-3 mb-3 mt-auto"
        style={{ background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.15)" }}
      >
        <span
          className="text-[9px] font-bold uppercase tracking-widest block mb-1"
          style={{ color: "#F97316", fontFamily: "'JetBrains Mono', monospace" }}
        >
          Try this once
        </span>
        <p className="text-[11px] leading-relaxed" style={{ color: "#E4E4E7", fontFamily: "'JetBrains Mono', monospace" }}>
          {card.tryThis}
        </p>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <button
          className="text-[11px] font-semibold px-3 py-1.5 rounded-lg"
          style={{ background: "rgba(249,115,22,0.12)", color: "#F97316", border: "1px solid rgba(249,115,22,0.2)" }}
        >
          + Add to tasks
        </button>
        <button
          className="text-[11px] font-medium px-3 py-1.5 rounded-lg"
          style={{ background: "rgba(255,255,255,0.04)", color: "#A1A1AA", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          Chat with it →
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        {card.tags.map((tag) => (
          <span
            key={tag}
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.04)", color: "#71717A", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {tag}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

const LOOP_MS = 4500 + ALL_VERDICTS.length * 1200 + 4000;

export default function HeroDemoAnimation() {
  const [phase, setPhase] = useState<"pile" | "processing" | "cards">("pile");
  const [visibleCards, setVisibleCards] = useState<number[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const cardTimers: ReturnType<typeof setTimeout>[] = [];
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;

    const runSequence = () => {
      setPhase("pile");
      setVisibleCards([]);

      t1 = setTimeout(() => setPhase("processing"), 2500);
      t2 = setTimeout(() => {
        setPhase("cards");
        ALL_VERDICTS.forEach((_, i) => {
          const timer = setTimeout(() => {
            setVisibleCards((prev) => [...prev, i]);
          }, i * 1200);
          cardTimers.push(timer);
        });
      }, 4500);
    };

    runSequence();
    const mainLoop = setInterval(() => {
      cardTimers.forEach(clearTimeout);
      cardTimers.length = 0;
      runSequence();
    }, LOOP_MS);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(mainLoop);
      cardTimers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto" style={{ height: "300px", overflow: "hidden" }}>
      <AnimatePresence mode="wait">
        {phase === "pile" && (
          <motion.div
            key="pile"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3 }}
            className="relative w-full flex items-center justify-center"
            style={{ height: "300px" }}
          >
            {(() => {
              const total = PILE_CARDS.length;
              const centerIdx = (total - 1) / 2;
              const rotations = [-8, -3, 3, 8];
              const yOffsets = [10, 3, 3, 10];
              const spacingX = isMobile ? 72 : 100;
              const cardWidth = isMobile ? 170 : 200;

              return PILE_CARDS.map((card, i) => {
                const offsetX = isMobile
                  ? (i - centerIdx) * 6          // tight x drift on mobile
                  : (i - centerIdx) * spacingX;
                const offsetY = isMobile
                  ? (i - centerIdx) * 28         // vertical cascade on mobile
                  : yOffsets[i];
                const rotation = isMobile
                  ? (i - centerIdx) * 2.5        // gentle rotation on mobile
                  : rotations[i];
                const zIdx = isMobile
                  ? i + 1                        // last card on top on mobile
                  : total - Math.round(Math.abs(i - centerIdx));

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 40, rotate: 0 }}
                    animate={{ opacity: 1, y: offsetY, x: offsetX, rotate: rotation }}
                    transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute rounded-xl px-4 py-3 text-left"
                    style={{
                      background: "rgba(18,18,18,0.95)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      backdropFilter: "blur(10px)",
                      width: cardWidth,
                      zIndex: zIdx,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <PlatformIcon name={card.icon} size={12} />
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#71717A" }}>
                        {card.platform}
                      </span>
                    </div>
                    <p className="text-white text-[13px] font-medium leading-snug mb-1.5">{card.title}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.04)", color: "#52525B" }}>
                        {card.tag}
                      </span>
                      <span className="text-[9px] font-medium" style={{ color: "#F97316" }}>never opened</span>
                    </div>
                  </motion.div>
                );
              });
            })()}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap"
            >
              <span
                className="text-[11px] font-medium px-3 py-1.5 rounded-full"
                style={{ background: "rgba(249,115,22,0.08)", color: "#F97316", border: "1px solid rgba(249,115,22,0.15)" }}
              >
                4 links saved this week · 0 opened
              </span>
            </motion.div>
          </motion.div>
        )}

        {phase === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.3 }}
            className="w-full flex flex-col items-center justify-center"
            style={{ height: "300px" }}
          >
            <div className="relative mb-5">
              <div
                className="w-14 h-14 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: "rgba(249,115,22,0.25)", borderTopColor: "#F97316" }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
            </div>
            <p className="text-white font-semibold text-sm mb-1.5">Generating verdicts...</p>
            <p className="text-[12px]" style={{ color: "#71717A" }}>Extracting key points, actions & tools</p>
            <div className="flex gap-1.5 mt-5">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0.4, opacity: 0.2 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.2, duration: 0.2 }}
                  className="w-2 h-2 rounded-full"
                  style={{ background: "#F97316" }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {phase === "cards" && (
          <motion.div
            key="cards-feed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            style={{ height: "300px", overflow: "hidden", position: "relative" }}
          >
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-2" style={{ alignContent: "start" }}>
              {visibleCards.map((cardIndex) => (
                <VerdictCard key={cardIndex} card={ALL_VERDICTS[cardIndex]} delay={0} />
              ))}
            </div>
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: "90px",
              background: "linear-gradient(to bottom, transparent, #0a0a0a)",
              pointerEvents: "none",
            }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
