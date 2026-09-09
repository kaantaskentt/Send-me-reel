"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import styles from "./studio.module.css";

/** Native modality makes the background inert; explicit Tab wrapping also keeps
 * focus inside the task when a browser would otherwise focus its own chrome. */
export default function StudioDialog({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); previous?.focus(); };
  }, []);
  return <dialog ref={dialog} aria-labelledby={headingId} className={`${styles.dialog} ${wide ? styles.dialogWide : ""}`} onKeyDown={event => {
    if (event.key !== "Tab") return;
    const elements = [...event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, [tabindex="0"]')].filter(element => element.getClientRects().length > 0 && !element.hidden);
    const first = elements[0]; const last = elements.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }} onCancel={event => { event.preventDefault(); close.current(); }} onClick={event => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close.current(); } }}>
    <header className={styles.dialogHeader}><h2 id={headingId}>{title}</h2><button type="button" className={styles.iconButton} aria-label={`Close ${title.toLowerCase()}`} onClick={onClose}><X size={18} /></button></header>
    <div className={styles.dialogBody}>{children}</div>
  </dialog>;
}
