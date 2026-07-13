"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Save, X } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { branchShortName } from "@/lib/branch";
import StageBadge from "@/components/admin/ui/StageBadge";
import { fmtDate } from "@/lib/child";
import { dbsExpiry, staffStatusAccent, staffStatusLabel, staffTypeAccent, staffTypeLabel } from "@/lib/staff";
import type { Branch, Staff, StaffInput } from "@/types";

export default function StaffDetailClient({ id }: { id: string }) {
  const [member, setMember] = useState<Staff | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<StaffInput | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated — please sign in as admin."); setLoading(false); return; }
    const [s, b] = await Promise.allSettled([api.adminGetStaffMember(token, id), api.getBranches()]);
    if (s.status === "fulfilled") setMember(s.value as Staff);
    else setError("Staff member not found.");
    if (b.status === "fulfilled") setBranches((b.value as Branch[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [id]);

  const branchName = useMemo(() => new Map(branches.map((b) => [b.slug, branchShortName(b)])), [branches]);

  const startEdit = () => {
    if (!member) return;
    setForm({
      first_name: member.first_name, last_name: member.last_name, email: member.email ?? "", phone: member.phone ?? "",
      branch_slug: member.branch_slug, room_id: member.room_id ?? "", job_title: member.job_title ?? "",
      staff_type: member.staff_type, status: member.status, start_date: member.start_date ?? "",
      contract_hours: member.contract_hours ?? 0, qualifications: member.qualifications ?? [],
      dbs_number: member.dbs_number ?? "", dbs_expiry: member.dbs_expiry ?? "", first_aid_expiry: member.first_aid_expiry ?? "",
    });
    setEditing(true);
  };

  const save = async () => {
    const token = getAccessToken();
    if (!token || !form) return;
    setSaving(true); setError(null);
    try {
      const updated = await api.adminUpdateStaff(token, id, form);
      setMember(updated as Staff);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally { setSaving(false); }
  };

  const setField = (patch: Partial<StaffInput>) => setForm((f) => (f ? { ...f, ...patch } : f));

  if (loading) return <p className="text-slate-400">Loading…</p>;
  if (!member) return <p className="text-red-500">{error ?? "Staff member not found."}</p>;
  const dbs = dbsExpiry(member.dbs_expiry);

  return (
    <>
      <Link href="/admin/staff" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600">
        <ArrowLeft className="h-4 w-4" /> All staff
      </Link>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-bold text-slate-900">{member.first_name} {member.last_name}</h1>
            <StageBadge label={staffStatusLabel[member.status]} accent={staffStatusAccent[member.status]} withDot />
            <StageBadge label={staffTypeLabel[member.staff_type]} accent={staffTypeAccent[member.staff_type]} withDot={false} />
          </div>
          <p className="mt-1 text-sm text-slate-500">{member.job_title || "—"} · <span className="font-mono text-xs text-slate-400">{member.ref ?? member.id}</span></p>
        </div>
        {!editing ? (
          <button type="button" onClick={startEdit} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Pencil className="h-4 w-4" /> Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setEditing(false)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><X className="h-4 w-4" /> Cancel</button>
            <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"><Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}</button>
          </div>
        )}
      </div>

      {!editing ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="card p-5 lg:col-span-2">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Employment</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
              <Item label="Branch" value={branchName.get(member.branch_slug) ?? member.branch_slug} />
              <Item label="Job title" value={member.job_title || "—"} />
              <Item label="Type" value={staffTypeLabel[member.staff_type]} />
              <Item label="Start date" value={fmtDate(member.start_date)} />
              <Item label="Contract hours" value={member.contract_hours ? `${member.contract_hours}h / week` : "—"} />
              <Item label="Email" value={member.email || "—"} />
              <Item label="Phone" value={member.phone || "—"} />
            </dl>

            <h2 className="mb-3 mt-6 text-sm font-bold uppercase tracking-widest text-slate-400">Qualifications</h2>
            {(!member.qualifications || member.qualifications.length === 0) ? (
              <p className="text-sm text-slate-400">None recorded.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {member.qualifications.map((qn, i) => <StageBadge key={i} label={qn} accent="teal" withDot={false} />)}
              </div>
            )}
          </div>

          <div className="card p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Compliance</h2>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wider text-slate-400">DBS check</dt>
                <dd className="mt-1 flex items-center gap-2 text-slate-800">
                  {member.dbs_number || "—"}
                  {dbs && <StageBadge label={dbs.label} accent={dbs.accent} withDot={false} />}
                </dd>
                <dd className="text-xs text-slate-400">{member.dbs_expiry ? `Expires ${fmtDate(member.dbs_expiry)}` : "No expiry recorded"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-slate-400">Paediatric first aid</dt>
                <dd className="mt-1 text-slate-800">{member.first_aid_expiry ? `Expires ${fmtDate(member.first_aid_expiry)}` : "Not recorded"}</dd>
              </div>
            </dl>
          </div>
        </div>
      ) : form && (
        <div className="card grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <Field label="First name"><input value={form.first_name} onChange={(e) => setField({ first_name: e.target.value })} className="inp" /></Field>
          <Field label="Last name"><input value={form.last_name} onChange={(e) => setField({ last_name: e.target.value })} className="inp" /></Field>
          <Field label="Job title"><input value={form.job_title} onChange={(e) => setField({ job_title: e.target.value })} className="inp" /></Field>
          <Field label="Branch">
            <select value={form.branch_slug} onChange={(e) => setField({ branch_slug: e.target.value })} className="inp bg-white">
              {branches.map((b) => <option key={b.slug} value={b.slug}>{branchShortName(b)}</option>)}
            </select>
          </Field>
          <Field label="Employment type">
            <select value={form.staff_type} onChange={(e) => setField({ staff_type: e.target.value as StaffInput["staff_type"] })} className="inp bg-white">
              <option value="permanent">Permanent</option><option value="agency">Agency</option><option value="bank">Bank</option>
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => setField({ status: e.target.value as StaffInput["status"] })} className="inp bg-white">
              <option value="active">Active</option><option value="on_leave">On leave</option><option value="inactive">Inactive</option>
            </select>
          </Field>
          <Field label="Email"><input type="email" value={form.email} onChange={(e) => setField({ email: e.target.value })} className="inp" /></Field>
          <Field label="Phone"><input value={form.phone} onChange={(e) => setField({ phone: e.target.value })} className="inp" /></Field>
          <Field label="Start date"><input type="date" value={form.start_date} onChange={(e) => setField({ start_date: e.target.value })} className="inp" /></Field>
          <Field label="Contract hours / week"><input type="number" min={0} value={form.contract_hours} onChange={(e) => setField({ contract_hours: Number(e.target.value) })} className="inp" /></Field>
          <Field label="DBS number"><input value={form.dbs_number} onChange={(e) => setField({ dbs_number: e.target.value })} className="inp" /></Field>
          <Field label="DBS expiry"><input type="date" value={form.dbs_expiry} onChange={(e) => setField({ dbs_expiry: e.target.value })} className="inp" /></Field>
          <Field label="Paediatric first aid expiry"><input type="date" value={form.first_aid_expiry} onChange={(e) => setField({ first_aid_expiry: e.target.value })} className="inp" /></Field>
          <div className="sm:col-span-2"><Field label="Qualifications (comma-separated)"><input value={(form.qualifications ?? []).join(", ")} onChange={(e) => setField({ qualifications: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} className="inp" /></Field></div>
        </div>
      )}

      <style jsx>{`
        :global(.inp) { width: 100%; border-radius: 0.5rem; border: 1px solid rgb(226 232 240); padding: 0.5rem 0.75rem; font-size: 0.875rem; }
      `}</style>
    </>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-slate-800">{value}</dd>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs uppercase tracking-wider text-slate-400">{label}</label>
      {children}
    </div>
  );
}
