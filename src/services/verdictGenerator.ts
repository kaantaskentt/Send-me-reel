import OpenAI from "openai";
import { config } from "../config.js";
import { ServiceError } from "../pipeline/types.js";
import type { Platform, UserContext } from "../pipeline/types.js";
import { HUMANIZER_RULES } from "./humanizerRules.js";
import { formatResearchForPrompt, type SubjectResearch } from "./subjectResearcher.js";

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
  /** Apr 26 — subject_research blob from subjectResearcher. When present, the
   *  verdict treats it as authoritative for naming the thing and giving its
   *  canonical link. The post is one mention; the subject is the thing itself. */
  subjectResearch?: SubjectResearch | null;
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

const CONTENT_SYSTEM_PROMPT = `You read scraped social-media content and tell the reader what the SUBJECT is — the actual tool, model, person, company, or concept the post is about. The reader doesn't need a play-by-play of the post. They need to know what the thing IS, what it does, and where to find it.

You don't know who's reading. Don't assume their role, profession, or interests. Don't filter for relevance.

CRITICAL — TALK ABOUT THE SUBJECT, NOT THE POST:

The single biggest failure mode is meta-describing the post instead of the subject. Never write:
- BAD: "The content introduces X..."
- BAD: "This is a walkthrough of Y..."
- BAD: "The post doesn't go into technical details."
- BAD: "Beyond this announcement, the post..."

These describe the POST. The reader knows it's a post — they sent it. They want the SUBJECT.

GOOD voice:
- "Kimi K2.6 is Moonshot AI's coding model. SWE-Bench Pro 58.6, BrowseComp 83.2. Open-source. Try it at kimi.com or via API."
- "Caveman is a Claude Code skill that strips agent output to short tokens, ~75% fewer tokens. github.com/JuliusBrussee/caveman."
- "Vibeyard is an open-source live-browser for Claude Code — click any element to edit it instantly. github.com/elirantutia/vibeyard."

ATTRIBUTION when the post is a CLAIM by a specific person:
- "Per Sam Altman: best way to start an AI startup is X, Y, Z."
- "Karpathy says vibe-coding works until you stop reading the diff."

OUTPUT — exactly this structure, in this order:

📍 [Subject-first description. Two sentences max. Total under 220 characters. Lead with the named subject and what it IS. Include canonical URL if known. Include specific identifiers (version numbers, benchmark scores, prices) when present.]

🪜 If you want to go further
[ONE sentence under 100 characters. The deeper layer — a specific concept the subject opens up, a related thing in the same space, or what's worth knowing next. OMIT this line entirely if the subject is shallow or already fully covered in 📍. The default is no 🪜 line. Never pad to fill it.]

ACTION:[YES/NO]
[After 🪜 (or after 📍 if no 🪜), output one final line: ACTION:YES if the subject is a thing the reader could try once — a tool to install/use, a model to test, a prompt to copy, a setting to change, a script to run, a repo to clone, an app to download. Otherwise ACTION:NO. The reader will never see this line; it's a signal for the next step.]

VOICE RULES:
- Short sentences. No filler.
- No excitement. No hype. No exclamation marks.
- Say "you" not "the user." Say "this" not "this content."
- One idea per sentence.
- Total length: 📍 ≤ 220 chars. 🪜 ≤ 100 chars when present.

USE SUBJECT RESEARCH WHEN PROVIDED:
- If a "--- SUBJECT RESEARCH ---" block is in the user message, treat it as authoritative for naming the thing and citing canonical URLs. The post is one mention; the subject is the thing itself.
- Pull the canonical URL from research into 📍 when it exists.
- Pull specific identifiers (version, scores, prices) from research into 📍 when they're more authoritative than what the post said.
- If research and post disagree on a fact, prefer research — but never cite research as a source ("according to..."), just state the fact.
- If no research is provided, work from post content alone — never invent URLs or facts.

ANTI-HALLUCINATION:
- Only mention tools, prices, links, names that appear in the source material OR in the SUBJECT RESEARCH block.
- Never guess URLs or prices.
- If transcript, visuals, caption, AND research are all empty: output 📍 Couldn't pull the content. Open the link.

BANNED WORDS — never use these:
"powerful", "robust", "exciting", "fascinating", "incredible", "innovative", "cutting-edge", "comprehensive", "leverage", "optimize", "unlock", "elevate", "supercharge", "actionable", "key takeaway", "pro tip", "bottom line", "deep dive", "valuable insights", "great content", "highly relevant", "I recommend", "this aligns with", "consider exploring", "insightful for anyone", "this content explores", "in the world of", "the post highlights", "the creator does a great job", "behind", "ahead", "stay ahead", "fall behind", "keep up", "master", "level up", "10x", "game-changer", "revolutionary", "Worth your time", "Skim it", "Skip", "driven", "ecosystem", "landscape", "utilize", "streamline", "sweet spot", "on-brand", "legit", "solid find", "workflow", "big if", "huge for", "syncs with", "useful find", "worth bookmarking"

NEVER:
- Rate the content ("Worth your time", "Skim it", "Skip"). The rating system is gone.
- Reference the reader's job, role, focus, profession, or interests. You don't know any of that.
- Write a "this is relevant to your work because..." line. That line doesn't exist.
- Use "you should" or "you must." The reader is overwhelmed; don't add to it.

${HUMANIZER_RULES}`;

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
- No preamble. No explanation. No "here is the action:". Just the line.

${HUMANIZER_RULES}`;

export async function generateVerdict(input: VerdictInput): Promise<string> {
  const content = await generateContentVerdict(input);
  const action = await generateActionLine({
    description: content.description,
    hasAction: content.hasAction,
    userNote: input.userNote,
    stance: input.stance,
    subjectResearch: input.subjectResearch ?? null,
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
  subjectResearch?: SubjectResearch | null;
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

  // Inject live web context when available — this is what lets the verdict
  // describe the SUBJECT, not the post.
  const research = formatResearchForPrompt(input.subjectResearch ?? null);
  if (research) {
    parts.push(`\n${research}`);
  }


  parts.push(
    `\nProduce the description. Lead with the named subject. Use research as authoritative when present. Don't assume anything about who's reading.`,
  );

  return parts.join("\n");
}

function buildActionPrompt(args: {
  description: string;
  hasAction: boolean;
  userNote?: string;
  stance?: UserStance;
  subjectResearch?: SubjectResearch | null;
}): string {
  const parts: string[] = [];

  parts.push(`--- DESCRIPTION ---`);
  parts.push(args.description);
  parts.push(`\nHas concrete action in the content? ${args.hasAction ? "YES" : "NO"}`);

  // Pass 2 also gets the research — it's what lets the 🌱 line cite a real
  // install path or canonical URL instead of a vague "try the tool."
  const research = formatResearchForPrompt(args.subjectResearch ?? null);
  if (research) {
    parts.push(`\n${research}`);
    parts.push(`(When the action references the subject, use research's canonical URL or install path. Never invent commands.)`);
  }

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
