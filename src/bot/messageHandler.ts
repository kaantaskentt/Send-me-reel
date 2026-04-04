import type { MyContext } from "./context.js";
import { extractUrl } from "../pipeline/urlRouter.js";
import { runPipeline } from "../pipeline/orchestrator.js";

export async function handleMessage(ctx: MyContext) {
  const text = ctx.message?.text;
  if (!text) return;

  const url = extractUrl(text);
  if (!url) {
    // Not a URL — ignore silently so users can chat without triggering pipeline
    return;
  }

  // Run pipeline (don't await — let it run in background so bot stays responsive)
  runPipeline(ctx, url).catch((err) => {
    console.error("Pipeline error (unhandled):", err);
  });
}
