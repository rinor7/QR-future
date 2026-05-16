import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Live Stripe price IDs (created 2026-05-17). Keep in sync with
// PLAN_META in src/app/dashboard/upgrade/page.tsx and VALID_PRICES in
// the checkout route.
const PRICE_TO_PLAN: Record<string, string> = {
  "price_1TXqLz1DHdp5yzacOTHAnrsl": "growth",     // growth monthly
  "price_1TXqLz1DHdp5yzacFxKS3HrS": "growth",     // growth yearly
  "price_1TXqR21DHdp5yzacdKQPyHq3": "business",   // business monthly
  "price_1TXqR21DHdp5yzacOBJ2nUnd": "business",   // business yearly
  "price_1TXqRT1DHdp5yzacOUnF63Jj": "enterprise", // enterprise monthly
  "price_1TXqSr1DHdp5yzacnuZ74Laj": "enterprise", // enterprise yearly
};

const PLAN_LIMITS: Record<string, number> = {
  free: 1,
  growth: 10,
  business: 100,
  enterprise: -1,
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function pauseExcessContacts(supabase: ReturnType<typeof getSupabase>, ownerId: string, plan: string) {
  const limit = PLAN_LIMITS[plan] ?? 1;

  // Reactivate all first, then pause excess (handles upgrades too)
  await supabase.from("contacts").update({ is_active: true }).eq("user_id", ownerId);

  if (limit === -1) return; // unlimited — all stay active

  // Get all contacts ordered oldest first — keep oldest N active, pause the rest
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id")
    .eq("user_id", ownerId)
    .order("created_at", { ascending: true });

  if (!contacts || contacts.length <= limit) return;

  const excessIds = contacts.slice(limit).map((c) => c.id);
  await supabase.from("contacts").update({ is_active: false }).in("id", excessIds);
}

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getSupabase();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan;
    const customerId = session.customer as string;

    if (userId && plan) {
      // Save plan + stripe customer ID
      await supabase.from("profiles").update({ plan, stripe_customer_id: customerId }).eq("user_id", userId);
      // Reactivate all contacts (they just upgraded)
      await pauseExcessContacts(supabase, userId, plan);
    }
  }

  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = sub.customer as string;
    const priceId = sub.items.data[0]?.price.id;
    const plan = PRICE_TO_PLAN[priceId] ?? "free";

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (profile) {
      await supabase.from("profiles").update({ plan }).eq("user_id", profile.user_id);
      await pauseExcessContacts(supabase, profile.user_id, plan);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = sub.customer as string;

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (profile) {
      await supabase.from("profiles").update({ plan: "free" }).eq("user_id", profile.user_id);
      await pauseExcessContacts(supabase, profile.user_id, "free");
    }
  }

  return NextResponse.json({ received: true });
}
