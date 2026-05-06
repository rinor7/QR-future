import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { BRAND_NAME } from "@/lib/brand";

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const pageUrl = typeof body?.pageUrl === "string" ? body.pageUrl : "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Look up requester's org owner + role for context
  const { data: requesterProfile } = await supabase
    .from("profiles")
    .select("owner_id, role, plan, organization_name")
    .eq("user_id", user.id)
    .single();

  // Resolve platform owner's support email
  const { data: platform } = await supabase
    .from("profiles")
    .select("email, support_email")
    .eq("is_platform_admin", true)
    .limit(1)
    .maybeSingle();

  const toEmail = platform?.support_email || platform?.email;
  if (!toEmail) {
    return NextResponse.json({ error: "Platform support email not configured" }, { status: 500 });
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

  const subject = `[Support] ${name || email}`;
  const orgLabel = requesterProfile?.organization_name ? ` (${requesterProfile.organization_name})` : "";
  const text = [
    `From: ${name || "(no name)"} <${email}>${orgLabel}`,
    `User ID: ${user.id}`,
    `Auth email: ${user.email ?? "(none)"}`,
    `Role: ${requesterProfile?.role ?? "?"} · Plan: ${requesterProfile?.plan ?? "?"}`,
    pageUrl ? `Page: ${pageUrl}` : null,
    "",
    "Message:",
    message,
  ].filter(Boolean).join("\n");

  try {
    await transporter.sendMail({
      from: `"${BRAND_NAME} Support" <${smtpUser}>`,
      to: toEmail,
      replyTo: email,
      subject,
      text,
    });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Send failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
