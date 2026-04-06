"use client";

import { useState } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const DEMO_URL = "https://www.instagram.com/reel/DFnVBmxx2Lj/";

export default function TryItNowSection() {
  const [copied, setCopied] = useState(false);
  const ref = useScrollAnimation(0.3);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(DEMO_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      const el = document.createElement("textarea");
      el.value = DEMO_URL;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className="py-14 lg:py-20" style={{ background: "#FAFAF8" }}>
      <div className="landing-container">
        <div
          ref={ref}
          className="fade-up max-w-2xl mx-auto text-center"
        >
          {/* Label */}
          <span className="section-label block mb-4">Live Demo</span>

          {/* Headline */}
          <p
            className="text-[#1a1a1a] text-xl sm:text-2xl mb-6 font-bold tracking-[-0.015em]"
          >
            Try it right now — copy this link and paste it to the bot:
          </p>

          {/* URL box + copy button */}
          <div
            className="flex items-stretch rounded-xl overflow-hidden mx-auto"
            style={{
              border: "1.5px solid #fde8d4",
              background: "white",
              boxShadow: "0 2px 16px rgba(249,115,22,0.08)",
              maxWidth: "560px",
            }}
          >
            {/* URL display */}
            <div
              className="flex-1 px-4 py-3.5 text-left overflow-hidden"
              style={{
                fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                fontSize: "0.82rem",
                color: "#EA6C0A",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: "1.5",
                borderRight: "1.5px solid #fde8d4",
              }}
            >
              {DEMO_URL}
            </div>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-5 py-3.5 font-bold text-sm transition-all duration-150 flex-shrink-0"
              style={{
                background: copied ? "#10B981" : "#F97316",
                color: "white",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.875rem",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                minWidth: "90px",
                justifyContent: "center",
              }}
              aria-label="Copy demo URL to clipboard"
            >
              {copied ? (
                <>
                  {/* Checkmark icon */}
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8L6.5 11.5L13 4.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  {/* Copy icon */}
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="white" strokeWidth="1.5"/>
                    <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2H3.5A1.5 1.5 0 0 0 2 3.5V9.5A1.5 1.5 0 0 0 3.5 11H5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>

          {/* Hint */}
          <p
            className="text-slate-400 text-sm mt-4"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Then open{" "}
            <a
              href="https://t.me/contextdrop2027bot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#F97316] font-semibold hover:underline"
            >
              @contextdrop2027bot
            </a>{" "}
            on Telegram and paste it. Verdict in 60 seconds.
          </p>
        </div>
      </div>
    </section>
  );
}
