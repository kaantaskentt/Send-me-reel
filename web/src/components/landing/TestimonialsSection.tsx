"use client";

/*
 * TestimonialsSection — Manus "Dark Signal" port (Apr 26)
 * 3 testimonials, dark cards, orange quote marks.
 */

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const TESTIMONIALS = [
  {
    quote:
      "I was saving 20+ posts a day and acting on zero. Now I send the good ones to Mr Context and actually have a task list by end of day.",
    name: "Alex M.",
    role: "Indie developer",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40&h=40&fit=crop&crop=face",
  },
  {
    quote:
      "The 'TRY THIS ONCE' callout is the thing. I don't need a summary — I need to know what to actually do. This gives me that.",
    name: "Sarah K.",
    role: "Founder, B2B SaaS",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop&crop=face",
  },
  {
    quote:
      "I use it for LinkedIn posts mostly. Half of them are fluff — it tells me which half is worth 5 minutes of my time.",
    name: "James T.",
    role: "Content creator",
    avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=40&h=40&fit=crop&crop=face",
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

export default function TestimonialsSection() {
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
            What people say
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
            Real people. Real links. Real tasks done.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-xl p-5"
              style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div
                className="mb-4"
                style={{ color: "#F97316", fontSize: "2rem", lineHeight: 1, fontFamily: "Georgia, serif" }}
              >
                &ldquo;
              </div>
              <p
                className="mb-5 leading-relaxed"
                style={{ color: "#A1A1AA", fontSize: "14px", fontFamily: "'Inter', sans-serif" }}
              >
                {t.quote}
              </p>
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.avatar} alt={t.name} className="w-8 h-8 rounded-full object-cover" />
                <div>
                  <p
                    className="text-white font-semibold"
                    style={{ fontSize: "13px", fontFamily: "'Inter', sans-serif" }}
                  >
                    {t.name}
                  </p>
                  <p style={{ fontSize: "12px", color: "#52525B", fontFamily: "'Inter', sans-serif" }}>{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
