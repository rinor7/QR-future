"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { ActivityItem } from "@/app/api/activity/route";

type DisplayItem = ActivityItem & { count?: number };

// Collapse consecutive scans of the same card within 10 minutes into one row.
function groupItems(items: ActivityItem[]): DisplayItem[] {
  const out: DisplayItem[] = [];
  const WINDOW_MS = 10 * 60 * 1000;
  for (const it of items) {
    const last = out[out.length - 1];
    if (
      last &&
      last.type === "scan" &&
      it.type === "scan" &&
      last.qr_id === it.qr_id &&
      new Date(last.ts).getTime() - new Date(it.ts).getTime() < WINDOW_MS
    ) {
      last.count = (last.count ?? 1) + 1;
      continue;
    }
    out.push({ ...it });
  }
  return out;
}

const EVENT_LABELS: Record<string, string> = {
  click_phone:            "Phone tapped",
  click_email:            "Email tapped",
  click_website:          "Website opened",
  click_pdf:              "PDF opened",
  click_link:             "Link clicked",
  click_save_contact:     "Contact saved",
  click_share:            "Card shared",
  click_social_linkedin:  "LinkedIn opened",
  click_social_instagram: "Instagram opened",
  click_social_facebook:  "Facebook opened",
  click_social_tiktok:    "TikTok opened",
  click_social_snapchat:  "Snapchat opened",
  click_social_x:         "X opened",
  click_social_other:     "Social link opened",
  lead_capture_open:      "Lead form opened",
  lead_capture_submit:    "Lead submitted",
};

const EVENT_ICONS: Record<string, string> = {
  click_phone: "call",
  click_email: "mail",
  click_website: "language",
  click_pdf: "picture_as_pdf",
  click_link: "link",
  click_save_contact: "contact_page",
  click_share: "share",
  click_social_linkedin: "open_in_new",
  click_social_instagram: "open_in_new",
  click_social_facebook: "open_in_new",
  click_social_tiktok: "open_in_new",
  click_social_snapchat: "open_in_new",
  click_social_x: "open_in_new",
  click_social_other: "open_in_new",
  lead_capture_open: "contact_mail",
  lead_capture_submit: "mark_email_read",
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  return `${d}d ago`;
}

function describeScan(item: ActivityItem): string {
  const loc = [item.city, item.country].filter(Boolean).join(", ");
  const device = item.device_type ? item.device_type.charAt(0).toUpperCase() + item.device_type.slice(1) : "";
  if (device && loc) return `Scanned on ${device} from ${loc}`;
  if (loc) return `Scanned from ${loc}`;
  if (device) return `Scanned on ${device}`;
  return "Scanned";
}

function ActivityRow({ item, isNew }: { item: DisplayItem; isNew: boolean }) {
  // Notifications get their own prominent rendering
  if (item.type === "notification") {
    const kind = item.notification_kind ?? "";
    const iconMap: Record<string, string> = {
      user_deleted: "person_off",
      user_signed_up: "person_add",
      user_invited: "mail",
      invite_accepted: "how_to_reg",
    };
    const icon = iconMap[kind] ?? "notifications";
    return (
      <div className="flex items-start gap-3 px-4 py-4 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 dark:border-amber-500">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-amber-100 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300">
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-100 truncate">{item.message ?? item.qr_label}</p>
            {isNew && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />}
          </div>
          {kind === "user_deleted" && (
            <p className="text-xs text-amber-700 dark:text-amber-300/80 truncate mt-0.5">
              Their QR cards stay with the organisation.
            </p>
          )}
        </div>
        <span className="text-[10px] text-amber-600 dark:text-amber-400/70 shrink-0 mt-1">{timeAgo(item.ts)}</span>
      </div>
    );
  }

  const isScan = item.type === "scan";
  const isLead = item.type === "lead";

  const iconBg = isScan
    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600"
    : isLead
    ? "bg-green-50 dark:bg-green-900/20 text-green-600"
    : "bg-purple-50 dark:bg-purple-900/20 text-purple-600";

  const icon = isScan
    ? "qr_code_scanner"
    : isLead
    ? "contact_mail"
    : EVENT_ICONS[item.event_type ?? ""] ?? "touch_app";

  const detail = isScan
    ? (item.count && item.count > 1 ? `${item.count} scans · ${describeScan(item)}` : describeScan(item))
    : isLead
    ? `New lead${item.lead_name ? ` from ${item.lead_name}` : ""}`
    : (EVENT_LABELS[item.event_type ?? ""] ?? item.event_type ?? "Interaction");

  return (
    <Link
      href={`/dashboard/analytics/${item.qr_id}`}
      className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-[#1e2130] transition-colors group"
    >
      {/* Icon */}
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}>
        <span className="material-symbols-outlined text-[16px]">{icon}</span>
      </div>

      {/* Text — card name is the headline, event is the detail */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{item.qr_label}</p>
          {isNew && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{detail}</p>
      </div>

      {/* Time */}
      <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 mt-1">{timeAgo(item.ts)}</span>
    </Link>
  );
}

const STORAGE_KEY = "qr-activity-seen";

export default function ActivityPanel({
  open,
  onClose,
  onUnreadChange,
}: {
  open: boolean;
  onClose: () => void;
  onUnreadChange: (count: number) => void;
}) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSeenAt, setLastSeenAt] = useState<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load lastSeenAt from localStorage once
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setLastSeenAt(stored ? parseInt(stored, 10) : 0);
  }, []);

  // Fetch activity
  async function fetchActivity() {
    try {
      const res = await fetch("/api/activity");
      if (!res.ok) return;
      const data: ActivityItem[] = await res.json();
      setItems(data);
      setLoading(false);
      // Compute unread count using the latest lastSeenAt from storage
      const stored = localStorage.getItem(STORAGE_KEY);
      const seen = stored ? parseInt(stored, 10) : 0;
      const unread = data.filter((it) => new Date(it.ts).getTime() > seen).length;
      onUnreadChange(unread);
    } catch {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchActivity();
    intervalRef.current = setInterval(fetchActivity, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When panel opens, mark all as seen
  useEffect(() => {
    if (open) {
      const now = Date.now();
      localStorage.setItem(STORAGE_KEY, String(now));
      setLastSeenAt(now);
      onUnreadChange(0);
    }
  }, [open, onUnreadChange]);

  const unreadTs = lastSeenAt;
  const displayItems = useMemo(() => groupItems(items), [items]);

  return (
    <>
      {/* Backdrop (mobile only) */}
      {open && (
        <div
          className="wide:hidden fixed inset-0 bg-black/40 z-40"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <aside
        className={`
          fixed top-0 right-0 h-screen w-80 z-50 flex flex-col
          bg-white dark:bg-[#1a1d27] border-l border-slate-200 dark:border-[#242736]
          shadow-[-4px_0_24px_rgba(0,0,0,0.08)]
          transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-slate-100 dark:border-[#242736] shrink-0">
          <div>
            <h2 className="font-headline font-bold text-slate-900 dark:text-slate-100 text-base">Activity</h2>
            <p className="text-xs text-slate-400 mt-0.5">Live feed · updates every 30s</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Feed */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : displayItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-200 dark:text-slate-700 mb-3">qr_code_scanner</span>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No activity yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Scans, interactions and leads will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-[#242736]">
              {displayItems.map((item) => (
                <ActivityRow
                  key={item.id}
                  item={item}
                  isNew={new Date(item.ts).getTime() > unreadTs}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {displayItems.length > 0 && (
          <div className="px-5 py-4 border-t border-slate-100 dark:border-[#242736] shrink-0">
            <Link
              href="/dashboard/codes"
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              View all QR codes →
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
