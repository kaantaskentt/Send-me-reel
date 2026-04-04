import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";
import { ServiceError } from "../pipeline/types.js";
import type { Platform, UserContext } from "../pipeline/types.js";

const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

export interface VerdictInput {
  transcript: string | null;
  visualSummary: string;
  caption: string;
  metadata: Record<string, unknown>;
  userContext: UserContext;
  platform: Platform;
  sourceUrl: string;
}

const SYSTEM_PROMPT = `You are ContextDrop, a personal AI assistant that analyzes social media content for this specific user. You know their role, goals, and priorities. Your job is to tell them what a piece of content contains and why it matters to them — in plain English, no jargon.

Your audience is beginner to semi-intermediate. Write like you're explaining to a smart friend, not a technical reviewer.

OUTPUT FORMAT — follow this exactly:

🔷 [Tool/Topic Name] — [one-line description of what it actually is]

🧠 [Plain English sentence: what this tool/concept IS and what problem it solves — tailored to this user's context]
🔧 [Plain English sentence: HOW it works or how you'd use it — concrete, not abstract]

💡 Real-world use: [A specific example of how someone actually uses this — from the video content, GitHub readme, or common use cases. If no real example was found in the content, OMIT this entire line.]

🔗 [Primary link: GitHub repo, product URL, or most useful resource found — just the URL, no label. If no link found, OMIT this line.]
[Practical tags line — include ONLY tags that apply from: 🆓 Free · 💰 Paid · 🔓 Open source · 💻 Runs locally · ☁️ Cloud only · 🐍 Python · 📦 npm. If none can be determined, OMIT this line.]

RULES:
- The 🧠 and 🔧 lines must reference the user's specific goals/projects when relevant — don't be generic
- Never use technical jargon without explaining it in the same sentence
- Never fabricate links or repo names — only include URLs you found in the transcript, visuals, or caption
- Keep the entire response under 600 characters (excluding the emoji prefixes)
- Do NOT include any verdict label, rating, or relevance score — the user decides via buttons
- Do NOT include headers like "What's in it:" or "Why it matters:" — the emojis are the structure`;

export async function generateVerdict(input: VerdictInput): Promise<string> {
  const userPrompt = buildUserPrompt(input);

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new ServiceError("VERDICT_EMPTY", "Claude returned non-text content");
    }

    return content.text;
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    throw new ServiceError(
      "VERDICT_FAILED",
      `Failed to generate verdict: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

function buildUserPrompt(input: VerdictInput): string {
  const parts: string[] = [];

  parts.push(`--- USER CONTEXT ---`);
  parts.push(`Role: ${input.userContext.role}`);
  parts.push(`Current focus: ${input.userContext.goal}`);
  parts.push(`Priority topics: ${input.userContext.contentPreferences}`);

  parts.push(`\n--- CONTENT FROM ${input.platform.toUpperCase()} ---`);
  parts.push(`Source: ${input.sourceUrl}`);

  if (input.caption) {
    parts.push(`\nCaption/Text:\n${input.caption}`);
  }

  if (input.transcript) {
    parts.push(`\nTranscript (what was said):\n${input.transcript}`);
  }

  if (input.visualSummary) {
    parts.push(`\nVisual analysis (what was shown):\n${input.visualSummary}`);
  }

  const author =
    (input.metadata.authorName as string) ||
    (input.metadata.authorUsername as string);
  if (author) {
    parts.push(`\nCreator: ${author}`);
  }

  parts.push(
    `\nAnalyze this content and produce your verdict for this specific user.`,
  );

  return parts.join("\n");
}
