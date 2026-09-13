"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Monitor, RefreshCw } from "lucide-react";
import StudioDialog from "./StudioDialog";
import styles from "./studio.module.css";

type Health = { status: string; readers: { gemini: boolean; frames: boolean; pages: boolean }; chat: { configured: boolean }; companion: { connected: boolean; terminal: boolean; browser: boolean; execution: string | null }; issues: string[] };

export default function LocalRuntimeStatus() {
  const [health, setHealth] = useState<Health | null>(null);
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  async function check() {
    setChecking(true);
    try {
      const response = await fetch("/api/local/health", { cache: "no-store", signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error("Could not check the local worker. Restart the personal launcher.");
      setHealth(await response.json()); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not check the local worker."); }
    finally { setChecking(false); }
  }
  useEffect(() => { void check(); }, []);
  return <>
    <button type="button" className={styles.toolbarButton} onClick={() => { setOpen(true); void check(); }}>{checking ? <Loader2 size={14} className={styles.spinner} /> : <Monitor size={15} />}{!error && health?.status === "ready" ? "Mac ready" : "Check setup"}</button>
    {open && <StudioDialog title="Your Mac connection" onClose={() => setOpen(false)}>
      <p className={styles.dialogDescription}>Your reader and computer worker run together on this Mac.</p>
      {health && <ul className={styles.readinessList}>{[{ label: "Content chat", ready: health.chat.configured }, { label: "Gemini video reader", ready: health.readers.gemini }, { label: "Mac companion", ready: health.companion.connected }, { label: "Browser actions", ready: health.companion.browser }, { label: "Coding app", ready: health.companion.terminal }].map(item => <li key={item.label}><span>{item.label}</span><span>{item.ready ? <><Check size={14} />{item.label === "Mac companion" ? "Connected" : "Configured"}</> : "Not available"}</span></li>)}</ul>}
      {!!health?.issues?.length && <p className={styles.evidenceNote}>{health.issues.join(" ")}</p>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <button type="button" className={styles.secondaryButton} disabled={checking} onClick={() => void check()}><RefreshCw size={14} />Check again</button>
      <p className={styles.evidenceNote}>Keep the launcher open to receive links and run tasks. It keeps your Mac awake. Watch tasks here; phone screen streaming is not connected.</p>
    </StudioDialog>}
  </>;
}
