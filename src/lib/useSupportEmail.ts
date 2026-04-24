"use client";
import { useEffect, useState } from "react";

// Fetches the platform-wide Contact Email set by the platform owner on their
// Settings page. Used to drive every "Contact support" link across the app.
// Returns undefined while loading or if no email is set.
export function useSupportEmail(): string | undefined {
  const [email, setEmail] = useState<string | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    fetch("/api/platform/support-email")
      .then((r) => r.json())
      .then(({ supportEmail }) => { if (alive && supportEmail) setEmail(supportEmail); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return email;
}
