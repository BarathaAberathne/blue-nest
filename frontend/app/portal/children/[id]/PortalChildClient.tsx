"use client";

// Parent-facing child page — Overview / Attendance / Daily updates tabs over
// the canonical child, attendance and daily-record data (every request is
// re-scoped server-side; the backend only ever returns shared+approved
// records and parent-safe fields).

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarCheck, ClipboardList, NotebookPen, UtensilsCrossed } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { usePortal } from "@/components/portal/PortalShell";
import Avatar from "@/components/admin/ui/Avatar";
import { ageLabel, fmtDate, fundingLabel } from "@/lib/child";
import type { DailyRecord, OnboardingView, PortalAttendanceRow } from "@/types";

type Tab = "overview" | "attendance" | "updates";

const TYPE_LABEL: Record<string, string> = {
  observation: "Learning observation", incident: "Incident", medication: "Medication", meal: "Meal",
};

function timeOf(iso?: string) {
  return iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—";
}

export default function PortalChildClient({ childId }: { childId: string }) {
  const { children } = usePortal();
  const search = useSearchParams();
  const [tab, setTab] = useState<Tab>((search?.get("tab") as Tab) || "overview");
  const [attendance, setAttendance] = useState<PortalAttendanceRow[]>([]);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [onboarding, setOnboarding] = useState<OnboardingView | null>(null);
  const [denied, setDenied] = useState(false);
  // Session expiry is handled by PortalShell's auth guard; remaining failures
  // are real server errors and must be visible, not empty tabs.
  const [partialError, setPartialError] = useState(false);

  const child = children.find((c) => c.id === childId);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    api.portalGetChildAttendance(token, childId).then((r) => setAttendance(r ?? [])).catch(() => setDenied(true));
    api.portalGetChildDailyRecords(token, childId).then((r) => setRecords(r ?? [])).catch(() => setPartialError(true));
    api.portalGetOnboarding(token, childId).then(setOnboarding).catch(() => setPartialError(true));
  }, [childId]);

  const grouped = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const groups: { label: string; items: DailyRecord[] }[] = [
      { label: "Today", items: [] }, { label: "Yesterday", items: [] }, { label: "Earlier", items: [] },
    ];
    records.forEach((r) => {
      if (r.date === today) groups[0].items.push(r);
      else if (r.date === yesterday) groups[1].items.push(r);
      else groups[2].items.push(r);
    });
    return groups.filter((g) => g.items.length > 0);
  }, [records]);

  if (denied || (!child && children.length > 0)) {
    return <p className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">This child is not linked to your account.</p>;
  }
  if (!child) return <p className="text-slate-400">Loading…</p>;

  return (
    <>
      {partialError && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800" role="alert">
          Some of {child.first_name}&rsquo;s information could not be loaded just now — please refresh, or contact the nursery if this keeps happening.
        </div>
      )}
      <div className="flex items-center gap-4">
        <Avatar name={`${child.first_name} ${child.last_name}`} src={child.photo_url} size="xl" />
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">{child.first_name} {child.last_name}</h1>
          <p className="text-sm text-slate-500">{ageLabel(child.dob)}{child.room_name ? ` · ${child.room_name}` : ""}{child.key_person_name ? ` · Key person: ${child.key_person_name}` : ""}</p>
        </div>
      </div>

      <div className="mt-5 flex gap-1 border-b border-slate-200" role="tablist">
        {([["overview", "Overview"], ["attendance", "Attendance"], ["updates", `Daily updates${records.length ? ` (${records.length})` : ""}`]] as [Tab, string][]).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${tab === k ? "border-teal-600 text-teal-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Details</h3>
            <dl className="space-y-2 text-sm text-slate-600">
              <div className="flex justify-between"><dt className="text-slate-400">Date of birth</dt><dd>{fmtDate(child.dob)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Starts</dt><dd>{fmtDate(child.start_date)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Room</dt><dd>{child.room_name || "To be confirmed"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Key person</dt><dd>{child.key_person_name || "To be confirmed"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Funding</dt><dd>{fundingLabel(child.funding_type)}</dd></div>
            </dl>
            {(child.allergy_tags?.length || child.dietary_tags?.length) ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                <UtensilsCrossed className="h-4 w-4 text-slate-400" />
                {(child.allergy_tags ?? []).map((t) => <span key={t} className="rounded-full bg-red-100 px-2 py-0.5 text-[0.65rem] font-semibold text-red-700">{t}</span>)}
                {(child.dietary_tags ?? []).map((t) => <span key={t} className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-700">{t}</span>)}
              </div>
            ) : null}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400"><ClipboardList className="h-3.5 w-3.5" /> Registration</h3>
            {onboarding ? (
              <>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Profile completion</span>
                  <span className="font-semibold text-slate-700">{onboarding.percent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-teal-500" style={{ width: `${onboarding.percent}%` }} />
                </div>
                {(() => {
                  const missing = onboarding.categories.flatMap((c) => c.missing ?? []).slice(0, 3);
                  return missing.length > 0 ? (
                    <ul className="mt-2 space-y-0.5 text-xs text-slate-500">{missing.map((m) => <li key={m}>• {m}</li>)}</ul>
                  ) : <p className="mt-2 text-xs text-teal-700">Everything complete — thank you!</p>;
                })()}
                <Link href={`/portal/children/${child.id}/induction`} className="mt-3 inline-block rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">
                  {onboarding.induction_status === "reviewed" ? "View induction answers" : "Complete profile"}
                </Link>
              </>
            ) : <p className="text-sm text-slate-400">Loading…</p>}
          </div>
        </div>
      )}

      {tab === "attendance" && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white">
          {attendance.length === 0 ? (
            <p className="p-5 text-sm text-slate-400">No attendance recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Arrived</th>
                  <th className="px-4 py-3">Left</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((a) => (
                  <tr key={a.date} className="border-b border-slate-50">
                    <td className="px-4 py-2.5 text-slate-700">{fmtDate(a.date)}</td>
                    <td className="px-4 py-2.5"><span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${a.check_in ? "text-teal-700" : "text-slate-500"}`}><CalendarCheck className="h-3.5 w-3.5" /> {a.status.replace(/_/g, " ")}</span></td>
                    <td className="px-4 py-2.5 text-slate-500">{timeOf(a.check_in)}</td>
                    <td className="px-4 py-2.5 text-slate-500">{timeOf(a.check_out)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "updates" && (
        <div className="mt-5 space-y-5">
          {grouped.length === 0 && <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-400">No updates have been shared yet.</p>}
          {grouped.map((g) => (
            <div key={g.label}>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">{g.label}</h3>
              <div className="space-y-3">
                {g.items.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <NotebookPen className="h-4 w-4 text-teal-600" />
                      <span className="font-medium text-slate-800">{r.title}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-semibold text-slate-500">{TYPE_LABEL[r.type] ?? r.type}</span>
                      <span className="ml-auto text-xs text-slate-400">{fmtDate(r.date)}</span>
                    </div>
                    {r.detail && <p className="mt-2 text-sm text-slate-600">{r.detail}</p>}
                    {r.type === "meal" && (r.meal_type || r.eaten) && (
                      <p className="mt-1 text-xs text-slate-500">{[r.meal_type, r.menu, r.eaten ? `ate ${r.eaten}` : ""].filter(Boolean).join(" · ")}</p>
                    )}
                    {r.type === "medication" && r.medication && (
                      <p className="mt-1 text-xs text-slate-500">{[r.medication, r.dose, r.admin_time ? `at ${r.admin_time}` : ""].filter(Boolean).join(" · ")}</p>
                    )}
                    {(r.attachments?.length ?? 0) > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {r.attachments!.map((url) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt="" className="h-20 w-20 rounded-lg border border-slate-200 object-cover" /></a>
                        ))}
                      </div>
                    )}
                    {r.parent_shared_at && (
                      <p className="mt-2 text-[0.65rem] text-slate-400">
                        Shared {fmtDate(r.parent_shared_at.slice(0, 10))}
                        {r.updated_at && r.parent_shared_at && r.updated_at > r.parent_shared_at ? " · updated since" : ""}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
