"use client";

import { useEffect, useRef, useState } from "react";
import { getAllContacts } from "@/lib/store";
import { QRContact } from "@/lib/types";

interface NFCCard {
  id: string;
  card_uid: string;
  label: string | null;
  contact_id: string | null;
  contactName: string | null;
  created_at: string;
  updated_at: string;
}

/* ── Searchable contact picker ── */
function ContactPicker({
  contacts,
  value,
  onChange,
  placeholder = "Search by name or company…",
  size = "normal",
}: {
  contacts: QRContact[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  size?: "normal" | "small";
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = contacts.find((c) => c.id === value);
  const displayName = selected
    ? `${selected.firstName ?? ""} ${selected.lastName ?? ""}`.trim() || selected.company || selected.qrLabel || selected.id.slice(0, 8)
    : "";

  const filtered = query.trim()
    ? contacts.filter((c) => {
        const name = `${c.firstName ?? ""} ${c.lastName ?? ""} ${c.company ?? ""} ${c.qrLabel ?? ""}`.toLowerCase();
        return name.includes(query.toLowerCase());
      })
    : contacts;

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function select(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  const inputCls = size === "small"
    ? "w-full bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
    : "w-full bg-slate-50 dark:bg-[#242736] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer";

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      {!open ? (
        <button
          type="button"
          onClick={() => { setOpen(true); setQuery(""); }}
          className={`${inputCls} text-left flex items-center justify-between gap-2`}
        >
          <span className={value ? "text-slate-900 dark:text-slate-100" : "text-slate-400"}>
            {value ? displayName : (size === "small" ? "— Unassign / pick —" : "— Assign later —")}
          </span>
          <span className="material-symbols-outlined text-slate-400 shrink-0" style={{ fontSize: 16 }}>expand_more</span>
        </button>
      ) : (
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className={inputCls}
        />
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#242736] rounded-xl shadow-xl overflow-hidden">
          {/* Clear / unassign option */}
          <button
            type="button"
            onClick={() => select("")}
            className="w-full text-left px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-50 dark:hover:bg-[#242736] border-b border-slate-100 dark:border-[#242736] transition-colors"
          >
            — {size === "small" ? "Unassign" : "Assign later"} —
          </button>

          {/* Scrollable list */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-sm text-slate-400 text-center">No contacts found</p>
            ) : (
              filtered.map((c) => {
                const name = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
                const sub = c.company || c.qrLabel || "";
                const isSelected = c.id === value;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => select(c.id)}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-[#242736] transition-colors ${isSelected ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                  >
                    {/* Avatar */}
                    <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                        {(name || sub || "?")[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{name || sub || c.id.slice(0, 8)}</p>
                      {name && sub && <p className="text-xs text-slate-400 truncate">{sub}</p>}
                    </div>
                    {isSelected && <span className="material-symbols-outlined text-blue-600 shrink-0" style={{ fontSize: 16 }}>check</span>}
                  </button>
                );
              })
            )}
          </div>

          {/* Count hint */}
          {filtered.length > 0 && (
            <p className="px-3 py-1.5 text-[10px] text-slate-400 border-t border-slate-100 dark:border-[#242736]">
              {query ? `${filtered.length} of ${contacts.length}` : `${contacts.length} profile${contacts.length !== 1 ? "s" : ""}`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main Page ── */
export default function NFCPage() {
  const [cards, setCards] = useState<NFCCard[]>([]);
  const [contacts, setContacts] = useState<QRContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [baseUrl, setBaseUrl] = useState("");

  // Register new card
  const [showRegister, setShowRegister] = useState(false);
  const [newUid, setNewUid] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newContact, setNewContact] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // Reassign
  const [reassignId, setReassignId] = useState<string | null>(null);
  const [reassignContact, setReassignContact] = useState("");
  const [reassignLoading, setReassignLoading] = useState(false);

  // Edit label
  const [editLabelId, setEditLabelId] = useState<string | null>(null);
  const [editLabelValue, setEditLabelValue] = useState("");

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setBaseUrl(window.location.origin);
    Promise.all([
      fetch("/api/nfc").then((r) => r.json()),
      getAllContacts(),
    ]).then(([nfcData, contactData]) => {
      setCards(Array.isArray(nfcData) ? nfcData : []);
      setContacts(contactData);
    }).finally(() => setLoading(false));
  }, []);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!newUid.trim()) return;
    setRegisterLoading(true);
    setRegisterError(null);
    const res = await fetch("/api/nfc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card_uid: newUid.trim(), label: newLabel.trim() || null, contact_id: newContact || null }),
    });
    const data = await res.json();
    if (!res.ok) { setRegisterError(data.error ?? "Failed"); setRegisterLoading(false); return; }

    const contact = contacts.find((c) => c.id === data.contact_id);
    setCards((prev) => [{ ...data, contactName: contact ? `${contact.firstName} ${contact.lastName}`.trim() || contact.company : null }, ...prev]);
    setNewUid(""); setNewLabel(""); setNewContact(""); setShowRegister(false);
    setRegisterLoading(false);
  }

  async function handleReassign(cardId: string) {
    setReassignLoading(true);
    const res = await fetch(`/api/nfc/${cardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact_id: reassignContact || null }),
    });
    if (res.ok) {
      const contact = contacts.find((c) => c.id === reassignContact);
      setCards((prev) => prev.map((c) =>
        c.id === cardId
          ? { ...c, contact_id: reassignContact || null, contactName: contact ? `${contact.firstName} ${contact.lastName}`.trim() || contact.company : null }
          : c
      ));
      setReassignId(null);
      setReassignContact("");
    }
    setReassignLoading(false);
  }

  async function handleSaveLabel(cardId: string) {
    await fetch(`/api/nfc/${cardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: editLabelValue }),
    });
    setCards((prev) => prev.map((c) => c.id === cardId ? { ...c, label: editLabelValue || null } : c));
    setEditLabelId(null);
  }

  async function handleDelete(cardId: string) {
    if (!confirm("Remove this NFC card from the platform? The physical card won't be affected.")) return;
    await fetch(`/api/nfc/${cardId}`, { method: "DELETE" });
    setCards((prev) => prev.filter((c) => c.id !== cardId));
  }

  function copyUrl(uid: string, cardId: string) {
    navigator.clipboard.writeText(`${baseUrl}/nfc/${uid}`);
    setCopiedId(cardId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const assigned = cards.filter((c) => c.contact_id);
  const unassigned = cards.filter((c) => !c.contact_id);

  return (
    <div className="pt-8 pb-12 px-6 lg:px-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-10 gap-4 flex-wrap">
        <div>
          <h2 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">NFC Cards</h2>
          <p className="text-slate-400 mt-2">Register physical NFC cards and assign them to profiles</p>
        </div>
        <button
          onClick={() => setShowRegister(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Register Card
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Cards", value: cards.length, icon: "nfc", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
          { label: "Assigned", value: assigned.length, icon: "link", color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
          { label: "Unassigned", value: unassigned.length, icon: "link_off", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
        ].map(({ label, value, icon, color, bg }) => (
          <div key={label} className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-100 dark:border-[#242736] p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${bg}`}>
              <span className={`material-symbols-outlined text-[20px] ${color}`}>{icon}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Register card modal */}
      {showRegister && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a1d27] rounded-3xl shadow-2xl w-full max-w-md p-8">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Register NFC Card</h3>
            <p className="text-sm text-slate-400 mb-6">Enter the unique ID printed on or programmed into the card</p>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Card UID / Code *</label>
                <input
                  type="text"
                  value={newUid}
                  onChange={(e) => setNewUid(e.target.value.toUpperCase())}
                  placeholder="e.g. A1B2C3D4"
                  required
                  className="w-full bg-slate-50 dark:bg-[#242736] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-400 mt-1">
                  The NFC chip must be programmed with: <span className="font-mono text-blue-600">{baseUrl}/nfc/{newUid || "CARD-UID"}</span>
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Label (optional)</label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. John's metal card"
                  className="w-full bg-slate-50 dark:bg-[#242736] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Assign to profile (optional)</label>
                <ContactPicker
                  contacts={contacts}
                  value={newContact}
                  onChange={setNewContact}
                />
              </div>
              {registerError && <p className="text-xs text-red-500">{registerError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={registerLoading || !newUid.trim()} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50">
                  {registerLoading ? "Registering…" : "Register Card"}
                </button>
                <button type="button" onClick={() => { setShowRegister(false); setRegisterError(null); setNewUid(""); setNewLabel(""); setNewContact(""); }} className="px-5 py-3 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Card list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : cards.length === 0 ? (
        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-100 dark:border-[#242736] p-16 text-center">
          <span className="material-symbols-outlined text-[48px] text-slate-200 dark:text-slate-700 block mb-3">nfc</span>
          <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-1">No NFC cards registered</h3>
          <p className="text-sm text-slate-400 mb-5">Register your first NFC card to start assigning it to profiles</p>
          <button onClick={() => setShowRegister(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors">
            Register first card
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-100 dark:border-[#242736] overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-[#242736] flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{cards.length} card{cards.length !== 1 ? "s" : ""} registered</h3>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-[#242736]">
            {cards.map((card) => (
              <div key={card.id} className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-[#242736] transition-colors">
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${card.contact_id ? "bg-green-50 dark:bg-green-900/20" : "bg-amber-50 dark:bg-amber-900/20"}`}>
                    <span className={`material-symbols-outlined text-[20px] ${card.contact_id ? "text-green-600" : "text-amber-500"}`}>nfc</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">{card.card_uid}</span>
                      {/* Label */}
                      {editLabelId === card.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            type="text"
                            value={editLabelValue}
                            onChange={(e) => setEditLabelValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleSaveLabel(card.id); if (e.key === "Escape") setEditLabelId(null); }}
                            className="text-xs bg-white dark:bg-[#1a1d27] border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                          <button onClick={() => handleSaveLabel(card.id)} className="text-xs text-blue-600 hover:underline">Save</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditLabelId(card.id); setEditLabelValue(card.label ?? ""); }}
                          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                          {card.label ? `"${card.label}"` : "+ add label"}
                        </button>
                      )}
                    </div>

                    {/* Assignment */}
                    {reassignId === card.id ? (
                      <div className="mt-2 flex items-start gap-2">
                        <div className="flex-1">
                          <ContactPicker
                            contacts={contacts}
                            value={reassignContact}
                            onChange={setReassignContact}
                            size="small"
                          />
                        </div>
                        <button
                          onClick={() => handleReassign(card.id)}
                          disabled={reassignLoading}
                          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium shrink-0 mt-0.5"
                        >
                          {reassignLoading ? "…" : "Save"}
                        </button>
                        <button onClick={() => setReassignId(null)} className="text-xs text-slate-400 hover:text-slate-600 transition-colors shrink-0 mt-1.5">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {card.contact_id ? (
                          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">person</span>
                            {card.contactName}
                          </span>
                        ) : (
                          <span className="text-xs text-amber-500 font-medium">Not assigned</span>
                        )}
                        <button
                          onClick={() => { setReassignId(card.id); setReassignContact(card.contact_id ?? ""); }}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          {card.contact_id ? "Reassign" : "Assign"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* NFC URL + actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => copyUrl(card.card_uid, card.id)}
                      title={`${baseUrl}/nfc/${card.card_uid}`}
                      className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiedId === card.id ? "check" : "content_copy"}
                      </span>
                      {copiedId === card.id ? "Copied!" : "Copy URL"}
                    </button>
                    <button
                      onClick={() => handleDelete(card.id)}
                      className="p-1.5 text-slate-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Remove card"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-6 border border-blue-100 dark:border-blue-900/30">
        <h4 className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-[18px]">info</span>
          How NFC cards work
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { step: "1", title: "Get the card UID", desc: "Each NFC card has a unique code. It's printed on the card or provided by the supplier." },
            { step: "2", title: "Program the chip", desc: `Set the NFC chip URL to: ${baseUrl}/nfc/[CARD-UID]. This is done once, never changes.` },
            { step: "3", title: "Register & assign", desc: "Enter the UID here, assign it to a profile. Reassign anytime — no need to reprogram." },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{step}</div>
              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">{title}</p>
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
