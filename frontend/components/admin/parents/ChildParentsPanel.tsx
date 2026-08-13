"use client";

// ChildParentsPanel — the canonical child↔parent UI on the child profile.
// Replaces the legacy embedded-guardians card: lists relationships with their
// flags, links existing parents (searchable picker) or creates one inline,
// edits flags, unlinks, and runs the portal invitation flow. Sole writer of
// a child's family links (the child edit form no longer touches guardians).

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Pencil, Plus, PoundSterling, Send, Trash2, Users } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { usePermissions } from "@/lib/usePermissions";
import PickerModal from "@/components/admin/ui/PickerModal";
import StageBadge from "@/components/admin/ui/StageBadge";
import type { ChildParentRelationship, Parent, ParentInput, RelationshipFlagsInput } from "@/types";

const RELATIONSHIPS = ["mother", "father", "guardian", "grandparent", "aunt", "uncle", "step-parent", "family friend", "childminder", "other"];

const FLAG_FIELDS: { key: keyof RelationshipFlagsInput; label: string }[] = [
  { key: "parental_responsibility", label: "Parental responsibility" },
  { key: "primary_contact", label: "Primary contact" },
  { key: "emergency_contact", label: "Emergency contact" },
  { key: "authorised_collection", label: "Authorised to collect" },
  { key: "billing_contact", label: "Billing contact" },
  { key: "receives_communications", label: "Receives communications" },
  { key: "lives_with_child", label: "Lives with child" },
  { key: "portal_access", label: "Parent portal access" },
  { key: "finance_access", label: "Finance access" },
];

const emptyParent: ParentInput = { first_name: "", last_name: "", email: "", mobile_phone: "" };

// pickFlags extracts ONLY the editable flag fields from a full relationship —
// spreading the whole object would smuggle id/child_id/parent_id/timestamps
// into the update payload, which the backend's DisallowUnknownFields rejects.
function pickFlags(r: ChildParentRelationship): RelationshipFlagsInput {
  return {
    relationship: r.relationship,
    parental_responsibility: !!r.parental_responsibility,
    primary_contact: !!r.primary_contact,
    emergency_contact: !!r.emergency_contact,
    authorised_collection: !!r.authorised_collection,
    billing_contact: !!r.billing_contact,
    receives_communications: !!r.receives_communications,
    lives_with_child: !!r.lives_with_child,
    portal_access: !!r.portal_access,
    finance_access: !!r.finance_access,
    legal_contact: !!r.legal_contact,
    contact_arrangements: r.contact_arrangements ?? "",
    priority: r.priority ?? 0,
  };
}
const emptyFlags: RelationshipFlagsInput = { relationship: "mother", parental_responsibility: true, primary_contact: false, emergency_contact: true, receives_communications: true, portal_access: true };

const portalAccent: Record<string, "slate" | "teal" | "amber" | "red" | "indigo"> = {
  invited: "indigo", temporary: "amber", active: "teal", restricted: "amber", suspended: "red",
};

function FlagEditor({ value, onChange }: { value: RelationshipFlagsInput; onChange: (v: RelationshipFlagsInput) => void }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">Relationship</span>
        <select value={value.relationship} onChange={(e) => onChange({ ...value, relationship: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          {RELATIONSHIPS.map((rr) => <option key={rr} value={rr}>{rr}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {FLAG_FIELDS.map((f) => (
          <label key={f.key} className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={!!value[f.key]} onChange={(e) => onChange({ ...value, [f.key]: e.target.checked })} />
            {f.label}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function ChildParentsPanel({ childId, canManage }: { childId: string; canManage: boolean }) {
  const router = useRouter();
  const { has } = usePermissions();
  const [rels, setRels] = useState<ChildParentRelationship[]>([]);
  const [parents, setParents] = useState<Map<string, Parent>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Add flow: pick an existing parent or switch to inline create.
  const [adding, setAdding] = useState(false);
  const [allParents, setAllParents] = useState<Parent[]>([]);
  const [pickedParentId, setPickedParentId] = useState("");
  const [creatingNew, setCreatingNew] = useState(false);
  const [newParent, setNewParent] = useState<ParentInput>(emptyParent);
  const [flags, setFlags] = useState<RelationshipFlagsInput>(emptyFlags);

  // Edit-flags flow.
  const [editingRel, setEditingRel] = useState<ChildParentRelationship | null>(null);
  const [editFlags, setEditFlags] = useState<RelationshipFlagsInput>(emptyFlags);

  // Invitation result (activation link shown once for copy/share).
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const list = await api.adminGetChildParents(token, childId);
      setRels(list ?? []);
      const ids = [...new Set((list ?? []).map((r) => r.parent_id))];
      const people = await Promise.all(ids.map((id) => api.adminGetParent(token, id).catch(() => null)));
      setParents(new Map(people.filter(Boolean).map((p) => [(p as Parent).id, p as Parent])));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load parents");
    } finally {
      setLoading(false);
    }
  }, [childId]);
  useEffect(() => { void load(); }, [load]);

  const openAdd = async () => {
    const token = getAccessToken();
    if (!token) return;
    setAdding(true); setCreatingNew(false); setPickedParentId(""); setNewParent(emptyParent); setFlags(emptyFlags);
    try { setAllParents((await api.adminGetParents(token)) ?? []); } catch { setAllParents([]); }
  };

  const submitLink = async () => {
    const token = getAccessToken();
    if (!token || busy) return;
    setBusy(true); setError(null);
    try {
      await api.adminLinkChildParent(token, childId, creatingNew
        ? { parent: newParent, ...flags }
        : { parent_id: pickedParentId, ...flags });
      setAdding(false);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to link parent"); }
    finally { setBusy(false); }
  };

  const submitFlags = async () => {
    const token = getAccessToken();
    if (!token || !editingRel || busy) return;
    setBusy(true); setError(null);
    try {
      await api.adminUpdateParentRelationship(token, editingRel.id, editFlags);
      setEditingRel(null);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to update relationship"); }
    finally { setBusy(false); }
  };

  const unlink = async (rel: ChildParentRelationship) => {
    const token = getAccessToken();
    if (!token || busy) return;
    setBusy(true); setError(null);
    try { await api.adminUnlinkParentRelationship(token, rel.id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to unlink"); }
    finally { setBusy(false); }
  };

  const invite = async (rel: ChildParentRelationship) => {
    const token = getAccessToken();
    if (!token || busy) return;
    setBusy(true); setError(null);
    try {
      const res = await api.adminInviteParent(token, rel.parent_id);
      setInviteLink(res.activation_link);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to send invitation"); }
    finally { setBusy(false); }
  };

  const flagChips = (r: ChildParentRelationship) => {
    const chips: string[] = [];
    if (r.parental_responsibility) chips.push("PR");
    if (r.primary_contact) chips.push("primary");
    if (r.emergency_contact) chips.push("emergency");
    if (r.authorised_collection) chips.push("collects");
    if (r.billing_contact) chips.push("billing");
    if (r.lives_with_child) chips.push("lives with");
    if (r.legal_contact) chips.push("legal contact");
    return chips;
  };

  if (loading) return <p className="text-sm text-slate-400">Loading parents…</p>;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-heading text-sm font-semibold text-slate-900">
          <Users className="h-4 w-4 text-teal-600" /> Parents & Guardians
        </h3>
        {canManage && (
          <div className="flex items-center gap-2">
            {rels.length > 0 && has("finance.manage") && (
              <button
                type="button"
                onClick={() => {
                  const token = getAccessToken();
                  if (!token) return;
                  void api.adminEnsureFamily(token, childId)
                    .then((fam) => router.push(`/admin/finance/${fam.id}`))
                    .catch((e) => setError(e instanceof Error ? e.message : "Could not open the family account"));
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <PoundSterling className="h-3.5 w-3.5" /> Family account
              </button>
            )}
            <button type="button" onClick={openAdd} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
              <Plus className="h-3.5 w-3.5" /> Add parent
            </button>
          </div>
        )}
      </div>

      {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

      {rels.length === 0 ? (
        <p className="text-sm text-slate-400">No parents or guardians linked yet.</p>
      ) : (
        <ul className="space-y-2">
          {rels.map((r) => {
            const p = parents.get(r.parent_id);
            return (
              <li key={r.id} className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/parents/${r.parent_id}`} className="font-medium text-slate-800 hover:text-teal-600 hover:underline">
                    {r.parent_name || "Parent"}
                  </Link>
                  <span className="text-xs text-slate-500">· {r.relationship}</span>
                  {p?.portal_state && (
                    <StageBadge label={`portal: ${p.portal_state}`} accent={portalAccent[p.portal_state] ?? "slate"} withDot={false} />
                  )}
                  {canManage && (
                    <span className="ml-auto flex items-center gap-2">
                      {p && r.portal_access && (!p.portal_state || p.portal_state === "invited") && (
                        <button type="button" onClick={() => invite(r)} disabled={busy} title={p.portal_state === "invited" ? "Re-send invitation" : "Invite to parent portal"} className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:underline disabled:opacity-50">
                          <Send className="h-3 w-3" /> {p.portal_state === "invited" ? "Re-invite" : "Invite"}
                        </button>
                      )}
                      <button type="button" onClick={() => { setEditingRel(r); setEditFlags(pickFlags(r)); }} title="Edit relationship" className="text-slate-400 hover:text-teal-600">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => unlink(r)} disabled={busy} title="Remove relationship" className="text-slate-400 hover:text-red-500 disabled:opacity-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {flagChips(r).map((c) => <span key={c} className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wide text-slate-600">{c}</span>)}
                  {p?.email && <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Mail className="h-3 w-3" />{p.email}</span>}
                  {p?.mobile_phone && <span className="text-xs text-slate-500">{p.mobile_phone}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {adding && (
        <PickerModal
          title="Add parent / guardian"
          subtitle={creatingNew ? "Enter the new person's details." : "Pick an existing person (siblings share one record) or create a new one."}
          options={creatingNew ? [] : allParents.filter((p) => !rels.some((r) => r.parent_id === p.id)).map((p) => ({
            id: p.id,
            label: `${p.first_name} ${p.last_name}`,
            detail: p.email || p.mobile_phone || undefined,
            badge: p.portal_state || undefined,
            badgeTone: "slate" as const,
          }))}
          selectedId={pickedParentId}
          onSelect={setPickedParentId}
          onClose={() => setAdding(false)}
          emptyText={creatingNew ? "" : "No other parents on record yet — create one below."}
        >
          <div className="mt-3 space-y-2">
            <button type="button" onClick={() => setCreatingNew((v) => !v)} className="text-xs font-medium text-teal-600 hover:underline">
              {creatingNew ? "← Pick an existing person instead" : "+ Create a new person"}
            </button>
            {creatingNew && (
              <div className="grid grid-cols-2 gap-2">
                <input value={newParent.first_name} onChange={(e) => setNewParent({ ...newParent, first_name: e.target.value })} placeholder="First name" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <input value={newParent.last_name} onChange={(e) => setNewParent({ ...newParent, last_name: e.target.value })} placeholder="Last name" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <input value={newParent.email ?? ""} onChange={(e) => setNewParent({ ...newParent, email: e.target.value })} placeholder="Email" type="email" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <input value={newParent.mobile_phone ?? ""} onChange={(e) => setNewParent({ ...newParent, mobile_phone: e.target.value })} placeholder="Mobile" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </div>
            )}
            <FlagEditor value={flags} onChange={setFlags} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAdding(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={submitLink} disabled={busy || (creatingNew ? !newParent.first_name.trim() || !newParent.last_name.trim() : !pickedParentId)} className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
                {busy ? "Saving…" : "Link parent"}
              </button>
            </div>
          </div>
        </PickerModal>
      )}

      {editingRel && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setEditingRel(null)} role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-3 text-lg font-bold text-slate-900">Relationship — {editingRel.parent_name}</h2>
            <FlagEditor value={editFlags} onChange={setEditFlags} />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setEditingRel(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={submitFlags} disabled={busy} className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">Save</button>
            </div>
          </div>
        </div>
      )}

      {inviteLink && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setInviteLink(null)} role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-1 text-lg font-bold text-slate-900">Invitation sent</h2>
            <p className="mb-3 text-sm text-slate-500">The parent has been emailed a secure activation link (single-use, expires in 14 days). You can also copy it to share directly:</p>
            <input readOnly value={inviteLink} onFocus={(e) => e.target.select()} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600" />
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => setInviteLink(null)} className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
