import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { limiters, rateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const cookieStore = cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ok } = await rateLimit(limiters.places, user.id);
  if (!ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { searchParams } = new URL(request.url);
  const input = searchParams.get("input");
  const country = searchParams.get("country") || "ch";

  if (!input || input.length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ predictions: [] });

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", input);
  url.searchParams.set("key", key);
  url.searchParams.set("language", "de");
  url.searchParams.set("types", "address");
  url.searchParams.set("components", `country:${country}`);

  const res = await fetch(url.toString());
  const data = await res.json();

  return NextResponse.json({
    predictions: (data.predictions ?? []).map((p: { place_id: string; description: string }) => ({
      placeId: p.place_id,
      description: p.description,
    })),
  });
}
