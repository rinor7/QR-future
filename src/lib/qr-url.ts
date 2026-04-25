export function getQRUrl(id: string): string {
  if (typeof window === "undefined") return `/qr/${id}`;
  const customDomain = localStorage.getItem("qr_custom_domain");
  const base = customDomain ? `https://${customDomain}` : window.location.origin;
  return `${base}/qr/${id}`;
}
