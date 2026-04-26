/**
 * Apr 26 — extractor regression spot-check.
 *
 * Calls extractSubject() against canned inputs that mirror real production
 * cases (Kimi, Caveman, Vibeyard, Anthropic certification, news clips,
 * Sam Altman, Elon Musk, food show, etc) and prints what it picks. Confirms
 * the tightened prompt fixes "subject hijack" without regressing the
 * cases that already worked.
 */

import "dotenv/config";
import { extractSubject } from "../src/services/subjectExtractor.js";

const cases = [
  {
    label: "✓ Kimi K2.6 (should still pick Kimi K2.6)",
    input: {
      caption: "Excited to share Kimi K2.6 by Moonshot AI. Open-source coding with longer-horizon and proactive agents.",
      transcript: null,
      visualSummary: "",
      platform: "linkedin",
      sourceUrl: "https://linkedin.com/...",
      metadata: {},
    },
  },
  {
    label: "✓ Caveman (should still pick Caveman)",
    input: {
      caption: "Caveman is a Claude Code skill that strips agent output to short tokens, ~75% fewer tokens. github.com/JuliusBrussee/caveman",
      transcript: "This is a walkthrough of Caveman, a Claude Code skill that compresses agent output to caveman-speak.",
      visualSummary: "Terminal demo of Caveman in action.",
      platform: "instagram",
      sourceUrl: "https://instagram.com/...",
      metadata: {},
    },
  },
  {
    label: "✓ Vibeyard (should pick Vibeyard, NOT Claude Code)",
    input: {
      caption: "Vibeyard, an open-source live-browser for Claude Code. Click any element to edit it. github.com/elirantutia/vibeyard",
      transcript: null,
      visualSummary: "Demo of clicking elements to edit them.",
      platform: "instagram",
      sourceUrl: "https://instagram.com/...",
      metadata: {},
    },
  },
  {
    label: "✗ Anthropic Claude Certified Architect (should pick the program, NOT Anthropic)",
    input: {
      caption: "Harvard just leaked what the most in-demand AI job of 2026 is and Anthropic dropped a free program to get hired for it.",
      transcript: "Harvard just released that every major company is hiring for this one job that didn't actually even exist six months ago. And Anthropic released an entire program certification course to get you hired for it.",
      visualSummary: "The video showcases opportunities related to AI certifications, particularly with a focus on the Claude Certified Architect program by ANTHROPIC.",
      platform: "instagram",
      sourceUrl: "https://instagram.com/...",
      metadata: {},
    },
  },
  {
    label: "✗ Sam Altman on founder clarity (should pick the topic, NOT Altman bio)",
    input: {
      caption: "Sam Altman: top founders always explain their startups in under 25 words.",
      transcript: "If you can't explain it in 25 words, you'll struggle to hire, raise, or sell.",
      visualSummary: "Sam Altman speaking on stage.",
      platform: "instagram",
      sourceUrl: "https://instagram.com/...",
      metadata: { authorName: "Sam Altman" },
    },
  },
  {
    label: "✗ Musk on TerraFab (should pick TerraFab)",
    input: {
      caption: "Elon Musk announces TerraFab — joint XAI/Tesla/SpaceX chip factory, 200B chips/year.",
      transcript: "Musk talks about a chip factory called TerraFab. 80% of compute headed to AI satellites in space.",
      visualSummary: "Slides about TerraFab chip factory.",
      platform: "instagram",
      sourceUrl: "https://instagram.com/...",
      metadata: { authorName: "Elon Musk" },
    },
  },
  {
    label: "✗ News clip mentioning Kimberly-Clark (should return null)",
    input: {
      caption: "Massive warehouse fire. Suspect cites low pay.",
      transcript: "An Ontario warehouse owned by Kimberly-Clark and operated by NFI Industries went up in flames yesterday.",
      visualSummary: "News footage of a warehouse fire, fire trucks.",
      platform: "instagram",
      sourceUrl: "https://instagram.com/...",
      metadata: {},
    },
  },
  {
    label: "✗ Food show called Square Sambos (should return null)",
    input: {
      caption: "Episode 1 of Square Sambos: steak frites toastie.",
      transcript: "Today on Square Sambos we're making a steak frites toastie. Mozzarella, BBQ steak, chimichurri.",
      visualSummary: "Food preparation montage. Square branding visible.",
      platform: "instagram",
      sourceUrl: "https://instagram.com/...",
      metadata: {},
    },
  },
  {
    label: "✗ Yo-yo trick video (should return null)",
    input: {
      caption: "Just got my new Aura yo-yo, took it for a spin.",
      transcript: "",
      visualSummary: "Slow-motion yo-yo trick video set to music.",
      platform: "instagram",
      sourceUrl: "https://instagram.com/...",
      metadata: {},
    },
  },
];

async function main() {
  for (const c of cases) {
    const r = await extractSubject(c.input);
    const summary = r ? `${r.name} (${r.type}, ${r.confidence})` : "null (skipped enrichment)";
    console.log(`${c.label}\n  → ${summary}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
