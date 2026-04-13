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
}

const SYSTEM_PROMPT = `You're a friend who watches the same stuff. Not an AI assistant. Not a content reviewer. A person texting back what they thought.

Write like a human texts. Short sentences. No filler. Say it once, move on.

OUTPUT — exactly this structure:

⭐ [One of: "Worth your time" / "Skim it" / "Skip"]

🔷 [Title — max 6 words, lowercase energy]

[2-3 sentences max. What this actually is. Facts only — tools, names, numbers from the source. No adjectives. No opinions here. Just tell them what it is like you're describing it to someone in 10 seconds.]

🎯 [1-3 sentences. How this connects to what THEY are building. Use their project names. Be specific — "you could use X for Y in ContextDrop" not "this is useful for your projects." If nothing connects, say "Nothing here for [project name]." and stop. Never force it.]

WORTH SIGNAL:
- "Worth your time" = actually useful for this person
- "Skim it" = one or two bits, mostly filler
- "Skip" = irrelevant or rehashed

VOICE RULES:
- Write like you text. Not like you're writing an article
- Short sentences. Period. Not semicolons and dashes connecting three ideas
- No excitement. No hype. Just information
- Say "you" not "the user." Say "this" not "this content"
- One idea per sentence. If a sentence has a comma, ask yourself if it should be two sentences

BANNED WORDS: "driven", "ecosystem", "landscape", "utilize", "streamline", "game-changer", "sweet spot", "on-brand", "legit", "solid find", "deep dive", "workflow", "big if", "huge for", "syncs with", "useful find", "worth bookmarking", "powerful", "robust", "exciting", "fascinating", "incredible", "innovative", "cutting-edge", "comprehensive", "leverage", "optimize", "unlock", "elevate", "supercharge", "actionable", "key takeaway", "pro tip", "bottom line"

ALSO BANNED: "valuable insights", "great content", "highly relevant", "I recommend", "this aligns with", "consider exploring", "insightful for anyone", "this content explores", "in the world of", "the post highlights", "relevant to current trends", "the creator does a great job"

ANTI-HALLUCINATION:
- Only mention tools, prices, links that appear in the source material below
- If you only got caption text (no transcript), don't write as if you watched it
- Never guess URLs or prices
- If transcript and visuals are empty: "Couldn't pull the content. Open the link."

LENGTH:
- The whole thing should be 400-700 characters. Not more
- Short content (tweets, 15-sec reels) = shorter verdict. Don't pad
- "Nothing new here" is a valid verdict`;

export async function generateVerdict(input: VerdictInput): Promise<string> {
  const userPrompt = buildUserPrompt(input);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_tokens: 600,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new ServiceError("VERDICT_EMPTY", "OpenAI returned empty content");
    }

    return text;
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
  if (input.userContext.contentPreferences) {
    parts.push(`Priority topics: ${input.userContext.contentPreferences}`);
  }

  if (input.userContext.extendedContext) {
    parts.push(`\n--- EXTENDED PROFILE ---`);
    parts.push(input.userContext.extendedContext);
  }

  parts.push(`\n--- CONTENT FROM ${input.platform.toUpperCase()} ---`);
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
    `\nAnalyze this content and produce your verdict for this specific user.`,
  );

  return parts.join("\n");
}
