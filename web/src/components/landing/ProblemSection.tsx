"use client";

/*
 * ProblemSection — Manus "Dark Signal" port (Apr 26)
 * Blurred thumbnail-grid bg with scroll-linked zoom + 4 timestamp pain cards.
 */

import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const THUMBNAIL_GRID_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029819932/PLcAoykFsSXnZwd5KnAU3Y/contextdrop-thumbnail-grid-real_b66db384.png";

const PROBLEMS = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
    time: "11:47 PM",
    quote: "\"I'll watch this properly later.\"",
    sub: "You won't. It's been 3 weeks. The tab is still open.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    ),
    time: "9:12 AM",
    quote: "\"What was that tool he mentioned?\"",
    sub: "You watched 4 minutes of a 12-minute video to find it. It wasn't there.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
    time: "2:30 PM",
    quote: "\"I saved 340 posts this month.\"",
    sub: "Opened: 4. The rest are a graveyard of good intentions.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    time: "6:55 PM",
    quote: "\"This is actually useful. I should try this.\"",
    sub: "You didn't. The next video started. The moment passed.",
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

export default function ProblemSection() {
  const { ref: viewRef, inView } = useInView();
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const scale = useTransform(scrollYProgress, [0, 1], [1.0, 1.1]);

  return (
    <section
      ref={(el) => {
        sectionRef.current = el;
        (viewRef as React.MutableRefObject<HTMLDivElement | null>).current = el as HTMLDivElement;
      }}
      className="relative py-28 overflow-hidden"
    >
      <div className="absolute inset-0 z-0">
        <motion.img
          src={THUMBNAIL_GRID_URL}
          alt=""
          aria-hidden="true"
          style={{
            scale,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "blur(4px) saturate(0.65)",
            transformOrigin: "center center",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, #0a0a0a 0%, rgba(10,10,10,0.72) 20%, rgba(10,10,10,0.72) 80%, #0a0a0a 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, #0a0a0a 0%, transparent 15%, transparent 85%, #0a0a0a 100%)",
          }}
        />
      </div>

      <div className="cd-container relative z-10">
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
            Sound familiar?
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
            Your feed is full of things<br />
            <span style={{ color: "#A1A1AA" }}>you'll &quot;get to later.&quot;</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {PROBLEMS.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-xl p-5"
              style={{
                background: "rgba(17,17,17,0.88)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(249,115,22,0.1)" }}
                >
                  {p.icon}
                </div>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "11px",
                    color: "#52525B",
                    marginTop: "10px",
                  }}
                >
                  {p.time}
                </span>
              </div>
              <p
                className="font-semibold mb-2 leading-snug"
                style={{ color: "#FAFAFA", fontSize: "15px", fontFamily: "'Inter', sans-serif" }}
              >
                {p.quote}
              </p>
              <p style={{ color: "#71717A", fontSize: "13px", lineHeight: 1.6, fontFamily: "'Inter', sans-serif" }}>
                {p.sub}
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
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "16px",
              color: "#A1A1AA",
              lineHeight: 1.7,
            }}
          >
            ContextDrop turns every link into a{" "}
            <span className="text-white font-semibold">30-second decision</span>{" "}
            — act on it, or move on.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
