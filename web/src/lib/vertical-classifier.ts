// Phase 4 — vertical filter (web side).
// Mirror of /src/services/verticalClassifier.ts. Both projects are independent
// TypeScript builds, so the classifier is duplicated. Keep the prompt text in
// sync if you change the canonical version in /src.

import OpenAI from "openai";

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

export type VerticalDecision = {
  inVertical: boolean;
  confidence: number;
  reason: string;
};

const SYSTEM_PROMPT = `You are a URL vertical classifier for a product called ContextDrop.

ContextDrop is built for AI / tech / business / productivity content. Anything else (recipes, fashion, sports, entertainment, fitness, lifestyle, travel) is out of scope.

INPUT: a URL and (optionally) a small snippet of caption text.

OUTPUT: exactly one JSON object on a single line, no markdown, no commentary. Keys:
  in_vertical    — boolean. true if the URL is likely AI / tech / business / productivity content.
  confidence     — number from 0 to 1.
  reason         — short string. If in_vertical is false, name the apparent topic ("cooking content", "fashion reel", etc.) for the user-facing redirect message. If true, leave empty.

CALIBRATION:
- Err generous on the borderline. Productivity tips, business advice, marketing, design, no-code/maker content, software, podcasts about work, founder stories — all in_vertical:true.
- AI tools, LLMs, agents, prompts, MCPs, automations — clearly in_vertical:true.
- Recipes, fitness routines, fashion lookbooks, sports highlights, makeup, home decor, vacation vlogs, dance, comedy skits, music videos, celebrity gossip — in_vertical:false.
- News politics, philosophy, science non-tech — borderline; default to in_vertical:true unless clearly entertainment-coded.
- If the URL is ambiguous (no signal in the URL or caption), default to in_vertical:true with confidence 0.3 — let the analysis run.
- Only return in_vertical:false with confidence > 0.7 when you are clearly seeing non-vertical signals.

Do not output anything except the JSON line.`;

export async function classifyUrl(
  url: string,
  captionHint?: string,
): Promise<VerticalDecision> {
  const userMsg = captionHint
    ? `URL: ${url}\nCaption (partial): ${captionHint.slice(0, 300)}`
    : `URL: ${url}`;

  try {
    const response = await client().chat.completions.create({
      model: "gpt-4.1-mini",
      max_tokens: 80,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) return { inVertical: true, confidence: 0, reason: "classifier returned empty" };

    const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
    const parsed = JSON.parse(cleaned) as {
      in_vertical: boolean;
      confidence: number;
      reason: string;
    };

    return {
      inVertical: parsed.in_vertical,
      confidence: parsed.confidence,
      reason: parsed.reason ?? "",
    };
  } catch {
    return { inVertical: true, confidence: 0, reason: "classifier error" };
  }
}

export function shouldRefuse(decision: VerticalDecision): boolean {
  return !decision.inVertical && decision.confidence > 0.7;
}
