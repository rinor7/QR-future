import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Step 1: get all free-plan user IDs
  const { data: freeUsers, error: profilesError } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("plan", "free");

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const userIds = (freeUsers ?? []).map((r: { user_id: string }) => r.user_id);
  if (userIds.length === 0) {
    return NextResponse.json({ deleted: 0 });
  }

  // Step 2: delete their contacts older than 48H
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { error, count } = await supabase
    .from("contacts")
    .delete({ count: "exact" })
    .in("user_id", userIds)
    .lt("created_at", cutoff);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: count });
}
