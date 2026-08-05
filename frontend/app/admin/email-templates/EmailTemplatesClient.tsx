"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, RotateCcw, Save } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { EmailTemplate } from "@/types";

export default function EmailTemplatesClient() {
  const token = typeof window !== "undefined" ? getAccessToken() : "";
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const current = templates.find((t) => t.key === selected);

  const pick = useCallback((t: EmailTemplate) => {
    setSelected(t.key); setSubject(t.subject); setBody(t.body); setMsg(null);
  }, []);

  const load = useCallback(async () => {
    if (!token) { setError("Not authenticated."); setLoading(false); return; }
    try {
      const items = await api.adminGetEmailTemplates(token);
      setTemplates(items ?? []);
      if (items && items.length && !selected) pick(items[0]);
      setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load templates"); }
    finally { setLoading(false); }
  }, [token, selected, pick]);
  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!token || !current) return;
    setSaving(true); setError(null); setMsg(null);
    try {
      await api.adminUpdateEmailTemplate(token, current.key, { subject, body });
      setMsg("Saved. New enquiries will use this copy.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to save"); }
    finally { setSaving(false); }
  };

  const revert = async () => {
    if (!token || !current || !confirm("Revert to the built-in default copy?")) return;
    setSaving(true); setError(null); setMsg(null);
    try {
      await api.adminDeleteEmailTemplate(token, current.key);
      const items = await api.adminGetEmailTemplates(token);
      setTemplates(items ?? []);
      const fresh = (items ?? []).find((t) => t.key === current.key);
      if (fresh) pick(fresh);
      setMsg("Reverted to the default copy.");
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to revert"); }
    finally { setSaving(false); }
  };

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;

  return (
    <>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-slate-900">Email templates</h1>
        <p className="text-sm text-slate-500">Customise transactional email copy. Until you edit one, the built-in default is used. Your message is wrapped in the branded Blue Nest email.</p>
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}
      {msg && <p className="mb-4 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-700">{msg}</p>}

      <div className="mb-4 flex flex-wrap gap-2">
        {templates.map((t) => (
          <button key={t.key} onClick={() => pick(t)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${selected === t.key ? "bg-teal-600 text-white" : "border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
            <Mail className="h-3.5 w-3.5" /> {t.label}
            {t.customized && <span className={`rounded-full px-1.5 py-0.5 text-[0.6rem] font-semibold ${selected === t.key ? "bg-white/25" : "bg-violet-100 text-violet-700"}`}>custom</span>}
          </button>
        ))}
      </div>

      {current && (
        <div className="max-w-2xl space-y-4">
          <p className="text-sm text-slate-500">{current.description}</p>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            Available variables: {current.variables.map((v) => <code key={v} className="mx-0.5 rounded bg-white px-1.5 py-0.5 font-mono text-teal-700">{`{{${v}}}`}</code>)}
          </div>
          <label className="block text-sm"><span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Subject</span>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
          <label className="block text-sm"><span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Body</span>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm" />
            <span className="mt-1 block text-xs text-slate-400">Blank line = new paragraph. Placeholders like {`{{name}}`} are filled in per enquiry.</span></label>
          <div className="flex items-center justify-between">
            <button onClick={revert} disabled={saving || !current.customized} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-rose-600 disabled:opacity-40"><RotateCcw className="h-4 w-4" /> Revert to default</button>
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"><Save className="h-4 w-4" /> {saving ? "Saving…" : "Save template"}</button>
          </div>
        </div>
      )}
    </>
  );
}
