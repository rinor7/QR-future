import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// Returns the current user's Stripe invoices for inline display on the
// Settings page. Safe to call even if the user has no subscription —
// returns an empty list so the UI can show a "no invoices yet" state.
export async function GET() {
  const cookieStore = cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ invoices: [] });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    // 24 covers two years of monthly billing — plenty for inline display
    // with a Show All toggle. Customers who need older invoices can hit
    // the Billing Portal which exposes the full history.
    const list = await stripe.invoices.list({
      customer: profile.stripe_customer_id,
      limit: 24,
    });

    const invoices = list.data.map((i) => ({
      id: i.id,
      number: i.number,
      status: i.status,            // paid | open | void | uncollectible | draft
      amount: (i.amount_paid || i.amount_due) / 100,
      currency: (i.currency ?? "chf").toUpperCase(),
      created: i.created * 1000,   // ms epoch
      pdfUrl: i.invoice_pdf,       // direct PDF download
      hostedUrl: i.hosted_invoice_url, // Stripe-hosted invoice page
    }));

    return NextResponse.json({ invoices, hasMore: list.has_more });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe invoices error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
