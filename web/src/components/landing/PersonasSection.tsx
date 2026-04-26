"use client";

/*
 * PersonasSection — Manus "Dark Signal" port (Apr 26)
 * 4 dark cards in 2x2 bento grid: who it's for.
 */

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const PERSONAS = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    title: "Founders & builders",
    desc: "You're watching 10 videos a day about AI tools, growth tactics, and competitor moves.",
    example: "\"Sent 3 links this morning. Had 3 tasks by 9am. Actually did one.\"",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    title: "Developers",
    desc: "You follow 40 dev accounts. Every week there's a new tool, framework, or workflow to try.",
    example: "\"Finally have a list of things to actually test instead of a 300-tab browser.\"",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Content creators",
    desc: "You research trends, tools, and formats constantly. You need signal, not more content.",
    example: "\"I use it to research what tools my audience is talking about.\"",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    title: "Anyone drowning in tabs",
    desc: "You bookmark everything and use nothing. Your saved folder is a monument to good intentions.",
    example: "\"I sent it a YouTube video I'd had open for 6 days. Done in 30 seconds.\"",
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

export default function PersonasSection() {
  const { ref, inView } = useInView();

  return (
    <section
      ref={ref}
      className="py-24"
      style={{ background: "#0a0a0a", borderTop: "1px solid rgba(255,255,255,0.06)" }}
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
            Who it's for
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
            If you consume content to stay sharp,<br />
            <span style={{ color: "#A1A1AA" }}>this is for you.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {PERSONAS.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-xl p-5 group transition-all duration-200"
              style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.08)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(249,115,22,0.3)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-4"
                style={{ background: "rgba(249,115,22,0.1)" }}
              >
                {p.icon}
              </div>
              <h3
                className="text-white font-semibold mb-2"
                style={{ fontFamily: "'Inter', sans-serif", fontSize: "16px", letterSpacing: "-0.01em" }}
              >
                {p.title}
              </h3>
              <p className="mb-3" style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#71717A", lineHeight: 1.65 }}>
                {p.desc}
              </p>
              <p className="italic" style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#52525B", lineHeight: 1.6 }}>
                {p.example}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
