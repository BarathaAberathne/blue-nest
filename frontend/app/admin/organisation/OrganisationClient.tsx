"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Check, Palette, Save, Settings, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken, getAuthUser } from "@/lib/auth";
import type { Organisation, OrgProfileInput } from "@/types";

// Feature flags the org can toggle (Phase T1 seed set; modules read these).
const FEATURES: { key: string; label: string; desc: string }[] = [
  { key: "ai_assistant", label: "AI assistant", desc: "Conversational AI across the CMS (Phase A0)." },
  { key: "command_centre", label: "Command Centre", desc: "Executive mission-control dashboard." },
  { key: "procurement", label: "Procurement", desc: "Supply requests, purchase orders, suppliers." },
  { key: "online_store", label: "Online store", desc: "Public storefront + Stripe checkout." },
];

export default function OrganisationClient() {
  const [org, setOrg] = useState<Organisation | null>(null);
  const [form, setForm] = useState<OrgProfileInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canEdit = getAuthUser()?.role === "super_admin";

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated."); setLoading(false); return; }
    api.adminGetOrganisation(token)
      .then((o) => {
        setOrg(o);
        setForm({ name: o.name, branding: { ...o.branding }, settings: { ...o.settings, features: o.settings.features ?? [] } });
      })
      .catch(() => setError("Failed to load organisation."))
      .finally(() => setLoading(false));
  }, []);

  const features = useMemo(() => new Set(form?.settings.features ?? []), [form]);
  const toggleFeature = (key: string) => setForm((f) => {
    if (!f) return f;
    const set = new Set(f.settings.features ?? []);
    if (set.has(key)) set.delete(key); else set.add(key);
    return { ...f, settings: { ...f.settings, features: [...set] } };
  });

  const save = async () => {
    const token = getAccessToken();
    if (!token || !form) return;
    setSaving(true); setMsg(null); setError(null);
    try {
      const updated = await api.adminUpdateOrganisation(token, form);
      setOrg(updated);
      setMsg("Organisation saved.");
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to save"); }
    finally { setSaving(false); }
  };

  if (loading) return <p className="text-slate-400">Loading…</p>;
  if (!org || !form) return <p className="text-red-500">{error ?? "Organisation not found."}</p>;

  const primary = form.branding.primary_color || "#0f9d8c";

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-slate-900"><Building2 className="h-6 w-6 text-teal-600" /> Organisation</h1>
          <p className="text-sm text-slate-500">Your nursery group&apos;s profile, branding and enabled features. <span className="font-mono text-xs text-slate-400">{org.slug}</span></p>
        </div>
        {canEdit && (
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
          </button>
        )}
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}
      {msg && <p className="mb-4 inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600"><Check className="h-4 w-4" /> {msg}</p>}
      {!canEdit && <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">Read-only — only your organisation&apos;s super admin can edit these settings.</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile + branding */}
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-400"><Building2 className="h-4 w-4" /> Profile</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Organisation name">
                <input value={form.name} disabled={!canEdit} onChange={(e) => setForm({ ...form, name: e.target.value })} className="inp" />
              </Field>
              <Field label="Plan"><input value={org.plan || "—"} disabled className="inp bg-slate-50 text-slate-500" /></Field>
              <Field label="Timezone">
                <input value={form.settings.timezone ?? ""} disabled={!canEdit} onChange={(e) => setForm({ ...form, settings: { ...form.settings, timezone: e.target.value } })} placeholder="Europe/London" className="inp" />
              </Field>
              <Field label="Currency">
                <input value={form.settings.currency ?? ""} disabled={!canEdit} onChange={(e) => setForm({ ...form, settings: { ...form.settings, currency: e.target.value } })} placeholder="GBP" className="inp" />
              </Field>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-400"><Palette className="h-4 w-4" /> Branding</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Logo URL">
                <input value={form.branding.logo_url ?? ""} disabled={!canEdit} onChange={(e) => setForm({ ...form, branding: { ...form.branding, logo_url: e.target.value } })} placeholder="/logo/…png" className="inp" />
              </Field>
              <ColorField label="Primary colour" value={form.branding.primary_color ?? ""} disabled={!canEdit} onChange={(v) => setForm({ ...form, branding: { ...form.branding, primary_color: v } })} />
              <ColorField label="Accent colour" value={form.branding.accent_color ?? ""} disabled={!canEdit} onChange={(v) => setForm({ ...form, branding: { ...form.branding, accent_color: v } })} />
            </div>
          </section>
        </div>

        {/* Features + preview */}
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-400"><Sparkles className="h-4 w-4" /> Features</h2>
            <div className="space-y-2">
              {FEATURES.map((f) => (
                <label key={f.key} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${features.has(f.key) ? "border-teal-200 bg-teal-50" : "border-slate-200 hover:bg-slate-50"} ${!canEdit ? "cursor-default opacity-90" : ""}`}>
                  <input type="checkbox" checked={features.has(f.key)} disabled={!canEdit} onChange={() => toggleFeature(f.key)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600" />
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">{f.label}</span>
                    <span className="block text-xs text-slate-500">{f.desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-400"><Settings className="h-4 w-4" /> Preview</h2>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
              <span className="grid h-11 w-11 flex-none place-items-center rounded-xl text-sm font-bold text-white" style={{ background: primary }}>
                {org.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="truncate font-bold text-slate-900">{form.name || "Organisation"}</div>
                <div className="text-xs text-slate-400">{[form.settings.timezone, form.settings.currency].filter(Boolean).join(" · ") || "no settings yet"}</div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <style jsx>{`:global(.inp) { width: 100%; border-radius: 0.5rem; border: 1px solid rgb(226 232 240); padding: 0.5rem 0.75rem; font-size: 0.875rem; }`}</style>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</label>
      {children}
    </div>
  );
}

function ColorField({ label, value, disabled, onChange }: { label: string; value: string; disabled?: boolean; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value || "#0f9d8c"} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="h-9 w-10 flex-none cursor-pointer rounded border border-slate-200 bg-white" />
        <input value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} placeholder="#0f9d8c" className="inp font-mono text-xs" />
      </div>
    </div>
  );
}
