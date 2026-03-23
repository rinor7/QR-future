import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await supabase
    .from("profiles")
    .select("support_email")
    .eq("is_platform_admin", true)
    .single();

  return NextResponse.json({ supportEmail: (data?.support_email as string) || null });
}
