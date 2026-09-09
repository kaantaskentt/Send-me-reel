import { createReplicationHandler } from "@/lib/replication-handler";

export const runtime = "nodejs";
export const maxDuration = 90;
export const POST = createReplicationHandler();
