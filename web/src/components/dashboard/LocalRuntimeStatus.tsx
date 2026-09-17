"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2, Monitor, MonitorCheck, RefreshCw } from "lucide-react";
import StudioDialog from "./StudioDialog";
import type { LocalComputerSetup } from "@/lib/local-computer";
import styles from "./studio.module.css";

type Health = { status: string; readers: { gemini: boolean; frames: boolean; pages: boolean }; chat: { configured: boolean }; companion: { connected: boolean; terminal: boolean; browser: boolean; browserConnection?: 'not_connected' | 'awaiting_selection' | 'selected'; execution: string | null }; issues: string[] };

export default function LocalRuntimeStatus() {
  const [health, setHealth] = useState<Health | null>(null);
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [connectingChrome, setConnectingChrome] = useState(false);
  const [chromeUrl, setChromeUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [computer, setComputer] = useState<LocalComputerSetup | null>(null);
  const [computerError, setComputerError] = useState('');
  const [openingHelper, setOpeningHelper] = useState(false);
  const [helperMessage, setHelperMessage] = useState('');
  const checkComputer = useCallback(async () => {
    try {
      const response = await fetch('/api/local/computer/setup', { cache: 'no-store', signal: AbortSignal.timeout(30_000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not check Mac app control.');
      setComputer(data); setComputerError('');
      if (data.available) setHelperMessage('');
    } catch (e) { setComputer(null); setComputerError(e instanceof Error ? e.message : 'Could not check Mac app control.'); }
  }, []);
  async function openHelper() {
    setOpeningHelper(true); setHelperMessage('');
    try {
      const response = await fetch('/api/local/computer/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'open_helper' }), signal: AbortSignal.timeout(30_000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not open the Mac helper.');
      setHelperMessage('Helper opened. Allow Screen Recording and Accessibility, then check again.'); setComputerError('');
    } catch (e) { setComputerError(e instanceof Error ? e.message : 'Could not open the Mac helper.'); }
    finally { setOpeningHelper(false); }
  }
  async function connectChrome() {
    setConnectingChrome(true); setCopied(false);
    try {
      const response = await fetch('/api/local/browser/connect', { method: 'POST', signal: AbortSignal.timeout(10_000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not prepare your Chrome connection.');
      setChromeUrl(data.setupUrl); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not prepare your Chrome connection.'); }
    finally { setConnectingChrome(false); }
  }
  async function copyChromeUrl() {
    try { await navigator.clipboard.writeText(chromeUrl); setCopied(true); }
    catch { setError('Select the connection link below and copy it into Chrome.'); }
  }
  const check = useCallback(async (includeComputer = false) => {
    setChecking(true);
    try {
      const response = await fetch("/api/local/health", { cache: "no-store", signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error("Could not check the local worker. Restart the personal launcher.");
      setHealth(await response.json()); setError("");
      if (includeComputer) await checkComputer();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not check the local worker."); }
    finally { setChecking(false); }
  }, [checkComputer]);
  useEffect(() => { void check(); }, [check]);
  return <>
    <button type="button" aria-label={!error && health?.companion.connected ? "Mac connected" : "Check setup"} title="Check browser, coding and Mac app access" className={styles.toolbarButton} onClick={() => { setOpen(true); void check(true); }}>{checking ? <Loader2 size={17} className={styles.spinner} /> : !error && health?.companion.connected ? <MonitorCheck size={17} /> : <Monitor size={17} />}<span className={styles.runtimeLabel}>{!error && health?.companion.connected ? "Mac connected" : "Check setup"}</span></button>
    {open && <StudioDialog title="Your Mac connection" onClose={() => setOpen(false)}>
      <p className={styles.dialogDescription}>Connect the tools you want ContextDrop to use.</p>
      {health && <ul className={styles.readinessList}>{[{ label: "Chat about your content", ready: health.chat.configured }, { label: "Read video with Gemini", ready: health.readers.gemini }, { label: "Mac worker", ready: health.companion.connected }, { label: "Build with a coding app", ready: health.companion.terminal }].map(item => <li key={item.label}><span>{item.label}</span><span>{item.ready ? <><Check size={14} />{item.label === "Mac worker" ? "Connected" : "Configured"}</> : "Not available"}</span></li>)}<li><span>Your Chrome</span><span>{health.companion.browserConnection === 'selected' ? 'Selected' : 'Connect first'}</span></li></ul>}
      {health?.companion.connected && health.companion.browser && <>
        {health.companion.browserConnection === 'selected' ? <p className={styles.evidenceNote}>Chrome is selected. Keep its connection tab open. We check the connection when a task starts.</p> : <p className={styles.evidenceNote}>Choose the Chrome profile where you are already signed in.</p>}
        {!chromeUrl ? <button type="button" className={styles.primaryButton} disabled={connectingChrome} onClick={() => void connectChrome()}>{connectingChrome ? <Loader2 size={15} className={styles.spinner} /> : <Monitor size={15} />}Connect Chrome</button> : <>
          <button type="button" className={styles.primaryButton} onClick={() => void copyChromeUrl()}><Copy size={15} />{copied ? 'Copied' : 'Copy Chrome link'}</button>
          <a className={styles.secondaryButton} href={chromeUrl} target="_blank" rel="noreferrer">Open connection page</a>
          <p className={styles.evidenceNote}>Use your usual Chrome profile. If you are in another browser, paste the copied link in Chrome. Click <strong>Connect this Chrome</strong> there, then check again below.</p>
          <details><summary className={styles.evidenceNote}>Connection link</summary><input aria-label="Chrome connection link" value={chromeUrl} readOnly onFocus={event => event.currentTarget.select()} style={{ width: '100%', fontSize: 13, padding: 10, marginBottom: 16 }} /></details>
        </>}
      </>}
      {health?.companion.connected && <section className={styles.setupSection} aria-label="Mac app control">
        <h3>Use my Mac apps <span>{computer?.available ? 'Ready' : checking ? 'Checking…' : 'Set up'}</span></h3>
        <p>{computer?.available ? 'Choose an app. Review each click before it runs.' : 'Allow Peekaboo to see your screen and click for you.'}</p>
        {computer && <ul className={styles.readinessList}>
          <li><span>Screen Recording</span><span>{computer.permissions.screenRecording ? <><Check size={14} />Allowed</> : 'Needed'}</span></li>
          <li><span>Accessibility</span><span>{computer.permissions.accessibility ? <><Check size={14} />Allowed</> : 'Needed'}</span></li>
        </ul>}
        {computer && !computer.available && <p className={styles.evidenceNote}>{computer.message}</p>}
        {!computer?.available && <button type="button" className={styles.secondaryButton} disabled={openingHelper || checking || computer?.status === 'unsupported'} onClick={() => void openHelper()}>{openingHelper ? <Loader2 size={15} className={styles.spinner} /> : <Monitor size={15} />}Open Mac helper</button>}
        {helperMessage && <p role="status" className={styles.evidenceNote}>{helperMessage}</p>}
        {computerError && <p role="alert" className={styles.error}>{computerError}</p>}
        <p className={styles.evidenceNote}>The selected app’s screenshots go to your AI provider. You can stop at any time.</p>
      </section>}
      {!!health?.issues?.length && <p className={styles.evidenceNote}>{health.issues.join(" ")}</p>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <button type="button" className={styles.secondaryButton} disabled={checking} onClick={() => void check(true)}><RefreshCw size={14} />Check again</button>
      <p className={styles.evidenceNote}>Keep ContextDrop running. Chrome may still ask you to sign in or complete a CAPTCHA.</p>
    </StudioDialog>}
  </>;
}
