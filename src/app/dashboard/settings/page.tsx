"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { getUserProfile } from "@/lib/store";
import { Plan, PLAN_LABELS, PLAN_LIMITS } from "@/lib/types";
import { useLang } from "@/lib/language";
import TemplateEditorModal, { QRTemplate } from "@/components/TemplateEditorModal";
import QRCode from "react-qr-code";

export default function SettingsPage() {
  const { tr, lang, toggleLang } = useLang();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<Plan>("free");
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [hasStripeSubscription, setHasStripeSubscription] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [planUsed, setPlanUsed] = useState(0);

  const [supportEmail, setSupportEmail] = useState("");
  const [supportEmailLoading, setSupportEmailLoading] = useState(false);
  const [supportEmailSaved, setSupportEmailSaved] = useState(false);
  const [editingSupport, setEditingSupport] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const [leadCaptureDisabled, setLeadCaptureDisabled] = useState(false);
  const [leadCaptureSaving, setLeadCaptureSaving] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookSaved, setWebhookSaved] = useState(false);
  const [webhookError, setWebhookError] = useState<string | null>(null);

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePreview, setDeletePreview] = useState<{ subUsers: number; qrCodes: number; folders: number; scans: number; leads: number } | null>(null);

  // Templates
  const [templates, setTemplates] = useState<QRTemplate[]>([]);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<QRTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<QRTemplate | null>(null);

  // Branding / White label
  const [organizationName, setOrganizationName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [brandColor, setBrandColor] = useState("#2563eb");
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandSaved, setBrandSaved] = useState(false);
  const [brandLogoUploading, setBrandLogoUploading] = useState(false);

  // Account contact info (single values)
  const [acctPhone, setAcctPhone] = useState("");
  const [acctEmail, setAcctEmail] = useState("");
  const [acctWebsite, setAcctWebsite] = useState("");
  const [acctStreet, setAcctStreet] = useState("");
  const [acctStreetNr, setAcctStreetNr] = useState("");
  const [acctPlz, setAcctPlz] = useState("");
  const [acctCity, setAcctCity] = useState("");
  const [acctCountry, setAcctCountry] = useState("");
  const [acctSaving, setAcctSaving] = useState(false);
  const [acctSaved, setAcctSaved] = useState(false);

  // Social media links (company-level)
  const [acctLinkedin, setAcctLinkedin] = useState("");
  const [acctInstagram, setAcctInstagram] = useState("");
  const [acctFacebook, setAcctFacebook] = useState("");
  const [acctTiktok, setAcctTiktok] = useState("");
  const [acctSnapchat, setAcctSnapchat] = useState("");
  const [acctX, setAcctX] = useState("");

  // 2FA / MFA state
  const [mfaEnrolled, setMfaEnrolled] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaEnrolling, setMfaEnrolling] = useState(false);
  const [mfaUri, setMfaUri] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaDisabling, setMfaDisabling] = useState(false);
  const [mfaMembersAllowed, setMfaMembersAllowed] = useState(true);
  const [mfaMembersSaving, setMfaMembersSaving] = useState(false);



  async function handleSaveWebhook(e: React.FormEvent) {
    e.preventDefault();
    setWebhookError(null);
    setWebhookSaved(false);
    if (webhookUrl && !webhookUrl.startsWith("https://")) {
      setWebhookError("Webhook URL must start with https://");
      return;
    }
    setWebhookSaving(true);
    const supabase = getSupabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ lead_webhook_url: webhookUrl || null }).eq("user_id", user.id);
      setWebhookSaved(true);
      setTimeout(() => setWebhookSaved(false), 3000);
    }
    setWebhookSaving(false);
  }

  async function handleToggleLeadCapture(val: boolean) {
    setLeadCaptureDisabled(val);
    setLeadCaptureSaving(true);
    const supabase = getSupabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ lead_capture_disabled: val }).eq("user_id", user.id);
    }
    setLeadCaptureSaving(false);
  }

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      setEmail(user.email ?? "");
      // Self-heal: if profiles.email drifted from auth email (e.g. historical
      // email changes that didn't mirror to profiles), sync it now.
      if (user.email) {
        const { data: prof } = await supabase.from("profiles").select("email").eq("user_id", user.id).single();
        if (prof && prof.email !== user.email) {
          await supabase.from("profiles").update({ email: user.email }).eq("user_id", user.id);
        }
      }
    });
    getUserProfile().then(async (p) => {
      if (p) {
        setPlan(p.plan);
        setIsOwner(p.userId === p.ownerId);
        setIsPlatformAdmin(p.isPlatformAdmin ?? false);
        setUserRole(p.role);
        setSupportEmail(p.supportEmail ?? "");
        setSupportEmailSaved(!!p.supportEmail);
        // Load lead capture + webhook settings
        const supabaseInner = getSupabaseBrowser();
        const { data: { user: u } } = await supabaseInner.auth.getUser();
        if (u) {
          const { data: prof } = await supabaseInner.from("profiles").select("lead_capture_disabled, lead_webhook_url, brand_name, brand_logo_url, brand_primary_color, stripe_customer_id, organization_name, account_phone, account_email, account_website, account_phones, account_emails, account_websites, account_street, account_street_nr, account_plz, account_city, account_country, account_socials").eq("user_id", u.id).single();
          if (prof) {
            setHasStripeSubscription(!!prof.stripe_customer_id);
            setLeadCaptureDisabled(!!prof.lead_capture_disabled);
            setWebhookUrl(prof.lead_webhook_url ?? "");
            setBrandName(prof.brand_name ?? "");
            setBrandLogoUrl(prof.brand_logo_url ?? "");
            setBrandColor(prof.brand_primary_color ?? "#2563eb");
            setOrganizationName(prof.organization_name ?? "");
            // Account contact info (single values, with fallback from old array columns)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const parseFirst = (raw: any, key: string): string => {
              if (!raw) return "";
              try {
                const a = typeof raw === "string" ? JSON.parse(raw) : raw;
                return Array.isArray(a) && a.length > 0 ? String(a[0]?.[key] ?? "") : "";
              } catch { return ""; }
            };
            const phoneVal = prof.account_phone || parseFirst(prof.account_phones, "number");
            const emailVal = prof.account_email || parseFirst(prof.account_emails, "email");
            const websiteVal = prof.account_website || parseFirst(prof.account_websites, "url");
            setAcctPhone(phoneVal);
            setAcctEmail(emailVal);
            setAcctWebsite(websiteVal);
            setAcctStreet(prof.account_street ?? "");
            setAcctStreetNr(prof.account_street_nr ?? "");
            setAcctPlz(prof.account_plz ?? "");
            setAcctCity(prof.account_city ?? "");
            setAcctCountry(prof.account_country ?? "");
            // Social media links
            const socials = (() => { try { return JSON.parse(prof.account_socials ?? "{}"); } catch { return {}; } })();
            setAcctLinkedin(socials.linkedin ?? "");
            setAcctInstagram(socials.instagram ?? "");
            setAcctFacebook(socials.facebook ?? "");
            setAcctTiktok(socials.tiktok ?? "");
            setAcctSnapchat(socials.snapchat ?? "");
            setAcctX(socials.x ?? "");
          }
          // Load MFA enrollment status
          const { data: mfaFactors } = await supabaseInner.auth.mfa.listFactors();
          const verifiedFactor = mfaFactors?.totp?.find((f: { status: string }) => f.status === "verified");
          setMfaEnrolled(!!verifiedFactor);
          if (verifiedFactor) setMfaFactorId(verifiedFactor.id);
          // Load owner's mfa_members_allowed (works for both owner and member)
          const { data: ownerMfaProfile } = await supabaseInner
            .from("profiles")
            .select("mfa_members_allowed")
            .eq("user_id", p.ownerId)
            .single();
          setMfaMembersAllowed(ownerMfaProfile?.mfa_members_allowed ?? true);
        }
      }
    });
    // Get QR count for plan usage
    import("@/lib/store").then(({ getAllContacts }) => {
      getAllContacts().then((c) => setPlanUsed(c.length));
    });
    // Load templates
    fetch("/api/templates").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setTemplates(data);
    }).catch(() => {});
  }, [router]);

  async function handleSaveBranding(e: React.FormEvent) {
    e.preventDefault();
    setBrandSaving(true);
    const supabase = getSupabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({
        brand_name: brandName || null,
        brand_logo_url: brandLogoUrl || null,
        brand_primary_color: brandColor || null,
      }).eq("user_id", user.id);
      setBrandSaved(true);
      setTimeout(() => setBrandSaved(false), 3000);
      // Trigger sidebar refresh
      window.dispatchEvent(new CustomEvent("brand-updated"));
    }
    setBrandSaving(false);
  }

  async function handleBrandLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBrandLogoUploading(true);
    const supabase = getSupabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `logos/${user.id}/brand-logo.${ext}`;
      await supabase.storage.from("Uploads").upload(path, file, { upsert: true });
      const { data: { publicUrl } } = supabase.storage.from("Uploads").getPublicUrl(path);
      setBrandLogoUrl(publicUrl);
    }
    setBrandLogoUploading(false);
  }

  async function handleSaveAccountInfo(e: React.FormEvent) {
    e.preventDefault();
    setAcctSaving(true);
    const supabase = getSupabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const socials: Record<string, string> = {};
      if (acctLinkedin) socials.linkedin = acctLinkedin;
      if (acctInstagram) socials.instagram = acctInstagram;
      if (acctFacebook) socials.facebook = acctFacebook;
      if (acctTiktok) socials.tiktok = acctTiktok;
      if (acctSnapchat) socials.snapchat = acctSnapchat;
      if (acctX) socials.x = acctX;
      await supabase.from("profiles").update({
        organization_name: organizationName || null,
        account_phone: acctPhone || null,
        account_email: acctEmail || null,
        account_website: acctWebsite || null,
        account_street: acctStreet || null,
        account_street_nr: acctStreetNr || null,
        account_plz: acctPlz || null,
        account_city: acctCity || null,
        account_country: acctCountry || null,
        account_socials: Object.keys(socials).length > 0 ? JSON.stringify(socials) : null,
      }).eq("user_id", user.id);
      setAcctSaved(true);
      setTimeout(() => setAcctSaved(false), 3000);
    }
    setAcctSaving(false);
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== "DELETE") return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        if (Array.isArray(data.details) && data.details.length > 0) {
          console.error("[account/delete] details:", data.details);
          setDeleteError(`${data.error || "Failed to delete account"}\n${data.details.join("\n")}`);
        } else {
          setDeleteError(data.error || "Failed to delete account");
        }
        setDeleteLoading(false);
        return;
      }
      // Sign out and redirect to login
      const supabase = getSupabaseBrowser();
      await supabase.auth.signOut();
      router.push("/login");
    } catch {
      setDeleteError("Something went wrong. Please try again.");
      setDeleteLoading(false);
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true);
    setPortalError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setPortalError(data.error ?? "Could not open billing portal.");
        setPortalLoading(false);
      }
    } catch {
      setPortalError("Something went wrong. Please try again.");
      setPortalLoading(false);
    }
  }

  async function handleSaveSupportEmail(e: React.FormEvent) {
    e.preventDefault();
    setSupportEmailLoading(true);
    const supabase = getSupabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ support_email: supportEmail }).eq("user_id", user.id);
      setSupportEmailSaved(true);
      setEditingSupport(false);
    }
    setSupportEmailLoading(false);
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(false);
    setEmailLoading(true);
    const supabase = getSupabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    // Save organization name
    if (user) {
      await supabase.from("profiles").update({ organization_name: organizationName || null }).eq("user_id", user.id);
    }
    // Update email only if changed
    if (newEmail && newEmail !== email) {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) { setEmailError(error.message); setEmailLoading(false); return; }
      if (user) {
        await supabase.from("profiles").update({ email: newEmail }).eq("user_id", user.id);
        const { data: prof } = await supabase.from("profiles").select("owner_id").eq("user_id", user.id).single();
        const ownerIdForLog = prof?.owner_id ?? user.id;
        await supabase.from("org_notifications").insert({
          owner_id: ownerIdForLog,
          type: "email_changed",
          message: `${email} changed email to ${newEmail}`,
          metadata: { from: email, to: newEmail, user_id: user.id },
        });
      }
      setEmail(newEmail);
      setEmailSuccess(true);
      setNewEmail("");
    } else {
      setEmailSuccess(true);
      setTimeout(() => setEmailSuccess(false), 2500);
    }
    setEmailLoading(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);
    if (newPassword !== confirmPassword) { setPwError(tr.settings_pw_error_match); return; }
    if (newPassword.length < 6) { setPwError(tr.settings_pw_error_short); return; }
    setPwLoading(true);
    const supabase = getSupabaseBrowser();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (signInError) { setPwError(tr.settings_pw_error_wrong); setPwLoading(false); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { setPwError(error.message); } else {
      setPwSuccess(true);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    }
    setPwLoading(false);
  }

  async function handleStartMfa() {
    setMfaError(null);
    const supabase = getSupabaseBrowser();
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (error || !data) { setMfaError(error?.message ?? "Failed to start 2FA setup"); return; }
    setMfaFactorId(data.id);
    setMfaUri(data.totp.uri);
    setMfaSecret(data.totp.secret);
    setMfaEnrolling(true);
  }

  async function handleVerifyMfa() {
    setMfaError(null);
    setMfaVerifying(true);
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfaFactorId, code: mfaCode });
    if (error) { setMfaError("Invalid code. Please try again."); setMfaVerifying(false); return; }
    setMfaEnrolled(true);
    setMfaEnrolling(false);
    setMfaUri(""); setMfaSecret(""); setMfaCode(""); setMfaVerifying(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await supabase.from("profiles").select("owner_id").eq("user_id", user.id).single();
      await supabase.from("org_notifications").insert({
        owner_id: prof?.owner_id ?? user.id,
        type: "mfa_enabled",
        message: `${user.email} enabled 2FA`,
        metadata: { user_id: user.id, email: user.email },
      });
    }
  }

  function handleCancelMfa() {
    setMfaEnrolling(false);
    setMfaUri(""); setMfaSecret(""); setMfaCode(""); setMfaError(null);
  }

  async function handleDisableMfa() {
    setMfaVerifying(true);
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.mfa.unenroll({ factorId: mfaFactorId });
    if (error) { setMfaError(error.message); setMfaVerifying(false); return; }
    setMfaEnrolled(false); setMfaDisabling(false); setMfaFactorId(""); setMfaVerifying(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await supabase.from("profiles").select("owner_id").eq("user_id", user.id).single();
      await supabase.from("org_notifications").insert({
        owner_id: prof?.owner_id ?? user.id,
        type: "mfa_disabled",
        message: `${user.email} disabled 2FA`,
        metadata: { user_id: user.id, email: user.email },
      });
    }
  }

  async function handleToggleMfaMembers(val: boolean) {
    setMfaMembersSaving(true);
    const supabase = getSupabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ mfa_members_allowed: val }).eq("user_id", user.id);
      setMfaMembersAllowed(val);
      await supabase.from("org_notifications").insert({
        owner_id: user.id,
        type: "team_mfa_toggled",
        message: `Team 2FA ${val ? "enabled" : "disabled"} for ${user.email}'s team`,
        metadata: { enabled: val, owner_email: user.email },
      });
    }
    setMfaMembersSaving(false);
  }

  return (
    <div className="pt-8 pb-12 px-4 sm:px-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight font-headline">{tr.settings_title}</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">{tr.settings_subtitle_full}</p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-6">

        {/* Account Information (8 cols) */}
        <section className="col-span-12 lg:col-span-8 bg-white dark:bg-[#1a1d27] rounded-xl p-8 shadow-[0px_20px_40px_rgba(25,28,30,0.04)]">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-xl text-blue-600">
                <span className="material-symbols-outlined">person</span>
              </div>
              <h3 className="text-2xl font-bold font-headline">{tr.settings_account_info}</h3>
            </div>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
              {isOwner ? tr.settings_role_owner : userRole === "admin" ? tr.settings_role_admin : tr.settings_role_member}
            </span>
          </div>
          <form onSubmit={handleChangeEmail} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm text-slate-500 dark:text-slate-400 font-semibold">{tr.settings_full_name}</label>
                <input type="text" defaultValue="" placeholder={tr.settings_your_name_ph} className="w-full bg-gray-50 dark:bg-[#242736] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-500 dark:text-slate-400 font-semibold">{tr.settings_email_label}</label>
                <input type="email" value={newEmail || email} onChange={(e) => setNewEmail(e.target.value)} className="w-full bg-gray-50 dark:bg-[#242736] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
            </div>
            {emailError && <p className="text-xs text-red-500">{emailError}</p>}
            {emailSuccess && <p className="text-xs text-green-600">{tr.settings_email_success}</p>}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {isPlatformAdmin ? (
                  <>
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{tr.settings_role_label}</span>
                    <span className="text-sm font-semibold text-violet-600">Platform Owner</span>
                  </>
                ) : isOwner ? (
                  <>
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{tr.plan_label}:</span>
                    <span className="text-sm font-semibold text-blue-600">{PLAN_LABELS[plan]}</span>
                    <Link href="/dashboard/upgrade" className="text-xs text-blue-600 hover:underline ml-1">{tr.settings_plan_change_short}</Link>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{tr.settings_role_label}</span>
                    <span className="text-sm font-semibold text-blue-600 capitalize">{userRole || tr.settings_role_member}</span>
                  </>
                )}
              </div>
              <button type="submit" disabled={emailLoading} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-60 w-full sm:w-auto">
                {emailLoading ? tr.settings_email_saving : tr.settings_update_account}
              </button>
            </div>
          </form>
        </section>

        {/* Security (4 cols) */}
        <section className="col-span-12 lg:col-span-4 bg-white dark:bg-[#1a1d27] rounded-xl p-8 shadow-[0px_20px_40px_rgba(25,28,30,0.04)]">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl text-slate-500 dark:text-slate-400">
              <span className="material-symbols-outlined">shield</span>
            </div>
            <h3 className="text-xl font-bold font-headline">{tr.settings_security}</h3>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm text-slate-500 dark:text-slate-400 font-semibold">{tr.settings_pw_current}</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" className="w-full bg-gray-50 dark:bg-[#242736] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-500 dark:text-slate-400 font-semibold">{tr.settings_pw_new}</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={tr.settings_pw_min_ph} className="w-full bg-gray-50 dark:bg-[#242736] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-500 dark:text-slate-400 font-semibold">{tr.settings_pw_confirm_label}</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={tr.settings_pw_repeat_ph} className="w-full bg-gray-50 dark:bg-[#242736] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            {pwError && <p className="text-xs text-red-500">{pwError}</p>}
            {pwSuccess && <p className="text-xs text-green-600">{tr.settings_pw_success}</p>}
            <button type="submit" disabled={pwLoading} className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-60">
              {pwLoading ? tr.settings_pw_saving : tr.settings_pw_btn}
            </button>
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700/50 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{tr.settings_2fa}</span>
                  <p className="text-xs text-slate-400 mt-0.5">{tr.settings_2fa_hint}</p>
                </div>
                {!mfaEnrolled && !mfaEnrolling && (isOwner || mfaMembersAllowed) && (
                  <button type="button" onClick={handleStartMfa} className="shrink-0 text-xs font-semibold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
                    {tr.settings_2fa_enable}
                  </button>
                )}
                {!mfaEnrolled && !mfaEnrolling && !isOwner && !mfaMembersAllowed && (
                  <span className="shrink-0 text-xs text-slate-400 italic">{tr.settings_2fa_disabled}</span>
                )}
                {mfaEnrolled && !mfaDisabling && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>{tr.settings_2fa_active}
                    </span>
                    <button type="button" onClick={() => setMfaDisabling(true)} className="text-xs text-slate-400 hover:text-red-500 transition-colors font-medium">{tr.settings_2fa_disable}</button>
                  </div>
                )}
              </div>
              {/* QR enrollment step */}
              {mfaEnrolling && (
                <div className="space-y-3 bg-slate-50 dark:bg-[#242736] rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{tr.settings_2fa_scan}</p>
                  <div className="flex justify-center bg-white p-3 rounded-xl">
                    <QRCode value={mfaUri} size={160} />
                  </div>
                  <details className="text-xs text-slate-400">
                    <summary className="cursor-pointer hover:text-slate-600 select-none">Can&apos;t scan? Enter the key manually</summary>
                    <p className="mt-2 font-mono break-all text-xs bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg">{mfaSecret}</p>
                  </details>
                  <input
                    type="text"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    className="w-full bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-center font-mono tracking-widest focus:ring-2 focus:ring-blue-500"
                    maxLength={6}
                  />
                  {mfaError && <p className="text-xs text-red-500">{mfaError}</p>}
                  <div className="flex gap-2">
                    <button type="button" onClick={handleVerifyMfa} disabled={mfaCode.length !== 6 || mfaVerifying} className="flex-1 bg-blue-600 text-white text-sm py-2 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                      {mfaVerifying ? "Verifying..." : "Verify & Enable"}
                    </button>
                    <button type="button" onClick={handleCancelMfa} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {/* Disable confirmation */}
              {mfaDisabling && (
                <div className="space-y-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl p-4">
                  <p className="text-xs font-semibold text-red-700 dark:text-red-400">This will remove 2FA from your account. You can re-enable it anytime.</p>
                  {mfaError && <p className="text-xs text-red-500">{mfaError}</p>}
                  <div className="flex gap-2">
                    <button type="button" onClick={handleDisableMfa} disabled={mfaVerifying} className="flex-1 bg-red-600 text-white text-sm py-2 rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors">
                      {mfaVerifying ? "Disabling..." : "Yes, disable 2FA"}
                    </button>
                    <button type="button" onClick={() => { setMfaDisabling(false); setMfaError(null); }} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            {/* Owner toggle: allow/disallow members from using 2FA */}
            {isOwner && !isPlatformAdmin && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700/50">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Team 2FA</span>
                    <p className="text-xs text-slate-400 mt-0.5">Allow team members to enable two-factor authentication</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleMfaMembers(!mfaMembersAllowed)}
                    disabled={mfaMembersSaving}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-60 ${mfaMembersAllowed ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${mfaMembersAllowed ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>
              </div>
            )}
          </form>
        </section>

        {/* Company Information (owner or admin only, not platform admin) */}
        {(isOwner || userRole === "admin") && !isPlatformAdmin && (
          <section className="col-span-12 bg-white dark:bg-[#1a1d27] rounded-xl p-8 shadow-[0px_20px_40px_rgba(25,28,30,0.04)]">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-green-500/10 p-3 rounded-xl text-green-600">
                <span className="material-symbols-outlined">contacts</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold font-headline">{tr.settings_company_info}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{tr.settings_company_subtitle}</p>
              </div>
            </div>
            <form onSubmit={handleSaveAccountInfo} className="space-y-8">

              {/* Organization Name */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-[18px]">business</span>
                  {tr.settings_org_name}
                </h4>
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder={tr.settings_org_name_ph}
                  className="w-full bg-gray-50 dark:bg-[#242736] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                />
              </div>

              {/* Contact Info */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-[18px]">contact_phone</span>
                  {tr.settings_contact_info}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{tr.field_phone}</label>
                    <input type="text" value={acctPhone} onChange={(e) => setAcctPhone(e.target.value)} placeholder={tr.settings_phone_ph} className="w-full bg-gray-50 dark:bg-[#242736] border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{tr.field_email}</label>
                    <input type="email" value={acctEmail} onChange={(e) => setAcctEmail(e.target.value)} placeholder={tr.settings_email_ph} className="w-full bg-gray-50 dark:bg-[#242736] border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">{tr.field_website}</label>
                    <input type="text" value={acctWebsite} onChange={(e) => setAcctWebsite(e.target.value)} placeholder={tr.settings_website_ph} className="w-full bg-gray-50 dark:bg-[#242736] border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>

              {/* Social Media Links */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-[18px]">share</span>
                  {tr.settings_social_media}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">LinkedIn</label>
                    <SocialPrefixInput prefix="linkedin.com/company/" fullPrefix="https://linkedin.com/company/" value={acctLinkedin} onChange={setAcctLinkedin} placeholder="your-company" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Instagram</label>
                    <SocialPrefixInput prefix="instagram.com/" fullPrefix="https://instagram.com/" value={acctInstagram} onChange={setAcctInstagram} placeholder="username" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Facebook</label>
                    <SocialPrefixInput prefix="facebook.com/" fullPrefix="https://facebook.com/" value={acctFacebook} onChange={setAcctFacebook} placeholder="pagename" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">TikTok</label>
                    <SocialPrefixInput prefix="tiktok.com/@" fullPrefix="https://tiktok.com/@" value={acctTiktok} onChange={setAcctTiktok} placeholder="username" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Snapchat</label>
                    <SocialPrefixInput prefix="snapchat.com/add/" fullPrefix="https://snapchat.com/add/" value={acctSnapchat} onChange={setAcctSnapchat} placeholder="username" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">X / Twitter</label>
                    <SocialPrefixInput prefix="x.com/" fullPrefix="https://x.com/" value={acctX} onChange={setAcctX} placeholder="handle" />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-[18px]">location_on</span>
                  {tr.settings_address}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="text" value={acctStreet} onChange={(e) => setAcctStreet(e.target.value)} placeholder={tr.settings_street_ph} className="bg-gray-50 dark:bg-[#242736] border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                  <input type="text" value={acctStreetNr} onChange={(e) => setAcctStreetNr(e.target.value)} placeholder={tr.settings_streetnr_ph} className="bg-gray-50 dark:bg-[#242736] border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                  <input type="text" value={acctPlz} onChange={(e) => setAcctPlz(e.target.value)} placeholder={tr.settings_plz_ph} className="bg-gray-50 dark:bg-[#242736] border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                  <input type="text" value={acctCity} onChange={(e) => setAcctCity(e.target.value)} placeholder={tr.settings_city_ph} className="bg-gray-50 dark:bg-[#242736] border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                  <input type="text" value={acctCountry} onChange={(e) => setAcctCountry(e.target.value)} placeholder={tr.settings_country_ph} className="sm:col-span-2 bg-gray-50 dark:bg-[#242736] border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button type="submit" disabled={acctSaving} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-60">
                  {acctSaving ? tr.settings_saving : tr.settings_save_company}
                </button>
                {acctSaved && (
                  <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>{tr.settings_saved_short}
                  </span>
                )}
              </div>
            </form>
          </section>
        )}

        {/* Platform Preferences (12 cols) — hidden from platform owner */}
        {!isPlatformAdmin && (
        <section className="col-span-12 bg-white dark:bg-[#1a1d27] rounded-xl p-8 shadow-[0px_20px_40px_rgba(25,28,30,0.04)]">
          <div className="flex items-center gap-4 mb-10">
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl text-slate-600 dark:text-slate-400">
              <span className="material-symbols-outlined">tune</span>
            </div>
            <h3 className="text-2xl font-bold font-headline">{tr.settings_platform_prefs}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Regional */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">language</span>
                {tr.settings_regional}
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#1e2130] hover:bg-gray-50 dark:hover:bg-[#242736] transition-colors cursor-pointer">
                  <span className="text-sm">{tr.settings_language}</span>
                  <button onClick={toggleLang} className="text-sm font-bold text-blue-600">{lang === "de" ? "Deutsch" : "English (EN)"}</button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#1e2130] hover:bg-gray-50 dark:hover:bg-[#242736] transition-colors cursor-pointer">
                  <span className="text-sm">{tr.settings_timezone}</span>
                  <span className="text-sm font-bold text-blue-600">UTC+1 (CET)</span>
                </div>
              </div>
            </div>
            {/* Features */}
            {(isOwner || userRole === "admin") && (
              <div className="space-y-4">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">feature_search</span>
                  {tr.settings_features}
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#1e2130]">
                    <div>
                      <p className="text-sm font-medium">{tr.settings_lead_capture}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{tr.settings_lead_capture_hint}</p>
                    </div>
                    <button
                      onClick={() => handleToggleLeadCapture(!leadCaptureDisabled)}
                      disabled={leadCaptureSaving}
                      className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ml-3 ${leadCaptureDisabled ? "bg-slate-200 dark:bg-slate-700" : "bg-blue-600"} disabled:opacity-60`}
                      aria-label="Toggle lead capture"
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${leadCaptureDisabled ? "left-1" : "translate-x-6"}`} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
        )}

        {/* CRM / Export (owner or admin only, not platform admin) */}
        {(isOwner || userRole === "admin") && !isPlatformAdmin && (
          <section className="col-span-12 bg-white dark:bg-[#1a1d27] rounded-xl p-8 shadow-[0px_20px_40px_rgba(25,28,30,0.04)]">
            <div className="flex flex-wrap items-start gap-4 mb-8">
              <div className="bg-teal-500/10 p-3 rounded-xl text-teal-600 shrink-0">
                <span className="material-symbols-outlined">hub</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-2xl font-bold font-headline">{tr.settings_crm_export}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{tr.settings_crm_subtitle}</p>
              </div>
              <a
                href="/api/leads/export"
                download
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm w-full sm:w-auto"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                {tr.settings_export_all_leads}
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Webhook / Zapier */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-[18px]">webhook</span>
                  Webhook / Zapier
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  When a new lead is captured, we will POST the lead data to this URL. Works with Zapier, Make, n8n, or any custom endpoint.
                </p>
                <form onSubmit={handleSaveWebhook} className="space-y-3">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://hooks.zapier.com/hooks/catch/..."
                    className="w-full bg-gray-50 dark:bg-[#242736] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  {webhookError && <p className="text-xs text-red-500">{webhookError}</p>}
                  <div className="flex items-center gap-3">
                    <button type="submit" disabled={webhookSaving} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-60">
                      {webhookSaving ? "Saving…" : "Save Webhook"}
                    </button>
                    {webhookSaved && (
                      <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        Saved
                      </span>
                    )}
                    {webhookUrl && !webhookSaving && (
                      <button type="button" onClick={() => { setWebhookUrl(""); }} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 transition-colors">
                        Remove
                      </button>
                    )}
                  </div>
                </form>
                <div className="mt-4 p-3 bg-gray-50 dark:bg-[#1e2130] rounded-xl border border-slate-200 dark:border-slate-700/50">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Payload preview</p>
                  <pre className="text-xs text-slate-600 dark:text-slate-400 font-mono overflow-x-auto whitespace-pre-wrap">{`{
  "event": "lead.captured",
  "timestamp": "2025-01-01T12:00:00Z",
  "lead": { "name": "…", "email": "…", "company": "…" },
  "source": { "qr_label": "…", "employee": "…" }
}`}</pre>
                </div>
              </div>

              {/* Lead Assignment info */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-[18px]">assignment_ind</span>
                  Lead Assignment
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Every lead is automatically assigned to the employee whose QR code was scanned. The employee name and QR label are included in all exports and webhook payloads.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-[#1e2130] rounded-xl border border-slate-200 dark:border-slate-700/50">
                    <span className="material-symbols-outlined text-[18px] text-teal-600 shrink-0 mt-0.5">qr_code</span>
                    <div>
                      <p className="text-sm font-semibold">QR → Employee → Lead</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Each QR code belongs to one employee. When someone scans it and submits their contact, the lead is tagged to that employee.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-[#1e2130] rounded-xl border border-slate-200 dark:border-slate-700/50">
                    <span className="material-symbols-outlined text-[18px] text-blue-600 shrink-0 mt-0.5">analytics</span>
                    <div>
                      <p className="text-sm font-semibold">Per-QR Analytics</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">View and export leads per QR code from the Analytics page of each code.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Branding / White Label (owner or admin only, not platform admin) */}
        {(isOwner || userRole === "admin") && !isPlatformAdmin && (
          <section className="col-span-12 bg-white dark:bg-[#1a1d27] rounded-xl p-8 shadow-[0px_20px_40px_rgba(25,28,30,0.04)]">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-purple-500/10 p-3 rounded-xl text-purple-600">
                <span className="material-symbols-outlined">style</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold font-headline">Branding</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">White-label the platform and set up your custom domain</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* White Label */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-5">
                  <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-[18px]">palette</span>
                  White Label
                </h4>
                <form onSubmit={handleSaveBranding} className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Brand Name</label>
                    <input
                      type="text"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="e.g. Acme Corp"
                      className="w-full bg-gray-50 dark:bg-[#242736] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">Replaces &quot;qr-card.ch&quot; in the sidebar and dashboard</p>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Brand Logo</label>
                    {brandLogoUrl ? (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#1e2130] rounded-xl border border-slate-200 dark:border-slate-700">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={brandLogoUrl} alt="Brand logo" className="h-10 w-10 object-contain rounded-lg bg-white border border-slate-200 dark:border-slate-700" />
                        <span className="text-sm text-slate-900 dark:text-slate-100 flex-1 truncate">Logo uploaded</span>
                        <button type="button" onClick={() => setBrandLogoUrl("")} className="text-xs text-red-500 hover:underline">Remove</button>
                      </div>
                    ) : (
                      <label className={`flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#1e2130] rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#242736] transition-colors ${brandLogoUploading ? "opacity-60 pointer-events-none" : ""}`}>
                        <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">upload</span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">{brandLogoUploading ? "Uploading…" : "Upload logo (PNG, SVG, JPG)"}</span>
                        <input type="file" accept="image/*" className="sr-only" onChange={handleBrandLogoUpload} />
                      </label>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Brand Color</label>
                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#242736] rounded-xl px-4 py-3">
                      <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="w-8 h-8 rounded-md border-0 cursor-pointer bg-transparent shrink-0" />
                      <span className="text-sm font-mono text-slate-900 dark:text-slate-100">{brandColor}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <button type="submit" disabled={brandSaving} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-60">
                      {brandSaving ? "Saving…" : "Save Branding"}
                    </button>
                    {brandSaved && (
                      <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>Saved
                      </span>
                    )}
                  </div>
                </form>
              </div>

              {/* Custom Domain — Coming Soon */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-5">
                  <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-[18px]">domain</span>
                  Custom Domain
                  <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 bg-purple-50 dark:bg-purple-900/20 px-2.5 py-1 rounded-full ml-1">Coming Soon</span>
                </h4>
                <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <span className="material-symbols-outlined text-slate-400 text-[24px]">language</span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Serve QR cards from your own domain</p>
                    <p className="text-xs text-slate-400 mt-1">e.g. <span className="font-mono">card.yourcompany.com</span> instead of the default URL</p>
                  </div>
                  <p className="text-xs text-slate-400">This feature is under development and will be available soon.</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Company Templates (owner or admin only, not platform admin) */}
        {(isOwner || userRole === "admin") && !isPlatformAdmin && (
          <section className="col-span-12 bg-white dark:bg-[#1a1d27] rounded-xl p-8 shadow-[0px_20px_40px_rgba(25,28,30,0.04)]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="bg-purple-500/10 p-3 rounded-xl text-purple-600">
                  <span className="material-symbols-outlined">style</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold font-headline">Company Templates</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Pre-fill and lock fields when creating QR codes</p>
                </div>
              </div>
              <button
                onClick={() => { setEditingTemplate(null); setShowTemplateEditor(true); }}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                New Template
              </button>
            </div>

            {templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-slate-200 dark:border-[#242736] rounded-xl">
                <span className="material-symbols-outlined text-[40px] text-slate-200 dark:text-slate-700 mb-3">style</span>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No templates yet</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">Create a template to pre-fill and lock company fields when employees create QR codes</p>
                <button
                  onClick={() => { setEditingTemplate(null); setShowTemplateEditor(true); }}
                  className="mt-4 px-4 py-2 text-sm font-semibold text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  Create first template
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((t) => (
                  <div key={t.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-[#242736] rounded-xl border border-slate-100 dark:border-[#2a2e3e]">
                    <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: t.primary_color }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{t.name}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(t.locked_fields ?? []).length === 0 ? (
                          <span className="text-xs text-slate-400">No locked fields</span>
                        ) : (
                          (t.locked_fields ?? []).slice(0, 6).map((f) => (
                            <span key={f} className="text-[10px] font-medium text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded-full">
                              🔒 {f.replace(/_url$/, "").replace(/_/g, " ")}
                            </span>
                          ))
                        )}
                        {(t.locked_fields ?? []).length > 6 && (
                          <span className="text-[10px] text-slate-400">+{t.locked_fields.length - 6} more</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => { setEditingTemplate(t); setShowTemplateEditor(true); }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button
                        onClick={() => setTemplateToDelete(t)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Platform Support Email (platform admin only) */}
        {isPlatformAdmin && (
          <section className="col-span-12 bg-white dark:bg-[#1a1d27] rounded-xl p-8 shadow-[0px_20px_40px_rgba(25,28,30,0.04)]">
            <h3 className="text-xl font-bold font-headline mb-2">{tr.settings_support_email_title ?? "Platform Contact Email"}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{tr.settings_support_email_hint ?? "Shown to team members when a save error occurs."}</p>
            {supportEmailSaved && !editingSupport ? (
              <div className="flex items-center justify-between bg-gray-50 dark:bg-[#242736] rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Contact Email</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{supportEmail}</p>
                </div>
                <button onClick={() => setEditingSupport(true)} className="text-xs text-blue-600 hover:underline font-medium">{tr.edit}</button>
              </div>
            ) : (
              <form onSubmit={handleSaveSupportEmail} className="flex gap-3 items-end">
                <div className="flex-1">
                  <input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="support@yourcompany.com" autoFocus className="w-full bg-gray-50 dark:bg-[#242736] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500" />
                </div>
                <button type="submit" disabled={supportEmailLoading} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-60">{supportEmailLoading ? "..." : tr.settings_support_email_btn}</button>
                {editingSupport && <button type="button" onClick={() => setEditingSupport(false)} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 px-4 py-3">{tr.cancel}</button>}
              </form>
            )}
          </section>
        )}

        {/* Billing (12 cols) */}
        {isOwner && !isPlatformAdmin && (
          <section className="col-span-12 overflow-hidden relative rounded-2xl text-white shadow-xl" style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #2563eb 100%)" }}>
            {/* QR pattern decoration — right side */}
            <div className="absolute right-0 top-0 bottom-0 w-48 sm:w-64 flex items-center justify-center opacity-[0.07] pointer-events-none select-none">
              <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                {/* Top-left finder */}
                <rect x="10" y="10" width="60" height="60" rx="4" fill="none" stroke="white" strokeWidth="8"/>
                <rect x="24" y="24" width="32" height="32" rx="2" fill="white"/>
                {/* Top-right finder */}
                <rect x="130" y="10" width="60" height="60" rx="4" fill="none" stroke="white" strokeWidth="8"/>
                <rect x="144" y="24" width="32" height="32" rx="2" fill="white"/>
                {/* Bottom-left finder */}
                <rect x="10" y="130" width="60" height="60" rx="4" fill="none" stroke="white" strokeWidth="8"/>
                <rect x="24" y="144" width="32" height="32" rx="2" fill="white"/>
                {/* Data dots */}
                {[
                  [88,10],[100,10],[112,10],[88,22],[112,22],[100,34],[88,46],[100,46],[112,46],
                  [88,58],[112,58],[100,70],[88,82],[100,82],[112,82],
                  [130,82],[142,82],[154,82],[166,82],[178,82],[190,82],
                  [10,88],[22,88],[34,88],[46,88],[58,88],[70,88],
                  [88,88],[100,88],[112,88],[124,88],[136,88],[148,88],[160,88],[172,88],[184,88],[196,88],
                  [10,100],[34,100],[58,100],[82,100],[106,100],[130,100],[154,100],[178,100],
                  [10,112],[22,112],[46,112],[70,112],[94,112],[118,112],[142,112],[166,112],[190,112],
                  [88,124],[112,124],[136,124],[160,124],[184,124],
                  [88,136],[100,136],[124,136],[148,136],[172,136],
                  [88,148],[112,148],[136,148],[160,148],
                  [130,148],[142,148],[154,148],[166,148],[178,148],[190,148],
                  [130,160],[154,160],[178,160],
                  [130,172],[142,172],[166,172],[190,172],
                  [130,184],[154,184],[178,184],
                ].map(([x, y], i) => (
                  <rect key={i} x={x} y={y} width="8" height="8" rx="1" fill="white"/>
                ))}
              </svg>
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-7 sm:p-8">
              {/* Left: plan info */}
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200 block mb-2">Subscription Status</span>
                <h3 className="text-2xl sm:text-3xl font-bold font-headline leading-tight">{PLAN_LABELS[plan]} Plan</h3>
                <p className="text-blue-200 text-sm mt-1.5">Active subscription · qr-card.ch</p>
              </div>

              {/* Center: usage */}
              <div className="sm:text-center">
                <span className="text-xs font-semibold text-blue-200 block mb-1">
                  {PLAN_LIMITS[plan] === -1 ? "QR Codes" : "QR Codes Used"}
                </span>
                <span className="text-3xl font-extrabold font-headline">
                  {planUsed}
                  {PLAN_LIMITS[plan] !== -1 && (
                    <span className="text-blue-300 font-bold text-2xl"> / {PLAN_LIMITS[plan]}</span>
                  )}
                </span>
                {PLAN_LIMITS[plan] !== -1 && (
                  <div className="mt-2 w-36 h-1.5 bg-blue-800/60 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-white/70"
                      style={{ width: `${Math.min(100, Math.round((planUsed / PLAN_LIMITS[plan]) * 100))}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Right: button */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                {hasStripeSubscription ? (
                  <>
                    <button
                      onClick={handleManageBilling}
                      disabled={portalLoading}
                      className="bg-white text-blue-900 px-7 py-3.5 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors shadow-xl disabled:opacity-70 flex items-center gap-2"
                    >
                      {portalLoading && (
                        <span className="w-4 h-4 border-2 border-blue-900/30 border-t-blue-900 rounded-full animate-spin" />
                      )}
                      {portalLoading ? "Opening…" : "Manage Billing"}
                    </button>
                    <button
                      onClick={handleManageBilling}
                      disabled={portalLoading}
                      className="border border-white/40 text-white px-7 py-2.5 rounded-xl font-semibold text-xs hover:bg-white/10 transition-colors disabled:opacity-70 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                      View Invoices
                    </button>
                  </>
                ) : (
                  <Link
                    href="/dashboard/upgrade"
                    className="bg-white text-blue-900 px-7 py-3.5 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors shadow-xl text-center"
                  >
                    {plan === "free" ? "Upgrade Plan" : "View Plans"}
                  </Link>
                )}
                {portalError && (
                  <p className="text-xs text-red-200 max-w-[180px] text-right">{portalError}</p>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Danger Zone — hidden from platform owner (their account is managed separately) */}
      {!isPlatformAdmin && (
      <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-red-50 dark:bg-red-900/10 rounded-xl">
          <div>
            <h4 className="text-lg font-bold text-red-800 dark:text-red-200 font-headline">Delete Account</h4>
            <p className="text-sm text-red-800 dark:text-red-200/70 mt-1">
              {isOwner
                ? "Permanently deletes your account, all QR codes, scans, folders and sub-users. Irreversible."
                : "Permanently removes your login. Any QR cards you created stay with the organisation under the admin."}
            </p>
          </div>
          <button
            onClick={async () => {
              setShowDeleteModal(true);
              if (isOwner) {
                try {
                  const res = await fetch("/api/account/delete-preview");
                  const data = await res.json();
                  if (data.isOwner) setDeletePreview({ subUsers: data.subUsers, qrCodes: data.qrCodes, folders: data.folders, scans: data.scans, leads: data.leads });
                } catch {}
              }
            }}
            className="border-2 border-red-500 text-red-500 px-6 py-2.5 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-all w-full sm:w-auto shrink-0"
          >
            Delete Account
          </button>
        </div>
      </div>
      )}

      {/* Delete account confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a1d27] rounded-3xl shadow-2xl w-full max-w-md p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-red-600 text-[22px]">warning</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Delete Account</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              {isOwner
                ? "You are the owner of this organisation. Deleting your account will permanently delete:"
                : "This removes your login from this organisation. The admin will still see the QR cards you created — they'll be marked as created by a departed user. The admin will be notified."}
            </p>
            {isOwner && deletePreview && (
              <ul className="text-sm text-slate-700 dark:text-slate-300 mb-4 space-y-1.5 bg-red-50 dark:bg-red-900/10 rounded-xl p-4">
                <li>• <span className="font-semibold">{deletePreview.subUsers}</span> sub-user{deletePreview.subUsers === 1 ? "" : "s"} — logins revoked immediately</li>
                <li>• <span className="font-semibold">{deletePreview.qrCodes}</span> QR code{deletePreview.qrCodes === 1 ? "" : "s"}</li>
                <li>• <span className="font-semibold">{deletePreview.folders}</span> folder{deletePreview.folders === 1 ? "" : "s"}</li>
                <li>• <span className="font-semibold">{deletePreview.scans.toLocaleString()}</span> scan{deletePreview.scans === 1 ? "" : "s"} of analytics history</li>
                <li>• <span className="font-semibold">{deletePreview.leads.toLocaleString()}</span> captured lead{deletePreview.leads === 1 ? "" : "s"}</li>
              </ul>
            )}
            <p className="text-sm font-semibold text-red-600 mb-5">This cannot be undone.</p>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Type <span className="text-red-500 font-bold">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full bg-slate-50 dark:bg-[#242736] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 text-slate-900 dark:text-slate-100 mb-5"
            />
            {deleteError && (
              <div className="mb-4">
                <p className="text-xs text-red-500 whitespace-pre-wrap break-words">{deleteError}</p>
                {supportEmail && (
                  <a
                    href={`mailto:${supportEmail}?subject=Account%20deletion%20error&body=Hi%2C%20I%20encountered%20an%20error%20while%20trying%20to%20delete%20my%20account%3A%0A%0A`}
                    className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-blue-600 hover:underline"
                  >
                    <span className="material-symbols-outlined text-[14px]">mail</span>
                    Contact support: {supportEmail}
                  </a>
                )}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== "DELETE" || deleteLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white py-3 rounded-xl font-bold text-sm transition-colors"
              >
                {deleteLoading ? "Deleting…" : "Yes, delete everything"}
              </button>
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); setDeleteError(null); setDeletePreview(null); }}
                disabled={deleteLoading}
                className="px-5 py-3 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete template confirmation modal */}
      {templateToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a1d27] rounded-3xl shadow-2xl w-full max-w-md p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-red-600 text-[22px]">delete</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Delete template?</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Are you sure you want to delete <span className="font-semibold text-slate-900 dark:text-slate-100">&ldquo;{templateToDelete.name}&rdquo;</span>? Existing QR codes will keep their values but new ones will no longer be pre-filled from this template.
            </p>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  const id = templateToDelete.id;
                  setTemplateToDelete(null);
                  await fetch(`/api/templates/${id}`, { method: "DELETE" });
                  setTemplates((prev) => prev.filter((x) => x.id !== id));
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold text-sm transition-colors"
              >
                Yes, delete
              </button>
              <button
                onClick={() => setTemplateToDelete(null)}
                className="px-5 py-3 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Editor Modal */}
      <TemplateEditorModal
        open={showTemplateEditor}
        onClose={() => { setShowTemplateEditor(false); setEditingTemplate(null); }}
        onSaved={(saved) => {
          setTemplates((prev) =>
            editingTemplate
              ? prev.map((t) => (t.id === saved.id ? saved : t))
              : [saved, ...prev]
          );
          setEditingTemplate(null);
        }}
        editing={editingTemplate}
        orgDefaults={{
          organizationName,
          brandLogoUrl,
          acctPhone,
          acctEmail,
          acctWebsite,
          acctLinkedin,
          acctInstagram,
          acctFacebook,
          acctTiktok,
          acctSnapchat,
          acctX,
        }}
      />
    </div>
  );
}

function SocialPrefixInput({
  prefix,
  fullPrefix,
  value,
  onChange,
  placeholder,
}: {
  prefix: string;
  fullPrefix: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  function getSuffix(full: string): string {
    if (!full) return "";
    if (full.startsWith(fullPrefix)) return full.slice(fullPrefix.length);
    const variants = [fullPrefix.replace("https://", "http://"), fullPrefix.replace("https://", "")];
    for (const v of variants) {
      if (full.startsWith(v)) return full.slice(v.length);
    }
    return full;
  }

  return (
    <div className="w-full flex items-stretch bg-gray-50 dark:bg-[#242736] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 transition-all">
      <span className="flex items-center text-xs text-gray-400 bg-gray-100 dark:bg-[#1e2130] px-3 border-r border-gray-200 dark:border-[#2a2e3e] whitespace-nowrap shrink-0 select-none">
        {prefix}
      </span>
      <input
        type="text"
        value={getSuffix(value)}
        onChange={(e) => onChange(e.target.value ? fullPrefix + e.target.value.trim() : "")}
        placeholder={placeholder}
        size={1}
        className="flex-1 min-w-0 px-3 py-2.5 text-sm bg-transparent focus:outline-none placeholder:text-gray-400"
      />
    </div>
  );
}
