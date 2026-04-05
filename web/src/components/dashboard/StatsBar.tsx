"use client";

interface Props {
  total: number;
  learnCount: number;
  applyCount: number;
}

export default function StatsBar({ total, learnCount, applyCount }: Props) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {[
        { label: "Saved", value: total, color: "text-white" },
        { label: "To Learn", value: learnCount, color: "text-blue-400" },
        { label: "To Apply", value: applyCount, color: "text-emerald-400" },
      ].map((stat) => (
        <div
          key={stat.label}
          className="shrink-0 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 min-w-[100px]"
        >
          <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
          <p className="text-xs text-zinc-500">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
