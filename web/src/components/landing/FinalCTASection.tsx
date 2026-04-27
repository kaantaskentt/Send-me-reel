"use client";

/*
 * FinalCTASection + Footer — Manus "Dark Signal" port (Apr 26)
 * Orange radial glow + dot grid, centered CTA → /signup.
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

export default function FinalCTASection() {
  const { ref, inView } = useInView();

  return (
    <>
      <section
        ref={ref}
        className="relative py-28 overflow-hidden"
        style={{ background: "#0a0a0a", borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(249,115,22,0.12) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="cd-container relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-widest mb-6"
              style={{ color: "#F97316", fontFamily: "'JetBrains Mono', monospace" }}
            >
              Ready?
            </p>
            <h2
              className="text-white mb-4"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 800,
                fontSize: "clamp(2rem, 5vw, 3.5rem)",
                letterSpacing: "-0.04em",
                lineHeight: 1.05,
              }}
            >
              One link. One thing to try.
            </h2>
            <p
              className="mb-10 max-w-md mx-auto"
              style={{
                color: "#71717A",
                fontSize: "16px",
                lineHeight: 1.7,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Your first 50 analyses are free. No card. No signup form. Just open the bot and send a link.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white text-base transition-all duration-150 hover:brightness-110 active:scale-95"
                style={{ background: "#F97316", boxShadow: "0 0 32px rgba(249,115,22,0.3)", textDecoration: "none" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
                </svg>
                Start free
              </a>
              <a
                href="/dashboard"
                className="text-sm font-medium transition-colors duration-150 hover:text-white"
                style={{ color: "#71717A", textDecoration: "none" }}
              >
                Preview the dashboard →
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <footer
        className="py-8"
        style={{ background: "#0a0a0a", borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="cd-container flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: "#F97316" }}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 7L6 10.5L11.5 3.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span
              className="text-white font-semibold text-sm"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              ContextDrop
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="#pricing"
              className="text-xs transition-colors hover:text-white"
              style={{ color: "#52525B", textDecoration: "none", fontFamily: "'Inter', sans-serif" }}
            >
              Pricing
            </a>
            <a
              href="/dashboard"
              className="text-xs transition-colors hover:text-white"
              style={{ color: "#52525B", textDecoration: "none", fontFamily: "'Inter', sans-serif" }}
            >
              Dashboard
            </a>
            <a
              href="https://t.me/contextdrop2027bot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs transition-colors hover:text-white"
              style={{ color: "#52525B", textDecoration: "none", fontFamily: "'Inter', sans-serif" }}
            >
              Telegram
            </a>
            <a
              href="/privacy"
              className="text-xs transition-colors hover:text-white"
              style={{ color: "#52525B", textDecoration: "none", fontFamily: "'Inter', sans-serif" }}
            >
              Privacy
            </a>
            <a
              href="/terms"
              className="text-xs transition-colors hover:text-white"
              style={{ color: "#52525B", textDecoration: "none", fontFamily: "'Inter', sans-serif" }}
            >
              Terms
            </a>
          </div>
          <p
            className="text-xs"
            style={{ color: "#52525B", fontFamily: "'JetBrains Mono', monospace" }}
          >
            © {new Date().getFullYear()} ContextDrop
          </p>
        </div>
      </footer>
    </>
  );
}
