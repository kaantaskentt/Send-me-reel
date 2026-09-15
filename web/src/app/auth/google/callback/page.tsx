"use client";

import { useEffect, useRef } from "react";
import { completeGoogleCallback, pendingShareRedirect } from "@/lib/google-auth";

export default function GoogleCallbackPage() {
  const completion = useRef<Promise<string> | null>(null);

  useEffect(() => {
    let active = true;
    if (!completion.current) {
      const location = window.location.href;
      // Remove the code and any legacy tokens before loading another document.
      window.history.replaceState(null, "", window.location.pathname);
      completion.current = completeGoogleCallback(location, fetch);
    }
    // Reuse one exchange through React's development effect replay. Aborting and
    // resubmitting can consume a one-use code before the second request arrives.
    void completion.current.then(destination => {
      if (!active) return;
      if (!destination.startsWith("/login?")) {
        const pending = document.cookie.split("; ").find(cookie => cookie.startsWith("cd_pending_url="))?.slice("cd_pending_url=".length);
        document.cookie = "cd_pending_url=; path=/; max-age=0; SameSite=Lax";
        destination = pendingShareRedirect(pending) ?? destination;
      }
      // A fresh document observes the new signed session cookie.
      window.location.replace(destination);
    });
    return () => { active = false; };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#faf8f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: "#f97316",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7L6 10.5L11.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p role="status" style={{ fontSize: 16, fontWeight: 600, color: "#1c1917" }}>Signing you in…</p>
      </div>
    </div>
  );
}
