import { createClient } from "@supabase/supabase-js";
import LandingClient from "./LandingClient";

export const revalidate = 0;

const PLAN_ORDER = ["free", "growth", "business", "enterprise"];

async function getPlanConfigs() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    type Row = { plan: string; price: number; price_yearly?: number | null; features: string[]; features_en?: string[] | null };
    let data: Row[] | null = (await supabase.from("plan_config").select("plan, price, price_yearly, features, features_en")).data as Row[] | null;
    if (!data) {
      // Bilingual / yearly migration may not have run — retry minimal shape.
      data = (await supabase.from("plan_config").select("plan, price, features")).data as Row[] | null;
    }
    if (!data) return null;
    return PLAN_ORDER
      .map((p) => data!.find((d) => d.plan === p))
      .filter(Boolean)
      .map((d) => ({
        ...d!,
        price_yearly: d!.price_yearly ?? 0,
        features_en: d!.features_en ?? d!.features ?? [],
      })) as { plan: string; price: number; price_yearly: number; features: string[]; features_en: string[] }[];
  } catch {
    return null;
  }
}

export default async function LandingPage() {
  const plans = await getPlanConfigs();
  return <LandingClient plans={plans} />;
}
