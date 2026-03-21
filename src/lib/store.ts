import { getSupabase } from "./supabase";
import { getSupabaseBrowser } from "./supabase-browser";
import { QRContact, CreateQRContact, ContactLink, UserProfile, Plan, PLAN_LIMITS, Role, TeamMember } from "./types";

function generateId(): string {
  return `qr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// Map snake_case DB rows → camelCase app types
function toContact(row: Record<string, unknown>): QRContact {
  return {
    id: row.id as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    createdBy: (row.created_by as string) ?? "",
    qrLabel: (row.qr_label as string) ?? "",
    firstName: (() => { const n = (row.name as string) ?? ""; const i = n.lastIndexOf(" "); return i === -1 ? n : n.slice(0, i); })(),
    lastName: (() => { const n = (row.name as string) ?? ""; const i = n.lastIndexOf(" "); return i === -1 ? "" : n.slice(i + 1); })(),
    title: (row.title as string) ?? "",
    company: (row.company as string) ?? "",
    logoUrl: (row.logo_url as string) ?? "",
    phone: (row.phone as string) ?? "",
    email: (row.email as string) ?? "",
    website: (row.website as string) ?? "",
    linkedinUrl: (row.linkedin_url as string) ?? "",
    instagramUrl: (row.instagram_url as string) ?? "",
    facebookUrl: (row.facebook_url as string) ?? "",
    tiktokUrl: (row.tiktok_url as string) ?? "",
    snapchatUrl: (row.snapchat_url as string) ?? "",
    xUrl: (row.x_url as string) ?? "",
    otherSocialUrl: (row.other_social_url as string) ?? "",
    links: (() => {
      if (row.links && Array.isArray(row.links)) return row.links as ContactLink[];
      if (row.pdf_url) return [{ url: row.pdf_url as string, label: (row.pdf_label as string) || "Dokument öffnen", type: "link" as const }];
      return [];
    })(),
    street: (row.street as string) ?? "",
    streetNr: (row.street_nr as string) ?? "",
    plz: (row.plz as string) ?? "",
    city: (row.city as string) ?? "",
    primaryColor: (row.primary_color as string) ?? "#2563eb",
    bgImageUrl: (row.bg_image_url as string) ?? "",
    notes: (row.notes as string) ?? "",
    showLogoInQr: (row.show_logo_in_qr as boolean) ?? true,
    isActive: (row.is_active as boolean) ?? true,
  };
}

// Map camelCase app types → snake_case DB columns
function toRow(data: Partial<CreateQRContact>) {
  return {
    ...(data.qrLabel !== undefined && { qr_label: data.qrLabel }),
    ...((data.firstName !== undefined || data.lastName !== undefined) && {
      name: `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim(),
    }),
    ...(data.title !== undefined && { title: data.title }),
    ...(data.company !== undefined && { company: data.company }),
    ...(data.logoUrl !== undefined && { logo_url: data.logoUrl }),
    ...(data.phone !== undefined && { phone: data.phone }),
    ...(data.email !== undefined && { email: data.email }),
    ...(data.website !== undefined && { website: data.website }),
    ...(data.linkedinUrl !== undefined && { linkedin_url: data.linkedinUrl }),
    ...(data.instagramUrl !== undefined && { instagram_url: data.instagramUrl }),
    ...(data.facebookUrl !== undefined && { facebook_url: data.facebookUrl }),
    ...(data.tiktokUrl !== undefined && { tiktok_url: data.tiktokUrl }),
    ...(data.snapchatUrl !== undefined && { snapchat_url: data.snapchatUrl }),
    ...(data.xUrl !== undefined && { x_url: data.xUrl }),
    ...(data.otherSocialUrl !== undefined && { other_social_url: data.otherSocialUrl }),
    ...(data.links !== undefined && { links: data.links }),
    ...(data.street !== undefined && { street: data.street }),
    ...(data.streetNr !== undefined && { street_nr: data.streetNr }),
    ...(data.plz !== undefined && { plz: data.plz }),
    ...(data.city !== undefined && { city: data.city }),
    ...(data.primaryColor !== undefined && { primary_color: data.primaryColor }),
    ...(data.bgImageUrl !== undefined && { bg_image_url: data.bgImageUrl }),
    ...(data.notes !== undefined && { notes: data.notes }),
    ...(data.showLogoInQr !== undefined && { show_logo_in_qr: data.showLogoInQr }),
  };
}

// ── Profile ──────────────────────────────────────────────────────────────────

export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = getSupabaseBrowser();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error || !data) return null;

  const isPlatformAdmin = (data.is_platform_admin as boolean) ?? false;
  const ownerId = (data.owner_id as string) ?? (data.user_id as string);

  // Every org owner and their team can manage users — role === 'admin' check on the page controls actual access
  const canManageUsers = true;

  return {
    userId: data.user_id as string,
    email: data.email as string,
    plan: (data.plan as Plan) ?? "free",
    role: (data.role as Role) ?? "admin",
    ownerId,
    createdAt: data.created_at as string,
    isPlatformAdmin,
    canManageUsers,
  };
}

// ── Team members ──────────────────────────────────────────────────────────────

export async function getTeamMembers(): Promise<TeamMember[]> {
  const supabase = getSupabaseBrowser();
  // RLS policy returns only profiles in the same org
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, email, role, created_at, first_name, last_name")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    userId: row.user_id as string,
    email: row.email as string,
    firstName: (row.first_name as string) ?? "",
    lastName: (row.last_name as string) ?? "",
    role: (row.role as Role) ?? "reader",
    createdAt: row.created_at as string,
  }));
}

export async function updateTeamMemberRole(memberId: string, role: Role): Promise<void> {
  const supabase = getSupabaseBrowser();
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("user_id", memberId);
  if (error) throw new Error(error.message);
}

export async function removeTeamMember(memberId: string): Promise<void> {
  const supabase = getSupabaseBrowser();
  // Delete their profile — the auth user itself requires service role (done via API route)
  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("user_id", memberId);
  if (error) throw new Error(error.message);
}

// ── Contacts ─────────────────────────────────────────────────────────────────

// Dashboard: all contacts in the org
export async function getAllContacts(): Promise<QRContact[]> {
  const supabase = getSupabaseBrowser();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const profile = await getUserProfile();
  if (!profile) return [];

  // Filter by ownerId — covers all org members (writers store under ownerId)
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", profile.ownerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(toContact);
}

// Public QR landing page — no auth needed
export async function getContact(id: string): Promise<QRContact | null> {
  const { data, error } = await getSupabase()
    .from("contacts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return toContact(data);
}

export async function getContactCount(): Promise<number> {
  const supabase = getSupabaseBrowser();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const profile = await getUserProfile();
  if (!profile) return 0;

  const { count, error } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.ownerId);

  if (error) return 0;
  return count ?? 0;
}

export async function createContact(input: CreateQRContact): Promise<QRContact> {
  const supabase = getSupabaseBrowser();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const profile = await getUserProfile();

  // Plan limit: use owner's plan for writers
  let plan = profile?.plan ?? "free";
  if (profile?.role !== "admin") {
    // Fetch owner profile to get the correct plan
    const { data: ownerData } = await supabase
      .from("profiles")
      .select("plan")
      .eq("user_id", profile?.ownerId)
      .single();
    plan = (ownerData?.plan as Plan) ?? "free";
  }

  const limit = PLAN_LIMITS[plan];
  if (limit !== -1) {
    const count = await getContactCount();
    if (count >= limit) {
      throw new Error(`PLAN_LIMIT:${plan}:${limit}`);
    }
  }

  const id = generateId();
  const row = {
    id,
    ...toRow(input),
    created_by: user.email ?? "",
    // Writers store contacts under the admin's user_id so they appear in the org pool
    user_id: profile?.ownerId ?? user.id,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("contacts")
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return toContact(data);
}

export async function updateContact(
  id: string,
  input: Partial<CreateQRContact>
): Promise<QRContact | null> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("contacts")
    .update({ ...toRow(input), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return toContact(data);
}

function extractStoragePath(url: string): string | null {
  const marker = "/storage/v1/object/public/Uploads/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

export async function deleteContact(id: string): Promise<void> {
  const supabase = getSupabaseBrowser();

  const { data } = await supabase
    .from("contacts")
    .select("logo_url, pdf_url")
    .eq("id", id)
    .single();

  if (data) {
    const paths: string[] = [];
    if (data.logo_url) {
      const p = extractStoragePath(data.logo_url);
      if (p) paths.push(p);
    }
    if (data.pdf_url) {
      const p = extractStoragePath(data.pdf_url);
      if (p) paths.push(p);
    }
    if (paths.length > 0) {
      await supabase.storage.from("Uploads").remove(paths);
    }
  }

  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
