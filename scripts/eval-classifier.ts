import { classifyContent } from "../src/services/contentClassifier.js";

interface EvalCase {
  id: number;
  difficulty: "easy" | "medium" | "hard";
  description: string;
  expected_category: string;
  expected_action_lane: string;
}

const CASES: EvalCase[] = [
  { id: 1,  difficulty: "easy",   description: "Reel about MiroFish, an open-source AI crowd simulation tool. Creator demos hundreds of agents with personas reacting to scenarios.", expected_category: "named_tool", expected_action_lane: "open_it" },
  { id: 2,  difficulty: "easy",   description: "OpenClawBot reel. Open-source autonomous AI agent platform that runs locally and does computer tasks via LLM workflows. URL: openclaw.im", expected_category: "named_tool", expected_action_lane: "open_it" },
  { id: 3,  difficulty: "easy",   description: "Mem0 quickstart demo. Memory layer for AI agents, 5 lines of code to add persistent memory.", expected_category: "named_tool", expected_action_lane: "open_it" },
  { id: 4,  difficulty: "easy",   description: "Reel: 'I used Cursor for 30 days and here's what I think.' Creator argues tab-completion is the real unlock, not chat.", expected_category: "creator_review", expected_action_lane: "open_it" },
  { id: 5,  difficulty: "medium", description: "Comparison reel: Claude Code vs Cursor for real engineering. Creator says different tools, not competitors.", expected_category: "creator_review", expected_action_lane: "open_it" },
  { id: 6,  difficulty: "medium", description: "Tutorial reel: Build a RAG agent with LangChain and Pinecone in 5 minutes.", expected_category: "tutorial", expected_action_lane: "open_it" },
  { id: 7,  difficulty: "medium", description: "Tutorial: 3-folder note system (today / this week / archive). No software, just folders.", expected_category: "tutorial", expected_action_lane: "open_it" },
  { id: 8,  difficulty: "easy",   description: "Reel: 'Answer first, then explain' is a prompt pattern that reduces hallucinations by making the model commit early.", expected_category: "technique", expected_action_lane: "open_it" },
  { id: 9,  difficulty: "easy",   description: "5-minute miso pasta. Butter, miso, garlic, parm, lemon. Trick: whisk miso into pasta water.", expected_category: "recipe", expected_action_lane: "save_for_later" },
  { id: 10, difficulty: "easy",   description: "No-knead bread Tartine method. 12-hour cold rise, Dutch oven.", expected_category: "recipe", expected_action_lane: "save_for_later" },
  { id: 11, difficulty: "medium", description: "Recipe reel that mentions Anova sous vide as the tool used for the egg cooking step.", expected_category: "recipe", expected_action_lane: "save_for_later" },
  { id: 12, difficulty: "easy",   description: "Muji HIT lamp, $40, warm LED, paper-shade aesthetic. Sold direct on muji.com.", expected_category: "product", expected_action_lane: "shop_this" },
  { id: 13, difficulty: "easy",   description: "Baronfig Notion-style planner, dot-grid, lays flat, $32.", expected_category: "product", expected_action_lane: "shop_this" },
  { id: 14, difficulty: "medium", description: "Atomix two-Michelin Korean tasting in Midtown Manhattan, $375pp, books two months out.", expected_category: "place", expected_action_lane: "save_for_later" },
  { id: 15, difficulty: "medium", description: "Bar Pleiades inside the Surrey Hotel, UES. Martinis, Audrey Hepburn vibe, $24 cocktails.", expected_category: "place", expected_action_lane: "save_for_later" },
  { id: 16, difficulty: "easy",   description: "90/90 hip stretch. Both shins at right angles, sink forward over front leg, hold 60 seconds per side.", expected_category: "exercise", expected_action_lane: "open_it" },
  { id: 17, difficulty: "easy",   description: "3-minute morning breathing: 4 in, 7 hold, 8 out. Five rounds.", expected_category: "exercise", expected_action_lane: "open_it" },
  { id: 18, difficulty: "medium", description: "2-minute drawing warm-up: 30 blind contour faces, 30 seconds each.", expected_category: "practice", expected_action_lane: "save_for_later" },
  { id: 19, difficulty: "medium", description: "Spanish sentence-mining drill: pick one TV scene, transcribe one line, translate, repeat next day.", expected_category: "practice", expected_action_lane: "save_for_later" },
  { id: 20, difficulty: "easy",   description: "3 rules for 1:1s: let them set agenda, ask 'what's draining you,' end with one specific commitment.", expected_category: "advice", expected_action_lane: "chat_about" },
  { id: 21, difficulty: "medium", description: "'Smallest reversible decision' rule for getting unstuck. Pick the smallest version of the choice you can undo.", expected_category: "advice", expected_action_lane: "chat_about" },
  { id: 22, difficulty: "medium", description: "Transformer attention explained: each token looks at every other token, weighted by learned relevance.", expected_category: "concept", expected_action_lane: "chat_about" },
  { id: 23, difficulty: "medium", description: "Jobs-to-be-Done explained: customers don't buy products, they hire them for a job.", expected_category: "concept", expected_action_lane: "chat_about" },
  { id: 24, difficulty: "easy",   description: "Hot-take thread: training compute spending is outpacing AI revenue 4x, capex bubble looks like 1999.", expected_category: "commentary", expected_action_lane: "just_a_watch" },
  { id: 25, difficulty: "easy",   description: "Take: remote work productivity numbers are misleading; the real shift is in how teams form and dissolve.", expected_category: "commentary", expected_action_lane: "just_a_watch" },
  { id: 26, difficulty: "easy",   description: "Story: how she quit FAANG, moved to Lisbon, went broke twice, ended up running a 6-person studio.", expected_category: "story", expected_action_lane: "just_a_watch" },
  { id: 27, difficulty: "medium", description: "Story: time he almost died on a solo hike in Patagonia. Lesson: prep for the injured version of yourself.", expected_category: "story", expected_action_lane: "just_a_watch" },
  { id: 28, difficulty: "easy",   description: "90-second comedy sketch on AI-bro overconfidence at startup demo days.", expected_category: "entertainment", expected_action_lane: "just_a_watch" },
  { id: 29, difficulty: "easy",   description: "4 minutes of slow drone shots over Hokkaido in winter, with a strong score.", expected_category: "entertainment", expected_action_lane: "just_a_watch" },
  { id: 30, difficulty: "hard",   description: "Reel where a creator reviews a recipe app called Paprika. Half the content is the app, half is them cooking from it.", expected_category: "creator_review", expected_action_lane: "open_it" },
  { id: 31, difficulty: "hard",   description: "Influencer's morning routine: cold plunge, journal, gym. No specific product or tool named.", expected_category: "advice", expected_action_lane: "chat_about" },
  { id: 32, difficulty: "hard",   description: "News-report-style reel: 'Anthropic just released Claude Opus 4.7.' Lists key specs and benchmarks.", expected_category: "commentary", expected_action_lane: "just_a_watch" },
  { id: 33, difficulty: "hard",   description: "Reel: 'this is the best $20 you'll spend on a kitchen tool' — a Microplane grater.", expected_category: "product", expected_action_lane: "shop_this" },
  { id: 34, difficulty: "hard",   description: "Reel of someone explaining 'box breathing' as a technique used by Navy SEALs. Lists the 4-4-4-4 pattern.", expected_category: "exercise", expected_action_lane: "open_it" },
  { id: 35, difficulty: "hard",   description: "Reel: 'use this prompt to make ChatGPT 10x better.' Pastes a long prompt template.", expected_category: "technique", expected_action_lane: "open_it" },
];

interface ResultRow {
  id: number;
  difficulty: string;
  passed: boolean;
  predicted_category: string;
  expected_category: string;
  predicted_lane: string;
  expected_lane: string;
  confidence: number;
}

async function run() {
  console.log("Running full eval set (35 rows)...\n");

  const results: ResultRow[] = [];

  // Run all cases in parallel
  const settled = await Promise.allSettled(
    CASES.map(async (tc) => {
      const result = await classifyContent({
        transcript: tc.description,
        caption: tc.description,
        visualSummary: "",
        platform: "instagram",
        sourceUrl: "https://example.com",
      });
      return { tc, result };
    }),
  );

  for (const s of settled) {
    if (s.status === "rejected") {
      console.error("Case failed:", s.reason);
      continue;
    }
    const { tc, result } = s.value;
    const catOk = result.category === tc.expected_category;
    const laneOk = result.action_lane === tc.expected_action_lane;
    results.push({
      id: tc.id,
      difficulty: tc.difficulty,
      passed: catOk && laneOk,
      predicted_category: result.category,
      expected_category: tc.expected_category,
      predicted_lane: result.action_lane,
      expected_lane: tc.expected_action_lane,
      confidence: result.confidence,
    });
  }

  results.sort((a, b) => a.id - b.id);

  // --- By difficulty ---
  const byDiff: Record<string, { pass: number; total: number; misses: ResultRow[] }> = {
    easy:   { pass: 0, total: 0, misses: [] },
    medium: { pass: 0, total: 0, misses: [] },
    hard:   { pass: 0, total: 0, misses: [] },
  };

  for (const r of results) {
    const d = byDiff[r.difficulty];
    d.total++;
    if (r.passed) d.pass++;
    else d.misses.push(r);
  }

  const total = results.length;
  const totalPass = results.filter((r) => r.passed).length;

  console.log("=== SCORE BREAKDOWN ===\n");
  for (const diff of ["easy", "medium", "hard"] as const) {
    const { pass, total: t, misses } = byDiff[diff];
    const pct = Math.round((pass / t) * 100);
    console.log(`${diff.toUpperCase().padEnd(8)} ${pass}/${t}  (${pct}%)`);
    for (const m of misses) {
      console.log(
        `  ❌ row ${m.id}: predicted "${m.predicted_category}" (conf ${m.confidence.toFixed(2)}) — expected "${m.expected_category}"`,
      );
    }
  }

  console.log(`\nOVERALL  ${totalPass}/${total}  (${Math.round((totalPass / total) * 100)}%)`);

  // --- Full table ---
  console.log("\n=== FULL RESULTS ===\n");
  console.log("ID  DIFF    PASS  CONF  PREDICTED            EXPECTED");
  for (const r of results) {
    const mark = r.passed ? "✅" : "❌";
    console.log(
      `${String(r.id).padStart(2)}  ${r.difficulty.padEnd(6)}  ${mark}   ${r.confidence.toFixed(2)}  ${r.predicted_category.padEnd(20)} ${r.expected_category}`,
    );
  }
}

run().catch(console.error);
