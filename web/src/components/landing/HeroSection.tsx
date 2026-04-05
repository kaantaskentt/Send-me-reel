"use client";

import { useEffect, useRef, useState } from "react";
import { BOT_LINK } from "@/lib/constants";

const HERO_PHONE_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029819932/PLcAoykFsSXnZwd5KnAU3Y/hero_phone_warm-55V7RT6dEuLrP23S3hAWxR.webp";

export default function HeroSection() {
  const [visible, setVisible] = useState(false);
  const phoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!phoneRef.current) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 6;
      const y = (e.clientY / window.innerHeight - 0.5) * 4;
      phoneRef.current.style.transform = `rotate(-3deg) translate(${x}px, ${y}px)`;
    };
    window.addEventListener("mousemove", handler, { passive: true });
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  return (
    <section
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{ background: "#FAFAF8" }}
    >
      <div
        className="absolute top-0 right-0 w-[600px] h-[600px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at top right, rgba(249,115,22,0.12) 0%, transparent 65%)",
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-[400px] h-[400px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at bottom left, rgba(249,115,22,0.06) 0%, transparent 65%)",
        }}
      />

      <div className="landing-container relative z-10 pt-28 pb-16 lg:pt-32 lg:pb-20">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
          <div
            className="flex-1 min-w-0 w-full transition-all duration-700"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(20px)",
            }}
          >
            <div className="badge-orange mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              10 free analyses · No signup
            </div>

            <h1 className="text-[2.6rem] sm:text-5xl md:text-[3.25rem] text-[#1a1a1a] mb-5 leading-[1.1] font-[800] tracking-[-0.03em]">
              Stop bookmarking.
              <br />
              <span className="text-[#F97316]">Start understanding.</span>
            </h1>

            <p className="text-lg text-slate-500 mb-3 leading-relaxed max-w-[480px] font-normal">
              Send any Instagram, TikTok, or X video link to ContextDrop on
              Telegram. In 60 seconds, get a personalized AI verdict — what it
              contains, what tools are mentioned, and why it matters{" "}
              <em>to you</em>.
            </p>

            <p className="text-sm text-orange-400/80 mb-8 mono">
              &quot;Send it. Understand it. Actually use it.&quot;
            </p>

            <div className="flex flex-col sm:flex-row gap-3 items-start">
              <a
                href={BOT_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary pulse-orange"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z" />
                </svg>
                Start free on Telegram
              </a>
              <span className="text-slate-400 text-sm self-center">
                No credit card · No signup
              </span>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-2">
                {[
                  { bg: "#F97316", letter: "A" },
                  { bg: "#8B5CF6", letter: "M" },
                  { bg: "#10B981", letter: "J" },
                  { bg: "#3B82F6", letter: "K" },
                ].map((u, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white font-bold"
                    style={{ background: u.bg }}
                  >
                    {u.letter}
                  </div>
                ))}
              </div>
              <span className="text-slate-400 text-sm">
                Joined by{" "}
                <strong className="text-slate-600">2,400+</strong> creators
                &amp; founders
              </span>
            </div>
          </div>

          <div
            className="flex-shrink-0 relative w-full max-w-[260px] sm:max-w-[300px] lg:max-w-[320px]"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(30px)",
              transition: "opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s",
            }}
          >
            <div
              ref={phoneRef}
              className="relative float-anim"
              style={{
                transform: "rotate(-3deg)",
                transition: "transform 0.4s ease-out",
              }}
            >
              <div
                className="absolute inset-0 rounded-[2.5rem] blur-3xl"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(249,115,22,0.2) 0%, transparent 70%)",
                  transform: "scale(1.15)",
                }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={HERO_PHONE_URL}
                alt="ContextDrop Telegram bot showing a video analysis verdict"
                className="relative z-10 w-full"
                style={{
                  filter: "drop-shadow(0 24px 48px rgba(0,0,0,0.12))",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, transparent, #FAFAF8)",
        }}
      />
    </section>
  );
}
