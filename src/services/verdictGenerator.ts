import OpenAI from "openai";
import { config } from "../config.js";
import { ServiceError } from "../pipeline/types.js";
import type { Platform, UserContext, ClassifierResult } from "../pipeline/types.js";
import { HUMANIZER_RULES } from "./humanizerRules.js";
import {
  formatResearchForPrompt,
  type SubjectResearch,
} from "./subjectResearcher.js";

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
  /** Ticket B — classifier output. Category + action lane selected before verdict generation. */
  contentType?: ClassifierResult | null;
}

export type UserStance =
  | "curious_not_started"
  | "watching_not_doing"
  | "tried_gave_up"
  | "using_want_more";

interface ContentVerdict {
  description: string;
  hasAction: boolean;
  isNoContent?: boolean;
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
- Use research to correctly name the subject and cite its canonical URL and specific identifiers (version, scores, prices).
- But the creator's transcript and demonstration are the actual content — research is background context, not the story. If the creator is making an argument or showing a technique, that argument or technique is the verdict, not a definition of the subject.
- Pull the canonical URL from research into 📍 when it exists.
- Pull specific identifiers (version, scores, prices) from research into 📍 when they add precision the post lacked.
- If research and post disagree on a fact, prefer research for naming and identifiers — but never let research replace the creator's actual content.
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

// --- Category-specific Pass 1 prompts ---

const CONTENT_PROMPT_TAKEAWAY = `You read scraped social-media content and extract the argument, take, or lesson — the thing worth holding.

This content is someone's opinion or a personal story. Describe it accurately. Do not name a product or tool unless one is the explicit subject and has a canonical pointer.

OUTPUT — exactly this structure, nothing else:

📍 [Two sentences max. Total under 220 characters.
- Opinion/argument: lead with the claim. "Per [Creator]: [the argument]." If the content centres on a named tool or subject and a URL exists, name it and include the URL.
- Story: what happened, then the lesson the creator drew from it.
- Attribution always: say whose take this is. Use "Per [Name]:" shorthand — never "X argues that..."
- [Name] must be a real person's name (e.g. "Alex Hormozi") or a recognised organisation (e.g. "Anthropic", "OpenAI"). Never use an account handle, username, or domain (e.g. evolving.ai, @techuser) as [Name]. If no real name is identifiable from the content, write "Per the creator:" instead.]

No ACTION line. No 🪜 line. Just 📍 and nothing else.

Voice: plain and direct. No hype. Short sentences.

ANTI-HALLUCINATION: only name subjects, tools, or URLs that appear in the source or research.

NEVER: meta-describe. "Per Hormozi: business owners who wait will fall behind." not "Hormozi argues that business owners who wait will fall behind."

${HUMANIZER_RULES}`;

const CONTENT_PROMPT_SAVE = `You read scraped social-media content and describe the practical thing — the dish, the place, the drill.

OUTPUT — exactly this structure, nothing else:

📍 [Two sentences max. Total under 220 characters.
- Recipe: name the dish, then the one technique or trick that makes it work.
- Place: name the place, then what makes it worth going.
- Practice: name the drill, then what it builds.
Do not mention a named tool or brand unless it is the dish, place, or drill itself. Describe the thing, not the creator's opinion of it.]

No ACTION line. No 🪜 line. Just 📍 and nothing else.

Voice: plain. Specific. No enthusiasm markers.

ANTI-HALLUCINATION: only name dishes, places, prices, or techniques that appear in the source.

${HUMANIZER_RULES}`;

const CONTENT_PROMPT_SHOP = `You read scraped social-media content and describe the product — what it is, what it costs, where to get it.

OUTPUT — exactly this structure, nothing else:

📍 [Two sentences max. Total under 220 characters.
Name the product. Include price if mentioned. Include where to buy if mentioned. Describe the object — not the creator's take, not their enthusiasm.]

No ACTION line. No 🪜 line. Just 📍 and nothing else.

Voice: factual. Specific. No adjectives that could be cut.

ANTI-HALLUCINATION: only name prices and URLs that appear in the source or research.

${HUMANIZER_RULES}`;

// --- Category-specific Pass 2 action prompts ---

const SHOP_ACTION_PROMPT = `You produce ONE action line for a product the reader might buy. That's your entire job.

OUTPUT — exactly this format, nothing else:
🛍 Shop this
[ONE sentence. Under 20 words. The simplest next step toward buying.
Good: "Open the product page and see if it ships to you."
Good: "Look at the photos — you'll know immediately."
Good: "Search the name to find the current price."
Bad: "Consider purchasing this item." (too generic)
Bad: "This would make a great addition to your home." (not an action)]

No inventing. If no URL was mentioned, tell them to search by name.
Output format strict: "🛍 Shop this" on its own line, then the sentence on the next line. Nothing else.

${HUMANIZER_RULES}`;

const SAVE_ACTION_PROMPT = `You produce ONE action line for content the reader should come back to — a recipe, a place, a practice drill. That's your entire job.

OUTPUT — exactly this format, nothing else:
💾 Save for later
[ONE sentence. Under 20 words. The smallest concrete step toward using this when the time is right.
Good: "Screenshot the ingredient list."
Good: "Add to your weekend cooking list."
Good: "Save for a slow Sunday."
Good: "Set a reminder for Saturday morning."
Bad: "Try this sometime." (too vague)
Bad: "This looks great!" (not an action)]

Output format strict: "💾 Save for later" on its own line, then the sentence on the next line. Nothing else.

${HUMANIZER_RULES}`;

const CHAT_ACTION_PROMPT = `You produce ONE action line for content where the value is in applying ideas to the reader's own situation. That's your entire job.

OUTPUT — exactly this format, nothing else:
💬 Chat about this
[ONE sentence. Under 20 words. Tells the reader what to bring to the chat — the specific question or context.
Good: "Tell the bot what decision you're stuck on and apply the rule together."
Good: "Ask it to apply JTBD to a product you're working on — that's where it clicks."
Good: "Talk it through with your next 1:1 in mind."
Bad: "Discuss this with the bot." (too vague)
Bad: "Apply this to your situation." (says nothing)]

Output format strict: "💬 Chat about this" on its own line, then the sentence on the next line. Nothing else.

${HUMANIZER_RULES}`;

const TAKEAWAY_PROMPT = `You produce ONE takeaway block for opinion or story content. That's your entire job.

OUTPUT — exactly this format, nothing else:

First line — pick exactly one label:
💭 The take — for a prediction, claim, or argument. The creator is asserting something about how the world works or will go.
💭 The point — for a lesson drawn from a story. Something happened; this is what it means.
💭 What [Name] says — when the creator's real name is explicitly stated (a person's name like "Alex Hormozi", or a recognised org like "Anthropic"). Never use an account handle, username, or domain as [Name]. If no real name is known, use a different label.
💭 Worth holding onto — for a principle or observation that isn't tied to a specific event or argument. Slower register. Something to sit with, not debate.

Second line (third if needed): the substance. 1-2 short sentences. The argument itself. The lesson itself. Not "X argues that..." — just the thing.

Good:
💭 The take
Business owners who don't adopt will get separated from the ones who do. The downside of going slow is bigger than the downside of going wrong.

Good:
💭 The point
Comfort kills more dreams than failure does.

Good:
💭 The take
Training compute spend is outpacing AI revenue 4x. The counter on inference efficiency isn't addressed.

Bad:
💭 The take
Hormozi argues that business owners who fail to adopt AI risk falling behind. (meta — just state the thing)

Voice: calm. No urgency. Attribution goes in the label, not the body.
Output format strict: label line first, then the substance. Nothing else.

${HUMANIZER_RULES}`;

const LOGIN_WALL_PATTERNS = [
  "see everyday moments from your close friends",
  "log into instagram",
  "log in to see",
  "log in to view",
  "sign up or log in",
  "log in or sign up",
  "sign up to continue",
  "mobile number, usern",
  "please enable javascript",
  "you need to be signed in",
  "join now to see who you know",
  "sign in to linkedin",
];

function isLoginWallContent(input: VerdictInput): boolean {
  const hasRealContent =
    (input.transcript?.trim().length ?? 0) > 5 ||
    (input.visualSummary?.trim().length ?? 0) > 20 ||
    Boolean(input.subjectResearch);
  if (hasRealContent) return false;
  const captionLower = (input.caption || "").toLowerCase();
  return LOGIN_WALL_PATTERNS.some((p) => captionLower.includes(p));
}

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
  if (content.isNoContent) return content.description;
  const action = await generateActionLine({
    description: content.description,
    hasAction: content.hasAction,
    userNote: input.userNote,
    stance: input.stance,
    subjectResearch: input.subjectResearch ?? null,
    contentType: input.contentType,
  });

  return assembleVerdict(content.description, action);
}

function selectContentPrompt(contentType?: ClassifierResult | null): string {
  const cat = contentType?.category;
  if (cat === "commentary" || cat === "story")           return CONTENT_PROMPT_TAKEAWAY;
  if (cat === "recipe" || cat === "place" || cat === "practice") return CONTENT_PROMPT_SAVE;
  if (cat === "product")                                 return CONTENT_PROMPT_SHOP;
  return CONTENT_SYSTEM_PROMPT;
}

async function generateContentVerdict(
  input: VerdictInput,
): Promise<ContentVerdict> {
  if (isLoginWallContent(input)) {
    return { description: "📍 Couldn't pull the content. Open the link.", hasAction: false, isNoContent: true };
  }

  const userPrompt = buildContentPrompt(input);
  const systemPrompt = selectContentPrompt(input.contentType);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 400,
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const text = response.choices[0]?.message?.content;
    if (!text) {
      console.error("[verdictGenerator] Pass 1 returned empty content; using fallback verdict");
      return buildFallbackContentVerdict(input);
    }

    // Specialized prompts (takeaway/save/shop) don't emit ACTION:YES/NO.
    // For those, hasAction is unused — the lane drives Pass 2 regardless.
    const hasAction = /\bACTION\s*:\s*YES\b/i.test(text);
    const description = text
      .replace(/\n?\s*ACTION\s*:\s*(YES|NO)\b.*$/i, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return { description, hasAction };
  } catch (err) {
    console.error(
      "[verdictGenerator] Pass 1 failed; using fallback verdict:",
      err instanceof Error ? err.message : err,
    );
    return buildFallbackContentVerdict(input);
  }
}

function buildFallbackContentVerdict(input: VerdictInput): ContentVerdict {
  const research = input.subjectResearch ?? null;
  const title = typeof input.metadata.title === "string" ? input.metadata.title.trim() : "";
  const subject = research?.subject?.trim() || title || "This";
  const summary = research?.summary?.trim() || extractFirstUsefulSentence(input.caption);
  const canonicalUrl = research?.canonicalUrl?.trim();

  const descriptionBody = summary
    ? summary
    : `${subject} could not be summarized cleanly. Open the source link.`;
  const urlSuffix = canonicalUrl && !descriptionBody.includes(canonicalUrl) ? ` ${canonicalUrl}` : "";
  const description = `📍 ${descriptionBody}${urlSuffix}`.slice(0, 420).trim();

  return {
    description,
    hasAction: Boolean(
      canonicalUrl &&
        research &&
        ["tool", "model", "repo"].includes(research.type),
    ),
  };
}

function extractFirstUsefulSentence(text: string): string {
  const cleaned = text
    .replace(/\s+/g, " ")
    .replace(/^Title:\s*/i, "")
    .trim();
  if (!cleaned) return "";

  const abstractStart = cleaned.search(/\bAbstract\b/i);
  const source = abstractStart >= 0 ? cleaned.slice(abstractStart).replace(/^Abstract\s*/i, "") : cleaned;
  const sentence = source.match(/^(.{80,260}?[.!?])\s/)?.[1] || source.slice(0, 260);
  return sentence.trim();
}

async function generateActionLine(args: {
  description: string;
  hasAction: boolean;
  userNote?: string;
  stance?: UserStance;
  subjectResearch?: SubjectResearch | null;
  contentType?: ClassifierResult | null;
}): Promise<string> {
  const lane = args.contentType?.action_lane;
  const cat = args.contentType?.category;

  // Entertainment: no third line at all.
  if (cat === "entertainment") return "";

  // Route to category-specific action prompts.
  if (lane === "shop_this")     return callActionModel(SHOP_ACTION_PROMPT,  args);
  if (lane === "save_for_later") return callActionModel(SAVE_ACTION_PROMPT, args);
  if (lane === "chat_about")    return callActionModel(CHAT_ACTION_PROMPT,  args);
  if (lane === "the_takeaway")  return callActionModel(TAKEAWAY_PROMPT,     args);

  // open_it (and unclassified fallback): existing behaviour.
  const userPrompt = buildActionPrompt(args);
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 120,
      temperature: 0.3,
      messages: [
        { role: "system", content: ACTION_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) return "🍵 Just a watch";
    if (!/^(🌱|🍵)/u.test(text)) return "🍵 Just a watch";
    return text;
  } catch {
    return "🍵 Just a watch";
  }
}

async function callActionModel(
  systemPrompt: string,
  args: {
    description: string;
    hasAction: boolean;
    userNote?: string;
    stance?: UserStance;
    subjectResearch?: SubjectResearch | null;
    contentType?: ClassifierResult | null;
  },
): Promise<string> {
  const userPrompt = buildActionPrompt(args);
  const lane = args.contentType?.action_lane;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 120,
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) return laneDefaultFallback(lane);
    if (!/^(🌱|🍵|🛍|💾|💬|💭)/u.test(text)) return laneDefaultFallback(lane);
    return text;
  } catch {
    return laneDefaultFallback(lane);
  }
}

function laneDefaultFallback(lane: string | undefined): string {
  switch (lane) {
    case "shop_this":     return "🛍 Shop this\nSearch the name to find the product page.";
    case "save_for_later": return "💾 Save for later\nAdd to your list.";
    case "chat_about":    return "💬 Chat about this\nTalk it through with the bot.";
    case "the_takeaway":  return "";
    default:              return "🍵 Just a watch";
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
  contentType?: ClassifierResult | null;
}): string {
  const parts: string[] = [];
  const lane = args.contentType?.action_lane;

  parts.push(`--- DESCRIPTION ---`);
  parts.push(args.description);

  // For non-open_it lanes the system prompt fully specifies the output shape.
  // Just give the model the description (+ note if present) and a minimal cue.
  if (lane === "the_takeaway") {
    if (args.userNote) {
      parts.push(`\n--- READER'S NOTE ---`);
      parts.push(args.userNote);
    }
    parts.push(`\nProduce the 💭 takeaway block as instructed.`);
    return parts.join("\n");
  }

  if (lane === "shop_this") {
    const research = formatResearchForPrompt(args.subjectResearch ?? null);
    if (research) parts.push(`\n${research}`);
    if (args.userNote) {
      parts.push(`\n--- READER'S NOTE ---`);
      parts.push(args.userNote);
    }
    parts.push(`\nProduce the 🛍 Shop this line as instructed.`);
    return parts.join("\n");
  }

  if (lane === "save_for_later") {
    if (args.userNote) {
      parts.push(`\n--- READER'S NOTE ---`);
      parts.push(args.userNote);
    }
    parts.push(`\nProduce the 💾 Save for later line as instructed.`);
    return parts.join("\n");
  }

  if (lane === "chat_about") {
    if (args.userNote) {
      parts.push(`\n--- READER'S NOTE ---`);
      parts.push(args.userNote);
    }
    parts.push(`\nProduce the 💬 Chat about this line as instructed.`);
    return parts.join("\n");
  }

  // open_it (and unclassified fallback): full existing behaviour.
  parts.push(
    `\nHas concrete action in the content? ${args.hasAction ? "YES" : "NO"}`,
  );

  const research = formatResearchForPrompt(args.subjectResearch ?? null);
  if (research) {
    parts.push(`\n${research}`);
    parts.push(
      `(When the action references the subject, use research's canonical URL or install path. Never invent commands.)`,
    );
  }

  if (args.userNote) {
    parts.push(`\n--- READER'S NOTE WHEN SAVING ---`);
    parts.push(args.userNote);
    parts.push(
      `(If they asked a question, answer it inside the 🌱 line. If they said why they saved it, map the 🌱 line to that.)`,
    );
  }

  if (args.stance) {
    parts.push(
      `\n--- READER'S STANCE (tone calibration only — never name them) ---`,
    );
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
  if (!action) return description.trim();
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
      if (
        trimmed.startsWith("🌱") ||
        trimmed.startsWith("🍵") ||
        trimmed.startsWith("🛍") ||
        trimmed.startsWith("💾") ||
        trimmed.startsWith("💬") ||
        trimmed.startsWith("💭") ||
        trimmed.startsWith("📍")
      ) {
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
