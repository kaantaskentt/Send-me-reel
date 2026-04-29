import type { ParsedVerdict, WorthSignal } from "./types";

const NEW_FORMAT_RE = /^[\u{1F4CD}\u{1F331}\u{1F375}\u{1FA9C}]/u;
// 📍 = U+1F4CD, 🌱 = U+1F331, 🍵 = U+1F375, 🪜 = U+1FA9C

export function parseVerdict(raw: string): ParsedVerdict {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const isNewFormat = lines.some((l) => NEW_FORMAT_RE.test(l));

  if (isNewFormat) return parseNewFormat(raw, lines);
  return parseLegacyFormat(raw, lines);
}

function parseNewFormat(raw: string, lines: string[]): ParsedVerdict {
  const descriptionLines: string[] = [];
  const deeperLines: string[] = [];
  const actionLines: string[] = [];
  let noHomework = false;
  let mode: "description" | "deeper" | "action" | null = null;

  for (const line of lines) {
    if (line.startsWith("📍")) {
      mode = "description";
      const rest = line.replace("📍", "").trim();
      // Skip the section header "What this is" — we don't surface it
      if (rest && !/^what this is\??$/i.test(rest)) descriptionLines.push(rest);
    } else if (line.startsWith("🪜")) {
      mode = "deeper";
      const rest = line.replace("🪜", "").trim();
      if (rest && !/^if you want to go further\??$/i.test(rest)) deeperLines.push(rest);
    } else if (line.startsWith("🌱")) {
      mode = "action";
      const rest = line.replace("🌱", "").trim();
      if (rest && !/^try this once\??$/i.test(rest)) actionLines.push(rest);
    } else if (line.startsWith("🍵")) {
      mode = null;
      noHomework = true;
      // Anything after the 🍵 marker on the same line is ignored — the marker
      // itself is the message
    } else if (mode === "description") {
      descriptionLines.push(line);
    } else if (mode === "deeper") {
      deeperLines.push(line);
    } else if (mode === "action") {
      actionLines.push(line);
    }
  }

  const description = descriptionLines.join(" ").trim();
  const action = actionLines.join(" ").trim() || undefined;
  const deeper = deeperLines.join(" ").trim() || undefined;

  // Body for the existing dashboard renderer: keep the raw verdict (with markers)
  // so the pre-wrap render shows everything until Phase 3 redesigns the card.
  // We strip the literal section headers so it reads cleanly.
  const cleanedBody = raw
    .replace(/^📍\s*what this is\??\s*\n?/im, "📍 ")
    .replace(/^🪜\s*if you want to go further\??\s*\n?/im, "🪜 ")
    .replace(/^🌱\s*try this once\??\s*\n?/im, "🌱 ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Title: take the first sentence of the description, clipped at a natural
  // clause boundary (comma, em-dash) or last word within ~72 chars — never
  // mid-word. 72 chars ≈ 2 clean lines at 15px bold on a 600px card.
  const firstSentence = description.split(/[.!?]/)[0]?.trim() ?? "";
  function clampTitle(text: string, max = 72): string {
    if (text.length <= max) return text;
    const slice = text.slice(0, max);
    const comma = slice.lastIndexOf(", ");
    const dash = slice.lastIndexOf(" — ");
    const ndash = slice.lastIndexOf(" – ");
    const candidates = [comma, dash, ndash].filter((i) => i >= 28);
    if (candidates.length) return text.slice(0, Math.max(...candidates)).trimEnd();
    const space = slice.lastIndexOf(" ");
    return space >= 28 ? text.slice(0, space) : slice;
  }
  const title = firstSentence ? clampTitle(firstSentence) : "Untitled";

  return {
    title,
    body: cleanedBody,
    // forYou is intentionally undefined — the 🎯 box is retired in the new format
    forYou: undefined,
    // worthSignal is intentionally null — the rating axis is retired
    worthSignal: null,
    raw,
    isNewFormat: true,
    description: description || undefined,
    action,
    noHomework,
    deeper,
  };
}

function parseLegacyFormat(raw: string, lines: string[]): ParsedVerdict {
  let title = "";
  let worthSignal: WorthSignal = null;
  const summaryLines: string[] = [];
  const forYouLines: string[] = [];
  let pastTitle = false;
  let inForYou = false;

  for (const line of lines) {
    if (line.startsWith("⭐")) {
      const val = line.replace("⭐", "").trim().toLowerCase();
      if (val.includes("worth your time")) worthSignal = "worth_your_time";
      else if (val.includes("skim")) worthSignal = "skim_it";
      else if (val.includes("skip")) worthSignal = "skip";
    } else if (line.startsWith("🔷")) {
      title = line.replace("🔷", "").trim().split("—")[0]?.trim() || "";
      pastTitle = true;
    } else if (line.startsWith("🎯")) {
      inForYou = true;
      const rest = line.replace("🎯", "").trim();
      if (rest) forYouLines.push(rest);
    } else if (pastTitle) {
      // Strip legacy emoji prefixes from old verdicts
      const cleaned = line
        .replace(/^🧠\s*/, "")
        .replace(/^🔧\s*/, "")
        .replace(/^💡\s*/, "")
        .replace(/^🔗\s*/, "")
        .trim();
      if (cleaned) {
        if (inForYou) forYouLines.push(cleaned);
        else summaryLines.push(cleaned);
      }
    }
  }

  const body = summaryLines.join("\n\n");
  let forYou: string | undefined = forYouLines.join(" ") || undefined;

  // Filter out stale "nothing here for X" lines from old cached verdicts
  if (forYou && /nothing here for/i.test(forYou)) {
    forYou = undefined;
  }

  return {
    title: title || "Untitled",
    body: body || (forYou ?? ""),
    forYou,
    worthSignal,
    raw,
    isNewFormat: false,
  };
}
