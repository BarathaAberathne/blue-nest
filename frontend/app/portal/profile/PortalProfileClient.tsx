"use client";

// My Profile — the PARENT's own record (contact details + relationships).
// Child information lives under My Children, never here.

import { useEffect, useState } from "react";
import { UserCircle } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken, getAuthUser } from "@/lib/auth";
import type { ChildParentRelationship, Parent } from "@/types";

export default function PortalProfileClient() {
  const [parent, setParent] = useState<Parent | null>(null);
  const [rels, setRels] = useState<ChildParentRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const user = getAuthUser();

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    api.portalGetMe(token)
      .then((me) => { setParent(me.parent); setRels(me.children ?? []); })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-400">Loading…</p>;

  return (
    <>
      {loadError && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800" role="alert">
          Your profile could not be loaded just now — the details below may be incomplete. Please refresh, or contact the nursery if this keeps happening.
        </div>
      )}
      <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-slate-900"><UserCircle className="h-6 w-6 text-teal-600" /> My Profile</h1>
      <p className="mt-1 text-sm text-slate-500">Your own contact details. To update anything, just let the nursery know.</p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Contact details</h3>
          <dl className="space-y-2 text-sm text-slate-600">
            <div className="flex justify-between"><dt className="text-slate-400">Name</dt><dd className="font-medium text-slate-800">{parent ? `${parent.first_name} ${parent.last_name}` : `${user?.first_name ?? ""} ${user?.last_name ?? ""}`}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Email</dt><dd>{parent?.email ?? user?.email}</dd></div>
            {parent?.mobile_phone && <div className="flex justify-between"><dt className="text-slate-400">Mobile</dt><dd>{parent.mobile_phone}</dd></div>}
          </dl>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Your children</h3>
          {rels.length === 0 ? <p className="text-sm text-slate-400">No children linked.</p> : (
            <ul className="space-y-2 text-sm">
              {rels.map((r) => (
                <li key={r.id} className="flex items-center justify-between">
                  <span className="font-medium text-slate-800">{r.child_name || "Child"}</span>
                  <span className="text-xs text-slate-500">{r.relationship}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
