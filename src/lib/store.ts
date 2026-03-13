import { getSupabase } from "./supabase";
import { getSupabaseBrowser } from "./supabase-browser";
import { QRContact, CreateQRContact } from "./types";

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

export async function getAllContacts(): Promise<QRContact[]> {
  const { data, error } = await getSupabase()
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(toContact);
}

export async function getContact(id: string): Promise<QRContact | null> {
  const { data, error } = await getSupabase()
    .from("contacts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return toContact(data);
}

export async function createContact(input: CreateQRContact): Promise<QRContact> {
  const supabase = getSupabaseBrowser();
  const id = generateId();

  const { data: { user } } = await supabase.auth.getUser();
  const createdBy = user?.email ?? "";

  const row = {
    id,
    ...toRow(input),
    created_by: createdBy,
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
  const { data, error } = await getSupabase()
    .from("contacts")
    .update({ ...toRow(input), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return toContact(data);
}

export async function deleteContact(id: string): Promise<void> {
  const { error } = await getSupabase().from("contacts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
