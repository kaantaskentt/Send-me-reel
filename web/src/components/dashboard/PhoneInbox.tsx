"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Check, Download, Loader2, RefreshCw, Smartphone, X } from "lucide-react";
import StudioDialog from "./StudioDialog";
import styles from "./studio.module.css";

type PhoneStatus = {
  paired: boolean; configured: boolean; workerOnline: boolean;
  importedTotal: number; newCount: number; pendingCount: number | null;
  failedCount: number | null; hasMore: boolean; lastSyncedAt: string | null;
  lastError: string | null;
};
type ShareStatus = { available: boolean; shortcutAvailable?: boolean; lastSyncedAt: string | null; items: { id: string; url: string; receivedAt: string; source: "iphone" }[]; error?: string | null };

export default function PhoneInbox() {
  const [status, setStatus] = useState<PhoneStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [share, setShare] = useState<ShareStatus | null>(null);
  const imported = useRef<number | null>(null);

  const accept = useCallback((data: PhoneStatus) => {
    setStatus(data);
    if (imported.current !== null && data.importedTotal !== imported.current) {
      window.dispatchEvent(new Event("contextdrop:library-changed"));
    }
    imported.current = data.importedTotal;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function check() {
      await Promise.allSettled([ (async () => { try {
        const response = await fetch("/api/local/phone", { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]) });
        if (!response.ok) throw new Error("Could not check your phone inbox.");
        const data = await response.json();
        if (!controller.signal.aborted) accept(data);
      } catch { /* The setup dialog offers a manual retry without interrupting chat. */ } })(), (async () => {
        try {
          const response = await fetch("/api/local/inbox", { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]) });
          if (response.ok && !controller.signal.aborted) setShare(await response.json());
        } catch { /* Manual sync remains available. */ }
      })() ]);
      if (!controller.signal.aborted) timer = setTimeout(check, 15_000);
    }
    void check();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [accept]);

  async function updateShare(body: { action: "sync" } | { action: "dismiss"; id: string }) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/local/inbox", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(15_000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not check your iPhone inbox.");
      setShare(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not check your iPhone inbox."); }
    finally { setBusy(false); }
  }

  function chooseLink(item: NonNullable<ShareStatus["items"]>[number]) {
    const event = new CustomEvent("contextdrop:inbox-link", { detail: { id: item.id, url: item.url }, cancelable: true });
    if (window.dispatchEvent(event)) { setError("Finish the current capture before opening another link."); return; }
    setOpen(false); setLink("");
  }

  async function update(body: { dashboardLink: string } | { action: "sync" | "disconnect" }) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/local/phone", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(40_000) });
      const data = await response.json();
      if (typeof data.paired === "boolean") { accept(data); if (data.paired) setLink(""); }
      if (!response.ok) throw new Error(data.error || "Could not update the phone inbox.");
      window.dispatchEvent(new Event("contextdrop:library-changed"));
    } catch (e) { setError(e instanceof Error && e.name !== "TimeoutError" ? e.message : "The inbox is taking longer. Check sync again before retrying pairing."); }
    finally { setBusy(false); }
  }

  return <>
    <button type="button" className={styles.toolbarButton} aria-label="Phone inbox" onClick={() => setOpen(true)}><Smartphone size={15} />iPhone{!!share?.items.length && <span className={styles.inboxBadge}>{share.items.length}</span>}{status?.paired && <Check size={12} />}</button>
    {open && <StudioDialog title="Send from your iPhone" onClose={() => { setOpen(false); setLink(""); }}>
      <p className={styles.dialogDescription}>Instagram → Share → Send to ContextDrop.</p>
      {!!share?.items.length && <div className={styles.shareItems} aria-label="Links from your iPhone">{share.items.map(item => <div key={item.id} className={styles.shareItem}><button type="button" className={styles.shareLink} onClick={() => chooseLink(item)}><span><strong>{new URL(item.url).hostname.replace(/^www\./, "")}</strong><small>{item.url}</small></span><ArrowRight size={16} /></button><button type="button" className={styles.iconButton} disabled={busy} aria-label={`Dismiss ${item.url}`} onClick={() => void updateShare({ action: "dismiss", id: item.id })}><X size={14} /></button></div>)}</div>}
      {!share?.items.length && <p className={styles.empty}>Links from your phone will appear here.</p>}
      <div className={styles.inline}>
        {share?.shortcutAvailable && <a className={styles.primaryButton} href="/api/local/inbox/shortcut" download="Send to ContextDrop.shortcut"><Download size={15} />Get iPhone shortcut</a>}
        <button type="button" className={styles.secondaryButton} disabled={busy} onClick={() => void updateShare({ action: "sync" })}>{busy ? <Loader2 size={14} className={styles.spinner} /> : <RefreshCw size={14} />}Check inbox</button>
      </div>
      <p className={styles.evidenceNote}>{share?.shortcutAvailable ? "Open the shortcut on this Mac and choose Add Shortcut. With Shortcuts iCloud Sync on, it appears on your iPhone." : "Set up the iPhone share shortcut once using the steps below."}</p>
      {share?.available === false && <p role="status" className={styles.evidenceNote}>Enable iCloud Drive and Shortcuts sync on both devices to receive links.</p>}
      {share?.error && <p role="alert" className={styles.error}>{share.error}</p>}
      <details className={styles.taskChecks}><summary>Setup help and Telegram</summary>
      {!share?.shortcutAvailable && <ol className={styles.phoneSteps}>
        <li>In Apple Shortcuts, create <strong>Send to ContextDrop</strong>. Turn on <strong>Show in Share Sheet</strong> and accept URLs.</li>
        <li>Add <strong>Get Text from Input</strong>, using Shortcut Input.</li>
        <li>Add <strong>Set Name</strong> for that text. Use a unique name ending in <code>.txt</code> each time, such as a formatted current date.</li>
        <li>Add <strong>Save File</strong> to <strong>iCloud Drive → Shortcuts → ContextDrop → Inbox</strong>. Turn off Ask Where to Save and Overwrite If File Exists.</li>
      </ol>}
      <p className={styles.evidenceNote}>Use the same Apple Account on both devices. In Instagram, choose Share, then More, then Send to ContextDrop. If it is missing, copy the link and share it from Safari. Keep this Mac’s launcher open; iCloud delivery can take a moment. Opening a received link lets you review it before analysis.</p>
      <h3 className={styles.phoneAlternative}>Or use Telegram</h3>
      {!status?.paired ? <>
        <p className={styles.dialogDescription}>Save a link in Telegram. Find it here on your Mac.</p>
        <ol className={styles.phoneSteps}>
          <li><a href="https://t.me/contextdrop2027bot" target="_blank" rel="noreferrer">Open the ContextDrop bot <ArrowUpRight size={13} /></a></li>
          <li>Send <code>/dashboard</code> to the bot.</li>
          <li>Copy its personal link into the box below.</li>
        </ol>
        <form onSubmit={event => { event.preventDefault(); void update({ dashboardLink: link.trim() }); }}>
          <label className={styles.field}>Your personal dashboard link<input type="password" aria-label="Your personal dashboard link" autoComplete="off" spellCheck={false} className={styles.input} maxLength={8192} placeholder="Paste the link from Telegram" value={link} onChange={event => setLink(event.target.value)} /></label>
          <button className={styles.primaryButton} disabled={busy || !link.trim() || status?.configured === false}>{busy ? <Loader2 size={15} className={styles.spinner} /> : <Smartphone size={15} />}Connect my Telegram</button>
        </form>
        <p className={styles.evidenceNote}>Paste this private link only here. It pairs your account with this Mac.</p>
        {status?.configured === false && <p className={styles.evidenceNote}>Start the personal launcher with the existing Telegram database configuration.</p>}
      </> : <>
        <p className={styles.dialogDescription}>Instagram → Copy link → paste it in Telegram.</p>
        <a href="https://t.me/contextdrop2027bot" target="_blank" rel="noreferrer" className={styles.primaryButton}>Open Telegram <ArrowUpRight size={15} /></a>
        <ul className={styles.readinessList}>
          <li><span>Telegram account</span><span><Check size={14} />Paired</span></li>
          <li><span>Mac sync</span><span>{status.workerOnline ? "Running" : "Launcher needed"}</span></li>
          <li><span>In your library</span><span>{status.importedTotal}</span></li>
          {!!status.pendingCount && <li><span>Being analyzed</span><span>{status.pendingCount}</span></li>}
          {!!status.failedCount && <li><span>Could not be captured</span><span>{status.failedCount}</span></li>}
        </ul>
        <p className={styles.evidenceNote}>{status.lastSyncedAt ? `Last checked ${new Date(status.lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. ` : ""}New content appears in Library without changing this conversation.{status.hasMore ? " Older saves are still syncing." : ""}</p>
        <div className={styles.inline}><button type="button" className={styles.secondaryButton} disabled={busy} onClick={() => void update({ action: "sync" })}>{busy ? <Loader2 size={14} className={styles.spinner} /> : <RefreshCw size={14} />}Sync now</button><button type="button" className={styles.textButton} disabled={busy} onClick={() => void update({ action: "disconnect" })}>Disconnect</button></div>
        <p className={styles.evidenceNote}>Keep the launcher open. Telegram must finish analyzing a link before it can arrive here; some social links need an uploaded file instead.</p>
      </>}
      {status?.lastError && <p role="alert" className={styles.error}>{status.lastError}</p>}
      </details>
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </StudioDialog>}
  </>;
}
