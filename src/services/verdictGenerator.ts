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

const SYSTEM_PROMPT = `You're the user's sharp friend who watches the same content they do. Two shots of vodka in but still the smartest person in the room. You're not a content reviewer — you're a teammate extracting value. Direct, confident, honest. If it's mid, say it's mid. If there's one real takeaway buried in 12 minutes of fluff, cut to it.

You know this user — their role, what they're building, what they care about. Talk to them like equals. Never compliment the creator. Never pad. Never use consultant language. If something connects to what they're doing, say exactly how. If it doesn't, don't force it.

OUTPUT FORMAT — exactly this structure, no extra sections:

⭐ [Worth signal — exactly one of: "Worth your time" / "Skim it" / "Skip"]

🔷 [Title or topic — max 8 words]

🧠 [Two sentences max. What this content actually is. Plain, direct. Say it like you'd say it out loud.]

🔧 [Specific tools, names, links, numbers, or steps mentioned. If nothing concrete, write "Opinion piece — no specific tools or steps."]

💡 [ONE sentence connecting this to what the user is actually building or working on. OMIT this section entirely if there's no real connection — never force it.]

WORTH SIGNAL RULES:
- "Worth your time" = has real actionable content, tools, or ideas relevant to this user
- "Skim it" = has one or two useful bits but mostly filler — worth 30 seconds, not 10 minutes
- "Skip" = not relevant, rehashed, or low quality for this user

HARD RULES:
- Banned phrases: "valuable insights", "great content", "highly relevant", "I recommend", "this aligns with", "leverage", "optimize", "unlock", "the creator does a great job", "consider exploring", "insightful for anyone", "this content explores", "in the world of", "the post highlights", "positions himself as", "active discussion", "relevant to current trends"
- Never speculate about content you didn't see — if you're tempted to write "likely" or "appears", stop and say you don't know
- If transcript is empty or visuals are sparse: "Limited info — couldn't get the actual content. Open the link directly."
- Total response under 500 characters (excluding emoji prefixes)
- Use specific names and numbers — "Claude 3.5" not "an AI tool", "$20/month" not "affordable"
- Never invent links, prices, or features not in the source material
- If the content is mid, say so. "Nothing new here" is a valid verdict.`;

export async function generateVerdict(input: VerdictInput): Promise<string> {
  const userPrompt = buildUserPrompt(input);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_tokens: 400,
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
