"use client";

/*
 * FinalCTASection + Footer — Manus "Dark Signal" port (Apr 26)
 * Orange radial glow + dot grid, centered CTA → the link input.
 */

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

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

export default function FinalCTASection({ localStudio = false }: { localStudio?: boolean }) {
  const { ref, inView } = useInView();
  const workspaceHref = localStudio ? "/replicate/local" : "/dashboard";

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
              Start with one link.
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
              Paste a link. Ask about it. Choose something to try.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/#start"
                onClick={(event) => {
                  const input = document.getElementById("content-link-input");
                  if (!input) return;
                  event.preventDefault();
                  input.scrollIntoView({ block: "center", behavior: "auto" });
                  input.focus({ preventScroll: true });
                }}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white text-base transition-all duration-150 hover:brightness-110 active:scale-95"
                style={{ background: "#F97316", boxShadow: "0 0 32px rgba(249,115,22,0.3)", textDecoration: "none" }}
              >
                Paste a link
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link
                href={workspaceHref}
                className="text-sm font-medium transition-colors duration-150 hover:text-white"
                style={{ color: "#71717A", textDecoration: "none" }}
              >
                Open your workspace →
              </Link>
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
            <Link
              href={workspaceHref}
              className="text-xs transition-colors hover:text-white"
              style={{ color: "#52525B", textDecoration: "none", fontFamily: "'Inter', sans-serif" }}
            >
              Dashboard
            </Link>
            <a
              href="https://t.me/contextdrop2027bot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs transition-colors hover:text-white"
              style={{ color: "#52525B", textDecoration: "none", fontFamily: "'Inter', sans-serif" }}
            >
              Telegram
            </a>
            <Link
              href="/privacy"
              className="text-xs transition-colors hover:text-white"
              style={{ color: "#52525B", textDecoration: "none", fontFamily: "'Inter', sans-serif" }}
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-xs transition-colors hover:text-white"
              style={{ color: "#52525B", textDecoration: "none", fontFamily: "'Inter', sans-serif" }}
            >
              Terms
            </Link>
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
