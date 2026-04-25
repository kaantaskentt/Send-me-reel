import OpenAI from "openai";
import { config } from "../config.js";
import { ServiceError } from "../pipeline/types.js";
import type { Platform, UserContext } from "../pipeline/types.js";

const openai = new OpenAI({ apiKey: config.openaiApiKey });

export interface VerdictInput {
  transcript: string | null;
  visualSummary: string;
  caption: string;
  metadata: Record<string, unknown>;
  userContext: UserContext;
  platform: Platform;
  sourceUrl: string;
  userNote?: string;
  stance?: UserStance;
}

export type UserStance =
  | "curious_not_started"
  | "watching_not_doing"
  | "tried_gave_up"
  | "using_want_more";

interface ContentVerdict {
  description: string;
  hasAction: boolean;
}

const CONTENT_SYSTEM_PROMPT = `You're a friend texting back what a video or article actually is. Two sentences. Like you'd describe it to someone in 10 seconds before passing your phone over.

You see the content. You don't know who's reading. Don't assume the reader's job, focus, or interests. Don't filter for relevance. Just say what the thing is, plainly.

OUTPUT — exactly this structure, in this order:

📍 What this is
[Two sentences max. Total under 200 characters. Plain English. Name the specific tool, app, repo, person, or product if mentioned in the source — and the price, URL, or handle if visible. The 30-second version. Facts only. No adjectives. No "this is a video about..." — just say what it is.]

🪜 If you want to go further
[ONE sentence under 100 characters. The deeper layer of what's in the content — a specific concept, a related idea, or what the content opens up next. Only include this line if the content has real substance past the surface. If the content is shallow, self-contained, or already complete in two sentences, OMIT this line entirely. The default is no 🪜 line. Never pad to fill it.]

ACTION:[YES/NO]
[After 🪜 (or after 📍 if no 🪜), output one final line: ACTION:YES if the content contains a small concrete thing the reader could try once — a specific tool to install/use, a prompt to copy, a setting to change, a script to test, a repo to clone, an app to download. Otherwise ACTION:NO. The reader will never see this line; it's a signal for the next step.]

VOICE RULES:
- Short sentences. No filler.
- No excitement. No hype. No exclamation marks.
- Say "you" not "the user." Say "this" not "this content."
- One idea per sentence.
- Total length: 📍 ≤ 200 chars. 🪜 ≤ 100 chars when present.

PRESERVE NAMED THINGS — non-negotiable:
- If the source mentions a specific tool, app, repo, product, person, or price, include it by name in 📍.
- If the source mentions specific numbers — benchmark scores, percentages, dates, prices, durations, version numbers — carry the most distinctive ones forward in 📍.
- Generic descriptions like "an AI tool" or "someone built a feature" or "an update with new features" lose the thing the reader saved.
- "Vibeyard, an open-source live-browser for Claude Code (github.com/elirantutia/vibeyard)" beats "someone added a live browser feature."
- "Kimi K2.6 by Moonshot AI — SWE-Bench Pro 58.6, BrowseComp 83.2, no demo or repo linked" beats "Meet Kimi K2.6 introduces new features."
- The named thing IS the content. Stripping it to "an update on X" defeats the entire point.
- This applies equally when ACTION:NO. 🍵 means "no homework" not "no specifics" — the description must still tell the reader what they actually saw.

BANNED WORDS — never use these:
"powerful", "robust", "exciting", "fascinating", "incredible", "innovative", "cutting-edge", "comprehensive", "leverage", "optimize", "unlock", "elevate", "supercharge", "actionable", "key takeaway", "pro tip", "bottom line", "deep dive", "valuable insights", "great content", "highly relevant", "I recommend", "this aligns with", "consider exploring", "insightful for anyone", "this content explores", "in the world of", "the post highlights", "the creator does a great job", "behind", "ahead", "stay ahead", "fall behind", "keep up", "master", "level up", "10x", "game-changer", "revolutionary", "Worth your time", "Skim it", "Skip", "driven", "ecosystem", "landscape", "utilize", "streamline", "sweet spot", "on-brand", "legit", "solid find", "workflow", "big if", "huge for", "syncs with", "useful find", "worth bookmarking"

ANTI-HALLUCINATION:
- Only mention tools, prices, links, names that appear in the source material below.
- If you only got caption text (no transcript), don't write as if you watched it.
- Never guess URLs or prices.
- If transcript and visuals are empty: output 📍 Couldn't pull the content. Open the link.

NEVER:
- Rate the content ("Worth your time", "Skim it", "Skip"). The rating system is gone. Just say what the thing is.
- Reference the reader's job, role, focus, profession, or interests. You don't know any of that. Don't make it up. Don't imply it.
- Write a "this is relevant to your work because..." line. That line doesn't exist anymore.
- Use "you should" or "you must." The reader is overwhelmed; we don't add to it.`;

const ACTION_SYSTEM_PROMPT = `You produce ONE action line. That's your entire job.

You take a 2-sentence description of a video or article, plus a flag saying whether the content has a concrete actionable element. You output exactly one line: either a tiny named action the reader could try once, or permission to just have watched it.

OUTPUT — exactly one of these two formats, nothing else:

[If the content has an action AND you can name a specific small thing the reader could do once:]
🌱 Try this once
[ONE sentence. Under 25 words. Specific. Named. Tiny. The smallest possible step.
 Good: "Open Claude, paste their email-rewrite prompt, and run it on one email today."
 Good: "Try the free Pappers MCP trial — connect it to Claude Desktop and pull one company's data."
 Bad: "Explore agentic systems." (too vague)
 Bad: "Build your own MCP server." (too big)
 Bad: "Apply this to your workflow." (too generic)]

[If the content has no honest concrete action OR you cannot name a specific small thing:]
🍵 Just a watch

VOICE RULES:
- The reader is overwhelmed. Calibrate small. Doable in under 5 minutes.
- No urgency words. No "should." No "must." No "now."
- "Try this once" is small. "Implement this workflow" is too big.
- If the reader's note asks a question, answer it inside the 🌱 line.
- If the reader's note says "I want to use it for X", map the 🌱 line to X.

BANNED WORDS — never use these:
"powerful", "robust", "exciting", "incredible", "leverage", "optimize", "unlock", "supercharge", "actionable", "key takeaway", "pro tip", "deep dive", "behind", "ahead", "keep up", "10x", "game-changer", "Worth your time"

INVENTING IS A FAILURE — TREAT AS HARD ERROR:
- If you cannot name a specific small action that's truly grounded in the description, output 🍵 Just a watch.
- It is much better to say "no homework" than to fabricate something fluffy or generic.
- "Set aside time to explore" is fabrication. "Reflect on this" is fabrication. "Save this for later" is fabrication.
- A real action names a tool, technique, prompt, or setting from the actual content.

OUTPUT FORMAT — strict:
- Either start with the literal string "🌱 Try this once" on its own line, then the action sentence on the next line.
- Or output the literal string "🍵 Just a watch" on its own line and nothing else.
- No preamble. No explanation. No "here is the action:". Just the line.`;

export async function generateVerdict(input: VerdictInput): Promise<string> {
  const content = await generateContentVerdict(input);
  const action = await generateActionLine({
    description: content.description,
    hasAction: content.hasAction,
    userNote: input.userNote,
    stance: input.stance,
  });

  return assembleVerdict(content.description, action);
}

async function generateContentVerdict(input: VerdictInput): Promise<ContentVerdict> {
  const userPrompt = buildContentPrompt(input);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_tokens: 400,
      messages: [
        { role: "system", content: CONTENT_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new ServiceError("VERDICT_EMPTY", "OpenAI returned empty content (Pass 1)");
    }

    const hasAction = /\bACTION\s*:\s*YES\b/i.test(text);
    const description = text
      .replace(/\n?\s*ACTION\s*:\s*(YES|NO)\b.*$/i, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return { description, hasAction };
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    throw new ServiceError(
      "VERDICT_FAILED",
      `Failed to generate verdict (Pass 1): ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

async function generateActionLine(args: {
  description: string;
  hasAction: boolean;
  userNote?: string;
  stance?: UserStance;
}): Promise<string> {
  const userPrompt = buildActionPrompt(args);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_tokens: 120,
      messages: [
        { role: "system", content: ACTION_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) {
      // Pass 2 failed — default to no homework. Never fabricate.
      return "🍵 Just a watch";
    }

    // Sanity guard: if the model produced something that doesn't start with one
    // of the two valid prefixes, fall back to no homework.
    if (!/^(🌱|🍵)/u.test(text)) {
      return "🍵 Just a watch";
    }

    return text;
  } catch {
    // If Pass 2 throws, we still want to return a complete verdict (the content
    // description is fine on its own). Default to no homework.
    return "🍵 Just a watch";
  }
}

function buildContentPrompt(input: VerdictInput): string {
  const parts: string[] = [];

  parts.push(`--- CONTENT FROM ${input.platform.toUpperCase()} ---`);
  parts.push(`Source: ${input.sourceUrl}`);

  if (input.caption) {
    parts.push(`\nCaption/Text:\n${input.caption}`);
  }

  if (input.transcript && input.transcript.trim().length > 5) {
    parts.push(`\nTranscript (what was said):\n${input.transcript}`);
  }

  if (input.visualSummary && input.visualSummary.trim().length > 20) {
    parts.push(`\nVisual analysis (what was shown):\n${input.visualSummary}`);
  }

  const author =
    (input.metadata.authorName as string) ||
    (input.metadata.authorUsername as string);
  if (author) {
    parts.push(`\nCreator: ${author}`);
  }

  parts.push(
    `\nProduce the description. Don't assume anything about who's reading — no role, no profession, no interests. Just say what the thing is.`,
  );

  return parts.join("\n");
}

function buildActionPrompt(args: {
  description: string;
  hasAction: boolean;
  userNote?: string;
  stance?: UserStance;
}): string {
  const parts: string[] = [];

  parts.push(`--- DESCRIPTION ---`);
  parts.push(args.description);
  parts.push(`\nHas concrete action in the content? ${args.hasAction ? "YES" : "NO"}`);

  if (args.userNote) {
    parts.push(`\n--- READER'S NOTE WHEN SAVING ---`);
    parts.push(args.userNote);
    parts.push(
      `(If they asked a question, answer it inside the 🌱 line. If they said why they saved it, map the 🌱 line to that.)`,
    );
  }

  if (args.stance) {
    parts.push(`\n--- READER'S STANCE (tone calibration only — never name them) ---`);
    parts.push(stanceCue(args.stance));
  }

  parts.push(
    `\nProduce exactly one line: 🌱 Try this once with a tiny named action OR 🍵 Just a watch. Nothing else.`,
  );

  return parts.join("\n");
}

function stanceCue(stance: UserStance): string {
  switch (stance) {
    case "curious_not_started":
      return "They are curious about AI but haven't really started. Calibrate the action TINY — the smallest possible first thing. No setup. No installs. Free tools only.";
    case "watching_not_doing":
      return "They watch a lot but never act. Calibrate the action so it can be done in 2 minutes from a phone or laptop they already have.";
    case "tried_gave_up":
      return "They tried AI before and got overwhelmed. Calibrate the action gently and reassuringly. Avoid anything that feels like 'set up an account' or 'install a thing.' If unsure, prefer 🍵 Just a watch.";
    case "using_want_more":
      return "They use AI a bit and want to use it more on purpose. The action can be slightly more specific or technique-focused, but still doable in under 5 minutes.";
  }
}

function assembleVerdict(description: string, action: string): string {
  return `${description}\n\n${action}`.trim();
}

/**
 * Returns the Telegram-render version of a verdict — strips the 🪜 "if you want
 * to go further" block. The 🪜 line is dashboard-only per the Phase 1 plan;
 * Telegram messages are kept to 📍 + 🌱/🍵 only so they fit a phone glance.
 *
 * Storage retains the full verdict (including 🪜) so the dashboard can render
 * the deeper layer when the user chooses to look closer. This function is
 * applied at the moment of sending to Telegram, not at write-time.
 */
export function renderForTelegram(fullVerdict: string): string {
  const lines = fullVerdict.split("\n");
  const out: string[] = [];
  let inDeeper = false;

  for (const line of lines) {
    if (line.trim().startsWith("🪜")) {
      inDeeper = true;
      continue;
    }
    if (inDeeper) {
      // Stay in deeper-block until we hit the next emoji-prefixed line (🌱 or 🍵)
      const trimmed = line.trim();
      if (trimmed.startsWith("🌱") || trimmed.startsWith("🍵") || trimmed.startsWith("📍")) {
        inDeeper = false;
        out.push(line);
      }
      // else: skip (it's the 🪜 body)
      continue;
    }
    out.push(line);
  }

  return out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
