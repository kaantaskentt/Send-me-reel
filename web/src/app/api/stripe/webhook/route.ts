import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-03-25.dahlia",
  });
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = getSupabase();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;

      if (userId) {
        // Activate premium
        await db
          .from("users")
          .update({
            premium: true,
            premium_since: new Date().toISOString(),
            stripe_customer_id: session.customer as string,
          })
          .eq("id", userId);

        // Give premium users 200 bonus credits
        const { data: credits } = await db
          .from("credits")
          .select("balance")
          .eq("user_id", userId)
          .single();

        if (credits) {
          await db
            .from("credits")
            .update({ balance: credits.balance + 200 })
            .eq("user_id", userId);
        }

        console.log(`[stripe] User ${userId} upgraded to premium`);
      }
      break;
    }

    case "customer.subscription.deleted": {
      // Subscription cancelled — remove premium
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      await db
        .from("users")
        .update({ premium: false })
        .eq("stripe_customer_id", customerId);

      console.log(`[stripe] Customer ${customerId} premium cancelled`);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
