import { NextResponse } from "next/server";
import Stripe from "stripe";

// Monthly Stripe price IDs (legacy IDs reused after the plan rename).
// Yearly IDs are added by the user from the Stripe dashboard; until set,
// yearly checkout is disabled in the UI.
const VALID_PRICES = new Set([
  "price_1TBkP61MPl7fNPWeElDgBGsM", // growth (monthly)
  "price_1TBkPQ1MPl7fNPWehoGc86wl", // business (monthly)
  "price_1TBkPb1MPl7fNPWeD7FeszuB", // enterprise (monthly)
]);

const PRICE_TO_PLAN: Record<string, string> = {
  "price_1TBkP61MPl7fNPWeElDgBGsM": "growth",
  "price_1TBkPQ1MPl7fNPWehoGc86wl": "business",
  "price_1TBkPb1MPl7fNPWeD7FeszuB": "enterprise",
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
