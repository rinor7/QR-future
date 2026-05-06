export function getGeoFromHeaders(req: Request): { country: string | null; city: string | null } {
  const code = req.headers.get("x-vercel-ip-country");
  const cityRaw = req.headers.get("x-vercel-ip-city");

  let country: string | null = null;
  if (code) {
    try {
      country = new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
    } catch {
      country = code;
    }
  }

  return {
    country,
    city: cityRaw ? decodeURIComponent(cityRaw) : null,
  };
}
