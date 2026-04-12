"use client";

/*
 * StatsBar — ContextDrop "Warm Signal"
 * White strip with warm dividers, orange accent numbers
 */

import { useEffect, useRef, useState } from "react";

const STATS = [
  { value: 6100, suffix: "+", label: "Videos analyzed" },
  { value: 2400, suffix: "+", label: "Creators & founders" },
  { value: 1800, suffix: "+", label: "Tools discovered" },
  { value: 28, suffix: "s", label: "Avg. analysis time" },
];

function useCountUp(target: number, duration = 1200, active: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [active, target, duration]);
  return count;
}

function StatItem({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const count = useCountUp(value, 1200, active);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="text-center px-6 py-5">
      <div
        className="text-2xl sm:text-3xl text-[#1a1a1a] mb-0.5 tabular-nums"
        style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 800, letterSpacing: "-0.02em" }}
      >
        {count.toLocaleString()}
        <span style={{ color: "#F97316" }}>{suffix}</span>
      </div>
      <div
        className="text-xs text-slate-400 uppercase tracking-widest"
        style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}
      >
        {label}
      </div>
    </div>
  );
}

export default function StatsBar() {
  return (
    <div
      className="border-y"
      style={{ borderColor: "#f0ede8", background: "white" }}
    >
      <div className="container">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x"
          style={{ borderColor: "#f0ede8" }}
        >
          {STATS.map((s) => (
            <StatItem key={s.label} {...s} />
          ))}
        </div>
      </div>
    </div>
  );
}
