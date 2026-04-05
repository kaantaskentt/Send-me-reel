import type { ParsedVerdict } from "./types";

export function parseVerdict(raw: string): ParsedVerdict {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

  let title = "";
  let subtitle = "";
  let explanation = "";
  let howTo = "";
  let realWorldUse: string | undefined;
  let link: string | undefined;
  const tags: string[] = [];

  for (const line of lines) {
    if (line.startsWith("🔷")) {
      const parts = line.replace("🔷", "").trim().split("—");
      title = parts[0]?.trim() || "";
      subtitle = parts.slice(1).join("—").trim();
    } else if (line.startsWith("🧠")) {
      explanation = line.replace("🧠", "").trim();
    } else if (line.startsWith("🔧")) {
      howTo = line.replace("🔧", "").trim();
    } else if (line.startsWith("💡")) {
      realWorldUse = line.replace("💡", "").replace(/^Real-world use:\s*/i, "").trim();
    } else if (line.startsWith("🔗")) {
      link = line.replace("🔗", "").trim();
    } else if (
      line.includes("🆓") ||
      line.includes("💰") ||
      line.includes("🔓") ||
      line.includes("💻") ||
      line.includes("☁️") ||
      line.includes("🐍") ||
      line.includes("📦")
    ) {
      // Parse tag line: "🆓 Free · 🔓 Open source"
      const parts = line.split("·").map((t) => t.trim()).filter(Boolean);
      tags.push(...parts);
    }
  }

  return {
    title: title || "Untitled",
    subtitle,
    explanation,
    howTo,
    realWorldUse,
    link,
    tags: tags.length > 0 ? tags : undefined,
    raw,
  };
}
