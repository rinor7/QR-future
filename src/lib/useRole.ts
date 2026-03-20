"use client";
import { useEffect, useState } from "react";
import { getUserProfile } from "./store";
import { Role } from "./types";

export function useRole() {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserProfile()
      .then((p) => setRole(p?.role ?? "admin"))
      .finally(() => setLoading(false));
  }, []);

  return {
    role,
    loading,
    isAdmin: role === "admin",
    isWriter: role === "writer",
    isReader: role === "reader",
  };
}
