"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bell, CalendarDays, FileWarning, PhoneCall } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { fmtBranch } from "@/lib/enquiry";
import type { EnquiryTaskItem, EnquiryTasks } from "@/types";

// localStorage key for the set of notification item ids the admin has already
// seen (opened the bell on). The badge only counts items NOT yet seen, so it
// clears once you open it and re-appears only for genuinely new work.
const SEEN_KEY = "admin_notif_seen";

function loadSeen(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(SEEN_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

/**
 * Admin notification bell — surfaces admissions work needing attention (overdue
 * follow-ups, new enquiries uncontacted >24h, visits today, applications missing
 * registration). In-app only; no email/SMS. The badge counts only items you
 * haven't seen yet; opening the bell marks the current ones as seen.
 */
export default function NotificationBell() {
  const [tasks, setTasks] = useState<EnquiryTasks | null>(null);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<string[]>(() => loadSeen());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (token) api.adminGetEnquiryTasks(token).then(setTasks).catch(() => { /* non-blocking */ });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const groups: { label: string; items: EnquiryTaskItem[]; icon: React.ElementType; color: string }[] = tasks
    ? [
        { label: "Overdue follow-ups", items: tasks.overdue_follow_ups, icon: AlertTriangle, color: "text-rose-500" },
        { label: "New, not contacted", items: tasks.uncontacted_24h, icon: PhoneCall, color: "text-sky-500" },
        { label: "Visits today", items: tasks.visits_today, icon: CalendarDays, color: "text-violet-500" },
        { label: "Applications to register", items: tasks.apps_missing_registration, icon: FileWarning, color: "text-teal-500" },
      ].filter((g) => g.items.length > 0)
    : [];

  // Unique ids of everything currently needing attention.
  const currentIds = Array.from(new Set(groups.flatMap((g) => g.items.map((t) => t.id))));
  const seenSet = new Set(seen);
  // Badge = items you haven't opened the bell on yet.
  const unseenCount = currentIds.filter((id) => !seenSet.has(id)).length;

  // Opening the bell marks the current items as seen (and prunes resolved ones so
  // the stored set stays bounded), clearing the badge until new work arrives.
  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      if (next) {
        setSeen(currentIds);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(SEEN_KEY, JSON.stringify(currentIds));
        }
      }
      return next;
    });
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        aria-label={`Notifications${unseenCount ? ` (${unseenCount} new)` : ""}`}
      >
        <Bell className="h-5 w-5" />
        {unseenCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[0.6rem] font-bold text-white">
            {unseenCount > 9 ? "9+" : unseenCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="font-semibold text-slate-900">Notifications</p>
            <p className="text-xs text-slate-400">{currentIds.length === 0 ? "You're all caught up" : `${currentIds.length} item${currentIds.length === 1 ? "" : "s"} need attention`}</p>
          </div>
          <div className="max-h-96 overflow-auto">
            {groups.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">Nothing needs attention right now 🎉</p>
            ) : (
              groups.map((g) => (
                <div key={g.label} className="border-b border-slate-50 px-2 py-2 last:border-0">
                  <p className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-slate-500">
                    <g.icon className={`h-3.5 w-3.5 ${g.color}`} /> {g.label} ({g.items.length})
                  </p>
                  {g.items.slice(0, 4).map((t) => (
                    <Link key={t.id} href={`/admin/inquiries/${t.id}`} onClick={() => setOpen(false)}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                      <span className="truncate text-slate-700">{t.name}</span>
                      <span className="shrink-0 text-xs text-slate-400">{fmtBranch(t.branch)}</span>
                    </Link>
                  ))}
                </div>
              ))
            )}
          </div>
          <Link href="/admin/inquiries/dashboard" onClick={() => setOpen(false)}
            className="block border-t border-slate-100 px-4 py-2.5 text-center text-sm font-medium text-teal-600 hover:bg-slate-50">
            View admissions dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
