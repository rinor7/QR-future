import { NextResponse } from "next/server";

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("placeId");

  if (!placeId) return NextResponse.json({ result: null });

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ result: null });

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("key", key);
  url.searchParams.set("fields", "address_components");
  url.searchParams.set("language", "de");

  const res = await fetch(url.toString());
  const data = await res.json();

  const components: AddressComponent[] = data.result?.address_components ?? [];

  const get = (type: string) =>
    components.find((c) => c.types.includes(type))?.long_name ?? "";

  return NextResponse.json({
    street: get("route"),
    streetNr: get("street_number"),
    plz: get("postal_code"),
    city: get("locality") || get("postal_town"),
  });
}
