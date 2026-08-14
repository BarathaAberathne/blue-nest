"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Archive, ArrowRightLeft, FileDown, Pencil, Plus, Save, Trash2, UserCheck, X } from "lucide-react";
import BackLink from "@/components/admin/ui/BackLink";
import { api, downloadCsv } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { branchShortName } from "@/lib/branch";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import StageBadge from "@/components/admin/ui/StageBadge";
import Avatar from "@/components/admin/ui/Avatar";
import ProfilePhotoUploader from "@/components/admin/ui/ProfilePhotoUploader";
import ChildRoomAllocations from "@/components/admin/rooms/ChildRoomAllocations";
import ChildParentsPanel from "@/components/admin/parents/ChildParentsPanel";
import ChildOnboardingPanel from "@/components/admin/children/ChildOnboardingPanel";
import InductionAnswers from "@/components/admin/children/InductionAnswers";
import ConsentsCard from "@/components/admin/children/ConsentsCard";
import SendSupportPanel from "@/components/admin/send/SendSupportPanel";
import { sendActive } from "@/lib/send";
import PickerModal from "@/components/admin/ui/PickerModal";
import DailyLogForm from "@/components/admin/daily/DailyLogForm";
import { usePermissions } from "@/lib/usePermissions";
import { ageLabel, childStatusAccent, fmtDate, fundingLabel } from "@/lib/child";
import { dailyTypeAccent, dailyTypeLabel } from "@/lib/daily";
import { useTaxonomy, sessionOptions } from "@/lib/useTaxonomy";
import type { Branch, Child, ChildInput, ChildSession, DailyRecord, Guardian, InductionBundle, Room, Staff } from "@/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

// The FULL child profile is tabbed: everything the family filled in on the
// induction form surfaces here for staff, grouped by concern.
type ProfileTab = "overview" | "family" | "health" | "induction" | "records";
const PROFILE_TABS: [ProfileTab, string][] = [
  ["overview", "Overview"],
  ["family", "Family & contacts"],
  ["health", "Health & development"],
  ["induction", "Induction & consents"],
  ["records", "Daily records"],
];

export default function ChildDetailClient({ id }: { id: string }) {
  const [child, setChild] = useState<Child | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ChildInput | null>(null);
  const [saving, setSaving] = useState(false);
  const { has } = usePermissions();
  const search = useSearchParams();
  const [tab, setTabState] = useState<ProfileTab>((search?.get("tab") as ProfileTab) || "overview");
  // Mirror the active tab into the URL (replaceState — no history spam) so
  // browser back from a detail page returns to the SAME tab.
  const setTab = (k: ProfileTab) => {
    setTabState(k);
    if (typeof window !== "undefined") window.history.replaceState(null, "", k === "overview" ? window.location.pathname : `?tab=${k}`);
  };
  const [inductionBundle, setInductionBundle] = useState<InductionBundle | null>(null);
  const [bundleLoading, setBundleLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [showLog, setShowLog] = useState(false);
  // Key-person picker + archive flow (both children.manage-gated).
  const [pickingKeyPerson, setPickingKeyPerson] = useState(false);
  const [branchStaff, setBranchStaff] = useState<Staff[]>([]);
  const [archiving, setArchiving] = useState(false);
  const [leaveDateDraft, setLeaveDateDraft] = useState("");
  // Incremented by the ROOM row's Assign/Change button — opens the room
  // allocation popup down in the ChildRoomAllocations panel.
  const [roomOpenRequest, setRoomOpenRequest] = useState(0);

  // Configurable, per-branch lists drive the session picker + tag chips.
  const taxBranch = form?.branch_slug ?? child?.branch_slug ?? "";
  const sessionTypeOptions = sessionOptions(useTaxonomy("session_type", taxBranch));
  const sessionLabel = (code: string) => sessionTypeOptions.find((o) => o.value === code)?.label ?? code;
  const allergyTerms = useTaxonomy("allergy_type", taxBranch);
  const dietaryTerms = useTaxonomy("dietary_label", taxBranch);
  const toggleTag = (field: "allergy_tags" | "dietary_tags", code: string) =>
    setForm((f) => (f ? { ...f, [field]: (f[field] ?? []).includes(code) ? (f[field] ?? []).filter((c) => c !== code) : [...(f[field] ?? []), code] } : f));

  const load = async () => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated — please sign in as admin."); setLoading(false); return; }
    const [c, b, r, d, ind] = await Promise.allSettled([api.adminGetChild(token, id), api.adminGetBranches(token), api.adminGetRooms(token), api.adminGetDailyRecords(token, { child: id, approval: "approved", limit: 12 }), api.adminGetInduction(token, id)]);
    if (c.status === "fulfilled") setChild(c.value as Child);
    else setError("Child not found.");
    if (b.status === "fulfilled") setBranches((b.value as Branch[]) ?? []);
    if (r.status === "fulfilled") setRooms((r.value as Room[]) ?? []);
    if (d.status === "fulfilled") setRecords((d.value as DailyRecord[]) ?? []);
    if (ind.status === "fulfilled") setInductionBundle(ind.value as InductionBundle);
    setBundleLoading(false);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [id]);
  // Only touches the read-only display state (child/records) — safe to
  // background-refresh mid-edit since `form` is a separate, un-synced state.
  useAutoRefresh(load, 30_000);

  const branchName = useMemo(() => new Map(branches.map((b) => [b.slug, branchShortName(b)])), [branches]);
  const roomName = useMemo(() => new Map(rooms.map((r) => [r.id, r.name])), [rooms]);

  const startEdit = () => {
    if (!child) return;
    setForm({
      first_name: child.first_name, last_name: child.last_name, dob: child.dob ?? "", gender: child.gender ?? "",
      branch_slug: child.branch_slug, status: child.status, start_date: child.start_date ?? "",
      funding_type: child.funding_type, allergies: child.allergies ?? "", dietary_reqs: child.dietary_reqs ?? "",
      medical_notes: child.medical_notes ?? "", guardians: child.guardians ?? [],
      sessions: child.sessions ?? [],
      allergy_tags: child.allergy_tags ?? [], dietary_tags: child.dietary_tags ?? [],
    });
    setEditing(true);
  };

  const save = async () => {
    const token = getAccessToken();
    if (!token || !form) return;
    setSaving(true); setError(null);
    try {
      const updated = await api.adminUpdateChild(token, id, form);
      setChild(updated as Child);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally { setSaving(false); }
  };

  const setField = (patch: Partial<ChildInput>) => setForm((f) => (f ? { ...f, ...patch } : f));

  const openKeyPersonPicker = async () => {
    const token = getAccessToken();
    if (!token || !child) return;
    setPickingKeyPerson(true);
    try {
      const staff = await api.adminGetStaff(token, { branch: child.branch_slug, status: "active" });
      setBranchStaff((staff as Staff[]) ?? []);
    } catch { setBranchStaff([]); }
  };
  const assignKeyPerson = async (staffId: string) => {
    const token = getAccessToken();
    if (!token) return;
    setError(null);
    try {
      const updated = await api.adminSetChildKeyPerson(token, id, staffId);
      setChild(updated as Child);
      setPickingKeyPerson(false);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to set key person"); }
  };

  const archive = async () => {
    const token = getAccessToken();
    if (!token) return;
    setError(null);
    try {
      const updated = await api.adminArchiveChild(token, id, leaveDateDraft || undefined);
      setChild(updated as Child);
      setArchiving(false);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to archive"); }
  };

  // Full-profile PDF — the server composes identity + contacts + every
  // induction answer + consents (+ SEND for send.manage callers) into one
  // downloadable document.
  const downloadPdf = async () => {
    const token = getAccessToken();
    if (!token) return;
    setPdfBusy(true); setError(null);
    try {
      await downloadCsv(`/api/v1/admin/children/${id}/profile.pdf`, token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF export failed");
    } finally { setPdfBusy(false); }
  };

  const setGuardian = (i: number, patch: Partial<Guardian>) =>
    setForm((f) => (f ? { ...f, guardians: (f.guardians ?? []).map((g, gi) => (gi === i ? { ...g, ...patch } : g)) } : f));
  const addGuardian = () =>
    setForm((f) => (f ? { ...f, guardians: [...(f.guardians ?? []), { name: "", relation: "", email: "", phone: "", primary: (f.guardians ?? []).length === 0 }] } : f));
  const removeGuardian = (i: number) =>
    setForm((f) => (f ? { ...f, guardians: (f.guardians ?? []).filter((_, gi) => gi !== i) } : f));
  const setPrimaryGuardian = (i: number) =>
    setForm((f) => (f ? { ...f, guardians: (f.guardians ?? []).map((g, gi) => ({ ...g, primary: gi === i })) } : f));

  const sessionFor = (day: string) => form?.sessions?.find((s) => s.day === day)?.type ?? "";
  const setSession = (day: string, type: string) =>
    setForm((f) => {
      if (!f) return f;
      const rest = (f.sessions ?? []).filter((s) => s.day !== day);
      const next: ChildSession[] = type ? [...rest, { day, type }] : rest;
      return { ...f, sessions: next.sort((a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day)) };
    });

  if (loading) return <p className="text-slate-400">Loading…</p>;
  if (!child) return <p className="text-red-500">{error ?? "Child not found."}</p>;

  return (
    <>
      <BackLink fallback="/admin/children" />

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-4">
          {has("children.manage") ? (
            <ProfilePhotoUploader
              name={`${child.first_name} ${child.last_name}`}
              photoUrl={child.photo_url}
              size="lg"
              onSave={async (token, url) => {
                const updated = await api.adminSetChildPhoto(token, child.id, url);
                setChild((c) => (c ? { ...c, photo_url: updated.photo_url } : c));
              }}
            />
          ) : (
            <Avatar name={`${child.first_name} ${child.last_name}`} src={child.photo_url} size="lg" />
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-2xl font-bold text-slate-900">{child.first_name} {child.last_name}</h1>
              <StageBadge label={child.status} accent={childStatusAccent[child.status]} withDot />
              {sendActive(child.send_status) && <StageBadge label="Additional support" accent="violet" withDot={false} />}
            </div>
            <p className="mt-1 font-mono text-xs text-slate-400">{child.ref ?? child.id}</p>
          </div>
        </div>
        {!editing ? (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void downloadPdf()} disabled={pdfBusy} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              <FileDown className="h-4 w-4" /> {pdfBusy ? "Preparing…" : "Download PDF"}
            </button>
            {has("children.manage") && child.status !== "left" && (
              <button type="button" onClick={() => { setLeaveDateDraft(new Date().toISOString().slice(0, 10)); setArchiving(true); }} className="inline-flex items-center gap-2 rounded-lg border border-amber-200 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50">
                <Archive className="h-4 w-4" /> Mark as left
              </button>
            )}
            <button type="button" onClick={startEdit} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Pencil className="h-4 w-4" /> Edit
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setEditing(false)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><X className="h-4 w-4" /> Cancel</button>
            <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"><Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}</button>
          </div>
        )}
      </div>

      {!editing ? (
        <>
          <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
            {PROFILE_TABS.map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition ${tab === k ? "border-teal-600 text-teal-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
                {label}
              </button>
            ))}
          </div>

          {tab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="card p-5 lg:col-span-2">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Profile</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
              <Item label="Age" value={ageLabel(child.dob)} />
              <Item label="Date of birth" value={fmtDate(child.dob)} />
              <Item label="Gender" value={child.gender || "—"} />
              <Item label="Branch" value={branchName.get(child.branch_slug) ?? child.branch_slug} />
              <div>
                <dt className="text-xs uppercase tracking-wider text-slate-400">Room</dt>
                <dd className="mt-0.5 flex items-center gap-2 text-slate-800">
                  {child.room_id ? roomName.get(child.room_id) ?? child.room_name ?? "—" : "—"}
                  {has("children.manage") && child.status !== "left" && (
                    <button type="button" onClick={() => setRoomOpenRequest((n) => n + 1)} className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:underline">
                      <ArrowRightLeft className="h-3.5 w-3.5" /> {child.room_id ? "Change" : "Assign"}
                    </button>
                  )}
                </dd>
              </div>
              <Item label="Funding" value={fundingLabel(child.funding_type)} />
              <Item label="Start date" value={fmtDate(child.start_date)} />
              {child.status === "left" && <Item label="Left on" value={fmtDate(child.leave_date)} />}
              <div>
                <dt className="text-xs uppercase tracking-wider text-slate-400">Key person</dt>
                <dd className="mt-0.5 flex items-center gap-2 text-slate-800">
                  {child.key_person_name || "—"}
                  {has("children.manage") && (
                    <button type="button" onClick={openKeyPersonPicker} className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:underline">
                      <UserCheck className="h-3.5 w-3.5" /> {child.key_person_id ? "Change" : "Assign"}
                    </button>
                  )}
                </dd>
              </div>
              <Item label="Home address" value={child.address || "—"} />
            </dl>

            <h2 className="mb-3 mt-6 text-sm font-bold uppercase tracking-widest text-slate-400">Allergies & dietary</h2>
            <AllergiesDietary child={child} allergyTerms={allergyTerms} dietaryTerms={dietaryTerms} />

            <h2 className="mb-3 mt-6 text-sm font-bold uppercase tracking-widest text-slate-400">Weekly sessions</h2>
            {(!child.sessions || child.sessions.length === 0) ? (
              <p className="text-sm text-slate-400">No sessions recorded — set the weekly pattern via Edit.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {WEEKDAYS.map((day) => {
                  const s = child.sessions?.find((x) => x.day === day);
                  return (
                    <div key={day} className={`rounded-lg border px-3 py-2 text-center text-sm ${s ? "border-sky-200 bg-sky-50 text-sky-800" : "border-slate-100 text-slate-300"}`}>
                      <p className="text-xs font-medium uppercase tracking-wider">{day}</p>
                      <p className="mt-0.5">{s ? sessionLabel(s.type) : "—"}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {has("send.manage") && (
              <SendSupportPanel
                childId={child.id}
                branchSlug={child.branch_slug}
                onStatusChange={(status) => setChild((c) => (c ? { ...c, send_status: status } : c))}
              />
            )}
          </div>

          {/* Room placement — current room, transfer with capacity/age
              warnings, and full history. Sole writer of the child's room. */}
          <div className="lg:col-span-3">
            <ChildRoomAllocations
              childId={child.id}
              branchSlug={child.branch_slug}
              canManage={has("children.manage")}
              sendChild={sendActive(child.send_status)}
              onChange={() => { void load(); }}
              openRequest={roomOpenRequest}
            />
          </div>
        </div>
          )}

          {/* Family & contacts — canonical parents/relationships + what the
              family declared on the induction form (lives-with, legal contact,
              authorised collectors incl. the collection password). */}
          {tab === "family" && (
            <div className="space-y-4">
              <ChildParentsPanel childId={child.id} canManage={has("parents.manage")} />
              <InductionAnswers bundle={inductionBundle} keys={["child_details", "family", "legal_contact", "collectors"]} loading={bundleLoading} />
            </div>
          )}

          {/* Health & development — canonical allergy/dietary/medical record +
              the induction health, professionals, routine, cultural and
              development answers. */}
          {tab === "health" && (
            <div className="space-y-4">
              <div className="card p-5">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">Allergies & dietary (child record)</h2>
                <AllergiesDietary child={child} allergyTerms={allergyTerms} dietaryTerms={dietaryTerms} />
              </div>
              <InductionAnswers bundle={inductionBundle} keys={["professionals", "health", "allergies_dietary", "cultural", "routine", "development", "equality"]} loading={bundleLoading} />
            </div>
          )}

          {/* Induction & consents — onboarding progress, the four-eyes review
              (the ONLY sign-off surface; the submit notification links here)
              and the latest decision per consent item. */}
          {tab === "induction" && (
            <div className="space-y-4">
              <ChildOnboardingPanel childId={child.id} canManage={has("children.manage")} />
              <ConsentsCard childId={child.id} />
            </div>
          )}

          {tab === "records" && (
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Recent daily records</h2>
              <div className="flex items-center gap-3">
                {has("daily_logs.manage") && <button type="button" onClick={() => setShowLog(true)} className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"><Plus className="h-3.5 w-3.5" /> Add daily log</button>}
                <Link href="/admin/daily-log" className="text-xs text-teal-600 hover:underline">Open daily log →</Link>
              </div>
            </div>
            {records.length === 0 ? (
              <p className="text-sm text-slate-400">No approved observations, incidents or other records for this child yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {records.map((r) => (
                  <li key={r.id}>
                    <Link href={`/admin/daily-log/${r.id}`} className="flex items-center gap-3 py-2.5 text-sm hover:bg-slate-50">
                      <StageBadge label={dailyTypeLabel[r.type]} accent={dailyTypeAccent[r.type]} withDot={false} />
                      <span className="flex-1 text-slate-800">{r.title}{r.eyfs_areas && r.eyfs_areas.length > 0 && <span className="ml-2 text-xs text-slate-400">{r.eyfs_areas.join(", ")}</span>}</span>
                      <span className="text-xs text-slate-400">{fmtDate(r.date)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          )}
        </>
      ) : form && (
        <div className="card grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <Field label="First name"><input value={form.first_name} onChange={(e) => setField({ first_name: e.target.value })} className="inp" /></Field>
          <Field label="Last name"><input value={form.last_name} onChange={(e) => setField({ last_name: e.target.value })} className="inp" /></Field>
          <Field label="Date of birth"><input type="date" max={new Date().toISOString().slice(0, 10)} value={form.dob} onChange={(e) => setField({ dob: e.target.value })} className="inp" /></Field>
          <Field label="Gender">
            <select value={form.gender} onChange={(e) => setField({ gender: e.target.value })} className="inp bg-white">
              <option value="">—</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
            </select>
          </Field>
          <Field label="Branch">
            <select value={form.branch_slug} onChange={(e) => setField({ branch_slug: e.target.value })} className="inp bg-white">
              {branches.map((b) => <option key={b.slug} value={b.slug}>{branchShortName(b)}</option>)}
            </select>
          </Field>
          {/* Room is managed by the Room Placement panel (transfer + history),
              not this edit form — a single authoritative writer per the design. */}
          <Field label="Status">
            <select value={form.status} onChange={(e) => setField({ status: e.target.value as ChildInput["status"] })} className="inp bg-white">
              <option value="active">Active</option><option value="waitlist">Waitlist</option><option value="left">Left</option>
            </select>
          </Field>
          <Field label="Funding">
            <select value={form.funding_type} onChange={(e) => setField({ funding_type: e.target.value })} className="inp bg-white">
              <option value="none">Private (none)</option><option value="15h">15 hours</option><option value="30h">30 hours</option>
            </select>
          </Field>
          <Field label="Start date"><input type="date" value={form.start_date} onChange={(e) => setField({ start_date: e.target.value })} className="inp" /></Field>
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-500">Allergies</label>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {allergyTerms.map((t) => {
                const on = (form.allergy_tags ?? []).includes(t.code);
                return <button type="button" key={t.id} onClick={() => toggleTag("allergy_tags", t.code)} className={`rounded-full px-2.5 py-1 text-xs font-medium ${on ? "bg-red-100 text-red-700" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{t.label}</button>;
              })}
            </div>
            <input value={form.allergies} onChange={(e) => setField({ allergies: e.target.value })} className="inp" placeholder="Additional allergy notes…" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-500">Dietary requirements</label>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {dietaryTerms.map((t) => {
                const on = (form.dietary_tags ?? []).includes(t.code);
                return <button type="button" key={t.id} onClick={() => toggleTag("dietary_tags", t.code)} className={`rounded-full px-2.5 py-1 text-xs font-medium ${on ? "bg-amber-100 text-amber-700" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{t.label}</button>;
              })}
            </div>
            <input value={form.dietary_reqs} onChange={(e) => setField({ dietary_reqs: e.target.value })} className="inp" placeholder="Additional dietary notes…" />
          </div>
          <div className="sm:col-span-2"><Field label="Medical notes"><textarea value={form.medical_notes} onChange={(e) => setField({ medical_notes: e.target.value })} rows={2} className="inp" /></Field></div>

          <div className="sm:col-span-2">
            <label className="mb-2 block text-xs uppercase tracking-wider text-slate-400">Weekly sessions</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
              {WEEKDAYS.map((day) => (
                <label key={day} className="text-sm">
                  <span className="mb-1 block text-xs font-medium text-slate-500">{day}</span>
                  <select value={sessionFor(day)} onChange={(e) => setSession(day, e.target.value)} className="inp bg-white">
                    {sessionTypeOptions.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </div>

          {/* Guardians are managed by the Parents & Guardians panel (canonical
              child-parent relationships) — not this edit form. */}
        </div>
      )}

      {pickingKeyPerson && (
        <PickerModal
          title="Assign key person"
          subtitle={`Active staff at ${branchName.get(child.branch_slug) ?? child.branch_slug}.`}
          options={branchStaff.map((s) => ({
            id: s.id,
            label: `${s.first_name} ${s.last_name}`,
            detail: s.job_title || undefined,
            badge: s.id === child.key_person_id ? "current" : undefined,
            badgeTone: "teal" as const,
          }))}
          selectedId={child.key_person_id}
          onSelect={(id) => { void assignKeyPerson(id); }}
          onClose={() => setPickingKeyPerson(false)}
          emptyText="No active staff found at this branch."
        >
          {child.key_person_id && (
            <div className="mt-3 flex justify-start">
              <button type="button" onClick={() => assignKeyPerson("")} className="text-sm font-medium text-red-500 hover:underline">Clear key person</button>
            </div>
          )}
        </PickerModal>
      )}

      {archiving && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="mb-1 text-lg font-bold text-slate-900">Mark {child.first_name} as left</h2>
            <p className="mb-4 text-sm text-slate-500">
              Sets the status to <strong>Left</strong> and ends any live room placement so the space frees up.
              Nothing is deleted — the profile, history and daily records stay, and the status can be set back
              to Active from Edit if needed.
            </p>
            <label className="mb-4 block text-sm">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">Leaving date</span>
              <input type="date" value={leaveDateDraft} onChange={(e) => setLeaveDateDraft(e.target.value)} className="inp" />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setArchiving(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={archive} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700">
                <Archive className="h-4 w-4" /> Mark as left
              </button>
            </div>
          </div>
        </div>
      )}

      {showLog && child && (
        <DailyLogForm
          child={{ id: child.id, name: `${child.first_name} ${child.last_name}`, branch_slug: child.branch_slug }}
          onClose={() => setShowLog(false)}
          onSaved={() => { setShowLog(false); void load(); }}
        />
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

// The ONE allergies/dietary/medical rendering — shown on the Overview card
// (safety at a glance) and the Health tab, from a single implementation.
function AllergiesDietary({ child, allergyTerms, dietaryTerms }: {
  child: Child;
  allergyTerms: { code: string; label: string }[];
  dietaryTerms: { code: string; label: string }[];
}) {
  return (
    <div className="space-y-3 text-sm">
      <div>
        <dt className="mb-1.5 text-xs uppercase tracking-wider text-slate-400">Allergies</dt>
        {(child.allergy_tags ?? []).length === 0 && !child.allergies ? (
          <p className="text-slate-400">None recorded</p>
        ) : (
          <>
            {(child.allergy_tags ?? []).length > 0 && (
              <div className="mb-1.5 flex flex-wrap gap-1.5">
                {(child.allergy_tags ?? []).map((code) => (
                  <span key={code} className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                    {allergyTerms.find((t) => t.code === code)?.label ?? code}
                  </span>
                ))}
              </div>
            )}
            {child.allergies && <p className="text-slate-800">{child.allergies}</p>}
          </>
        )}
      </div>
      <div>
        <dt className="mb-1.5 text-xs uppercase tracking-wider text-slate-400">Dietary</dt>
        {(child.dietary_tags ?? []).length === 0 && !child.dietary_reqs ? (
          <p className="text-slate-400">None recorded</p>
        ) : (
          <>
            {(child.dietary_tags ?? []).length > 0 && (
              <div className="mb-1.5 flex flex-wrap gap-1.5">
                {(child.dietary_tags ?? []).map((code) => (
                  <span key={code} className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                    {dietaryTerms.find((t) => t.code === code)?.label ?? code}
                  </span>
                ))}
              </div>
            )}
            {child.dietary_reqs && <p className="text-slate-800">{child.dietary_reqs}</p>}
          </>
        )}
      </div>
      <Item label="Medical" value={child.medical_notes || "None recorded"} />
    </div>
  );
}
