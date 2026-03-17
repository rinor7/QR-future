import { getSupabase } from "./supabase";
import { getSupabaseBrowser } from "./supabase-browser";
import { QRContact, CreateQRContact, UserProfile, Plan, PLAN_LIMITS } from "./types";

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
    name: (row.name as string) ?? "",
    title: (row.title as string) ?? "",
    company: (row.company as string) ?? "",
    logoUrl: (row.logo_url as string) ?? "",
    phone: (row.phone as string) ?? "",
    email: (row.email as string) ?? "",
    website: (row.website as string) ?? "",
    linkedinUrl: (row.linkedin_url as string) ?? "",
    instagramUrl: (row.instagram_url as string) ?? "",
    facebookUrl: (row.facebook_url as string) ?? "",
    pdfUrl: (row.pdf_url as string) ?? "",
    pdfLabel: (row.pdf_label as string) ?? "Dokument öffnen",
    address: (row.address as string) ?? "",
    primaryColor: (row.primary_color as string) ?? "#2563eb",
    notes: (row.notes as string) ?? "",
  };
}

// Map camelCase app types → snake_case DB columns
function toRow(data: Partial<CreateQRContact>) {
  return {
    ...(data.name !== undefined && { name: data.name }),
    ...(data.title !== undefined && { title: data.title }),
    ...(data.company !== undefined && { company: data.company }),
    ...(data.logoUrl !== undefined && { logo_url: data.logoUrl }),
    ...(data.phone !== undefined && { phone: data.phone }),
    ...(data.email !== undefined && { email: data.email }),
    ...(data.website !== undefined && { website: data.website }),
    ...(data.linkedinUrl !== undefined && { linkedin_url: data.linkedinUrl }),
    ...(data.instagramUrl !== undefined && { instagram_url: data.instagramUrl }),
    ...(data.facebookUrl !== undefined && { facebook_url: data.facebookUrl }),
    ...(data.pdfUrl !== undefined && { pdf_url: data.pdfUrl }),
    ...(data.pdfLabel !== undefined && { pdf_label: data.pdfLabel }),
    ...(data.address !== undefined && { address: data.address }),
    ...(data.primaryColor !== undefined && { primary_color: data.primaryColor }),
    ...(data.notes !== undefined && { notes: data.notes }),
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

  return {
    userId: data.user_id as string,
    email: data.email as string,
    plan: (data.plan as Plan) ?? "free",
    createdAt: data.created_at as string,
  };
}

// ── Contacts ─────────────────────────────────────────────────────────────────

// Dashboard: only current user's contacts
export async function getAllContacts(): Promise<QRContact[]> {
  const supabase = getSupabaseBrowser();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", user.id)
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

  const { count, error } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (error) return 0;
  return count ?? 0;
}

export async function createContact(input: CreateQRContact): Promise<QRContact> {
  const supabase = getSupabaseBrowser();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check plan limit
  const profile = await getUserProfile();
  const plan = profile?.plan ?? "free";
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
    user_id: user.id,
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

  // Clean up any uploaded files from storage
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
