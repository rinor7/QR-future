import { NextResponse } from "next/server";
import Stripe from "stripe";

// Live Stripe price IDs (created 2026-05-17). Keep in sync with PLAN_META
// in src/app/dashboard/upgrade/page.tsx and PRICE_TO_PLAN in the webhook.
const VALID_PRICES = new Set([
  "price_1TXqLz1DHdp5yzacOTHAnrsl", // growth monthly
  "price_1TXqLz1DHdp5yzacFxKS3HrS", // growth yearly
  "price_1TXqR21DHdp5yzacdKQPyHq3", // business monthly
  "price_1TXqR21DHdp5yzacOBJ2nUnd", // business yearly
  "price_1TXqRT1DHdp5yzacOUnF63Jj", // enterprise monthly
  "price_1TXqSr1DHdp5yzacnuZ74Laj", // enterprise yearly
]);

const PRICE_TO_PLAN: Record<string, string> = {
  "price_1TXqLz1DHdp5yzacOTHAnrsl": "growth",
  "price_1TXqLz1DHdp5yzacFxKS3HrS": "growth",
  "price_1TXqR21DHdp5yzacdKQPyHq3": "business",
  "price_1TXqR21DHdp5yzacOBJ2nUnd": "business",
  "price_1TXqRT1DHdp5yzacOUnF63Jj": "enterprise",
  "price_1TXqSr1DHdp5yzacnuZ74Laj": "enterprise",
};

export async function POST(request: Request) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const { priceId, userId, userEmail } = await request.json();

    if (!VALID_PRICES.has(priceId)) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId, plan: PRICE_TO_PLAN[priceId] },
      customer_email: userEmail,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/upgrade`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe checkout error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
