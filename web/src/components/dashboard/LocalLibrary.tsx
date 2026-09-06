"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { History, Loader2 } from "lucide-react";
import type { LibraryItem } from "@/lib/local-library";

export default function LocalLibrary({ currentId }: { currentId?: string }) {
  const router = useRouter();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/local/library", { signal: controller.signal, cache: "no-store" }).then(response => response.ok ? response.json() : null).then(data => { if (Array.isArray(data?.items)) setItems(data.items); }).catch(() => {});
    return () => controller.abort();
  }, [currentId]);
  async function select(analysisId: string) {
    if (!analysisId || analysisId === currentId || busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/local/library", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ analysisId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not open that source.");
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not open saved content."); }
    finally { setBusy(false); }
  }
  return <div className="relative max-w-[220px] text-xs"><label className="flex items-center gap-2 text-stone-400">{busy ? <Loader2 size={14} className="animate-spin" /> : <History size={14} />}<select aria-label="Saved content" value={items.some(item => item.analysisId === currentId) ? currentId : ""} disabled={busy || items.length < 2} onChange={event => select(event.target.value)} className="max-w-[180px] truncate rounded-lg border border-white/10 bg-[#141210] px-2 py-2 text-xs text-stone-300 disabled:opacity-50"><option value="" disabled>Saved content</option>{items.map(item => <option key={item.analysisId} value={item.analysisId}>{item.title.slice(0, 65)}</option>)}</select></label>{error && <p role="alert" className="absolute right-0 top-11 z-10 w-64 rounded-lg border border-red-500/20 bg-[#21100d] p-3 text-red-200">{error}</p>}</div>;
}
