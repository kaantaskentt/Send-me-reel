"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Platform = "ios" | "android" | "desktop" | null;

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if ("standalone" in navigator && (navigator as any).standalone) return true;
  return false;
}

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform>(null);
  const [step, setStep] = useState<"install" | "pin">("install");
  const deferredPromptRef = useRef<any>(null);

  useEffect(() => {
    // Don't show if already installed or dismissed recently
    if (isStandalone()) return;

    const dismissed = localStorage.getItem("installPromptDismissed");
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return; // 7 days
    }

    const p = detectPlatform();
    setPlatform(p);
    setVisible(true);

    // Listen for Android install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e;
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem("installPromptDismissed", String(Date.now()));
  };

  const handleInstall = async () => {
    if (deferredPromptRef.current) {
      deferredPromptRef.current.prompt();
      const result = await deferredPromptRef.current.userChoice;
      if (result.outcome === "accepted") {
        setStep("pin");
      }
    }
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        style={{
          background: "#fff",
          border: "1px solid #e7e2d9",
          borderRadius: 18,
          padding: 20,
          marginBottom: 16,
          position: "relative",
        }}
      >
        {/* Dismiss button */}
        <button
          onClick={dismiss}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#a8a29e",
            fontSize: 18,
            lineHeight: 1,
            padding: 4,
          }}
          aria-label="Dismiss"
        >
          x
        </button>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          {/* Icon */}
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#1c1917", margin: "0 0 6px 0" }}>
              Analyze links from any app
            </p>

            {platform === "android" && step === "install" && (
              <>
                <p style={{ fontSize: 13, color: "#78716c", margin: "0 0 14px 0", lineHeight: 1.5 }}>
                  Install ContextDrop so it appears in your share menu. Then just tap Share on any link.
                </p>
                {deferredPromptRef.current ? (
                  <button
                    onClick={handleInstall}
                    style={{
                      padding: "10px 20px",
                      background: "#f97316",
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: 13,
                      borderRadius: 100,
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    Install ContextDrop
                  </button>
                ) : (
                  <p style={{ fontSize: 13, color: "#a8a29e", margin: 0 }}>
                    Tap your browser menu (three dots) and select "Add to Home screen".
                  </p>
                )}
              </>
            )}

            {platform === "android" && step === "pin" && (
              <p style={{ fontSize: 13, color: "#78716c", margin: 0, lineHeight: 1.5 }}>
                Now share any link and look for <strong>ContextDrop</strong> in your share sheet.
              </p>
            )}

            {platform === "ios" && (
              <div style={{ fontSize: 13, color: "#78716c", lineHeight: 1.7, margin: 0 }}>
                <p style={{ margin: "0 0 10px 0" }}>
                  <strong>Step 1:</strong> Tap the{" "}
                  <span style={{ display: "inline-flex", alignItems: "center", verticalAlign: "middle" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle" }}>
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                  </span>{" "}
                  Share button, then <strong>"Add to Home Screen"</strong>.
                </p>
                <p style={{ margin: "0 0 10px 0" }}>
                  <strong>Step 2:</strong> To add to your share sheet — share any link, scroll the app row right, tap <strong>"More"</strong>, then drag <strong>ContextDrop</strong> to the top of the list.
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "#a8a29e" }}>
                  After setup, sharing any link to ContextDrop starts an analysis instantly.
                </p>
              </div>
            )}

            {platform === "desktop" && (
              <p style={{ fontSize: 13, color: "#78716c", margin: 0, lineHeight: 1.5 }}>
                Open this page on your phone to install ContextDrop and analyze links directly from your share menu.
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
