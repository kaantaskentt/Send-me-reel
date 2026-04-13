import type { ParsedVerdict } from "./types";

export function parseVerdict(raw: string): ParsedVerdict {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

  let title = "";
  let worthSignal: import("./types").WorthSignal = null;
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

  // Backward compat: if no 🎯 section (old format), everything is body
  const body = summaryLines.join("\n\n");
  const forYou = forYouLines.join(" ");

  return {
    title: title || "Untitled",
    body: body || forYou, // fallback if somehow only forYou exists
    forYou: forYou || undefined,
    worthSignal,
    raw,
  };
}
