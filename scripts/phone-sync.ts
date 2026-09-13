/** Imports local shared links and this paired owner's completed cloud analyses. Never polls or sends Telegram updates. */
import "dotenv/config";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { getPhoneInboxStatus, phoneWorkerHeartbeat, syncPhoneInbox } from "../web/src/lib/local-phone-inbox.js";
import { syncShareInbox } from "../web/src/lib/local-share-inbox.js";

export async function runPhoneSync(root = path.resolve(".contextdrop"), signal?: AbortSignal) {
  let lastError: string | null = null;
  let lastShareError: string | null = null;
  while (!signal?.aborted) {
    // This independent, local-only path still works when the cloud database is unavailable.
    try {
      const share = await syncShareInbox({ root });
      if (share.error && share.error !== lastShareError) console.error(`[phone-inbox] ${share.error}`);
      lastShareError = share.error ?? null;
    } catch {
      const message = "Local shared links could not sync. Original iCloud files are unchanged.";
      if (message !== lastShareError) console.error(`[phone-inbox] ${message}`);
      lastShareError = message;
    }
    try {
      await phoneWorkerHeartbeat(root);
      const status = await getPhoneInboxStatus({ root });
      if (status.paired && status.configured) {
        const result = await syncPhoneInbox({ root });
        if (result.newCount) console.log(`[phone-inbox] Imported ${result.newCount} saved source(s).`);
        lastError = null;
      }
    } catch {
      const message = "Phone delivery is temporarily offline; saved cloud items will retry.";
      if (message !== lastError) console.error(`[phone-inbox] ${message}`);
      lastError = message;
    }
    await delay(15_000, undefined, { signal }).catch(() => {});
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const controller = new AbortController();
  process.once("SIGTERM", () => controller.abort());
  process.once("SIGINT", () => controller.abort());
  process.once("SIGHUP", () => controller.abort());
  runPhoneSync(path.resolve(".contextdrop"), controller.signal).catch(() => { console.error("[phone-inbox] Phone delivery stopped. Restart the local app to retry."); process.exitCode = 1; });
}
