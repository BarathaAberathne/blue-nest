"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  FileText,
  Mail,
  MessageSquare,
  StickyNote,
  UserCircle2,
} from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import Tabs, { type TabItem } from "@/components/ui/Tabs";
import {
  PRIORITY_META,
  fmtBranch,
  fmtDate,
  fmtDateShort,
  isFollowUpOverdue,
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

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex gap-2">
      <dt className="w-32 shrink-0 text-slate-500">{label}</dt>
      <dd className="text-slate-800">{value}</dd>
    </div>
  );
}

function SectionHeading({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
      <Icon className="h-4 w-4 text-teal-600" />
      {children}
    </h2>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">{children}</p>;
}

export default function AdminInquiryDetailClient({ id }: { id: string }) {
  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [assignees, setAssignees] = useState<EnquiryAssignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");
  const [toast, setToast] = useState<Toast | null>(null);
  const [busy, setBusy] = useState(false);

  // Editable form state
  const [noteDraft, setNoteDraft] = useState("");
  const [nextActionDraft, setNextActionDraft] = useState("");
  const [followUpDraft, setFollowUpDraft] = useState("");
  const [reg, setReg] = useState({
    registration_date: "",
    expected_start_date: "",
    child_age_group: "",
    room_allocation: "",
    funding_type: "",
  });

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    setTimeout(() => setToast(null), 3500);
  }, []);

  const hydrate = useCallback((e: Enquiry) => {
    setEnquiry(e);
    setNextActionDraft(e.next_action ?? "");
    setFollowUpDraft(toDateInput(e.follow_up_date));
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
    if (!token) {
      setError("Not authenticated.");
      setLoading(false);
      return;
    }
    api
      .adminGetEnquiry(token, id)
      .then((data) => hydrate(data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load inquiry"))
      .finally(() => setLoading(false));
    api.adminGetEnquiryAssignees(token).then(setAssignees).catch(() => { /* non-blocking */ });
  }, [id, hydrate]);

  // Runs a mutation, applies the returned enquiry, and surfaces a toast.
  const run = useCallback(
    async (fn: (token: string) => Promise<Enquiry>, success: string) => {
      const token = getAccessToken();
      if (!token) return;
      setBusy(true);
      try {
        const updated = await fn(token);
        hydrate(updated);
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
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  if (error || !enquiry) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">
        {error ?? "Inquiry not found."}
      </p>
    );
  }

  const e = enquiry;
  const fq = e.fee_quote;
  const app = e.application;
  const priority = (e.priority ?? "medium") as EnquiryPriority;
  const overdue = isFollowUpOverdue(e.status, e.follow_up_date);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const changeStatus = (status: EnquiryStatus) =>
    run((t) => api.adminUpdateEnquiryStatus(t, e.id, status), `Status set to ${statusLabel(status)}`);

  const assign = (assignedTo: string) => {
    const person = assignees.find((a) => a.id === assignedTo);
    return run(
      (t) => api.adminAssignEnquiry(t, e.id, assignedTo, person?.name ?? ""),
      assignedTo ? `Assigned to ${person?.name ?? "staff"}` : "Unassigned",
    );
  };

  // Follow-up writes the whole panel; merge a partial over current values so a
  // single-field change never wipes the others.
  const saveFollowUp = (partial: Partial<{ priority: EnquiryPriority; follow_up_date: string | null; next_action: string }>) =>
    run(
      (t) =>
        api.adminUpdateEnquiryFollowUp(t, e.id, {
          assigned_to: e.assigned_to ?? "",
          assigned_to_name: e.assigned_to_name ?? "",
          priority: partial.priority ?? priority,
          follow_up_date:
            partial.follow_up_date !== undefined ? partial.follow_up_date : (e.follow_up_date ?? null),
          next_action: partial.next_action ?? e.next_action ?? "",
        }),
      "Follow-up updated",
    );

  const addNote = () => {
    if (!noteDraft.trim()) {
      showToast({ kind: "error", msg: "Note cannot be empty" });
      return;
    }
    run((t) => api.adminAddEnquiryNote(t, e.id, noteDraft.trim()), "Note added").then(() => setNoteDraft(""));
  };

  const submitRegistration = () => {
    if (!reg.expected_start_date) {
      showToast({ kind: "error", msg: "Expected start date is required to register" });
      setTab("registration");
      return;
    }
    run(
      (t) =>
        api.adminRegisterEnquiry(t, e.id, {
          registration_date: dateInputToISO(reg.registration_date),
          expected_start_date: dateInputToISO(reg.expected_start_date),
          child_age_group: reg.child_age_group,
          room_allocation: reg.room_allocation,
          funding_type: reg.funding_type,
        }),
      "Marked as registered",
    );
  };

  const replyByEmail = () => {
    const token = getAccessToken();
    if (token) {
      api.adminLogEnquiryReply(token, e.id).then(hydrate).catch(() => { /* non-blocking */ });
    }
    window.location.href = `mailto:${e.email}?subject=${encodeURIComponent("Re: your enquiry to Blue Nest Montessori")}`;
  };

  const notes = [...(e.notes ?? [])].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  const activity = [...(e.activity_log ?? [])].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

  const tabs: TabItem[] = [
    { key: "overview", label: "Overview" },
    { key: "message", label: "Message" },
    { key: "notes", label: "Notes & Activity", badge: notes.length },
    { key: "followup", label: "Follow-up" },
    { key: "registration", label: "Registration" },
  ];

  return (
    <>
      {toast && (
        <div
          className={`fixed right-6 top-6 z-50 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.kind === "success" ? "bg-emerald-600" : toast.kind === "info" ? "bg-slate-800" : "bg-red-600"
          }`}
          role="status"
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-5">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link href="/admin/inquiries" className="hover:text-slate-700">← Inquiries</Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-400">{fmtBranch(e.branch)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-2xl font-bold text-slate-900">{e.name}</h1>
          <StatusBadge status={e.status} />
          {e.registration?.is_registered && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> Registered
            </span>
          )}
          {overdue && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
              Follow-up overdue
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {e.enquiry_type} · received {fmtDate(e.created_at)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="lg:col-span-2">
          <Card className="!rounded-2xl p-0">
            <div className="px-5 pt-2">
              <Tabs tabs={tabs} active={tab} onChange={setTab} />
            </div>
            <div className="p-5">
              {/* Overview */}
              {tab === "overview" && (
                <div className="space-y-6">
                  <div>
                    <SectionHeading icon={UserCircle2}>Enquirer</SectionHeading>
                    <dl className="space-y-1.5 text-sm">
                      <Row label="Name" value={e.name} />
                      <Row label="Email" value={<a href={`mailto:${e.email}`} className="text-teal-600 hover:underline">{e.email}</a>} />
                      <Row label="Phone" value={e.phone ? <a href={`tel:${e.phone}`} className="text-teal-600 hover:underline">{e.phone}</a> : undefined} />
                      <Row label="Branch" value={fmtBranch(e.branch)} />
                      <Row label="Enquiry type" value={e.enquiry_type} />
                      <Row label="Received" value={fmtDate(e.created_at)} />
                      <Row label="Source" value={e.source} />
                    </dl>
                  </div>

                  {(e.child_age || app?.child) && (
                    <div>
                      <SectionHeading icon={UserCircle2}>Child</SectionHeading>
                      <dl className="space-y-1.5 text-sm">
                        <Row label="Name" value={app?.child?.name} />
                        <Row label="Date of birth" value={app?.child?.dob} />
                        <Row label="Gender" value={app?.child?.gender ?? undefined} />
                        <Row label="Age" value={e.child_age} />
                      </dl>
                    </div>
                  )}

                  {fq && (
                    <div>
                      <SectionHeading icon={FileText}>Fee quote</SectionHeading>
                      <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                        <Row label="Branch" value={fmtBranch(fq.branch ?? "")} />
                        <Row label="Age group" value={fq.age_group} />
                        <Row label="Session" value={fq.session} />
                        <Row label="Days/week" value={fq.days ? String(fq.days) : undefined} />
                        <Row label="Funding" value={fq.funding} />
                        <Row label="Year weeks" value={fq.year_weeks ? String(fq.year_weeks) : undefined} />
                        <Row label="Early bird" value={fq.early_bird ? "Yes" : undefined} />
                        <Row label="Discount" value={fq.discount ? `${fq.discount} (−${fmtMoney(fq.discount_amount)}/wk)` : undefined} />
                        <Row label="Gross weekly" value={fmtMoney(fq.gross_weekly)} />
                        <Row label="Net weekly" value={fmtMoney(fq.net_weekly)} />
                        <Row label="Net monthly" value={fmtMoney(fq.net_monthly)} />
                      </dl>
                    </div>
                  )}

                  {app && (
                    <div>
                      <SectionHeading icon={FileText}>Application</SectionHeading>
                      <dl className="space-y-1.5 text-sm">
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
                            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                              <tr>
                                {["Day", "Session", "Time"].map((h) => (
                                  <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {app.sessions.map((s, i) => (
                                <tr key={i}>
                                  <td className="px-3 py-2 capitalize text-slate-800">{s.day}</td>
                                  <td className="px-3 py-2 text-slate-700">{s.label || s.type}</td>
                                  <td className="px-3 py-2 text-slate-500">{s.time || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {app.signature_data_url?.startsWith("data:image") && (
                        <div className="mt-4">
                          <h3 className="mb-2 text-sm font-semibold text-slate-700">Signature</h3>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={app.signature_data_url}
                            alt={`Signature from ${app.parent?.name ?? e.name}`}
                            className="max-h-32 rounded-lg border border-slate-200 bg-white p-2"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Message */}
              {tab === "message" && (
                <div className="space-y-4">
                  <SectionHeading icon={MessageSquare}>Original enquiry</SectionHeading>
                  {e.message ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{e.message}</p>
                  ) : (
                    <EmptyState>No message was included with this enquiry.</EmptyState>
                  )}
                  <button type="button" onClick={replyByEmail} className="btn-secondary py-2 text-sm">
                    <Mail className="h-4 w-4" /> Reply by email
                  </button>
                </div>
              )}

              {/* Notes & Activity */}
              {tab === "notes" && (
                <div className="space-y-6">
                  <div>
                    <SectionHeading icon={StickyNote}>Add an internal note</SectionHeading>
                    <textarea
                      value={noteDraft}
                      onChange={(ev) => setNoteDraft(ev.target.value)}
                      rows={3}
                      placeholder="Visible to the team only…"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <div className="mt-2 flex justify-end">
                      <button type="button" onClick={addNote} disabled={busy} className="btn-primary py-2 text-sm disabled:opacity-50">
                        Add note
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-slate-700">Notes</h3>
                    {notes.length === 0 ? (
                      <EmptyState>No notes yet.</EmptyState>
                    ) : (
                      <ul className="space-y-3">
                        {notes.map((n) => (
                          <li key={n.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                            <p className="whitespace-pre-wrap text-sm text-slate-700">{n.note}</p>
                            <p className="mt-1.5 text-xs text-slate-400">
                              {n.author_name || "Staff"} · {fmtDate(n.created_at)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-slate-700">Activity</h3>
                    {activity.length === 0 ? (
                      <EmptyState>No activity recorded yet.</EmptyState>
                    ) : (
                      <ol className="relative space-y-4 border-l border-slate-200 pl-5">
                        {activity.map((a) => (
                          <li key={a.id} className="relative">
                            <span className="absolute -left-[1.45rem] top-1 h-2.5 w-2.5 rounded-full bg-teal-400 ring-2 ring-white" />
                            <p className="text-sm text-slate-700">{a.message}</p>
                            <p className="mt-0.5 text-xs text-slate-400">
                              {a.author_name || "Staff"} · {fmtDate(a.created_at)}
                            </p>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </div>
              )}

              {/* Follow-up */}
              {tab === "followup" && (
                <div className="space-y-4">
                  <SectionHeading icon={Calendar}>Follow-up</SectionHeading>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="text-sm">
                      <span className="mb-1 block font-medium text-slate-600">Follow-up date</span>
                      <input
                        type="date"
                        value={followUpDraft}
                        onChange={(ev) => setFollowUpDraft(ev.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium text-slate-600">Priority</span>
                      <div className="flex gap-1.5">
                        {PRIORITIES.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => saveFollowUp({ priority: p })}
                            className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold capitalize transition-colors ${
                              priority === p ? PRIORITY_META[p].badge : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </label>
                  </div>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-600">Next action</span>
                    <textarea
                      value={nextActionDraft}
                      onChange={(ev) => setNextActionDraft(ev.target.value)}
                      rows={2}
                      placeholder="e.g. Call to arrange a visit"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-600">Assigned staff</span>
                    <select
                      value={e.assigned_to ?? ""}
                      onChange={(ev) => assign(ev.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">Unassigned</option>
                      {assignees.map((a) => (
                        <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                      ))}
                    </select>
                  </label>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => saveFollowUp({ follow_up_date: dateInputToISO(followUpDraft), next_action: nextActionDraft })}
                      className="btn-primary py-2 text-sm disabled:opacity-50"
                    >
                      Save follow-up
                    </button>
                  </div>
                </div>
              )}

              {/* Registration */}
              {tab === "registration" && (
                <div className="space-y-4">
                  <SectionHeading icon={ClipboardList}>Registration</SectionHeading>
                  {e.registration?.is_registered && (
                    <p className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" /> Registered on {fmtDateShort(e.registration.registration_date)}
                    </p>
                  )}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="text-sm">
                      <span className="mb-1 block font-medium text-slate-600">Registration date</span>
                      <input type="date" value={reg.registration_date} onChange={(ev) => setReg({ ...reg, registration_date: ev.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium text-slate-600">Expected start date *</span>
                      <input type="date" value={reg.expected_start_date} onChange={(ev) => setReg({ ...reg, expected_start_date: ev.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium text-slate-600">Child age group</span>
                      <input type="text" value={reg.child_age_group} onChange={(ev) => setReg({ ...reg, child_age_group: ev.target.value })}
                        placeholder="e.g. 2–3 years"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium text-slate-600">Room allocation</span>
                      <input type="text" value={reg.room_allocation} onChange={(ev) => setReg({ ...reg, room_allocation: ev.target.value })}
                        placeholder="e.g. Sunflower Room"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    </label>
                    <label className="text-sm sm:col-span-2">
                      <span className="mb-1 block font-medium text-slate-600">Funding type</span>
                      <input type="text" value={reg.funding_type} onChange={(ev) => setReg({ ...reg, funding_type: ev.target.value })}
                        placeholder="e.g. 15h / 30h funded, private"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    </label>
                  </div>
                  <div className="flex justify-end">
                    <button type="button" onClick={submitRegistration} disabled={busy} className="btn-primary py-2 text-sm disabled:opacity-50">
                      {e.registration?.is_registered ? "Update registration" : "Mark as registered"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sticky action panel */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card className="!rounded-2xl">
            <h2 className="mb-3 font-semibold text-slate-900">Status &amp; assignment</h2>
            <label className="mb-3 block text-sm">
              <span className="mb-1 block font-medium text-slate-600">Status</span>
              <select
                value={e.status}
                onChange={(ev) => {
                  const v = ev.target.value as EnquiryStatus;
                  // Registering requires an expected start date — route the user
                  // to the Registration tab instead of setting it blindly.
                  if (v === "registered" && !(e.registration?.is_registered && e.registration?.expected_start_date)) {
                    setTab("registration");
                    showToast({ kind: "info", msg: "Add an expected start date to register" });
                    return;
                  }
                  changeStatus(v);
                }}
                disabled={busy}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {ENQUIRY_STATUSES.map((s) => (
                  <option key={s} value={s}>{statusLabel(s)}</option>
                ))}
              </select>
            </label>
            <label className="mb-3 block text-sm">
              <span className="mb-1 block font-medium text-slate-600">Assigned staff</span>
              <select
                value={e.assigned_to ?? ""}
                onChange={(ev) => assign(ev.target.value)}
                disabled={busy}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Unassigned</option>
                {assignees.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>
            <div className="mb-3 text-sm">
              <span className="mb-1 block font-medium text-slate-600">Priority</span>
              <div className="flex gap-1.5">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={busy}
                    onClick={() => saveFollowUp({ priority: p })}
                    className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold capitalize transition-colors ${
                      priority === p ? PRIORITY_META[p].badge : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-600">Follow-up date</span>
              <input
                type="date"
                value={followUpDraft}
                disabled={busy}
                onChange={(ev) => {
                  setFollowUpDraft(ev.target.value);
                  saveFollowUp({ follow_up_date: dateInputToISO(ev.target.value) });
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </label>
            {e.follow_up_date && (
              <p className={`mt-1.5 text-xs ${overdue ? "font-semibold text-rose-600" : "text-slate-400"}`}>
                {overdue ? "Overdue — " : "Due "} {fmtDateShort(e.follow_up_date)}
              </p>
            )}
          </Card>

          <Card className="!rounded-2xl">
            <h2 className="mb-3 font-semibold text-slate-900">Actions</h2>
            <button type="button" onClick={replyByEmail} className="mb-2 block w-full rounded-xl border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Mail className="mr-1.5 inline h-4 w-4" /> Reply by email
            </button>
            <button type="button" onClick={() => window.print()} className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              <FileText className="mr-1.5 inline h-4 w-4" /> Print enquiry
            </button>
          </Card>
        </aside>
      </div>
    </>
  );
}
