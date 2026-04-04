import { supabase } from "./client.js";

export async function getBalance(userId: string): Promise<number> {
  const { data } = await supabase
    .from("credits")
    .select("balance")
    .eq("user_id", userId)
    .single();

  return data?.balance ?? 0;
}

export async function deduct(userId: string, amount: number = 1): Promise<boolean> {
  const { data: credit } = await supabase
    .from("credits")
    .select("balance, lifetime_used")
    .eq("user_id", userId)
    .single();

  if (!credit || credit.balance < amount) return false;

  const { error } = await supabase
    .from("credits")
    .update({
      balance: credit.balance - amount,
      lifetime_used: credit.lifetime_used + amount,
    })
    .eq("user_id", userId);

  return !error;
}

export async function refund(userId: string, amount: number = 1): Promise<void> {
  const { data: credit } = await supabase
    .from("credits")
    .select("balance, lifetime_used")
    .eq("user_id", userId)
    .single();

  if (!credit) return;

  await supabase
    .from("credits")
    .update({
      balance: credit.balance + amount,
      lifetime_used: Math.max(0, credit.lifetime_used - amount),
    })
    .eq("user_id", userId);
}

export async function getLifetimeUsed(userId: string): Promise<number> {
  const { data } = await supabase
    .from("credits")
    .select("lifetime_used")
    .eq("user_id", userId)
    .single();

  return data?.lifetime_used ?? 0;
}
