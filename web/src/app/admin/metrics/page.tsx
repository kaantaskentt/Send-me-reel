"use client";

/**
 * Phase 6 — internal metrics dashboard.
 *
 * Watches the four numbers we track to know if the bridge is working:
 *   1. tried_rate (north star) — strategy.md §14, target > 25%
 *   2. median time-to-first-try
 *   3. set-aside rate (informational, not a target)
 *   4. ghost rate (anti-metric, lower is better)
 *
 * Auth gate is server-side (route checks ADMIN_USER_EMAIL). This page just
 * fetches and renders. If the user isn't admin, the API returns 403 and we
 * show "not authorised."
 */

import { useEffect, useState } from "react";

interface Metrics {
  window_days: number;
  tried_rate: number | null;
  tried_rate_target: number;
  counts_last_7d: { tried: number; set_aside: number; saved_unresolved: number; total: number };
  median_time_to_first_try_days: number | null;
  median_ttft_target_days: number;
  set_aside_rate_30d: number | null;
  ghost_rate_30d: number | null;
  ghost_rate_target_max: number;
  stance_distribution: Record<string, number>;
}

const STANCE_LABELS: Record<string, string> = {
  curious_not_started: "🌱 curious",
  watching_not_doing: "🪞 watching",
  tried_gave_up: "🌀 gave up",
  using_want_more: "🛠 using",
};

function pct(n: number | null): string {
  if (n === null) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function days(n: number | null): string {
  if (n === null) return "—";
  return `${n.toFixed(1)} days`;
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/metrics")
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then(setMetrics)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (error) {
    return (
      <div style={pageStyle}>
        <p style={{ color: "#dc2626", fontFamily: "monospace" }}>{error}</p>
      </div>
    );
  }
  if (!metrics) {
    return <div style={pageStyle}>Loading…</div>;
  }

  const triedHit = metrics.tried_rate !== null && metrics.tried_rate >= metrics.tried_rate_target;
  const ttftHit =
    metrics.median_time_to_first_try_days !== null &&
    metrics.median_time_to_first_try_days <= metrics.median_ttft_target_days;
  const ghostHit =
    metrics.ghost_rate_30d !== null && metrics.ghost_rate_30d <= metrics.ghost_rate_target_max;

  return (
    <div style={pageStyle}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px 0", color: "#1c1917" }}>
        Bridge metrics
      </h1>
      <p style={{ fontSize: 13, color: "#78716c", margin: "0 0 24px 0" }}>
        Last {metrics.window_days} days, internal only.
      </p>

      <Metric
        label="Tried-it rate (north star)"
        value={pct(metrics.tried_rate)}
        target={`target > ${pct(metrics.tried_rate_target)}`}
        hit={triedHit}
        sub={`${metrics.counts_last_7d.tried} tried · ${metrics.counts_last_7d.set_aside} set aside · ${metrics.counts_last_7d.saved_unresolved} undecided`}
      />
      <Metric
        label="Median time-to-first-try"
        value={days(metrics.median_time_to_first_try_days)}
        target={`target < ${metrics.median_ttft_target_days} days`}
        hit={ttftHit}
        sub="from save to 'I tried it' toggle"
      />
      <Metric
        label="Set-aside rate (30d)"
        value={pct(metrics.set_aside_rate_30d)}
        target="informational"
        hit={null}
        sub="both states are good — this is not a target"
      />
      <Metric
        label="Ghost rate (anti-metric, 30d)"
        value={pct(metrics.ghost_rate_30d)}
        target={`target < ${pct(metrics.ghost_rate_target_max)}`}
        hit={ghostHit}
        sub="saved + never resolved 7+ days later. lower is better."
      />

      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1c1917", margin: "32px 0 12px 0" }}>
        Stance distribution
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
        {Object.entries(metrics.stance_distribution).map(([stance, count]) => (
          <div key={stance} style={stanceCardStyle}>
            <div style={{ fontSize: 13, color: "#78716c", fontWeight: 500 }}>{STANCE_LABELS[stance] ?? stance}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#1c1917", marginTop: 4 }}>{count}</div>
          </div>
        ))}
        {Object.keys(metrics.stance_distribution).length === 0 && (
          <p style={{ color: "#a8a29e", fontSize: 13 }}>No stance data yet.</p>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  target,
  hit,
  sub,
}: {
  label: string;
  value: string;
  target: string;
  hit: boolean | null;
  sub?: string;
}) {
  const hitColor = hit === true ? "#15803d" : hit === false ? "#dc2626" : "#a8a29e";
  return (
    <div style={metricCardStyle}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
        <span style={{ fontSize: 13, color: "#57534e", fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 12, color: hitColor, fontWeight: 600 }}>
          {hit === true ? "✓ on track" : hit === false ? "below target" : ""}
        </span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#1c1917", margin: "6px 0 4px 0", letterSpacing: "-0.02em" }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "#a8a29e" }}>{target}</div>
      {sub && <div style={{ fontSize: 11, color: "#a8a29e", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#faf8f5",
  padding: "32px 20px",
  maxWidth: 720,
  margin: "0 auto",
  fontFamily: "'DM Sans', sans-serif",
};

const metricCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e7e2d9",
  borderRadius: 14,
  padding: "16px 18px",
  marginBottom: 12,
};

const stanceCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e7e2d9",
  borderRadius: 12,
  padding: "12px 14px",
};
