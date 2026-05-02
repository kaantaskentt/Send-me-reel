import OpenAI from "openai";
import { config } from "../config.js";
import type { ContentCategory, ActionLane, ClassifierResult } from "../pipeline/types.js";

const openai = new OpenAI({ apiKey: config.openaiApiKey });

export interface ClassifierInput {
  transcript: string | null;
  caption: string;
  visualSummary: string;
  platform: string;
  sourceUrl: string;
}

const LANE: Record<ContentCategory, ActionLane> = {
  named_tool:     "open_it",
  creator_review: "open_it",
  tutorial:       "open_it",
  technique:      "open_it",
  product:        "shop_this",
  recipe:         "save_for_later",
  place:          "save_for_later",
  exercise:       "open_it",
  practice:       "save_for_later",
  advice:         "chat_about",
  concept:        "chat_about",
  commentary:     "the_takeaway",
  story:          "the_takeaway",
  entertainment:  "just_a_watch",
};

// needs_search for categories where it's fixed. tutorial and concept are conditional — model decides.
const SEARCH_FIXED: Partial<Record<ContentCategory, boolean>> = {
  named_tool:     true,
  creator_review: true,
  technique:      false,
  product:        true,
  recipe:         false,
  place:          true,
  exercise:       false,
  practice:       false,
  advice:         false,
  commentary:     false,
  story:          false,
  entertainment:  false,
};

const VALID_CATEGORIES = new Set<string>([
  "named_tool", "creator_review", "tutorial", "technique", "product",
  "recipe", "place", "exercise", "practice", "advice", "concept",
  "commentary", "story", "entertainment",
]);

const FALLBACK: ClassifierResult = {
  category: "commentary",
  action_lane: "the_takeaway",
  confidence: 0,
  needs_search: false,
};

const CLASSIFIER_PROMPT = `You classify social media content into exactly one of 14 categories. Read the transcript, caption, and visual description, then output JSON.

CATEGORIES:

named_tool — Content centred on a named software tool, AI model, framework, library, SaaS product, or app. The reel's value is the tool's existence.
creator_review — Someone trying, comparing, or reviewing one or more named tools. Their take IS the content. ("I used X for 30 days", "X vs Y", "honest review of X")
tutorial — Step-by-step instructions to build, set up, or accomplish a specific outcome. Has a clear sequence the viewer can follow.
technique — A method, prompt pattern, framework, or approach that doesn't centre on one named tool. The viewer can apply it with their existing setup.
product — A physical or digital product the viewer would spend money to acquire. The content must explicitly mention a price or a place to purchase (store, website checkout, link to buy). If neither a price nor a purchase mechanism is stated in the content, it is NOT a product — classify as named_tool instead.
recipe — Food. A specific dish, cooking method, or food prep technique.
place — A specific physical location: restaurant, cafe, bar, neighbourhood, travel destination.
exercise — Physical movement: workout, stretch, mobility drill, breathing technique. The action is the viewer's body.
practice — Skill-building drill: drawing, music, language, meditation. Short drill, value compounds with repetition.
advice — Wisdom, principles, frameworks for thinking or working. Value is in applying it to the viewer's specific situation (a conversation, not a one-time action).
concept — Explanation of an idea, theory, or mental model. Viewer wants to understand it more deeply.
commentary — Take, opinion, prediction, hot-take, news analysis, industry argument. There's an argument to absorb, not a thing to do.
story — Personal narrative, anecdote, journey. Value is the human story, not a transferable action.
entertainment — Comedy, satire, art, vibes. Content for the experience itself.

DISAMBIGUATION RULES — read these carefully before classifying:

1. Recipe reel that uses a named tool (Anova sous vide, a specific blender model): classify as "recipe". The tool is a prop. Only use "named_tool" if the reel is ABOUT the tool and the recipe is the prop.

2. Creator reviewing an app while also using it (reviewing Paprika while cooking from it): classify as "creator_review". The take is the substance.

3. News-style coverage of a model or product release ("Anthropic just released Claude Opus 4.7, here are the benchmarks"): classify as "commentary". Without a clear "go try this now" handle for the viewer, it stays commentary, not named_tool.

4. Official model or tool release announced by the creator or company itself, where the model/tool is openly accessible (open-source repo, API, downloadable): classify as "named_tool", not "commentary". The test: is the post FROM the maker, and can the viewer go try it? If yes, named_tool. Third-party news coverage of the same release stays "commentary".

5. Breathwork, stretching, or physical drill — even if framed philosophically (Navy SEALs use this, longevity research): classify as "exercise". The body movement is the signal, not the framing.

6. A prompt pattern, thinking technique, or method shown using an incidental tool (ChatGPT, Claude, Notion as the canvas): classify as "technique". The named tool is context, not the subject.

7. A lifestyle routine (morning routine, evening wind-down, productivity stack) that describes a lifestyle rather than a replicable step-by-step sequence: classify as "advice", not "tutorial".

8. "commentary" is the safe fallback when no category clearly wins.

9. Creator sharing something they built or found ("I put together", "I built", "I made", "here's a resource I found") with no price or checkout in the content — classify as "named_tool", not "product". Product requires a stated price or a stated purchase step. A database, list, tool, or resource shared without a payment mechanism is named_tool regardless of how commercial it looks.

10. A named tool, skill, or automation that also implements a technique or method: classify as "named_tool" if the reel's value is the tool's existence — the viewer's next step is to open, install, or clone the specific thing, not to apply a method using their existing setup. The test: could the viewer get the same outcome with a different tool or with no tool at all? If yes, the named tool is incidental and this is "technique" (see rule 6). If no — there is a specific named artifact the viewer needs — classify as "named_tool".

NEEDS_SEARCH FIELD:
Only matters when your category is "tutorial" or "concept". For all other categories the caller ignores this field — but still include it.
- tutorial: true if the tutorial references a named tool the viewer would need to look up. False if tool-agnostic.
- concept: true if the concept has a canonical reference (a named paper, framework, or website). False if it's a general idea.
- All other categories: output false.

OUTPUT — valid JSON only, no markdown, no backticks, no explanation:
{ "category": "<one of the 14>", "confidence": <0.0–1.0>, "needs_search": <true|false> }

confidence ≥ 0.7 means clear classification. Below 0.5 means genuinely ambiguous.`;

function buildSourceText(input: ClassifierInput): string {
  const parts: string[] = [
    `Platform: ${input.platform}`,
    `URL: ${input.sourceUrl}`,
  ];
  if (input.caption) parts.push(`\nCaption:\n${input.caption.slice(0, 1000)}`);
  if (input.transcript) parts.push(`\nTranscript:\n${input.transcript.slice(0, 2000)}`);
  if (input.visualSummary) parts.push(`\nVisual summary:\n${input.visualSummary.slice(0, 500)}`);
  return parts.join("\n");
}

export async function classifyContent(
  input: ClassifierInput,
): Promise<ClassifierResult> {
  const sourceText = buildSourceText(input);
  if (sourceText.trim().length < 20) return FALLBACK;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      temperature: 0,
      max_completion_tokens: 80,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: CLASSIFIER_PROMPT },
        { role: "user", content: sourceText },
      ],
    });

    const text = response.choices[0]?.message?.content;
    if (!text) return FALLBACK;

    const parsed = JSON.parse(text) as Record<string, unknown>;
    const category = parsed.category as string;
    const confidence = parsed.confidence;

    if (!VALID_CATEGORIES.has(category) || typeof confidence !== "number") {
      console.error("[contentClassifier] invalid response:", parsed);
      return FALLBACK;
    }

    if (confidence < 0.4) return FALLBACK;

    const typedCategory = category as ContentCategory;
    const action_lane = LANE[typedCategory];

    const fixedSearch = SEARCH_FIXED[typedCategory];
    const needs_search =
      fixedSearch !== undefined ? fixedSearch : Boolean(parsed.needs_search);

    return { category: typedCategory, action_lane, confidence, needs_search };
  } catch (err) {
    console.error("[contentClassifier] failed:", err instanceof Error ? err.message : err);
    return FALLBACK;
  }
}
