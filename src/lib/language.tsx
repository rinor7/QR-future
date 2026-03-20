"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Lang = "de" | "en";

export const t = {
  de: {
    // Sidebar
    nav_dashboard: "Dashboard",
    nav_codes: "QR Codes",
    nav_settings: "Einstellungen",
    nav_language: "Sprache",
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
    col_name: "Name / Musterfirma",
    col_created: "Erstellt",
    col_link: "Link",
    col_actions: "Aktionen",
    col_created_by: "Erstellt von",
    delete_confirm: "Nochmal klicken zum Bestätigen",
    delete: "Löschen",
    // Codes page
    new_qr: "Neuer QR Code",
    search_placeholder: "Suche nach Name, Musterfirma oder ID...",
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
    qr_label: "QR Code Name",
    qr_label_hint: "Nur für Sie sichtbar – hilft beim Erkennen im Dashboard.",
    qr_label_placeholder: "z.B. Messe 2026, Visitenkarte Büro",
    section_identity: "Angaben",
    section_contact: "Kontaktdaten",
    section_social: "Social Media",
    section_pdf: "Dateien / PDF",
    section_notes: "Notizen (intern)",
    field_first_name: "Vorname",
    field_last_name: "Name",
    field_title: "Titel / Position",
    field_company: "Musterfirma",
    field_logo: "Logo",
    field_logo_hint: "Direkter Bildlink (PNG, JPG, SVG)",
    upload_remove: "Entfernen",
    upload_uploading: "Wird hochgeladen…",
    upload_error_size: "Dateien zu groß. Maximum 14 MB.",
    upload_error_failed: "Upload fehlgeschlagen. Bitte erneut versuchen.",
    upload_logo: "Logo hochladen",
    upload_logo_hint: "Max. 14 MB · Wird automatisch komprimiert wenn nötig",
    upload_pdf: "PDF hochladen",
    upload_pdf_open: "Aktuelle Dateien öffnen",
    upload_pdf_hint: "Max. 14 MB · Nur PDF-Dateien",
    pdf_option_upload: "Dateien hochladen",
    pdf_option_link: "Link hinzufügen",
    link_label_placeholder: "z.B. Broschüre, Preisliste…",
    link_add: "Hinzufügen",
    links_max: "Maximum 4 Einträge erreicht",
    field_color: "Akzentfarbe",
    field_color_hint: "Wird als Hintergrundfarbe auf Ihrer QR-Visitenkarte verwendet.",
    field_phone: "Telefon",
    field_email: "E-Mail",
    field_website: "Webseite",
    field_street: "Strasse",
    field_street_nr: "Nr.",
    field_plz: "PLZ",
    field_city: "Ort",
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
    free_expiry_warning: "QR Codes laufen nach 48h ab",
    expiry_expired: "Abgelaufen",
    expiry_hours: "Läuft ab in",
    expiry_min: "min",
    delete_modal_title: "QR Code löschen?",
    delete_modal_body: "Alle Daten dieses QR Codes werden unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.",
    delete_modal_cancel: "Abbrechen",
    delete_modal_confirm: "Ja, löschen",
  },
  en: {
    // Sidebar
    nav_dashboard: "Dashboard",
    nav_codes: "QR Codes",
    nav_settings: "Settings",
    nav_language: "Language",
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
    qr_label: "QR Code Name",
    qr_label_hint: "Only visible to you – helps identify it in the dashboard.",
    qr_label_placeholder: "e.g. Trade Fair 2025, Office Card",
    section_identity: "Identity",
    section_contact: "Contact Details",
    section_social: "Social Media",
    section_pdf: "File / PDF",
    section_notes: "Notes (internal) - only visible in the dashboard",
    field_first_name: "First Name",
    field_last_name: "Last Name",
    field_title: "Title / Position",
    field_company: "Company",
    field_logo: "Logo",
    field_logo_hint: "Direct image link (PNG, JPG, SVG)",
    upload_remove: "Remove",
    upload_uploading: "Uploading…",
    upload_error_size: "File too large. Maximum 14 MB.",
    upload_error_failed: "Upload failed. Please try again.",
    upload_logo: "Upload logo",
    upload_logo_hint: "Max. 14 MB · Automatically compressed if needed",
    upload_pdf: "Upload PDF",
    upload_pdf_open: "Open current file",
    upload_pdf_hint: "Max. 14 MB · PDF files only",
    pdf_option_upload: "Upload file",
    pdf_option_link: "Add link",
    link_label_placeholder: "e.g. Brochure, Price list…",
    link_add: "Add",
    links_max: "Maximum 4 entries reached",
    field_color: "Accent Color",
    field_color_hint: "Used as the background color on your QR business card.",
    field_phone: "Phone",
    field_email: "Email",
    field_website: "Website",
    field_street: "Street",
    field_street_nr: "No.",
    field_plz: "Postal Code",
    field_city: "City",
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
    free_expiry_warning: "QR codes expire after 48h",
    expiry_expired: "Expired",
    expiry_hours: "Expires in",
    expiry_min: "min",
    delete_modal_title: "Delete QR Code?",
    delete_modal_body: "All data for this QR code will be permanently deleted. This action cannot be undone.",
    delete_modal_cancel: "Cancel",
    delete_modal_confirm: "Yes, delete",
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
