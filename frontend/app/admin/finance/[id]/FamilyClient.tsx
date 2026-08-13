"use client";

// Family account detail — charges, payments, schedules and Direct Debit
// actions. Collection is Stripe Bacs (off-session PaymentIntents); paper
// mandates are recorded manually (finance.adjust) so the flow also works
// where online DD isn't configured.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, PoundSterling } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { usePermissions } from "@/lib/usePermissions";
import StageBadge from "@/components/admin/ui/StageBadge";
import {
  chargeStatusAccent, chargeStatusLabel, formatPence,
  mandateStatusAccent, mandateStatusLabel, paymentStatusAccent,
} from "@/lib/finance";
import type { Charge, Child, CommunicationLog, FamilyView } from "@/types";

type ModalKind = null | "charge" | "first_payment" | "manual_payment" | "schedule" | "mandate";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function FamilyClient({ familyId }: { familyId: string }) {
  const [view, setView] = useState<FamilyView | null>(null);
  const [comms, setComms] = useState<CommunicationLog[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [modal, setModal] = useState<ModalKind>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { has } = usePermissions();

  const load = useCallback(async (silent = false) => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated."); return; }
    try {
      const v = await api.adminGetFamily(token, familyId);
      setView(v);
      api.adminGetFamilyCommunications(token, familyId).then(setComms).catch(() => null);
      if (!silent) {
        const kids = await Promise.all(
          (v.family.child_ids ?? []).map((id) => api.adminGetChild(token, id).catch(() => null)),
        );
        setChildren(kids.filter((k): k is Child => k !== null));
      }
      setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load"); }
  }, [familyId]);

  useEffect(() => { void load(); }, [load]);
  useAutoRefresh(() => load(true), 30_000);

  const f = view?.family;
  const childName = useMemo(() => new Map(children.map((c) => [c.id, `${c.first_name} ${c.last_name}`.trim()])), [children]);

  const run = async (fn: (token: string) => Promise<unknown>, done: string) => {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await fn(token);
      setNotice(done);
      setModal(null);
      await load(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Action failed"); }
    finally { setBusy(false); }
  };

  const collect = (c: Charge) =>
    run((t) => api.adminCollectCharge(t, c.id), `Direct Debit collection raised for ${c.ref || c.description}.`);

  const remind = (c: Charge) =>
    run((t) => api.adminSendChargeReminder(t, c.id), `Reminder sent for ${c.ref || c.description}.`);

  if (!f) {
    return (
      <div className="p-4">
        {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p> : <p className="text-sm text-slate-400">Loading…</p>}
      </div>
    );
  }

  const collectable = (c: Charge) =>
    f.mandate_status === "active" &&
    ["due", "overdue", "failed", "partially_paid", "upcoming"].includes(c.status);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/finance" className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-teal-600"><ArrowLeft className="h-3.5 w-3.5" /> Finance</Link>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-slate-900"><PoundSterling className="h-6 w-6 text-teal-600" /> {f.name}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {f.ref && <span className="mr-2 font-mono text-xs">{f.ref}</span>}
            Billing parent: {f.billing_parent_name || "—"}
            {f.billing_parent_id && (
              <Link href={`/admin/parents/${f.billing_parent_id}`} className="ml-1 text-teal-600 hover:underline">view</Link>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <StageBadge label={`DD ${mandateStatusLabel[f.mandate_status] ?? f.mandate_status}`} accent={mandateStatusAccent[f.mandate_status] ?? "slate"} withDot />
            <span className={`text-xl font-bold ${f.balance_pence > 0 ? "text-slate-900" : "text-green-700"}`}>{formatPence(f.balance_pence)}</span>
          </div>
          <p className="text-xs text-slate-400">outstanding balance</p>
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}
      {notice && <p className="mb-4 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-700">{notice}</p>}

      <div className="mb-6 flex flex-wrap gap-2">
        <button onClick={() => setModal("charge")} className="rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-teal-700">Raise charge</button>
        <button onClick={() => setModal("first_payment")} className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">First payment</button>
        <button onClick={() => setModal("manual_payment")} className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Record payment</button>
        <button onClick={() => setModal("schedule")} className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Monthly schedule</button>
        {has("finance.adjust") && f.mandate_status !== "active" && (
          <button onClick={() => setModal("mandate")} className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100">Record paper mandate</button>
        )}
      </div>

      {/* Children in the family */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(f.child_ids ?? []).map((id) => (
          <Link key={id} href={`/admin/children/${id}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-teal-50 hover:text-teal-700">
            {childName.get(id) ?? "Child"}
          </Link>
        ))}
      </div>

      {/* Charges */}
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-400">Charges</h2>
      <div className="card mb-6 overflow-x-auto">
        {view.charges.length === 0 ? <p className="p-4 text-sm text-slate-400">No charges yet.</p> : (
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Ref</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Child</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {view.charges.map((c) => (
                <tr key={c.id} className="border-b border-slate-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{c.ref || "—"}</td>
                  <td className="px-4 py-2.5 text-slate-800">
                    {c.description}
                    {c.first_payment && <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-violet-700">First payment</span>}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{c.child_name || "—"}</td>
                  <td className="px-4 py-2.5 text-slate-500">{c.due_date}</td>
                  <td className="px-4 py-2.5"><StageBadge label={chargeStatusLabel[c.status] ?? c.status} accent={chargeStatusAccent[c.status] ?? "slate"} withDot /></td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{formatPence(c.amount_pence)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-500">{c.paid_pence ? formatPence(c.paid_pence) : "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1.5">
                      {c.amount_pence - (c.paid_pence ?? 0) > 0 && !["cancelled", "written_off", "draft"].includes(c.status) && (
                        <button onClick={() => void remind(c)} disabled={busy} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Remind</button>
                      )}
                      {collectable(c) && (
                        <button onClick={() => void collect(c)} disabled={busy} className="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-50">Collect</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Payments */}
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-400">Payments</h2>
      <div className="card mb-6 overflow-x-auto">
        {view.payments.length === 0 ? <p className="p-4 text-sm text-slate-400">No payments yet.</p> : (
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Allocated to</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {view.payments.map((p) => (
                <tr key={p.id} className="border-b border-slate-50">
                  <td className="px-4 py-2.5 text-slate-500">{p.created_at?.slice(0, 10)}</td>
                  <td className="px-4 py-2.5 text-slate-600">{p.method === "bacs_debit" ? "Direct Debit" : p.method}</td>
                  <td className="px-4 py-2.5">
                    <StageBadge label={p.status} accent={paymentStatusAccent[p.status] ?? "slate"} withDot />
                    {p.failure_note && <span className="ml-2 text-xs text-red-500">{p.failure_note}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{(p.allocations ?? []).length} charge{(p.allocations ?? []).length === 1 ? "" : "s"}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{formatPence(p.amount_pence)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Schedules */}
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-400">Monthly schedules</h2>
      <div className="card overflow-x-auto">
        {view.schedules.length === 0 ? <p className="p-4 text-sm text-slate-400">No schedules — monthly charges are raised by schedule once fees are confirmed.</p> : (
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Child</th>
                <th className="px-4 py-3">Day of month</th>
                <th className="px-4 py-3">From</th>
                <th className="px-4 py-3">Until</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {view.schedules.map((s) => (
                <tr key={s.id} className="border-b border-slate-50">
                  <td className="px-4 py-2.5 text-slate-600">{childName.get(s.child_id) ?? "Child"}</td>
                  <td className="px-4 py-2.5 text-slate-500">{s.day_of_month}</td>
                  <td className="px-4 py-2.5 text-slate-500">{s.start_month}</td>
                  <td className="px-4 py-2.5 text-slate-500">{s.end_month || "ongoing"}</td>
                  <td className="px-4 py-2.5">{s.active ? <StageBadge label="Active" accent="green" /> : <StageBadge label="Inactive" accent="slate" />}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{formatPence(s.amount_pence)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Communications */}
      <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wider text-slate-400">Communications</h2>
      <div className="card">
        {comms.length === 0 ? <p className="p-4 text-sm text-slate-400">No reminders or messages sent yet.</p> : (
          <ul className="divide-y divide-slate-50">
            {comms.map((cl) => (
              <li key={cl.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StageBadge label={cl.kind.replace(/_/g, " ")} accent={cl.kind === "manual_reminder" ? "violet" : cl.kind === "dd_incomplete" ? "amber" : "sky"} withDot={false} />
                  <span className="text-sm font-medium text-slate-800">{cl.subject}</span>
                  <span className="ml-auto text-xs text-slate-400">{cl.sent_at?.slice(0, 16).replace("T", " ")}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{cl.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modal && (
        <ActionModal
          kind={modal}
          childOptions={(f.child_ids ?? []).map((id) => ({ id, name: childName.get(id) ?? "Child" }))}
          busy={busy}
          error={error}
          onClose={() => { setModal(null); setError(null); }}
          onSubmit={(kind, values) => {
            if (kind === "charge") {
              void run((t) => api.adminCreateCharge(t, familyId, {
                child_id: values.child_id || undefined,
                description: values.description,
                amount_pence: Math.round(parseFloat(values.amount || "0") * 100),
                due_date: values.due_date,
              }), "Charge raised.");
            } else if (kind === "first_payment") {
              void run((t) => api.adminCreateFirstPayment(t, familyId, {
                child_id: values.child_id,
                deposit_pence: Math.round(parseFloat(values.deposit || "0") * 100),
                first_month_pence: Math.round(parseFloat(values.first_month || "0") * 100),
                due_date: values.due_date,
              }), "First-payment charges raised (deposit + first month).");
            } else if (kind === "manual_payment") {
              void run((t) => api.adminRecordManualPayment(t, familyId, {
                amount_pence: Math.round(parseFloat(values.amount || "0") * 100),
                note: values.note,
              }), "Payment recorded and allocated to the oldest open charges.");
            } else if (kind === "schedule") {
              void run((t) => api.adminCreateSchedule(t, familyId, {
                child_id: values.child_id,
                amount_pence: Math.round(parseFloat(values.amount || "0") * 100),
                day_of_month: parseInt(values.day_of_month || "1", 10),
                start_month: values.start_month,
                end_month: values.end_month || undefined,
              }), "Monthly schedule created.");
            } else if (kind === "mandate") {
              void run((t) => api.adminMarkMandate(t, familyId, values.reference || ""), "Paper Direct Debit mandate recorded.");
            }
          }}
        />
      )}
    </>
  );
}

// ── Action modal (one generic shell, per-kind fields) ────────────────────────

const TITLES: Record<Exclude<ModalKind, null>, string> = {
  charge: "Raise a charge",
  first_payment: "First payment (deposit + first month)",
  manual_payment: "Record a manual payment",
  schedule: "Create a monthly schedule",
  mandate: "Record a paper Direct Debit mandate",
};

function ActionModal({
  kind, childOptions, busy, error, onClose, onSubmit,
}: {
  kind: Exclude<ModalKind, null>;
  childOptions: { id: string; name: string }[];
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (kind: Exclude<ModalKind, null>, values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({
    due_date: todayISO(),
    start_month: todayISO().slice(0, 7),
    day_of_month: "1",
    child_id: childOptions[0]?.id ?? "",
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  const input = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm";
  const label = "mb-1 block text-xs font-semibold text-slate-500";

  const childPicker = (required: boolean) => (
    <div>
      <span className={label}>Child{required ? "" : " (optional)"}</span>
      <select value={values.child_id ?? ""} onChange={set("child_id")} className={input}>
        {!required && <option value="">Whole family</option>}
        {childOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 font-heading text-lg font-bold text-slate-900">{TITLES[kind]}</h3>
        {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-500">{error}</p>}
        <form
          className="space-y-3"
          onSubmit={(e) => { e.preventDefault(); onSubmit(kind, values); }}
        >
          {kind === "charge" && (
            <>
              {childPicker(false)}
              <div>
                <span className={label}>Description</span>
                <input value={values.description ?? ""} onChange={set("description")} required className={input} placeholder="e.g. September fees" />
              </div>
              <div>
                <span className={label}>Amount (£)</span>
                <input type="number" min="0.01" step="0.01" value={values.amount ?? ""} onChange={set("amount")} required className={input} />
              </div>
              <div>
                <span className={label}>Due date</span>
                <input type="date" value={values.due_date ?? ""} onChange={set("due_date")} required className={input} />
              </div>
            </>
          )}
          {kind === "first_payment" && (
            <>
              {childPicker(true)}
              <div>
                <span className={label}>Deposit (£)</span>
                <input type="number" min="0" step="0.01" value={values.deposit ?? ""} onChange={set("deposit")} className={input} />
              </div>
              <div>
                <span className={label}>First month&apos;s fees (£)</span>
                <input type="number" min="0" step="0.01" value={values.first_month ?? ""} onChange={set("first_month")} className={input} />
              </div>
              <div>
                <span className={label}>Due date</span>
                <input type="date" value={values.due_date ?? ""} onChange={set("due_date")} required className={input} />
              </div>
              <p className="text-xs text-slate-400">These charges gate onboarding — the child becomes ready to start once they are paid and the Direct Debit mandate is active.</p>
            </>
          )}
          {kind === "manual_payment" && (
            <>
              <div>
                <span className={label}>Amount (£)</span>
                <input type="number" min="0.01" step="0.01" value={values.amount ?? ""} onChange={set("amount")} required className={input} />
              </div>
              <div>
                <span className={label}>Note</span>
                <input value={values.note ?? ""} onChange={set("note")} className={input} placeholder="e.g. bank transfer ref" />
              </div>
              <p className="text-xs text-slate-400">The payment settles the oldest open charges first.</p>
            </>
          )}
          {kind === "schedule" && (
            <>
              {childPicker(true)}
              <div>
                <span className={label}>Monthly amount (£)</span>
                <input type="number" min="0.01" step="0.01" value={values.amount ?? ""} onChange={set("amount")} required className={input} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className={label}>Day of month (1–28)</span>
                  <input type="number" min="1" max="28" value={values.day_of_month ?? "1"} onChange={set("day_of_month")} required className={input} />
                </div>
                <div>
                  <span className={label}>Start month</span>
                  <input type="month" value={values.start_month ?? ""} onChange={set("start_month")} required className={input} />
                </div>
              </div>
              <div>
                <span className={label}>End month (optional)</span>
                <input type="month" value={values.end_month ?? ""} onChange={set("end_month")} className={input} />
              </div>
            </>
          )}
          {kind === "mandate" && (
            <>
              <div>
                <span className={label}>Mandate reference</span>
                <input value={values.reference ?? ""} onChange={set("reference")} className={input} placeholder="e.g. paper form reference" />
              </div>
              <p className="text-xs text-slate-400">Records an offline (paper) Bacs mandate as active. This action is audited.</p>
            </>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={busy} className="rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
