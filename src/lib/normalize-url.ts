// Accepts whatever the user pasted into a URL field and returns a clean
// full URL. Used by every social-media input across Settings, QR Form
// and Template editor so users can paste either `instagram.com/foo` or
// `https://instagram.com/foo` and get the same stored value.
//
// - empty string stays empty
// - bare value without a dot is rejected (returned empty) so we don't
//   accidentally save half a handle as a URL
// - `http://` is upgraded to `https://` (sane default in 2026)
// - otherwise we prefix `https://`
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^http:\/\//i.test(trimmed)) return "https://" + trimmed.slice(7);
  if (/^https:\/\//i.test(trimmed)) return trimmed;
  if (!trimmed.includes(".")) return "";
  return `https://${trimmed}`;
}
