import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  // Verify the request comes from Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Delete contacts older than 48H that belong to free-plan users
  const { error, count } = await supabase
    .from("contacts")
    .delete({ count: "exact" })
    .in(
      "user_id",
      supabase.from("profiles").select("user_id").eq("plan", "free")
    )
    .lt("created_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

  if (error) {
    console.error("Cleanup error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: count });
}
