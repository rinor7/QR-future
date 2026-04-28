"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { QrCode, Check } from "lucide-react";
import { useSupportEmail } from "@/lib/useSupportEmail";
import { BRAND_NAME } from "@/lib/brand";

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const expired = searchParams.get("expired") === "1";
  const emailChanged = searchParams.get("email_changed") === "1";
  const passwordChanged = searchParams.get("password_changed") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaChallengeId, setMfaChallengeId] = useState("");
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaLoading, setMfaLoading] = useState(false);
  const supportEmail = useSupportEmail();

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
    // Check if MFA is required
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.[0];
      if (totpFactor) {
        const { data: challenge } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
        setMfaFactorId(totpFactor.id);
        setMfaChallengeId(challenge?.id ?? "");
        setMfaStep(true);
        setLoading(false);
        return;
      }
    }
    document.cookie = `qr_login_ts=${Math.floor(Date.now() / 1000)}; path=/; max-age=28800; SameSite=Lax`;
    router.push("/dashboard");
    router.refresh();
  }

  async function handleMfaVerify(e: React.FormEvent) {
    e.preventDefault();
    setMfaError(null);
    setMfaLoading(true);
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: mfaChallengeId,
      code: mfaCode,
    });
    if (error) {
      setMfaError("Invalid code. Please check your authenticator app and try again.");
      setMfaLoading(false);
      return;
    }
    document.cookie = `qr_login_ts=${Math.floor(Date.now() / 1000)}; path=/; max-age=28800; SameSite=Lax`;
    router.push("/dashboard");
    router.refresh();
  }

  async function handleOAuth(provider: "google") {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="min-h-screen flex !bg-gray-50" style={{ backgroundColor: "#f9fafb", color: "#111827" }}>
      {/* Left branded panel — hidden on mobile */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:"radial-gradient(circle at 20% 80%, white 0%, transparent 50%)"}} />
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 relative z-10">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white text-lg">{BRAND_NAME}</span>
        </Link>

        {/* Center content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl font-extrabold text-white leading-snug mb-3">
              Ihre digitale Visitenkarte.<br />Immer dabei.
            </h2>
            <p className="text-blue-200 text-sm leading-relaxed">
              QR-Code einmal drucken, Daten jederzeit aktualisieren. Kein Neudruck nötig.
            </p>
          </div>
          <ul className="space-y-3">
            {[
              "Kontaktdaten, Logo & Social Media",
              "Scan-Statistiken in Echtzeit",
              "Kein App-Download für Ihre Kunden",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-blue-100">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom mock card */}
        <div className="relative z-10 bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Max Muster</p>
              <p className="text-blue-200 text-xs">Geschäftsführer · Muster AG</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50">
        {/* Mobile logo */}
        <div className="lg:hidden flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-blue-200">
            <QrCode className="w-7 h-7 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">{BRAND_NAME}</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Willkommen zurück</h1>
            <p className="text-gray-500 text-sm mt-1">Melden Sie sich in Ihrem Konto an.</p>
          </div>

          {expired && (
            <div className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
              Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.
            </div>
          )}

          {emailChanged && (
            <div className="mb-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
              E-Mail-Adresse wurde aktualisiert. Bitte melden Sie sich mit der neuen E-Mail an. / Email address updated. Please sign in with your new email.
            </div>
          )}

          {passwordChanged && (
            <div className="mb-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
              Passwort wurde aktualisiert. Bitte melden Sie sich mit dem neuen Passwort an. / Password updated. Please sign in with your new password.
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-5">
            {mfaStep ? (
              /* ── MFA step ── */
              <form onSubmit={handleMfaVerify} className="space-y-5">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Two-Factor Authentication</h2>
                  <p className="text-sm text-gray-500">Open your authenticator app and enter the 6-digit code.</p>
                </div>
                <input
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  autoFocus
                  maxLength={6}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-2xl text-center font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-300"
                />
                {mfaError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                    <p>{mfaError}</p>
                    {supportEmail && (
                      <a href={`mailto:${supportEmail}`} className="inline-block mt-1 text-xs font-semibold underline hover:text-red-700">
                        Kontakt / Contact: {supportEmail}
                      </a>
                    )}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={mfaCode.length !== 6 || mfaLoading}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-medium transition-colors"
                >
                  {mfaLoading && (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  )}
                  {mfaLoading ? "Verifying..." : "Verify"}
                </button>
                <button type="button" onClick={() => setMfaStep(false)} className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors">
                  Back to login
                </button>
              </form>
            ) : (
              /* ── Normal login ── */
              <>
                <button
                  type="button"
                  onClick={() => handleOAuth("google")}
                  className="w-full flex items-center justify-center gap-3 border border-gray-200 hover:bg-gray-50 text-gray-700 py-2.5 rounded-xl font-medium text-sm transition-colors"
                >
                  <GoogleIcon />
                  Mit Google anmelden
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400 font-medium">oder per E-Mail</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">E-Mail</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@beispiel.at"
                      required
                      autoFocus
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-medium text-gray-700">Passwort</label>
                      <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline" tabIndex={-1}>
                        Passwort vergessen?
                      </Link>
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                    />
                  </div>
                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                      <p>{error}</p>
                      {supportEmail && (
                        <a href={`mailto:${supportEmail}`} className="inline-block mt-1 text-xs font-semibold underline hover:text-red-700">
                          Kontakt / Contact: {supportEmail}
                        </a>
                      )}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-medium transition-colors"
                  >
                    {loading && (
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    )}
                    {loading ? "Anmelden..." : "Anmelden"}
                  </button>
                </form>

                <p className="text-center text-sm text-gray-500">
                  Noch kein Konto?{" "}
                  <Link href="/register" className="text-blue-600 hover:underline font-medium">
                    Registrieren
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
