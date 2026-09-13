"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";
import type { LibraryItem } from "@/lib/local-library";
import LocalLibrary from "./LocalLibrary";
import styles from "./studio.module.css";

export default function PersonalSources({ currentId }: { currentId?: string }) {
  const router = useRouter();
  const [sources, setSources] = useState<LibraryItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    window.addEventListener("contextdrop:library-changed", refresh);
    return () => window.removeEventListener("contextdrop:library-changed", refresh);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/local/library", { cache: "no-store", signal: controller.signal }).then(async response => { if (!response.ok) throw new Error("Could not read your library."); return response.json(); }).then(data => { if (!controller.signal.aborted) { setSources(Array.isArray(data.items) ? data.items : []); setError(""); } }).catch(() => { if (!controller.signal.aborted) setError("Open Library to retry loading your sources."); });
    return () => controller.abort();
  }, [currentId, revision]);
  async function select(id: string) {
    if (busy || id === currentId) return;
    setBusy(id); setError("");
    try {
      const response = await fetch("/api/local/library", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ analysisId: id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not open this source.");
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not open this source."); }
    finally { setBusy(null); }
  }
  return <div className={styles.personalSources}>
    <LocalLibrary currentId={currentId} />
    <nav aria-label="Recent sources" className={styles.recentSources}>{sources.slice(0, 12).map(source => <button key={source.analysisId} type="button" disabled={busy !== null} aria-current={source.analysisId === currentId ? "page" : undefined} onClick={() => void select(source.analysisId)}>{busy === source.analysisId ? <Loader2 size={16} className={styles.spinner} /> : <FileText size={16} />}<span><strong>{source.title}</strong><small>{source.platform}</small></span></button>)}</nav>
    {error && <p role="alert" className={styles.railNote}>{error}</p>}
  </div>;
}
