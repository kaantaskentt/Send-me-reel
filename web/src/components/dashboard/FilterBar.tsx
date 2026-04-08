"use client";

interface Props {
  intent: string;
  onIntentChange: (v: string) => void;
  platform: string;
  onPlatformChange: (v: string) => void;
}

const intents = [
  { value: "all", label: "All" },
  { value: "learn", label: "📚 Learn" },
  { value: "apply", label: "🚀 Apply" },
];

function InstagramMini() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="ig-db" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f09433" />
          <stop offset="50%" stopColor="#e6683c" />
          <stop offset="100%" stopColor="#bc1888" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig-db)" />
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="white" strokeWidth="1.5" />
      <circle cx="17.5" cy="6.5" r="1" fill="white" />
    </svg>
  );
}

function TikTokMini() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#010101" />
      <path d="M16.6 5.82A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-3.38-2.4V9.84a5.64 5.64 0 1 0 5.64 5.59V9.15a7.33 7.33 0 0 0 4.29 1.38V7.44a4.28 4.28 0 0 1-2.4-1.62z" fill="#69C9D0" />
    </svg>
  );
}

function XMini() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#000" />
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="white" />
    </svg>
  );
}

const platforms = [
  { value: "all", label: "All", icon: null },
  { value: "instagram", label: "Instagram", icon: <InstagramMini /> },
  { value: "tiktok", label: "TikTok", icon: <TikTokMini /> },
  { value: "x", label: "X", icon: <XMini /> },
  { value: "article", label: "Articles", icon: null },
];

export default function FilterBar({ intent, onIntentChange, platform, onPlatformChange }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div
        style={{
          display: "flex",
          gap: 4,
          background: "#f5f1eb",
          border: "1px solid #e7e2d9",
          borderRadius: 12,
          padding: 4,
        }}
      >
        {intents.map((item) => (
          <button
            key={item.value}
            onClick={() => onIntentChange(item.value)}
            style={{
              flex: 1,
              padding: "6px 0",
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.15s",
              background: intent === item.value ? "#fff" : "transparent",
              color: intent === item.value ? "#1c1917" : "#a8a29e",
              boxShadow: intent === item.value ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
        {platforms.map((item) => (
          <button
            key={item.value}
            onClick={() => onPlatformChange(item.value)}
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 14px",
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 100,
              border: platform === item.value ? "1.5px solid #f97316" : "1.5px solid #e7e2d9",
              background: platform === item.value ? "#fff7ed" : "#fff",
              color: platform === item.value ? "#f97316" : "#78716c",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.15s",
            }}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
