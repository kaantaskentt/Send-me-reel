"use client";

interface Props {
  intent: string;
  onIntentChange: (v: string) => void;
  platform: string;
  onPlatformChange: (v: string) => void;
}

const intents = [
  { value: "all", label: "All" },
  { value: "learn", label: "Learn" },
  { value: "apply", label: "Apply" },
];

function InstagramMini() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <defs><linearGradient id="ig2" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f09433" /><stop offset="100%" stopColor="#bc1888" /></linearGradient></defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig2)" />
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="white" strokeWidth="1.5" />
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
    <div className="space-y-3">
      {/* Intent segmented control */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
        {intents.map((item) => (
          <button
            key={item.value}
            onClick={() => onIntentChange(item.value)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
              intent === item.value
                ? "bg-zinc-700 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Platform pills */}
      <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
        {platforms.map((item) => (
          <button
            key={item.value}
            onClick={() => onPlatformChange(item.value)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1 text-xs rounded-full border transition-all ${
              platform === item.value
                ? "border-blue-500/50 bg-blue-500/10 text-blue-300"
                : "border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
