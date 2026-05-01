/**
 * Title extraction regression set — tests the verdict-parser title logic.
 * Inlined from web/src/lib/verdict-parser.ts to avoid cross-project import issues.
 *
 * Run: npx tsx scripts/eval-titles.ts
 * Add a row whenever a new title shape is validated in production.
 */

function extractTitle(verdictRaw: string): string {
  const lines = verdictRaw.split("\n").map((l) => l.trim()).filter(Boolean);
  const descLines: string[] = [];
  let mode: "desc" | null = null;

  for (const line of lines) {
    if (line.startsWith("📍")) {
      mode = "desc";
      const rest = line.replace("📍", "").trim();
      if (rest) descLines.push(rest);
    } else if (/^[🪜🌱🍵🛍💾💬💭]/.test(line)) {
      break;
    } else if (mode === "desc") {
      descLines.push(line);
    }
  }

  const description = descLines.join(" ").trim();
  const firstSentence = description.split(/[.!?]/)[0]?.trim() ?? "";
  const titleText = firstSentence
    .replace(/^Per the creator:\s*/i, "")
    .replace(/ is an? /, " — ")
    .replace(/ is /, " — ");

  function clampTitle(text: string, max = 69): string {
    if (text.length <= max) return text;
    const slice = text.slice(0, max);
    const comma = slice.lastIndexOf(", ");
    const candidates = [comma].filter((i) => i >= 28);
    if (candidates.length) return text.slice(0, Math.max(...candidates)).trimEnd();
    const space = slice.lastIndexOf(" ");
    return space >= 28 ? text.slice(0, space) : slice;
  }

  return titleText ? clampTitle(titleText) : "Untitled";
}

interface TitleCase {
  label: string;
  verdict: string;
  expected: string;
}

const CASES: TitleCase[] = [
  {
    label: "named_tool — subject + possessive descriptor",
    verdict: `📍 webclaw is 0xMassi's open-source web extraction toolkit for AI agents and LLMs. It scrapes, crawls, and returns structured site data via CLI, REST API, and MCP. github.com/0xMassi/webclaw\n\n🍵 Just a watch`,
    expected: "webclaw — 0xMassi's open-source web extraction toolkit for AI agents",
  },
  {
    label: "named_tool — clean subject + descriptor (under 72)",
    verdict: `📍 Google NotebookLM is Google's AI research and study notebook. It turns your uploaded notes and PDFs into summaries, quizzes, flashcards, and Audio Overviews you can chat with. notebooklm.google.com\n\n🌱 Try this once\nOpen NotebookLM, upload one PDF, and ask "Make me 5 flashcards from this."`,
    expected: "Google NotebookLM — Google's AI research and study notebook",
  },
  {
    label: "exercise — 'is a' stripped, clips at space",
    verdict: `📍 Full Body Mobility Routine is a bodyweight stretching sequence for hip and general mobility. It includes frog squat + turn, world's greatest stretch, hip switches, circles, and child pose + cobra.\n\n🌱 Try this once\nDo one round of "world's greatest stretch" on each side today.`,
    expected: "Full Body Mobility Routine — bodyweight stretching sequence for hip",
  },
  {
    label: "recipe — no 'is', first sentence is the title",
    verdict: `📍 Cheesy roasted garlic & shallot dip. Roasting the garlic and shallot until caramelized gives it the smooth, sweet base that makes the creamy cheese mixture work.\n\n💾 Save for later\nAdd this to your next game day snack list.`,
    expected: "Cheesy roasted garlic & shallot dip",
  },
  {
    label: "commentary — 'Per X:' format, no 'is', clips at comma",
    verdict: `📍 Per Even Realities: Even G2 smart glasses now have Terminal Mode, a control layer for AI coding agents. It pitches coding and issuing commands away from a fixed screen.\n\n💭 What Even Realities says\nCoding does not need to stay tied to a laptop.`,
    expected: "Per Even Realities: Even G2 smart glasses now have Terminal Mode",
  },
  {
    label: "commentary — 'Per the creator:' stripped from title",
    verdict: `📍 Per the creator: OpenClaw and ClawBot will split business owners into adopters and laggards, because anything done on a computer may soon be automated.\n\n💭 What they argue\nThe bigger risk is waiting too long and ending up behind the ones who adopt early.`,
    expected: "OpenClaw and ClawBot will split business owners into adopters and",
  },
];

let passed = 0;
for (const c of CASES) {
  const title = extractTitle(c.verdict);
  const ok = title === c.expected;
  if (ok) {
    console.log(`✅  ${c.label}`);
    passed++;
  } else {
    console.log(`❌  ${c.label}`);
    console.log(`    expected: ${c.expected}`);
    console.log(`    got:      ${title}`);
  }
}

console.log(`\n${passed}/${CASES.length} passing`);
