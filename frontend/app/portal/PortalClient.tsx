"use client";

// Parent Portal dashboard — compact cards over canonical data: children with
// today's attendance status, the latest shared daily update, profile
// completeness, and the family payments summary. Rendered inside the single
// PortalShell (no page-specific layout).

import Link from "next/link";
import { useEffect, useState } from "react";
import { Banknote, CalendarCheck, NotebookPen } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { usePortal } from "@/components/portal/PortalShell";
import Avatar from "@/components/admin/ui/Avatar";
import { fmtDate } from "@/lib/child";
import { formatPence, mandateStatusLabel } from "@/lib/finance";
import type { DailyRecord, FamilyView, OnboardingView, PortalAttendanceRow } from "@/types";

const todayYMD = () => new Date().toISOString().slice(0, 10);

function attendanceLabel(row?: PortalAttendanceRow): { text: string; tone: string } {
  if (!row) return { text: "Not scheduled", tone: "text-slate-400" };
  if (row.check_in && !row.check_out) return { text: `Checked in ${new Date(row.check_in).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`, tone: "text-teal-700" };
  if (row.check_in && row.check_out) return { text: `Attended (left ${new Date(row.check_out).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })})`, tone: "text-slate-600" };
  return { text: row.status.replace(/_/g, " "), tone: "text-amber-600" };
}

export default function PortalClient() {
  const { children, loading, error } = usePortal();
  const [today, setToday] = useState<Map<string, PortalAttendanceRow>>(new Map());
  const [latest, setLatest] = useState<Map<string, DailyRecord>>(new Map());
  const [onboarding, setOnboarding] = useState<Map<string, OnboardingView>>(new Map());
  const [finance, setFinance] = useState<FamilyView | null>(null);
  const [ddNotice, setDdNotice] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token || children.length === 0) return;
    const day = todayYMD();
    children.forEach((c) => {
      api.portalGetChildAttendance(token, c.id).then((rows) => {
        const t = (rows ?? []).find((r) => r.date === day);
        if (t) setToday((m) => new Map(m).set(c.id, t));
      }).catch(() => null);
      api.portalGetChildDailyRecords(token, c.id).then((recs) => {
        if (recs?.length) setLatest((m) => new Map(m).set(c.id, recs[0]));
      }).catch(() => null);
      api.portalGetOnboarding(token, c.id).then((v) => {
        if (v) setOnboarding((m) => new Map(m).set(c.id, v));
      }).catch(() => null);
    });
  }, [children]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    api.portalGetFinance(token).then((v) => { if (v && "charges" in v) setFinance(v as FamilyView); }).catch(() => null);
    const dd = new URLSearchParams(window.location.search).get("dd");
    if (dd === "success") setDdNotice("Thank you — your Direct Debit is being set up. It becomes active once the bank confirms the mandate.");
    if (dd === "cancelled") setDdNotice("Direct Debit setup was cancelled. You can restart it from Payments & Orders whenever you are ready.");
  }, []);

  if (loading) return <p className="text-slate-400">Loading…</p>;
  if (error) return <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">{error} If you believe this is a mistake, please contact the nursery.</div>;

  return (
    <>
      <h1 className="font-heading text-2xl font-bold text-slate-900">Welcome back</h1>
      <p className="mt-1 text-sm text-slate-500">
        {children.length === 0 ? "" : `${children.length} ${children.length === 1 ? "child" : "children"} linked to your account.`}
      </p>

      {ddNotice && <p className="mt-4 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">{ddNotice}</p>}

      {children.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          <p className="font-medium text-slate-700">No children are currently linked to this account.</p>
          <p className="mt-1">If you believe this is a mistake, please contact the nursery so we can check your family&rsquo;s details.</p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {children.map((c) => {
            const att = attendanceLabel(today.get(c.id));
            const log = latest.get(c.id);
            const onb = onboarding.get(c.id);
            return (
              <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <Link href={`/portal/children/${c.id}`} className="flex items-center gap-3">
                  <Avatar name={`${c.first_name} ${c.last_name}`} src={c.photo_url} size="lg" />
                  <div className="min-w-0">
                    <h2 className="font-heading text-lg font-bold text-slate-900">{c.first_name} {c.last_name}</h2>
                    <p className="text-xs text-slate-500">{c.room_name || "Room to be confirmed"} · starts {fmtDate(c.start_date)}</p>
                  </div>
                </Link>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="text-slate-500">Today:</span>
                    <span className={`font-medium ${att.tone}`}>{att.text}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <NotebookPen className="h-4 w-4 shrink-0 text-slate-400" />
                    {log ? (
                      <span className="min-w-0 text-slate-600">
                        <span className="text-slate-500">Latest update:</span>{" "}
                        <Link href={`/portal/children/${c.id}?tab=updates`} className="font-medium text-teal-700 hover:underline">{log.title}</Link>
                        <span className="text-xs text-slate-400"> · {fmtDate(log.date)}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">No shared updates yet</span>
                    )}
                  </div>
                </dl>
                {onb && onb.percent < 100 && (
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Profile completion</span>
                      <span className="font-semibold text-slate-700">{onb.percent}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-teal-500" style={{ width: `${onb.percent}%` }} />
                    </div>
                    {onb.induction_status !== "reviewed" && (
                      <Link href={`/portal/children/${c.id}/induction`} className="mt-2 inline-block text-xs font-semibold text-teal-700 hover:underline">Complete profile →</Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {finance?.family && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-heading text-base font-bold text-slate-900"><Banknote className="h-4 w-4 text-teal-600" /> Payments</h2>
            <Link href="/portal/payments" className="text-xs font-semibold text-teal-700 hover:underline">View all →</Link>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <div><p className="text-xs uppercase tracking-wider text-slate-400">Balance</p><p className={`font-bold ${finance.family.balance_pence > 0 ? "text-slate-900" : "text-green-700"}`}>{formatPence(finance.family.balance_pence)}</p></div>
            <div><p className="text-xs uppercase tracking-wider text-slate-400">Next payment</p><p className="font-medium text-slate-700">{finance.next_payment ? `${formatPence(finance.next_payment.amount_pence - (finance.next_payment.paid_pence ?? 0))} · ${fmtDate(finance.next_payment.due_date)}` : "Nothing due"}</p></div>
            <div><p className="text-xs uppercase tracking-wider text-slate-400">Direct Debit</p><p className="font-medium text-slate-700">{mandateStatusLabel[finance.family.mandate_status]}</p></div>
          </div>
        </div>
      )}
    </>
  );
}
