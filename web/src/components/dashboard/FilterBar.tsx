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

const platforms = [
  { value: "all", label: "All" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "x", label: "X" },
  { value: "article", label: "Articles" },
];

export default function FilterBar({
  intent,
  onIntentChange,
  platform,
  onPlatformChange,
}: Props) {
  return (
    <div className="space-y-3">
      {/* Intent tabs */}
      <div className="flex gap-1 bg-zinc-900 rounded-lg p-1">
        {intents.map((item) => (
          <button
            key={item.value}
            onClick={() => onIntentChange(item.value)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              intent === item.value
                ? "bg-zinc-700 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Platform pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {platforms.map((item) => (
          <button
            key={item.value}
            onClick={() => onPlatformChange(item.value)}
            className={`shrink-0 px-3 py-1 text-xs rounded-full border transition-colors ${
              platform === item.value
                ? "border-blue-500/50 bg-blue-500/10 text-blue-300"
                : "border-zinc-800 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
