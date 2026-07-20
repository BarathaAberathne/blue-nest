"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileText,
  Mail,
  MessageSquare,
  Printer,
  StickyNote,
  UserCircle2,
} from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import NoteBox from "@/components/admin/inquiries/NoteBox";
import ReplyModal from "@/components/admin/inquiries/ReplyModal";
import {
  PRIORITY_META,
  RECOMMENDED_NEXT,
  fmtBranch,
  sourceLabel,
  fmtDate,
  fmtDateShort,
  isFollowUpOverdue,
  isTerminalStatus,
  statusLabel,
  toDateInput,
} from "@/lib/enquiry";
import { ENQUIRY_STATUSES } from "@/types";
import type { Enquiry, EnquiryAssignee, EnquiryPriority, EnquiryStatus } from "@/types";

type Toast = { kind: "success" | "error" | "info"; msg: string };
const PRIORITIES: EnquiryPriority[] = ["low", "medium", "high"];

function dateInputToISO(v: string): string | null {
  if (!v) return null;
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
function fmtMoney(n?: number) {
  return typeof n === "number" ? `£${n.toFixed(2)}` : "—";
}
function addDaysISO(n: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex gap-2">
      <dt className="w-32 shrink-0 text-slate-500">{label}</dt>
      <dd className="text-slate-800">{value}</dd>
    </div>
  );
}
function SectionHeading({ icon: Icon, children, action }: { icon: React.ElementType; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="flex items-center gap-2 font-semibold text-slate-900">
        <Icon className="h-4 w-4 text-teal-600" />
        {children}
      </h2>
      {action}
    </div>
  );
}
function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">{children}</p>;
}
function SummaryFact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

export default function AdminInquiryDetailClient({ id }: { id: string }) {
  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [assignees, setAssignees] = useState<EnquiryAssignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [busy, setBusy] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [appOpen, setAppOpen] = useState(false);

  const [noteDraft, setNoteDraft] = useState("");
  const [nextActionDraft, setNextActionDraft] = useState("");
  const [followUpDraft, setFollowUpDraft] = useState("");
  const [reg, setReg] = useState({ registration_date: "", expected_start_date: "", child_age_group: "", room_allocation: "", funding_type: "" });

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    setTimeout(() => setToast(null), 3500);
  }, []);

  const hydrate = useCallback((e: Enquiry) => {
    setEnquiry(e);
    setNextActionDraft(e.next_action ?? "");
    setFollowUpDraft(toDateInput(e.follow_up_date));
    setAppOpen(e.enquiry_type === "Application form");
    setReg({
      registration_date: toDateInput(e.registration?.registration_date) || toDateInput(new Date().toISOString()),
      expected_start_date: toDateInput(e.registration?.expected_start_date),
      child_age_group: e.registration?.child_age_group ?? e.child_age ?? "",
      room_allocation: e.registration?.room_allocation ?? "",
      funding_type: e.registration?.funding_type ?? "",
    });
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated."); setLoading(false); return; }
    api.adminGetEnquiry(token, id).then(hydrate)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load inquiry"))
      .finally(() => setLoading(false));
    api.adminGetEnquiryAssignees(token).then(setAssignees).catch(() => { /* non-blocking */ });
  }, [id, hydrate]);

  const run = useCallback(
    async (fn: (token: string) => Promise<Enquiry>, success: string) => {
      const token = getAccessToken();
      if (!token) return;
      setBusy(true);
      try {
        hydrate(await fn(token));
        showToast({ kind: "success", msg: success });
      } catch (err) {
        showToast({ kind: "error", msg: err instanceof Error ? err.message : "Something went wrong" });
      } finally {
        setBusy(false);
      }
    },
    [hydrate, showToast],
  );

  if (loading) {
    return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}</div>;
  }
  if (error || !enquiry) {
    return <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error ?? "Enquiry not found."}</p>;
  }

  const e = enquiry;
  const fq = e.fee_quote;
  const app = e.application;
  const priority = (e.priority ?? "medium") as EnquiryPriority;
  const overdue = isFollowUpOverdue(e.status, e.follow_up_date);
  const recommended = RECOMMENDED_NEXT[e.status] ?? [];

  // ── Mutations ────────────────────────────────────────────────────────────
  const changeStatus = (status: EnquiryStatus) => {
    if (status === "registered" && !(e.registration?.is_registered && e.registration?.expected_start_date)) {
      showToast({ kind: "info", msg: "Add an expected start date below to register" });
      document.getElementById("registration")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (isTerminalStatus(status) && !window.confirm(`Mark this enquiry as "${statusLabel(status)}"?`)) return;
    run((t) => api.adminUpdateEnquiryStatus(t, e.id, status), `Status set to ${statusLabel(status)}`);
  };

  const assign = (assignedTo: string) => {
    const person = assignees.find((a) => a.id === assignedTo);
    return run((t) => api.adminAssignEnquiry(t, e.id, assignedTo, person?.name ?? ""), assignedTo ? `Assigned to ${person?.name ?? "staff"}` : "Unassigned");
  };

  const saveFollowUp = (partial: Partial<{ priority: EnquiryPriority; follow_up_date: string | null; next_action: string }>) =>
    run((t) => api.adminUpdateEnquiryFollowUp(t, e.id, {
      assigned_to: e.assigned_to ?? "",
      assigned_to_name: e.assigned_to_name ?? "",
      priority: partial.priority ?? priority,
      follow_up_date: partial.follow_up_date !== undefined ? partial.follow_up_date : (e.follow_up_date ?? null),
      next_action: partial.next_action ?? e.next_action ?? "",
    }), "Follow-up updated");

  const addNote = () => {
    if (!noteDraft.trim()) { showToast({ kind: "error", msg: "Note cannot be empty" }); return; }
    run((t) => api.adminAddEnquiryNote(t, e.id, noteDraft.trim()), "Note added").then(() => setNoteDraft(""));
  };

  const submitRegistration = () => {
    if (!reg.expected_start_date) { showToast({ kind: "error", msg: "Expected start date is required to register" }); return; }
    run((t) => api.adminRegisterEnquiry(t, e.id, {
      registration_date: dateInputToISO(reg.registration_date),
      expected_start_date: dateInputToISO(reg.expected_start_date),
      child_age_group: reg.child_age_group,
      room_allocation: reg.room_allocation,
      funding_type: reg.funding_type,
    }), "Marked as registered");
  };

  const notes = [...(e.notes ?? [])].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  const activity = [...(e.activity_log ?? [])].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  const inputCls = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500";

  return (
    <>
      {toast && (
        <div className={`fixed right-6 top-6 z-[60] rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.kind === "success" ? "bg-emerald-600" : toast.kind === "info" ? "bg-slate-800" : "bg-red-600"}`} role="status">{toast.msg}</div>
      )}

      <ReplyModal open={replyOpen} onClose={() => setReplyOpen(false)} enquiry={e} onLogged={hydrate} />

      {/* Header */}
      <div className="mb-4">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link href="/admin/inquiries" className="hover:text-slate-700">← Enquiries</Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-400">{fmtBranch(e.branch)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-2xl font-bold text-slate-900">{e.name}</h1>
          <StatusBadge status={e.status} />
          {e.registration?.is_registered && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Registered</span>
          )}
          {overdue && <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">Follow-up overdue</span>}
        </div>
      </div>

      {/* Top summary card */}
      <Card className="mb-6 !rounded-2xl">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <SummaryFact label="Parent" value={e.name} />
          <SummaryFact label="Child" value={app?.child?.name ? `${app.child.name}${e.child_age ? ` · ${e.child_age}` : ""}` : (e.child_age || "—")} />
          <SummaryFact label="Branch" value={fmtBranch(e.branch)} />
          <SummaryFact label="Status" value={statusLabel(e.status)} />
          <SummaryFact label="Assigned" value={e.assigned_to_name || "Unassigned"} />
          <SummaryFact label="Priority" value={<span className="capitalize">{priority}</span>} />
          <SummaryFact label="Follow-up" value={e.follow_up_date ? fmtDateShort(e.follow_up_date) : "—"} />
          <SummaryFact label="Next action" value={e.next_action || "—"} />
          {e.registration?.is_registered && <SummaryFact label="Start date" value={fmtDateShort(e.registration.expected_start_date)} />}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* A — Enquiry Summary */}
          <Card className="!rounded-2xl">
            <SectionHeading icon={UserCircle2}>Enquiry summary</SectionHeading>
            <dl className="space-y-1.5 text-sm">
              <Row label="Email" value={<a href={`mailto:${e.email}`} className="text-teal-600 hover:underline">{e.email}</a>} />
              <Row label="Phone" value={e.phone ? <a href={`tel:${e.phone}`} className="text-teal-600 hover:underline">{e.phone}</a> : undefined} />
              <Row label="Branch" value={fmtBranch(e.branch)} />
              <Row label="Enquiry type" value={e.enquiry_type} />
              <Row label="Received" value={fmtDate(e.created_at)} />
              <Row label="Source" value={sourceLabel(e.source)} />
            </dl>
            <div className="mt-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Message</p>
              {e.message ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{e.message}</p> : <EmptyState>No message was included.</EmptyState>}
            </div>
            {fq && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Fee quote</p>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                  <Row label="Session" value={fq.session} />
                  <Row label="Age group" value={fq.age_group} />
                  <Row label="Days/week" value={fq.days ? String(fq.days) : undefined} />
                  <Row label="Funding" value={fq.funding} />
                  <Row label="Gross weekly" value={fmtMoney(fq.gross_weekly)} />
                  <Row label="Net weekly" value={fmtMoney(fq.net_weekly)} />
                  <Row label="Net monthly" value={fmtMoney(fq.net_monthly)} />
                </dl>
              </div>
            )}
          </Card>

          {/* B — Application Details (collapsible) */}
          {app && (
            <Card className="!rounded-2xl">
              <SectionHeading icon={FileText} action={
                <button type="button" onClick={() => setAppOpen((v) => !v)} className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:underline">
                  {appOpen ? "Hide" : "Show"} <ChevronDown className={`h-4 w-4 transition-transform ${appOpen ? "rotate-180" : ""}`} />
                </button>
              }>Application details</SectionHeading>
              {appOpen ? (
                <>
                  <dl className="space-y-1.5 text-sm">
                    <Row label="Child" value={app.child?.name} />
                    <Row label="Date of birth" value={app.child?.dob} />
                    <Row label="Gender" value={app.child?.gender ?? undefined} />
                    <Row label="Parent" value={app.parent?.name} />
                    <Row label="Parent email" value={app.parent?.email} />
                    <Row label="Parent phone" value={app.parent?.phone} />
                    <Row label="Settling-in" value={app.settling_in} />
                    <Row label="Waiting list" value={app.waiting_list ? "Yes" : "No"} />
                  </dl>
                  {app.sessions && app.sessions.length > 0 && (
                    <div className="mt-4">
                      <h3 className="mb-2 text-sm font-semibold text-slate-700">Requested sessions</h3>
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr>{["Day", "Session", "Time"].map((h) => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
                        <tbody className="divide-y divide-slate-100">
                          {app.sessions.map((s, i) => (
                            <tr key={i}><td className="px-3 py-2 capitalize text-slate-800">{s.day}</td><td className="px-3 py-2 text-slate-700">{s.label || s.type}</td><td className="px-3 py-2 text-slate-500">{s.time || "—"}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {app.signature_data_url?.startsWith("data:image") && (
                    <div className="mt-4">
                      <h3 className="mb-2 text-sm font-semibold text-slate-700">Signature</h3>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={app.signature_data_url} alt={`Signature from ${app.parent?.name ?? e.name}`} className="max-h-32 rounded-lg border border-slate-200 bg-white p-2" />
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-500">Application form submitted by {app.parent?.name || e.name}. Click “Show” to view child, parent, session and signature details.</p>
              )}
            </Card>
          )}

          {/* C — Notes & Timeline */}
          <Card className="!rounded-2xl">
            <SectionHeading icon={StickyNote}>Notes</SectionHeading>
            <NoteBox value={noteDraft} onChange={setNoteDraft} onSubmit={addNote} busy={busy} />
            <div className="mt-5">
              {notes.length === 0 ? <EmptyState>No notes yet.</EmptyState> : (
                <ul className="space-y-3">
                  {notes.map((n) => (
                    <li key={n.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                      <p className="whitespace-pre-wrap text-sm text-slate-700">{n.note}</p>
                      <p className="mt-1.5 text-xs text-slate-400">{n.author_name || "Staff"} · {fmtDate(n.created_at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mt-6">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Timeline</h3>
              {activity.length === 0 ? <EmptyState>No activity yet.</EmptyState> : (
                <ol className="relative space-y-3 border-l border-slate-200 pl-5">
                  {activity.map((a) => (
                    <li key={a.id} className="relative">
                      <span className="absolute -left-[1.45rem] top-1 h-2.5 w-2.5 rounded-full bg-slate-300 ring-2 ring-white" />
                      <p className="text-sm text-slate-600">{a.message}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{a.author_name || "Staff"} · {fmtDate(a.created_at)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </Card>

          {/* D — Follow-up */}
          <Card className="!rounded-2xl">
            <SectionHeading icon={Calendar}>Follow-up</SectionHeading>
            <div className="mb-3 flex flex-wrap gap-2">
              {[["Tomorrow", 1], ["In 3 days", 3], ["Next week", 7]].map(([label, days]) => (
                <button key={label as string} type="button" disabled={busy} onClick={() => { const iso = addDaysISO(days as number); setFollowUpDraft(toDateInput(iso)); saveFollowUp({ follow_up_date: iso }); }}
                  className="rounded-lg bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-700 hover:bg-teal-100 disabled:opacity-50">{label}</button>
              ))}
              <button type="button" disabled={busy} onClick={() => { setFollowUpDraft(""); saveFollowUp({ follow_up_date: null }); }}
                className="rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-50">Clear follow-up</button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-sm"><span className="mb-1 block font-medium text-slate-600">Follow-up date</span>
                <input type="date" value={followUpDraft} onChange={(ev) => setFollowUpDraft(ev.target.value)} className={inputCls} /></label>
              <label className="text-sm"><span className="mb-1 block font-medium text-slate-600">Assigned staff</span>
                <select value={e.assigned_to ?? ""} onChange={(ev) => assign(ev.target.value)} className={inputCls}>
                  <option value="">Unassigned</option>
                  {assignees.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select></label>
            </div>
            <label className="mt-4 block text-sm"><span className="mb-1 block font-medium text-slate-600">Next action</span>
              <textarea value={nextActionDraft} onChange={(ev) => setNextActionDraft(ev.target.value)} rows={2} placeholder="e.g. Call to arrange a visit" className={inputCls} /></label>
            <div className="mt-3 flex justify-end">
              <button type="button" disabled={busy} onClick={() => saveFollowUp({ follow_up_date: dateInputToISO(followUpDraft), next_action: nextActionDraft })} className="btn-primary py-2 text-sm disabled:opacity-50">Save follow-up</button>
            </div>
          </Card>

          {/* E — Registration */}
          <Card id="registration" className="!rounded-2xl">
            <SectionHeading icon={ClipboardList}>Registration</SectionHeading>
            {e.registration?.is_registered && (
              <p className="mb-3 flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Registered on {fmtDateShort(e.registration.registration_date)}</p>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-sm"><span className="mb-1 block font-medium text-slate-600">Registration date</span>
                <input type="date" value={reg.registration_date} onChange={(ev) => setReg({ ...reg, registration_date: ev.target.value })} className={inputCls} /></label>
              <label className="text-sm"><span className="mb-1 block font-medium text-slate-600">Expected start date *</span>
                <input type="date" value={reg.expected_start_date} onChange={(ev) => setReg({ ...reg, expected_start_date: ev.target.value })} className={inputCls} /></label>
              <label className="text-sm"><span className="mb-1 block font-medium text-slate-600">Child age group</span>
                <input type="text" value={reg.child_age_group} onChange={(ev) => setReg({ ...reg, child_age_group: ev.target.value })} placeholder="e.g. 2–3 years" className={inputCls} /></label>
              <label className="text-sm"><span className="mb-1 block font-medium text-slate-600">Room allocation</span>
                <input type="text" value={reg.room_allocation} onChange={(ev) => setReg({ ...reg, room_allocation: ev.target.value })} placeholder="e.g. Sunflower Room" className={inputCls} /></label>
              <label className="text-sm sm:col-span-2"><span className="mb-1 block font-medium text-slate-600">Funding type</span>
                <input type="text" value={reg.funding_type} onChange={(ev) => setReg({ ...reg, funding_type: ev.target.value })} placeholder="e.g. 15h / 30h funded, private" className={inputCls} /></label>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={submitRegistration} disabled={busy} className="btn-primary py-2 text-sm disabled:opacity-50">{e.registration?.is_registered ? "Update registration" : "Confirm registration"}</button>
            </div>
          </Card>
        </div>

        {/* Sticky action panel (desktop) */}
        <aside className="hidden space-y-4 lg:sticky lg:top-6 lg:block lg:self-start">
          {recommended.length > 0 && (
            <Card className="!rounded-2xl">
              <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Recommended next step</h2>
              <div className="flex flex-col gap-2">
                {recommended.map((n) => (
                  <button key={n.status} type="button" disabled={busy} onClick={() => changeStatus(n.status)}
                    className="rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">{n.label}</button>
                ))}
              </div>
            </Card>
          )}

          <Card className="!rounded-2xl">
            <h2 className="mb-3 font-semibold text-slate-900">Status &amp; assignment</h2>
            <label className="mb-3 block text-sm"><span className="mb-1 block font-medium text-slate-600">Status</span>
              <select value={e.status} onChange={(ev) => changeStatus(ev.target.value as EnquiryStatus)} disabled={busy} className={inputCls}>
                {ENQUIRY_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
              </select></label>
            <label className="mb-3 block text-sm"><span className="mb-1 block font-medium text-slate-600">Assigned staff</span>
              <select value={e.assigned_to ?? ""} onChange={(ev) => assign(ev.target.value)} disabled={busy} className={inputCls}>
                <option value="">Unassigned</option>
                {assignees.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select></label>
            <div className="text-sm"><span className="mb-1 block font-medium text-slate-600">Priority</span>
              <div className="flex gap-1.5">
                {PRIORITIES.map((p) => (
                  <button key={p} type="button" disabled={busy} onClick={() => saveFollowUp({ priority: p })}
                    className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold capitalize transition-colors ${priority === p ? PRIORITY_META[p].badge : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>{p}</button>
                ))}
              </div>
            </div>
          </Card>

          <Card className="!rounded-2xl">
            <h2 className="mb-3 font-semibold text-slate-900">Actions</h2>
            <button type="button" onClick={() => setReplyOpen(true)} className="mb-2 block w-full rounded-xl border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"><Mail className="mr-1.5 inline h-4 w-4" /> Reply by email</button>
            <button type="button" onClick={() => window.print()} className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"><Printer className="mr-1.5 inline h-4 w-4" /> Print enquiry</button>
          </Card>
        </aside>
      </div>

      {/* Mobile bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur lg:hidden">
        {recommended[0] && (
          <button type="button" disabled={busy} onClick={() => changeStatus(recommended[0].status)} className="flex-1 rounded-xl bg-teal-600 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{recommended[0].label}</button>
        )}
        <button type="button" onClick={() => setReplyOpen(true)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700"><Mail className="h-4 w-4" /></button>
        <a href={`tel:${e.phone}`} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700"><MessageSquare className="h-4 w-4" /></a>
      </div>
      <div className="h-16 lg:hidden" />
    </>
  );
}
