"use client";

import { useState } from "react";

export default function PricingPage() {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#faf8f5", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(250,248,245,0.88)", backdropFilter: "blur(16px)", borderBottom: "1px solid #e7e2d9" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 56, maxWidth: 960, margin: "0 auto" }}>
          <a href="/" style={{ textDecoration: "none", fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", color: "#1c1917" }}>
            Context<span style={{ color: "#f97316" }}>Drop</span>
          </a>
          <a href="/dashboard" style={{ fontSize: 13, color: "#78716c", textDecoration: "none", fontWeight: 500 }}>← Back to dashboard</a>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1c1917", margin: "0 0 10px 0" }}>Simple pricing</h1>
          <p style={{ fontSize: 15, color: "#78716c", margin: 0, lineHeight: 1.6 }}>Free to start. Upgrade when you need more.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Free tier */}
          <div style={{ background: "#fff", border: "1px solid #e7e2d9", borderRadius: 20, padding: 28, display: "flex", flexDirection: "column" }}>
            <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#a8a29e", margin: "0 0 8px 0" }}>Free</p>
            <p style={{ fontSize: 32, fontWeight: 800, color: "#1c1917", margin: "0 0 4px 0" }}>$0</p>
            <p style={{ fontSize: 13, color: "#a8a29e", margin: "0 0 24px 0" }}>To get started</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
              {["50 free credits", "AI-powered verdicts", "Action items", "Notion integration", "Telegram + Web dashboard"].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "#10b981", fontSize: 14 }}>✓</span>
                  <span style={{ fontSize: 13, color: "#44403c" }}>{item}</span>
                </div>
              ))}
            </div>

            <div style={{ padding: "13px 24px", marginTop: 24, background: "#f5f1eb", color: "#78716c", fontWeight: 600, fontSize: 14, borderRadius: 100, textAlign: "center" }}>
              Current plan
            </div>
          </div>

          {/* Premium tier */}
          <div style={{ background: "#fff", border: "2px solid #f97316", borderRadius: 20, padding: 28, display: "flex", flexDirection: "column", position: "relative" }}>
            <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg, #fbbf24, #f97316)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 14px", borderRadius: 100 }}>
              Most popular
            </div>
            <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#f97316", margin: "0 0 8px 0" }}>Premium</p>
            <p style={{ fontSize: 32, fontWeight: 800, color: "#1c1917", margin: "0 0 4px 0" }}>$9.99<span style={{ fontSize: 14, fontWeight: 500, color: "#a8a29e" }}>/mo</span></p>
            <p style={{ fontSize: 13, color: "#a8a29e", margin: "0 0 24px 0" }}>For power users</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
              {["200 credits/month", "Everything in Free", "AI chat per analysis", "Cross-analysis insights", "Priority support"].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "#f97316", fontSize: 14 }}>✓</span>
                  <span style={{ fontSize: 13, color: "#44403c" }}>{item}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleUpgrade}
              disabled={loading}
              style={{
                padding: "13px 24px", marginTop: 24,
                background: loading ? "#fb923c" : "#f97316",
                color: "#fff", fontWeight: 700, fontSize: 14,
                borderRadius: 100, border: "none",
                cursor: loading ? "wait" : "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {loading ? "Redirecting..." : "Get Premium"}
            </button>
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "#c4bdb5", marginTop: 32 }}>
          Cancel anytime. Credits don&apos;t expire.
        </p>
      </main>
    </div>
  );
}
