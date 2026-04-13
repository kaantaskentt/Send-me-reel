import type { ParsedVerdict } from "./types";

export function parseVerdict(raw: string): ParsedVerdict {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

  let title = "";
  let worthSignal: import("./types").WorthSignal = null;
  const bodyLines: string[] = [];
  let pastTitle = false;

  for (const line of lines) {
    if (line.startsWith("⭐")) {
      const val = line.replace("⭐", "").trim().toLowerCase();
      if (val.includes("worth your time")) worthSignal = "worth_your_time";
      else if (val.includes("skim")) worthSignal = "skim_it";
      else if (val.includes("skip")) worthSignal = "skip";
    } else if (line.startsWith("🔷")) {
      title = line.replace("🔷", "").trim().split("—")[0]?.trim() || "";
      pastTitle = true;
    } else if (pastTitle) {
      // Strip legacy emoji prefixes from old verdicts so they render cleanly
      const cleaned = line
        .replace(/^🧠\s*/, "")
        .replace(/^🔧\s*/, "")
        .replace(/^💡\s*/, "")
        .replace(/^🔗\s*/, "")
        .trim();
      if (cleaned) bodyLines.push(cleaned);
    }
  }

  return {
    title: title || "Untitled",
    body: bodyLines.join("\n\n"),
    worthSignal,
    raw,
  };
}
