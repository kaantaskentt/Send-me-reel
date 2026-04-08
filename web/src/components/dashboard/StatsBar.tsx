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
      numColor: "text-zinc-100",
      bg: "bg-zinc-800/60",
      border: "border-zinc-700/50",
      iconColor: "text-zinc-400",
    },
    {
      label: "To Learn",
      value: learnCount,
      icon: GraduationCap,
      numColor: "text-blue-300",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      iconColor: "text-blue-400",
    },
    {
      label: "To Apply",
      value: applyCount,
      icon: Rocket,
      numColor: "text-emerald-300",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      iconColor: "text-emerald-400",
    },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className={`rounded-xl border px-3 py-3 flex items-center gap-2.5 ${s.bg} ${s.border}`}
          >
            <div className={`shrink-0 ${s.iconColor}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className={`text-xl font-bold tabular-nums leading-none ${s.numColor}`}>
                {s.value}
              </p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5 font-medium">
                {s.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
