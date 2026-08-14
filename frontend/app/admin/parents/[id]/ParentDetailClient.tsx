"use client";

import { useCallback, useEffect, useState } from "react";
import BackLink from "@/components/admin/ui/BackLink";
import Link from "next/link";
import { Pencil, Save, Send, ShieldOff, ShieldCheck, X } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { usePermissions } from "@/lib/usePermissions";
import StageBadge from "@/components/admin/ui/StageBadge";
import type { ChildParentRelationship, Parent, ParentInput } from "@/types";

const portalAccent: Record<string, "slate" | "teal" | "amber" | "red" | "indigo"> = {
  invited: "indigo", temporary: "amber", active: "teal", restricted: "amber", suspended: "red",
};

function Item({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-slate-800">{value || "—"}</dd>
    </div>
  );
}

export default function ParentDetailClient({ id }: { id: string }) {
  const [parent, setParent] = useState<Parent | null>(null);
  const [children, setChildren] = useState<ChildParentRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ParentInput | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const { has } = usePermissions();
  const canManage = has("parents.manage");

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated."); setLoading(false); return; }
    try {
      const [p, kids] = await Promise.all([api.adminGetParent(token, id), api.adminGetParentChildren(token, id)]);
      setParent(p);
      setChildren(kids ?? []);
      setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Parent not found"); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    const token = getAccessToken();
    if (!token || !form) return;
    setBusy(true); setError(null);
    try {
      setParent(await api.adminUpdateParent(token, id, form));
      setEditing(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to save"); }
    finally { setBusy(false); }
  };

  const invite = async () => {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true); setError(null);
    try {
      const res = await api.adminInviteParent(token, id);
      setInviteLink(res.activation_link);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to invite"); }
    finally { setBusy(false); }
  };

  const setState = async (state: string) => {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true); setError(null);
    try { setParent(await api.adminSetParentPortalState(token, id, state)); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to update portal state"); }
    finally { setBusy(false); }
  };

  if (loading) return <p className="text-slate-400">Loading…</p>;
  if (!parent) return <p className="text-red-500">{error ?? "Parent not found."}</p>;

  return (
    <>
      <BackLink fallback="/admin/parents" />

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-bold text-slate-900">{parent.first_name} {parent.last_name}</h1>
            {parent.portal_state && <StageBadge label={`portal: ${parent.portal_state}`} accent={portalAccent[parent.portal_state] ?? "slate"} withDot />}
          </div>
          <p className="mt-1 font-mono text-xs text-slate-400">{parent.ref ?? parent.id}</p>
        </div>
        {canManage && !editing && (
          <button type="button" onClick={() => { setForm({ first_name: parent.first_name, last_name: parent.last_name, email: parent.email ?? "", profession: parent.profession ?? "", mobile_phone: parent.mobile_phone ?? "", work_phone: parent.work_phone ?? "", home_phone: parent.home_phone ?? "", home_address: parent.home_address ?? "", work_address: parent.work_address ?? "" }); setEditing(true); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Pencil className="h-4 w-4" /> Edit
          </button>
        )}
        {editing && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setEditing(false)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><X className="h-4 w-4" /> Cancel</button>
            <button type="button" onClick={save} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"><Save className="h-4 w-4" /> {busy ? "Saving…" : "Save"}</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Contact details</h2>
          {!editing ? (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
              <Item label="Email" value={parent.email} />
              <Item label="Mobile" value={parent.mobile_phone} />
              <Item label="Home phone" value={parent.home_phone} />
              <Item label="Work phone" value={parent.work_phone} />
              <Item label="Profession" value={parent.profession} />
              <Item label="Home address" value={parent.home_address} />
              <Item label="Work address" value={parent.work_address} />
            </dl>
          ) : form && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} placeholder="First name" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} placeholder="Last name" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" type="email" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input value={form.mobile_phone ?? ""} onChange={(e) => setForm({ ...form, mobile_phone: e.target.value })} placeholder="Mobile" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input value={form.home_phone ?? ""} onChange={(e) => setForm({ ...form, home_phone: e.target.value })} placeholder="Home phone" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input value={form.work_phone ?? ""} onChange={(e) => setForm({ ...form, work_phone: e.target.value })} placeholder="Work phone" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input value={form.profession ?? ""} onChange={(e) => setForm({ ...form, profession: e.target.value })} placeholder="Profession" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input value={form.home_address ?? ""} onChange={(e) => setForm({ ...form, home_address: e.target.value })} placeholder="Home address" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input value={form.work_address ?? ""} onChange={(e) => setForm({ ...form, work_address: e.target.value })} placeholder="Work address" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Portal access</h2>
          <p className="mb-3 text-sm text-slate-600">
            {parent.portal_state ? `State: ${parent.portal_state}` : "No portal access yet."}
            {parent.temporary_until && <span className="block text-xs text-slate-400">Temporary until {new Date(parent.temporary_until).toLocaleDateString("en-GB")}</span>}
          </p>
          {canManage && (
            <div className="flex flex-col gap-2">
              {(!parent.portal_state || parent.portal_state === "invited") && (
                <button type="button" onClick={invite} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
                  <Send className="h-4 w-4" /> {parent.portal_state === "invited" ? "Re-send invitation" : "Invite to portal"}
                </button>
              )}
              {(parent.portal_state === "temporary" || parent.portal_state === "restricted") && (
                <button type="button" onClick={() => setState("active")} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
                  <ShieldCheck className="h-4 w-4" /> Activate full access
                </button>
              )}
              {(parent.portal_state === "active" || parent.portal_state === "temporary" || parent.portal_state === "restricted") && (
                <button type="button" onClick={() => setState("suspended")} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
                  <ShieldOff className="h-4 w-4" /> Suspend access
                </button>
              )}
              {parent.portal_state === "suspended" && (
                <button type="button" onClick={() => setState("active")} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
                  <ShieldCheck className="h-4 w-4" /> Restore access
                </button>
              )}
            </div>
          )}
        </div>

        <div className="card p-5 lg:col-span-3">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Children</h2>
          {children.length === 0 ? (
            <p className="text-sm text-slate-400">Not linked to any children.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {children.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                  <Link href={`/admin/children/${r.child_id}`} className="font-medium text-slate-800 hover:text-teal-600 hover:underline">{r.child_name || "Child"}</Link>
                  <span className="text-xs text-slate-500">{r.relationship}</span>
                  {r.parental_responsibility && <StageBadge label="PR" accent="teal" withDot={false} />}
                  {r.primary_contact && <StageBadge label="primary" accent="indigo" withDot={false} />}
                  {r.portal_access && <StageBadge label="portal" accent="sky" withDot={false} />}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {inviteLink && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setInviteLink(null)} role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-1 text-lg font-bold text-slate-900">Invitation sent</h2>
            <p className="mb-3 text-sm text-slate-500">A secure activation link has been emailed (single-use, expires in 14 days):</p>
            <input readOnly value={inviteLink} onFocus={(e) => e.target.select()} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600" />
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => setInviteLink(null)} className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700">Done</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
