"use client";

/*
 * StatsBar — Manus "Dark Signal" port (Apr 26)
 * Dark #111111 strip with 4 mono numbers + count-up.
 */

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const STATS = [
  { value: 2765, suffix: "+", label: "Videos analysed" },
  { value: 1088, suffix: "+", label: "Creators using it" },
  { value: 816, suffix: "+", label: "Tools discovered" },
  { value: 12, suffix: "s", label: "Avg. analysis time" },
];

function useCountUp(target: number, duration: number, start: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

function StatItem({
  value,
  suffix,
  label,
  delay,
  start,
}: {
  value: number;
  suffix: string;
  label: string;
  delay: number;
  start: boolean;
}) {
  const count = useCountUp(value, 1600, start);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center gap-1 px-6 py-5"
    >
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 600,
          fontSize: "clamp(1.4rem, 3vw, 1.9rem)",
          color: "#FAFAFA",
          letterSpacing: "-0.02em",
        }}
      >
        {count.toLocaleString()}
        {suffix}
      </span>
      <span
        style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 500,
          fontSize: "11px",
          color: "#71717A",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </span>
    </motion.div>
  );
}

export default function StatsBar() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.3 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      style={{
        background: "#111111",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="cd-container">
        <div className="grid grid-cols-2 sm:grid-cols-4">
          {STATS.map((stat, i) => (
            <div
              key={i}
              style={{
                borderRight: i < STATS.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
              }}
            >
              <StatItem
                value={stat.value}
                suffix={stat.suffix}
                label={stat.label}
                delay={i * 0.08}
                start={visible}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
