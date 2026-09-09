"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, FileText, Library, Loader2, Search } from "lucide-react";
import type { LibraryItem } from "@/lib/local-library";
import StudioDialog from "./StudioDialog";
import styles from "./studio.module.css";

export default function LocalLibrary({ currentId }: { currentId?: string }) {
  const router = useRouter();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true); setError("");
    fetch("/api/local/library", { signal: controller.signal, cache: "no-store" })
      .then(async response => { if (!response.ok) throw new Error("Your saved content could not load. Close this window and try again."); return response.json(); })
      .then(data => { if (Array.isArray(data?.items)) setItems(data.items); })
      .catch(error => { if (!controller.signal.aborted) setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [currentId, open]);
  async function select(analysisId: string) {
    if (!analysisId || busy) return;
    if (analysisId === currentId) { setOpen(false); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/local/library", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ analysisId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not open that source.");
      setOpen(false); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not open saved content."); }
    finally { setBusy(false); }
  }
  const matching = items.filter(item => `${item.title} ${item.platform}`.toLowerCase().includes(query.toLowerCase()));
  return <>
    <button type="button" className={styles.toolbarButton} onClick={() => setOpen(true)} aria-label="Saved content"><Library size={16} /> Library</button>
    {open && <StudioDialog title="Saved content" onClose={() => setOpen(false)}>
      <p className={styles.dialogDescription}>Pick up a conversation where you left off. Your sources and chats are saved on this Mac.</p>
      <label className={styles.field}><span className={styles.inline}><Search size={14} /> Find a source</span><input type="search" aria-label="Search saved content" className={styles.input} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search titles or platforms…" /></label>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {loading ? <p className={styles.thinking} role="status"><Loader2 size={16} className={styles.spinner} /> Loading your library…</p> : <div className={styles.list}>{matching.map(item => <button type="button" key={item.analysisId} className={styles.listItem} aria-current={item.analysisId === currentId ? "true" : undefined} disabled={busy} onClick={() => void select(item.analysisId)}><FileText size={18} className={styles.listIcon} /><div><strong>{item.title}</strong><small>{item.platform}{item.analysisId === currentId ? " · Current conversation" : " · Saved source"}</small></div>{item.analysisId === currentId ? <Check size={16} className={styles.listIcon} /> : <ArrowUpRight size={16} className={styles.listIcon} />}</button>)}{!matching.length && <p className={styles.empty}>{query ? "No sources match that search." : "Your first completed source will appear here."}</p>}</div>}
      {busy && <p className={styles.thinking} role="status"><Loader2 size={16} className={styles.spinner} /> Opening conversation…</p>}
    </StudioDialog>}
  </>;
}
