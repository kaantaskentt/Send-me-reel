/** Backward-compatible entry point for database-independent source evidence capture. */
import { main } from "./analyze-video.js";
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Evidence capture failed");
  process.exitCode = 1;
});
