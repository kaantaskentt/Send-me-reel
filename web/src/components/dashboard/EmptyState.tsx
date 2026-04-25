"use client";

import { useState } from "react";

interface Props { isFiltered: boolean; onClearFilters: () => void; }

const DEMO_LINK = "https://www.instagram.com/reel/DFnVBmxx2Lj/";

const STEPS = [
  { num: "1", icon: "✈️", title: "Open the bot", sub: "Tap the button below to open Mr Context on Telegram." },
  { num: "2", icon: "🔗", title: "Paste any link", sub: "Reel, TikTok, tweet, LinkedIn, YouTube, article — anything." },
  { num: "3", icon: "⚡", title: "Come back here", sub: "Your verdict appears in about 30 seconds." },
];

export default function EmptyState({ isFiltered, onClearFilters }: Props) {
  const [copied, setCopied] = useState(false);

  if (isFiltered) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px", textAlign: "center", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1c1917", marginBottom: 8, marginTop: 0 }}>No results found</h3>
        <p style={{ fontSize: 14, color: "#a8a29e", maxWidth: 320, lineHeight: 1.6, marginBottom: 20 }}>Try adjusting your filters or search query.</p>
        <button onClick={onClearFilters} style={{ fontSize: 13, fontWeight: 700, color: "#f97316", background: "#fff7ed", border: "1px solid #fed7aa", padding: "10px 20px", borderRadius: 100, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Clear filters</button>
      </div>
    );
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(DEMO_LINK);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px", fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ width: 48, height: 48, borderRadius: 14, background: "#fff7ed", border: "1px solid #fed7aa", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 16 }}>📱</div>
      <h3 style={{ fontSize: 20, fontWeight: 800, color: "#1c1917", marginBottom: 6, marginTop: 0, textAlign: "center" }}>Get your first verdict</h3>
      <p style={{ fontSize: 13, color: "#a8a29e", marginBottom: 28, textAlign: "center" }}>Three steps. Thirty seconds.</p>

      {/* Steps */}
      <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 0, position: "relative", marginBottom: 28 }}>
        {/* Connecting line */}
        <div style={{ position: "absolute", left: 23, top: 24, bottom: 24, width: 2, background: "linear-gradient(180deg, #fed7aa, #f97316)", borderRadius: 2, zIndex: 0 }} />

        {STEPS.map((step, i) => (
          <div key={step.num} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "12px 0", position: "relative", zIndex: 1 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: i === 2 ? "#f97316" : "white",
              border: i === 2 ? "none" : "2px solid #e7e2d9",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20,
              boxShadow: i === 2 ? "0 4px 16px rgba(249,115,22,0.25)" : "0 1px 4px rgba(0,0,0,0.04)",
            }}>
              {step.icon}
            </div>
            <div style={{ paddingTop: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#f97316", background: "#fff7ed", border: "1px solid #fed7aa", padding: "1px 7px", borderRadius: 20, fontFamily: "'JetBrains Mono', monospace" }}>{step.num}</span>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: "#1c1917", margin: 0 }}>{step.title}</h4>
              </div>
              <p style={{ fontSize: 13, color: "#78716c", margin: 0, lineHeight: 1.5 }}>{step.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginBottom: 24 }}>
        <a href="https://t.me/contextdrop2027bot" target="_blank" rel="noopener noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f97316", color: "#fff", fontWeight: 700, fontSize: 14, padding: "12px 24px", borderRadius: 100, textDecoration: "none", boxShadow: "0 4px 16px rgba(249,115,22,0.25)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/></svg>
          Open bot →
        </a>
      </div>

      {/* Demo link */}
      <div style={{ width: "100%", maxWidth: 400, background: "#faf8f5", border: "1px solid #f0ebe4", borderRadius: 14, padding: "14px 16px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px 0" }}>Try this one</p>
        <button onClick={handleCopy} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "white", border: "1px solid #e7e2d9", borderRadius: 10, padding: "10px 12px", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#f97316", textAlign: "left" }}>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{DEMO_LINK}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: copied ? "#16a34a" : "#a8a29e", flexShrink: 0, fontFamily: "'DM Sans', sans-serif" }}>{copied ? "Copied!" : "Copy"}</span>
        </button>
        <p style={{ fontSize: 11, color: "#c4bdb5", margin: "8px 0 0 0" }}>Paste this in the bot to see your first verdict.</p>
      </div>

      {/* Note */}
      <p style={{ fontSize: 11, color: "#c4bdb5", marginTop: 20, textAlign: "center" }}>Your first 50 analyses are free.</p>
    </div>
  );
}
