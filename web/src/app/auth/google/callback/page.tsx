"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

function subscribeLocation(listener: () => void) {
  window.addEventListener("hashchange", listener);
  window.addEventListener("popstate", listener);
  return () => {
    window.removeEventListener("hashchange", listener);
    window.removeEventListener("popstate", listener);
  };
}

function browserLocation() { return window.location.href; }
function serverLocation() { return null; }

function navigateAfterAuth(destination: unknown) {
  const origin = window.location.origin;
  let target = new URL("/dashboard", origin);
  try {
    const requested = new URL(typeof destination === "string" ? destination : "/dashboard", origin);
    if (requested.origin === origin && !requested.username && !requested.password) target = requested;
  } catch { /* Invalid backend destinations fall back to the signed-in dashboard. */ }
  // A fresh document request observes the new session cookie without reusing
  // an unauthenticated route from Next's client cache.
  window.location.replace(target.href);
}

export default function GoogleCallbackPage() {
  const [status, setStatus] = useState("");
  const location = useSyncExternalStore(subscribeLocation, browserLocation, serverLocation);
  const callbackUrl = location ? new URL(location) : null;
  const accessToken = callbackUrl ? new URLSearchParams(callbackUrl.hash.substring(1)).get("access_token") : null;
  const claimToken = callbackUrl?.searchParams.get("claim_token") ?? null;
  const displayStatus = status || (location && !accessToken ? "Sign-in failed. Redirecting..." : claimToken ? "Linking your account..." : "Signing you in...");

  useEffect(() => {
    if (!location) return;
    const controller = new AbortController();
    let redirectTimer: ReturnType<typeof setTimeout> | undefined;
    if (!accessToken) {
      redirectTimer = setTimeout(() => {
        navigateAfterAuth("/login?error=google_no_token");
      }, 1500);
      return () => clearTimeout(redirectTimer);
    }

    // Send the access token (and optional claim_token) to the server
    fetch("/api/auth/google/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: accessToken, claim_token: claimToken }),
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (controller.signal.aborted) return;
        if (data.success) {
          // Check for pending share URL before redirecting
          const pendingUrl = document.cookie
            .split("; ")
            .find((c) => c.startsWith("cd_pending_url="))
            ?.split("=")
            .slice(1)
            .join("=");
          if (pendingUrl) {
            document.cookie = "cd_pending_url=; path=/; max-age=0";
            navigateAfterAuth(`/share?url=${encodeURIComponent(decodeURIComponent(pendingUrl))}`);
            return;
          }
          navigateAfterAuth(data.redirect);
        } else {
          setStatus("Something went wrong. Redirecting...");
          redirectTimer = setTimeout(() => {
            navigateAfterAuth("/login?error=google_callback_failed");
          }, 1500);
        }
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setStatus("Something went wrong. Redirecting...");
        redirectTimer = setTimeout(() => {
          navigateAfterAuth("/login?error=google_callback_error");
        }, 1500);
      });
    return () => { controller.abort(); clearTimeout(redirectTimer); };
  }, [location, accessToken, claimToken]);

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
        <p style={{ fontSize: 16, fontWeight: 600, color: "#1c1917" }}>{displayStatus}</p>
      </div>
    </div>
  );
}
