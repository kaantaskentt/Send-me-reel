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
  if (blocks.length === 1 && text.length > 550 && !text.includes("```")) {
    const sentences = [...new Intl.Segmenter("en", { granularity: "sentence" }).segment(text)];
    const first = sentences.slice(0, 2).map(part => part.segment).join("");
    if (first.length < text.length && first.length <= 420) preview = first;
    else if (sentences[0]?.segment.length < text.length && sentences[0].segment.length <= 420) preview = sentences[0].segment;
  }
  const collapsible = text.length > 550 && preview.length < text.length && !preview.includes("```");
  return <div><div id={id}><Markdown allowedUrls={allowedUrls}>{collapsible && !expanded ? preview : text}</Markdown></div>{collapsible && <button type="button" className={styles.textButton} aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)}>{expanded ? "Show less" : "Read full answer"}</button>}</div>;
}
