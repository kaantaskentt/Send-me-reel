import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-03-25.dahlia",
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabase();
  const { data: user } = await db
    .from("users")
    .select("stripe_customer_id")
    .eq("id", session.sub)
    .single();

  if (!user?.stripe_customer_id) {
    return NextResponse.json({ error: "No subscription found" }, { status: 400 });
  }

  const stripe = getStripe();
  const baseUrl = request.nextUrl.origin;

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${baseUrl}/dashboard`,
  });

  return NextResponse.json({ url: portalSession.url });
}
