import { supabase } from "./client.js";

export async function getBalance(userId: string): Promise<number> {
  const { data } = await supabase
    .from("credits")
    .select("balance")
    .eq("user_id", userId)
    .single();

  return data?.balance ?? 0;
}

export async function getLifetimeUsed(userId: string): Promise<number> {
  const { data } = await supabase
    .from("credits")
    .select("lifetime_used")
    .eq("user_id", userId)
    .single();

  return data?.lifetime_used ?? 0;
}

/** Analysis-scoped and safe to retry after an uncertain response. Requires migration 022. */
export async function refundAnalysis(analysisId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("refund_analysis_credit", { p_analysis_id: analysisId });
  if (error) throw new Error(`Analysis credit refund failed: ${error.message}`);
  if (typeof data !== "boolean") throw new Error("Analysis credit refund returned an invalid result");
  return data;
}
