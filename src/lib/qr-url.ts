"use client";

import { createContext, createElement, ReactNode, useCallback, useContext, useEffect, useState } from "react";

type Ctx = { domain: string | null; build: (id: string) => string };

const QRUrlContext = createContext<Ctx | null>(null);
const EVENT = "qr-custom-domain-changed";

function buildWith(domain: string | null, id: string): string {
  if (typeof window === "undefined") return `/qr/${id}`;
  const base = domain ? `https://${domain}` : window.location.origin;
  return `${base}/qr/${id}`;
}

export function QRUrlProvider({ children }: { children: ReactNode }) {
  const [domain, setDomainState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("qr_custom_domain");
  });

  useEffect(() => {
    fetch("/api/custom-domain")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.domain && data?.verified) {
          localStorage.setItem("qr_custom_domain", data.domain);
          setDomainState(data.domain);
        } else {
          localStorage.removeItem("qr_custom_domain");
          setDomainState(null);
        }
      })
      .catch(() => {});

    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<string | null>).detail;
      setDomainState(detail ?? null);
    };
    window.addEventListener(EVENT, onChange as EventListener);
    return () => window.removeEventListener(EVENT, onChange as EventListener);
  }, []);

  const build = useCallback((id: string) => buildWith(domain, id), [domain]);

  return createElement(QRUrlContext.Provider, { value: { domain, build } }, children);
}

export function useQRUrl(): (id: string) => string {
  const ctx = useContext(QRUrlContext);
  if (ctx) return ctx.build;
  return getQRUrl;
}

export function useCustomDomain(): string | null {
  return useContext(QRUrlContext)?.domain ?? null;
}

export function setCustomDomain(domain: string | null) {
  if (typeof window === "undefined") return;
  if (domain) localStorage.setItem("qr_custom_domain", domain);
  else localStorage.removeItem("qr_custom_domain");
  window.dispatchEvent(new CustomEvent(EVENT, { detail: domain }));
}

export function getQRUrl(id: string): string {
  if (typeof window === "undefined") return `/qr/${id}`;
  const cached = localStorage.getItem("qr_custom_domain");
  return buildWith(cached, id);
}
