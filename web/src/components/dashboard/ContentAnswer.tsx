"use client";

import { useId, useState } from "react";
import Markdown from "@/components/chat/Markdown";
import styles from "./studio.module.css";

/** Keep the original answer intact. Older long replies can be opened in full. */
export default function ContentAnswer({ text, allowedUrls = [] }: { text: string; allowedUrls?: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const blocks = text.split(/\n\s*\n/);
  let preview = blocks[0];
  if (preview.length < 150 && blocks[1]) preview += `\n\n${blocks[1]}`;
  const collapsible = text.length > 900 && preview.length < text.length && !preview.includes("```");
  return <div><div id={id}><Markdown allowedUrls={allowedUrls}>{collapsible && !expanded ? preview : text}</Markdown></div>{collapsible && <button type="button" className={styles.textButton} aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)}>{expanded ? "Show less" : "Read full answer"}</button>}</div>;
}
