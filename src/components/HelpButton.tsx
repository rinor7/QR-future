"use client";

import { useEffect, useState } from "react";
import { HelpCircle, X, Send, Check, Loader2 } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useLang } from "@/lib/language";

export default function HelpButton() {
  const { tr } = useLang();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const supabase = getSupabaseBrowser();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const meta = (user.user_metadata ?? {}) as { full_name?: string };
      if (!name) setName(meta.full_name ?? "");
      if (!email) setEmail(user.email ?? "");
    });
  }, [open, name, email]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      const res = await fetch("/api/help/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          message,
          pageUrl: typeof window !== "undefined" ? window.location.href : "",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || tr.help_send_failed);
        setSending(false);
        return;
      }
      setSent(true);
      setMessage("");
    } catch {
      setError(tr.help_send_failed);
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setOpen(false);
    setTimeout(() => {
      setSent(false);
      setError(null);
    }, 200);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={tr.help_button}
        className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        aria-label={tr.help_button}
      >
        <HelpCircle className="w-6 h-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={reset}>
          <div
            className="bg-white dark:bg-[#1a1d27] w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-[#242736]">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{tr.help_title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{tr.help_subtitle}</p>
              </div>
              <button
                onClick={reset}
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-[#242736] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {sent ? (
              <div className="px-6 py-10 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="font-bold text-slate-900 dark:text-slate-100">{tr.help_sent_title}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{tr.help_sent_body}</p>
                <button
                  onClick={reset}
                  className="mt-6 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                >
                  {tr.help_close}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">{tr.help_name}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={tr.help_name_ph}
                    className="w-full bg-slate-50 dark:bg-[#242736] border border-slate-200 dark:border-[#2a2e3e] rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">{tr.help_email} *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-slate-50 dark:bg-[#242736] border border-slate-200 dark:border-[#2a2e3e] rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">{tr.help_message} *</label>
                  <textarea
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={tr.help_message_ph}
                    rows={5}
                    className="w-full bg-slate-50 dark:bg-[#242736] border border-slate-200 dark:border-[#2a2e3e] rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                {error && <p className="text-xs text-red-500">{error}</p>}

                <button
                  type="submit"
                  disabled={sending || !email || !message}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? tr.help_sending : tr.help_send}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
