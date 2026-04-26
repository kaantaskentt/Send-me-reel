"use client";

/*
 * HowItWorksSection — Manus "Dark Signal" port (Apr 26)
 * 3 steps with large orange numeral backgrounds.
 */

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const STEPS = [
  {
    num: "01",
    title: "Send a link",
    desc: "Drop any URL into Mr Context on Telegram — Instagram, TikTok, X, LinkedIn, YouTube, or any article.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Get the signal",
    desc: "Mr Context reads it, strips the noise, and sends back a sharp summary + the one thing worth doing.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Act on it",
    desc: "One tap to add the action to your dashboard. Your feed becomes a to-do list — not a graveyard.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
];

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

export default function HowItWorksSection() {
  const { ref, inView } = useInView();

  return (
    <section
      ref={ref}
      className="py-24"
      style={{ background: "#111111", borderTop: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="cd-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <p
            className="text-[11px] font-semibold uppercase tracking-widest mb-4"
            style={{ color: "#F97316", fontFamily: "'JetBrains Mono', monospace" }}
          >
            How it works
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
            Three steps. Thirty seconds.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: 0.1 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="relative rounded-xl p-6 overflow-hidden"
              style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div
                className="absolute top-2 right-4 select-none pointer-events-none"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 800,
                  fontSize: "6rem",
                  color: "rgba(249,115,22,0.06)",
                  lineHeight: 1,
                  letterSpacing: "-0.04em",
                }}
              >
                {step.num}
              </div>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "rgba(249,115,22,0.1)" }}
              >
                {step.icon}
              </div>
              <div
                className="text-[11px] font-semibold uppercase tracking-widest mb-2"
                style={{ color: "#F97316", fontFamily: "'JetBrains Mono', monospace" }}
              >
                Step {step.num}
              </div>
              <h3
                className="text-white font-semibold mb-2"
                style={{ fontFamily: "'Inter', sans-serif", fontSize: "18px", letterSpacing: "-0.01em" }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "14px",
                  color: "#71717A",
                  lineHeight: 1.65,
                }}
              >
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mt-12"
        >
          <a
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white text-sm transition-all duration-150 hover:brightness-110 active:scale-95"
            style={{ background: "#F97316", textDecoration: "none" }}
          >
            Try it free — first 50 on us
          </a>
        </motion.div>
      </div>
    </section>
  );
}
