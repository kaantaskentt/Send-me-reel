"use client";
import { Bookmark, GraduationCap, Rocket } from "lucide-react";

interface Props {
  total: number;
  learnCount: number;
  applyCount: number;
}

export default function StatsBar({ total, learnCount, applyCount }: Props) {
  const items = [
    {
      label: "Saved",
      value: total,
      icon: Bookmark,
      numColor: "#1c1917",
      iconColor: "#a8a29e",
      iconBg: "#f5f1eb",
    },
    {
      label: "To Learn",
      value: learnCount,
      icon: GraduationCap,
      numColor: "#3b82f6",
      iconColor: "#3b82f6",
      iconBg: "#eff6ff",
    },
    {
      label: "To Apply",
      value: applyCount,
      icon: Rocket,
      numColor: "#f97316",
      iconColor: "#f97316",
      iconBg: "#fff7ed",
    },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
      {items.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            style={{
              background: "#fff",
              border: "1px solid #e7e2d9",
              borderRadius: 14,
              padding: "1rem 1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "0.875rem",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: s.iconBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon style={{ width: 16, height: 16, color: s.iconColor }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: s.numColor,
                  lineHeight: 1,
                  fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
                }}
              >
                {s.value}
              </p>
              <p
                style={{
                  fontSize: 10,
                  color: "#a8a29e",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontWeight: 600,
                  marginTop: 3,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {s.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
