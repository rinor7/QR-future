// Shared QR download logic used by /dashboard/edit/[id] and /dashboard/codes.
// Renders the QR's <svg> element to the requested format and triggers a
// browser download. Supports an optional logo overlay (drawn centred with
// a white pad behind it, same look as the dashboard preview).

import { jsPDF } from "jspdf";

export type QRFormat = "png" | "svg" | "pdf";

export interface QRDownloadOptions {
  svgEl: SVGElement;
  id: string;
  format: QRFormat;
  logoUrl?: string;
  /** PNG/PDF export size in pixels. Defaults to 400. SVG is rendered at this size too. */
  size?: number;
}

/** Renders the QR SVG + optional centred logo to a canvas. Resolves with
 *  the canvas once everything's drawn. Used by PNG + PDF paths. */
function renderToCanvas(opts: { svgEl: SVGElement; size: number; logoUrl?: string }): Promise<HTMLCanvasElement> {
  const { svgEl, size, logoUrl } = opts;
  return new Promise((resolve, reject) => {
    const clone = svgEl.cloneNode(true) as SVGElement;
    clone.setAttribute("width", String(size));
    clone.setAttribute("height", String(size));
    const svgData = new XMLSerializer().serializeToString(clone);
    const svgUrl = URL.createObjectURL(new Blob([svgData], { type: "image/svg+xml;charset=utf-8" }));
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) { reject(new Error("Canvas 2D not available")); return; }

    const qrImg = new Image();
    qrImg.onload = () => {
      ctx.drawImage(qrImg, 0, 0, size, size);
      URL.revokeObjectURL(svgUrl);

      if (!logoUrl) { resolve(canvas); return; }

      const logoSize = Math.round(size * 0.32);
      const padding = Math.round(logoSize * 0.1);
      const offset = (size - logoSize) / 2;
      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      logoImg.onload = () => {
        const scale = Math.min(logoSize / logoImg.naturalWidth, logoSize / logoImg.naturalHeight);
        const drawW = logoImg.naturalWidth * scale;
        const drawH = logoImg.naturalHeight * scale;
        const drawX = offset + (logoSize - drawW) / 2;
        const drawY = offset + (logoSize - drawH) / 2;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(offset - padding, offset - padding, logoSize + padding * 2, logoSize + padding * 2);
        ctx.drawImage(logoImg, drawX, drawY, drawW, drawH);
        resolve(canvas);
      };
      // If the logo fails to load (CORS etc.), still produce a logo-less QR.
      logoImg.onerror = () => resolve(canvas);
      logoImg.src = logoUrl;
    };
    qrImg.onerror = (e) => reject(e);
    qrImg.src = svgUrl;
  });
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
}

export async function downloadQR({ svgEl, id, format, logoUrl, size = 400 }: QRDownloadOptions) {
  if (format === "svg") {
    // Pure vector — no canvas, no logo merging needed. The logo on the live
    // landing page is drawn from CSS, so for SVG export we keep the QR alone
    // (cleaner for print + embedding).
    const clone = svgEl.cloneNode(true) as SVGElement;
    clone.setAttribute("width", String(size));
    clone.setAttribute("height", String(size));
    const data = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(new Blob([data], { type: "image/svg+xml;charset=utf-8" }));
    triggerDownload(url, `qr-${id}.svg`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  const canvas = await renderToCanvas({ svgEl, size, logoUrl });

  if (format === "png") {
    triggerDownload(canvas.toDataURL("image/png"), `qr-${id}.png`);
    return;
  }

  if (format === "pdf") {
    // Centre the QR on an A4 page (210x297mm). Print-ready, 1:1 readable.
    const pngDataUrl = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const qrSizeMm = 80; // 80mm — large enough for any phone to scan
    const x = (pageW - qrSizeMm) / 2;
    const y = (pageH - qrSizeMm) / 2;
    pdf.addImage(pngDataUrl, "PNG", x, y, qrSizeMm, qrSizeMm);
    pdf.save(`qr-${id}.pdf`);
    return;
  }
}
