"use client";

/*
 * PricingSection — Manus "Dark Signal" port (Apr 26)
 * Free + Pro dark cards. Both CTAs go to /signup.
 */

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

const FREE_FEATURES = [
  "50 analyses to start",
  "All platforms (Instagram, TikTok, X, YouTube, LinkedIn, articles)",
  "Summary + action item per link",
  "Personal dashboard",
  "Telegram bot",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Unlimited analyses",
  "Notion sync",
  "WhatsApp support (coming soon)",
  "Priority processing",
  "Ask AI follow-up questions",
];

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 mt-0.5">
      <path d="M2.5 7L6 10.5L11.5 3.5" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PricingSection() {
  const { ref, inView } = useInView();

  return (
    <section
      ref={ref}
      id="pricing"
      className="py-24"
      style={{ background: "#111111", borderTop: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="cd-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-14"
        >
          <p
            className="text-[11px] font-semibold uppercase tracking-widest mb-4"
            style={{ color: "#F97316", fontFamily: "'JetBrains Mono', monospace" }}
          >
            Pricing
          </p>
          <h2
            className="text-white"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            Start free. Go Pro when you're ready.
          </h2>
          <p className="mt-3" style={{ color: "#71717A", fontSize: "15px" }}>
            No credit card needed to start. Cancel anytime.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl p-6"
            style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <div className="mb-6">
              <p
                className="text-[11px] font-semibold uppercase tracking-widest mb-3"
                style={{ color: "#71717A", fontFamily: "'JetBrains Mono', monospace" }}
              >
                Free
              </p>
              <div className="flex items-baseline gap-1">
                <span
                  className="text-white"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "2.5rem", letterSpacing: "-0.04em" }}
                >
                  $0
                </span>
                <span style={{ color: "#71717A", fontSize: "14px" }}>/month</span>
              </div>
              <p className="mt-2" style={{ color: "#71717A", fontSize: "13px" }}>50 analyses to get started</p>
            </div>
            <ul className="space-y-3 mb-8">
              {FREE_FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <CheckIcon />
                  <span style={{ color: "#A1A1AA", fontSize: "14px", fontFamily: "'Inter', sans-serif" }}>{f}</span>
                </li>
              ))}
            </ul>
            <a
              href="/signup"
              className="block w-full text-center py-3 rounded-xl font-semibold text-sm transition-all duration-150 hover:brightness-110"
              style={{
                background: "rgba(255,255,255,0.08)",
                color: "#FAFAFA",
                border: "1px solid rgba(255,255,255,0.12)",
                textDecoration: "none",
              }}
            >
              Start free
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl p-6 relative"
            style={{
              background: "#0a0a0a",
              border: "1px solid rgba(249,115,22,0.4)",
              boxShadow: "0 0 32px rgba(249,115,22,0.08)",
            }}
          >
            <div
              className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[11px] font-semibold"
              style={{ background: "#F97316", color: "white", fontFamily: "'JetBrains Mono', monospace" }}
            >
              MOST POPULAR
            </div>
            <div className="mb-6">
              <p
                className="text-[11px] font-semibold uppercase tracking-widest mb-3"
                style={{ color: "#F97316", fontFamily: "'JetBrains Mono', monospace" }}
              >
                Pro
              </p>
              <div className="flex items-baseline gap-1">
                <span
                  className="text-white"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "2.5rem", letterSpacing: "-0.04em" }}
                >
                  $9
                </span>
                <span style={{ color: "#71717A", fontSize: "14px" }}>/month</span>
              </div>
              <p className="mt-2" style={{ color: "#71717A", fontSize: "13px" }}>Unlimited analyses, all features</p>
            </div>
            <ul className="space-y-3 mb-8">
              {PRO_FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <CheckIcon />
                  <span style={{ color: "#A1A1AA", fontSize: "14px", fontFamily: "'Inter', sans-serif" }}>{f}</span>
                </li>
              ))}
            </ul>
            <a
              href="/signup"
              className="block w-full text-center py-3 rounded-xl font-semibold text-sm transition-all duration-150 hover:brightness-110 active:scale-95"
              style={{ background: "#F97316", color: "white", textDecoration: "none" }}
            >
              Go Pro
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
