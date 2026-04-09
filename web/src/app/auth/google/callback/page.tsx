"use client";

import { useEffect, useState } from "react";

export default function GoogleCallbackPage() {
  const [status, setStatus] = useState("Signing you in...");

  useEffect(() => {
    // Supabase implicit OAuth returns tokens in the URL hash fragment
    // e.g., #access_token=...&refresh_token=...&token_type=bearer
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");

    if (!accessToken) {
      setStatus("Sign-in failed. Redirecting...");
      setTimeout(() => {
        window.location.href = "/login?error=google_no_token";
      }, 1500);
      return;
    }

    // Send the access token to our server to create a session
    fetch("/api/auth/google/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: accessToken }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          window.location.href = data.redirect || "/dashboard";
        } else {
          setStatus("Something went wrong. Redirecting...");
          setTimeout(() => {
            window.location.href = "/login?error=google_callback_failed";
          }, 1500);
        }
      })
      .catch(() => {
        setStatus("Something went wrong. Redirecting...");
        setTimeout(() => {
          window.location.href = "/login?error=google_callback_error";
        }, 1500);
      });
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
        <p style={{ fontSize: 16, fontWeight: 600, color: "#1c1917" }}>{status}</p>
      </div>
    </div>
  );
}
