import OpenAI from "openai";
import { config } from "../config.js";

const openai = new OpenAI({ apiKey: config.openaiApiKey });

export interface QualityInput {
  transcript: string | null;
  caption: string | null;
  visualSummary: string | null;
  platform: string;
  url: string;
}

export interface QualityDecision {
  proceed: boolean;
  strategy: "video" | "article" | "abort";
  reason: string;
}

// Detect explicit failure headings before the length fast path. A long login page
// is not stronger evidence than a short one. Actual video/audio observations take
// precedence: a tutorial may legitimately demonstrate a login screen.
const FAILURE_HEADINGS = [
  /(?:^|\n)\s*(?:Title:\s*)?(?:#+\s*)?(?:sign[ -]?in|log[ -]?in|login)\s+to\s+(?:continue|view|see|access)\b/i,
  /(?:^|\n)\s*(?:Title:\s*)?(?:#+\s*)?(?:sign up or log in|log in or sign up)\b/i,
  /(?:^|\n)\s*(?:Title:\s*)?(?:#+\s*)?this (?:account|profile|post|video) is private\b/i,
  /(?:^|\n)\s*(?:Title:\s*)?(?:#+\s*)?(?:404[ :–-]*)?(?:page|post|video|content) (?:not found|unavailable|is no longer available)\b/i,
  /(?:^|\n)\s*(?:Title:\s*)?(?:#+\s*)?(?:access denied|too many requests|captcha required|verify (?:that )?you are (?:a )?human|just a moment\.\.\.)/i,
];

export function parseQualityDecision(text: string): QualityDecision {
  const decision: unknown = JSON.parse(text);
  if (!decision || typeof decision !== "object") throw new Error("Invalid content verification response");
  const item = decision as Record<string, unknown>;
  if (typeof item.proceed !== "boolean" || !["video", "article", "abort"].includes(String(item.strategy)) ||
      typeof item.reason !== "string" || !item.reason.trim() || (item.proceed && item.strategy === "abort")) {
    throw new Error("Invalid content verification response");
  }
  return item as unknown as QualityDecision;
}

const SYSTEM_PROMPT = `You're a scrape-failure detector. You receive scraped data from a social-media post and decide ONLY whether the scrape itself failed (got a login wall / CAPTCHA / error page / rate limit instead of real content).

Return JSON only:
{"proceed": true/false, "strategy": "video"|"article"|"abort", "reason": "..."}

DEFAULT IS PROCEED. The agentic verdict pipeline downstream can handle thin or sparse content fine — it does its own web research to fill gaps. Don't second-guess content quality. The only job here is to detect broken scrapes, not to judge content.

ALWAYS proceed (return proceed: true, strategy: "video"):
- Transcript or visuals have any real text — even just a sentence or two.
- Caption has any topic-related text — even short.
- ANY of the three fields has content the verdict pipeline could plausibly work with.
- Default for anything ambiguous.

ONLY abort (return proceed: false, strategy: "abort") if the scrape OBVIOUSLY captured a non-content page:
- "Login to view this content" / "Sign in to continue" / "This account is private"
- CAPTCHA / "Are you human?" / Cloudflare challenge text
- Rate limit / "Too many requests" / "Try again later"
- Cookie consent banner alone with no actual post text
- Pure platform UI (nav menus, footer, "Download our app") with no user content
- 404 / "Page not found" / "This post is no longer available"

Choose strategy: "article" instead of abort when only the caption has content (image post, failed video extract) but the caption itself is real text.

reason: one sentence written for the end user. Only matters when proceed is false.`;

/**
 * Evaluate scraped content quality before generating a verdict.
 * Replaces all static content guards with a single AI decision.
 * Cost: ~$0.0001 per call. Latency: ~0.3s.
 */
export async function evaluateContent(input: QualityInput): Promise<QualityDecision> {
  // Fast path: if we clearly have good content, skip the AI call
  const transcriptLen = input.transcript?.trim().length || 0;
  const captionLen = input.caption?.trim().length || 0;
  const visualLen = input.visualSummary?.trim().length || 0;

  if (!transcriptLen && !visualLen && FAILURE_HEADINGS.some((pattern) => pattern.test(input.caption || ""))) {
    return { proceed: false, strategy: "abort", reason: "The link returned a login, access, or error page instead of the post. No video content was available." };
  }

  // Loose fast-path: any one substantial signal is enough — the verdict
  // pipeline now has its own web research and can fill gaps. Don't second-
  // guess thin content. (Apr 26 — same philosophy as removing the vertical
  // filter: stop blocking, let the downstream pipeline handle it.)
  if (transcriptLen > 50 || visualLen > 50 || captionLen > 30) {
    console.log(`[gate] Fast path: any-signal proceed (transcript=${transcriptLen} visual=${visualLen} caption=${captionLen})`);
    return { proceed: true, strategy: "video", reason: "Has content" };
  }

  // If everything is genuinely empty, fast abort
  if (transcriptLen === 0 && captionLen === 0 && visualLen === 0) {
    console.log(`[gate] Fast path: all empty → abort`);
    return { proceed: false, strategy: "abort", reason: "No content extracted from this link." };
  }

  // AI evaluation for ambiguous cases
  const parts: string[] = [];
  parts.push(`Platform: ${input.platform}`);
  parts.push(`URL: ${input.url}`);
  if (input.transcript) parts.push(`Transcript (first 200 chars): ${input.transcript.slice(0, 200)}`);
  if (input.caption) parts.push(`Caption (first 200 chars): ${input.caption.slice(0, 200)}`);
  if (input.visualSummary) parts.push(`Visual summary (first 200 chars): ${input.visualSummary.slice(0, 200)}`);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.4-nano",
      max_completion_tokens: 160,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: parts.join("\n") },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text || response.choices[0]?.finish_reason !== "stop") throw new Error("Content verification response was incomplete");

    const decision = parseQualityDecision(text);
    console.log(`[gate] Decision: proceed=${decision.proceed} strategy=${decision.strategy} reason="${decision.reason}"`);
    return decision;
  } catch (err) {
    console.error(`[gate] Error:`, err instanceof Error ? err.message : err);
    // Thin text alone cannot establish that we obtained the requested source.
    // Existing audiovisual evidence can still be used with its stored coverage limits.
    return transcriptLen || visualLen
      ? { proceed: true, strategy: "video", reason: "Using the available audiovisual evidence" }
      : { proceed: false, strategy: "abort", reason: "Could not verify the extracted post text. Please retry the link." };
  }
}
