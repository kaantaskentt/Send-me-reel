"use client";

/**
 * PricingSection — from Manus, with hover effects and circular checks
 */

import { useState } from "react";

const FREE_FEATURES = [
  "10 analyses per month",
  "Full summary + sharp take",
  "Add to tasks (up to 10)",
  "Works on Telegram",
  "Feed dashboard",
];

const PRO_FEATURES = [
  "Unlimited analyses",
  "Full summary + sharp take",
  "Unlimited tasks",
  "Works on Telegram & WhatsApp",
  "Feed dashboard + search",
  "Ask AI follow-ups",
  "Notion sync",
  "Priority processing",
];

function CheckIcon({ color = "#16a34a" }: { color?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="11" fill={color} fillOpacity="0.12" />
      <path d="M7 12.5L10.5 16L17 9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PricingSection() {
  const [hovered, setHovered] = useState<"free" | "pro" | null>(null);

  return (
    <section id="pricing" className="py-20 px-4" style={{ background: "#faf8f5" }}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-block text-xs font-bold tracking-widest uppercase mb-4 px-3 py-1 rounded-full"
            style={{ color: "#F97316", background: "#fff7ed", border: "1px solid #fed7aa" }}>Pricing</div>
          <h2 className="font-black mb-3" style={{ fontSize: "clamp(2rem, 3.5vw, 3rem)", color: "#1a1a1a", letterSpacing: "-0.04em", lineHeight: 1.1 }}>
            Simple pricing.<br /><span style={{ color: "#F97316" }}>No surprises.</span>
          </h2>
          <p className="text-base max-w-sm mx-auto" style={{ color: "#78716c", lineHeight: 1.7 }}>
            Start free. Upgrade when you&apos;re getting value. Cancel anytime — no dark patterns.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free */}
          <div className="rounded-2xl p-8 flex flex-col" onMouseEnter={() => setHovered("free")} onMouseLeave={() => setHovered(null)}
            style={{ background: "white", border: "1px solid #e5e0d8", boxShadow: hovered === "free" ? "0 8px 32px rgba(0,0,0,0.08)" : "0 2px 8px rgba(0,0,0,0.04)", transition: "box-shadow 0.2s" }}>
            <div className="mb-6">
              <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "#9ca3af" }}>Free</div>
              <div className="flex items-end gap-1 mb-2">
                <span className="font-black" style={{ fontSize: "2.5rem", color: "#1a1a1a", letterSpacing: "-0.04em", lineHeight: 1 }}>$0</span>
                <span className="text-sm mb-1" style={{ color: "#9ca3af" }}>/month</span>
              </div>
              <p className="text-sm" style={{ color: "#6b7280" }}>Good enough to see if this is for you. No card required.</p>
            </div>
            <ul className="flex flex-col gap-3 mb-8 flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: "#374151" }}>
                  <CheckIcon color="#9ca3af" />{f}
                </li>
              ))}
            </ul>
            <a href="https://t.me/contextdrop2027bot" target="_blank" rel="noopener noreferrer"
              className="block text-center py-3 rounded-xl text-sm font-bold transition-colors"
              style={{ background: "#f5f0eb", color: "#44403c", border: "1px solid #e5e0d8" }}>
              Start free on Telegram
            </a>
          </div>

          {/* Pro */}
          <div className="rounded-2xl p-8 flex flex-col relative overflow-hidden" onMouseEnter={() => setHovered("pro")} onMouseLeave={() => setHovered(null)}
            style={{ background: "#1a1a1a", border: "1.5px solid #F97316", boxShadow: hovered === "pro" ? "0 12px 48px rgba(249,115,22,0.25)" : "0 4px 24px rgba(249,115,22,0.12)", transition: "box-shadow 0.2s" }}>
            <div className="absolute top-4 right-4 text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "#F97316", color: "white" }}>Most popular</div>
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 80% 0%, rgba(249,115,22,0.08) 0%, transparent 60%)" }} />
            <div className="mb-6 relative">
              <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "#F97316" }}>Pro</div>
              <div className="flex items-end gap-1 mb-2">
                <span className="font-black" style={{ fontSize: "2.5rem", color: "white", letterSpacing: "-0.04em", lineHeight: 1 }}>$9.99</span>
                <span className="text-sm mb-1" style={{ color: "#9ca3af" }}>/month</span>
              </div>
              <p className="text-sm" style={{ color: "#9ca3af" }}>Unlimited everything. For people who actually use it.</p>
            </div>
            <ul className="flex flex-col gap-3 mb-8 flex-1 relative">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: "#e5e7eb" }}>
                  <CheckIcon color="#F97316" />{f}
                </li>
              ))}
            </ul>
            <a href="/pricing" className="block text-center py-3 rounded-xl text-sm font-bold transition-all relative"
              style={{ background: "#F97316", color: "white", textDecoration: "none" }}>
              Get Pro — $9.99/mo
            </a>
          </div>
        </div>

        <p className="text-center mt-8 text-sm font-mono" style={{ color: "#9ca3af" }}>
          // No annual lock-in. Cancel from Telegram with one message.
        </p>
      </div>
    </section>
  );
}
