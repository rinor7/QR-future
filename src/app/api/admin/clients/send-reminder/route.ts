import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { BRAND_NAME } from "@/lib/brand";

type RecipientResult = { email: string; ok: boolean; error?: string };

export async function POST(req: NextRequest) {
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
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("is_platform_admin, email")
    .eq("user_id", user.id)
    .single();

  if (!myProfile?.is_platform_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const recipients: { email: string; subject: string; body: string }[] = body.recipients ?? [];
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return NextResponse.json({ error: "No recipients" }, { status: 400 });
  }

  const smtpHost = process.env.M365_SMTP_HOST;
  const smtpPort = Number(process.env.M365_SMTP_PORT ?? 587);
  const smtpUser = process.env.M365_NOREPLY_USER;
  const smtpPass = process.env.M365_NOREPLY_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    return NextResponse.json({ error: "SMTP not configured" }, { status: 500 });
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: false,
    requireTLS: true,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const replyTo = myProfile.email || smtpUser;
  const results: RecipientResult[] = [];

  for (const r of recipients) {
    if (!r?.email || !r?.subject || !r?.body) {
      results.push({ email: r?.email ?? "", ok: false, error: "Missing field" });
      continue;
    }
    try {
      await transporter.sendMail({
        from: `"${BRAND_NAME}" <${smtpUser}>`,
        to: r.email,
        replyTo,
        subject: r.subject,
        text: r.body,
      });
      results.push({ email: r.email, ok: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Send failed";
      results.push({ email: r.email, ok: false, error: msg });
    }
  }

  return NextResponse.json({ results });
}
