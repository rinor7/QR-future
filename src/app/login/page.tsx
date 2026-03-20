"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { QrCode } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("E-Mail oder Passwort falsch.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <QrCode className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">QR Plattform</h1>
          <p className="text-gray-500 text-sm mt-1">Anmelden um fortzufahren</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                E-Mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@beispiel.at"
                required
                autoFocus
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Passwort
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-medium transition-colors"
            >
              {loading ? "Anmelden..." : "Anmelden"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Noch kein Konto?{" "}
            <Link href="/register" className="text-blue-600 hover:underline font-medium">
              Registrieren
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
