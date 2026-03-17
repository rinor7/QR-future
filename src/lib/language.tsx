"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Lang = "de" | "en";

export const t = {
  de: {
    // Sidebar
    nav_dashboard: "Dashboard",
    nav_codes: "QR Codes",
    nav_settings: "Einstellungen",
    logout: "Abmelden",
    // Dashboard page
    dashboard_subtitle: "Verwalten Sie Ihre QR Codes",
    create_qr: "QR Code erstellen",
    stat_total: "Gesamt QR Codes",
    stat_phone: "Mit Telefon",
    stat_website: "Mit Website",
    all_codes: "Alle QR Codes",
    no_codes: "Noch keine QR Codes",
    no_codes_sub: "Erstellen Sie Ihren ersten QR Code",
    create_now: "Jetzt erstellen",
    col_name: "Name / Unternehmen",
    col_created: "Erstellt",
    col_link: "Link",
    col_actions: "Aktionen",
    col_created_by: "Erstellt von",
    delete_confirm: "Nochmal klicken zum Bestätigen",
    delete: "Löschen",
    // Codes page
    new_qr: "Neuer QR Code",
    search_placeholder: "Suche nach Name, Unternehmen oder ID...",
    no_results: "Keine QR Codes gefunden",
    unnamed: "Unbenannt",
    edit: "Bearbeiten",
    codes_total: "QR Codes gesamt",
    // Settings
    settings_title: "Einstellungen",
    settings_subtitle: "Plattform-Einstellungen",
    settings_placeholder: "Einstellungen werden in einer zukünftigen Version verfügbar sein.",
    // Create page
    create_title: "Neuer QR Code",
    create_subtitle: "Füllen Sie die Felder aus und erstellen Sie Ihren QR Code",
    create_error: "Fehler beim Erstellen. Bitte versuchen Sie es erneut.",
    create_submit: "QR Code erstellen",
    // Edit page
    edit_title: "QR Code bearbeiten",
    edit_success: "QR Code erfolgreich erstellt!",
    saved: "Gespeichert!",
    save_error: "Fehler beim Speichern.",
    open_page: "Seite öffnen",
    copy_link: "Link kopieren",
    copied: "Kopiert!",
    download_qr: "QR herunterladen",
    save: "Speichern",
    // QRForm
    section_identity: "Identität",
    section_contact: "Kontaktdaten",
    section_social: "Social Media",
    section_pdf: "Datei / PDF",
    section_notes: "Notizen (intern)",
    field_name: "Name",
    field_title: "Titel / Position",
    field_company: "Unternehmen",
    field_logo: "Logo URL",
    field_logo_hint: "Direkter Bildlink (PNG, JPG, SVG)",
    field_color: "Akzentfarbe",
    field_phone: "Telefon",
    field_email: "E-Mail",
    field_website: "Website",
    field_address: "Adresse",
    field_linkedin: "LinkedIn URL",
    field_instagram: "Instagram URL",
    field_facebook: "Facebook URL",
    field_pdf_url: "PDF / Datei URL",
    field_pdf_label: "Button-Beschriftung",
    field_notes: "Interne Notiz",
    field_notes_placeholder: "Nur im Dashboard sichtbar...",
    cancel: "Abbrechen",
    // Plan
    plan_label: "Plan",
    plan_limit_reached: "Limit erreicht für Plan",
    plan_upgrade_hint: "Bitte upgraden Sie Ihren Plan.",
    plan_free_note: "Kostenlose QR Codes werden nach 48 Stunden gelöscht.",
  },
  en: {
    // Sidebar
    nav_dashboard: "Dashboard",
    nav_codes: "QR Codes",
    nav_settings: "Settings",
    logout: "Logout",
    // Dashboard page
    dashboard_subtitle: "Manage your QR codes",
    create_qr: "Create QR Code",
    stat_total: "Total QR Codes",
    stat_phone: "With Phone",
    stat_website: "With Website",
    all_codes: "All QR Codes",
    no_codes: "No QR codes yet",
    no_codes_sub: "Create your first QR code",
    create_now: "Create now",
    col_name: "Name / Company",
    col_created: "Created",
    col_link: "Link",
    col_actions: "Actions",
    col_created_by: "Created by",
    delete_confirm: "Click again to confirm",
    delete: "Delete",
    // Codes page
    new_qr: "New QR Code",
    search_placeholder: "Search by name, company or ID...",
    no_results: "No QR codes found",
    unnamed: "Unnamed",
    edit: "Edit",
    codes_total: "QR Codes total",
    // Settings
    settings_title: "Settings",
    settings_subtitle: "Platform Settings",
    settings_placeholder: "Settings will be available in a future version.",
    // Create page
    create_title: "New QR Code",
    create_subtitle: "Fill in the fields and create your QR code",
    create_error: "Error creating. Please try again.",
    create_submit: "Create QR Code",
    // Edit page
    edit_title: "Edit QR Code",
    edit_success: "QR code successfully created!",
    saved: "Saved!",
    save_error: "Error saving.",
    open_page: "Open page",
    copy_link: "Copy link",
    copied: "Copied!",
    download_qr: "Download QR",
    save: "Save",
    // QRForm
    section_identity: "Identity",
    section_contact: "Contact Details",
    section_social: "Social Media",
    section_pdf: "File / PDF",
    section_notes: "Notes (internal)",
    field_name: "Name",
    field_title: "Title / Position",
    field_company: "Company",
    field_logo: "Logo URL",
    field_logo_hint: "Direct image link (PNG, JPG, SVG)",
    field_color: "Accent Color",
    field_phone: "Phone",
    field_email: "Email",
    field_website: "Website",
    field_address: "Address",
    field_linkedin: "LinkedIn URL",
    field_instagram: "Instagram URL",
    field_facebook: "Facebook URL",
    field_pdf_url: "PDF / File URL",
    field_pdf_label: "Button Label",
    field_notes: "Internal Note",
    field_notes_placeholder: "Only visible in the dashboard...",
    cancel: "Cancel",
    // Plan
    plan_label: "Plan",
    plan_limit_reached: "Limit reached for plan",
    plan_upgrade_hint: "Please upgrade your plan.",
    plan_free_note: "Free QR codes are automatically deleted after 48 hours.",
  },
};

type Translations = typeof t.de;

interface LangContextType {
  lang: Lang;
  tr: Translations;
  toggleLang: () => void;
}

const LangContext = createContext<LangContextType>({
  lang: "de",
  tr: t.de,
  toggleLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("de");

  useEffect(() => {
    const stored = localStorage.getItem("dashboard_lang") as Lang | null;
    if (stored === "en" || stored === "de") setLang(stored);
  }, []);

  function toggleLang() {
    setLang((prev) => {
      const next = prev === "de" ? "en" : "de";
      localStorage.setItem("dashboard_lang", next);
      return next;
    });
  }

  return (
    <LangContext.Provider value={{ lang, tr: t[lang], toggleLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
