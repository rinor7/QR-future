import { createClient } from "@supabase/supabase-js";
import LandingClient from "./LandingClient";

const PLAN_ORDER = ["free", "star", "premium", "platinum"];

async function getPlanConfigs() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    type Row = { plan: string; price: number; features: string[]; features_en?: string[] | null };
    let data: Row[] | null = (await supabase.from("plan_config").select("plan, price, features, features_en")).data as Row[] | null;
    if (!data) {
      // Bilingual migration may not have run — retry without features_en.
      data = (await supabase.from("plan_config").select("plan, price, features")).data as Row[] | null;
    }
    if (!data) return null;
    return PLAN_ORDER
      .map((p) => data!.find((d) => d.plan === p))
      .filter(Boolean)
      .map((d) => ({ ...d!, features_en: d!.features_en ?? d!.features ?? [] })) as { plan: string; price: number; features: string[]; features_en: string[] }[];
  } catch {
    return null;
  }
}

export default async function LandingPage() {
  const plans = await getPlanConfigs();
  return <LandingClient plans={plans} />;
}
