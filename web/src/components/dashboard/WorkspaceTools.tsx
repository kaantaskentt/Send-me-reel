"use client";

import { useEffect, useState } from "react";
import { Bookmark, Download, Folder, Loader2, MessageCircle } from "lucide-react";
import StudioDialog from "./StudioDialog";
import styles from "./studio.module.css";

type Profile = { name: string; goal: string; preferences: string; harness: "claude" | "codex" };
type Workflow = { id: string; title: string; instructions: string; sourceTitles: string[]; status: "draft"; createdAt: string };
type Workspace = { profile: Profile; workflows: Workflow[] };
const emptyProfile: Profile = { name: "", goal: "", preferences: "", harness: "claude" };

export default function WorkspaceTools({ canUseWorkflow = false }: { canUseWorkflow?: boolean }) {
  const [panel, setPanel] = useState<"project" | "workflows" | null>(null);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!panel) return;
    const controller = new AbortController(); setLoading(true); setLoaded(false); setError(""); setSaved(false);
    fetch("/api/local/workspace", { cache: "no-store", signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error("Could not load your workspace. Please try again."); return response.json() as Promise<Workspace>; })
      .then(data => { setProfile(data.profile); setWorkflows(data.workflows); setLoaded(true); })
      .catch(error => { if (!controller.signal.aborted) setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [panel]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setSaved(false);
    try {
      const response = await fetch("/api/local/workspace", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not save your project.");
      setProfile(data.profile); setSaved(true);
    } catch (error) { setError(error instanceof Error ? error.message : "Could not save your project."); }
    finally { setSaving(false); }
  }
  function applyWorkflow(workflow: Workflow) {
    window.dispatchEvent(new CustomEvent("contextdrop:workflow", { detail: { id: workflow.id, title: workflow.title, instructions: workflow.instructions } }));
    setPanel(null);
  }
  return <>
    <button type="button" className={styles.toolbarButton} onClick={() => setPanel("project")}><Folder size={16} /> My project</button>
    <button type="button" className={styles.toolbarButton} onClick={() => setPanel("workflows")}><Bookmark size={16} /> Workflows</button>
    {panel && <StudioDialog title={panel === "project" ? "My project" : "Saved workflows"} onClose={() => setPanel(null)}>
      {loading ? <p className={styles.thinking} role="status"><Loader2 size={16} className={styles.spinner} /> Loading your workspace…</p> : !loaded ? null : panel === "project" ? <>
        <p className={styles.dialogDescription}>Tell ContextDrop what you’re working on. Future replies can connect useful ideas to your project.</p>
        <form onSubmit={save}>
          <label className={styles.field}>Project name<input className={styles.input} value={profile.name} maxLength={80} placeholder="My next project" onChange={event => { setProfile({ ...profile, name: event.target.value }); setSaved(false); }} /></label>
          <label className={styles.field}>What are you trying to achieve?<textarea className={styles.textarea} rows={3} value={profile.goal} maxLength={2000} placeholder="I’m building an AI video editor for short clips…" onChange={event => { setProfile({ ...profile, goal: event.target.value }); setSaved(false); }} /></label>
          <label className={styles.field}>Anything to keep in mind? <span className={styles.visuallyHidden}>Preferences</span><textarea className={styles.textarea} rows={2} value={profile.preferences} maxLength={2000} placeholder="My experience, budget, tools, or preferred style…" onChange={event => { setProfile({ ...profile, preferences: event.target.value }); setSaved(false); }} /></label>
          <label className={styles.field}>Preferred coding app<select className={styles.select} value={profile.harness} onChange={event => { setProfile({ ...profile, harness: event.target.value as Profile["harness"] }); setSaved(false); }}><option value="claude">Claude Code</option><option value="codex">Codex</option></select></label>
          {saved && <p role="status" className={styles.success}>Project saved. New replies will use this context.</p>}
          <div className={styles.dialogFooter}><button type="button" className={styles.secondaryButton} onClick={() => setPanel(null)}>Done</button><button disabled={saving} className={styles.primaryButton}>{saving && <Loader2 size={15} className={styles.spinner} />}{saving ? "Saving…" : "Save project"}</button></div>
        </form>
      </> : <>
        <p className={styles.dialogDescription}>Keep a useful answer as a recipe for next time. Saved workflows are drafts; actions still start with a reviewed plan.</p>
        {!canUseWorkflow && <p className={styles.dialogDescription}>Open or finish reading a source to use a workflow in its conversation.</p>}
        <div className={styles.list}>{workflows.map(workflow => <article key={workflow.id} className={styles.workflowCard}><h3>{workflow.title}</h3><p>{workflow.sourceTitles.join(" · ") || "Saved from a conversation"}</p><details className={styles.captureOptions}><summary>Read workflow</summary><p style={{ whiteSpace: "pre-wrap" }}>{workflow.instructions}</p></details><div className={styles.inline}><button type="button" className={styles.secondaryButton} disabled={!canUseWorkflow} onClick={() => applyWorkflow(workflow)}><MessageCircle size={14} /> Use in chat</button><a className={styles.textButton} href={`/api/local/workflows/${encodeURIComponent(workflow.id)}/export`} download><Download size={14} /> Download skill</a></div></article>)}</div>
        {!workflows.length && <p className={styles.empty}>When an answer is worth keeping, choose “Save workflow” below it. You can reuse it with another source.</p>}
      </>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </StudioDialog>}
  </>;
}
