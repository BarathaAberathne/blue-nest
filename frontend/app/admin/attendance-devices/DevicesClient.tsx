"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Monitor, Plus, Power, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { branchShortName } from "@/lib/branch";
import type { Branch, KioskDevice } from "@/types";

export default function DevicesClient() {
  const [devices, setDevices] = useState<KioskDevice[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [branch, setBranch] = useState("");
  const [creating, setCreating] = useState(false);
  // The plaintext token is shown ONCE right after creation.
  const [issued, setIssued] = useState<{ name: string; token: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated."); setLoading(false); return; }
    try {
      const [d, b] = await Promise.all([api.adminListKioskDevices(token), api.adminGetBranches(token)]);
      setDevices(d ?? []);
      setBranches((b ?? []).filter((x) => !x.archived_at));
      if (!branch && b?.length) setBranch(b[0].slug);
    } catch { setError("Failed to load devices."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const create = async () => {
    const token = getAccessToken();
    if (!token || !name.trim() || !branch) return;
    setCreating(true); setError(null);
    try {
      const res = await api.adminCreateKioskDevice(token, { name: name.trim(), branch_slug: branch });
      setIssued({ name: res.device.name, token: res.token });
      setCopied(false);
      setName("");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to create device"); }
    finally { setCreating(false); }
  };

  const toggle = async (d: KioskDevice) => {
    const token = getAccessToken();
    if (!token) return;
    await api.adminSetKioskDeviceActive(token, d.id, !d.active).catch(() => {});
    await load();
  };

  const remove = async (d: KioskDevice) => {
    const token = getAccessToken();
    if (!token || !window.confirm(`Remove kiosk “${d.name}”? The tablet using it will need re-pairing.`)) return;
    await api.adminDeleteKioskDevice(token, d.id).catch(() => {});
    await load();
  };

  const copy = async () => {
    if (!issued) return;
    try { await navigator.clipboard.writeText(issued.token); setCopied(true); } catch { /* noop */ }
  };

  const branchLabel = (slug: string) => branches.find((b) => b.slug === slug)?.name ? branchShortName({ slug, name: branches.find((b) => b.slug === slug)!.name }) : slug;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-slate-900">Attendance devices</h1>
        <p className="text-sm text-slate-500">Register the entrance tablets that run the clock-in kiosk. Each device gets a one-time code you enter on the tablet at <span className="font-mono text-xs">/kiosk</span> to pair it to its branch.</p>
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      {/* New device */}
      <div className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900"><Plus className="h-4 w-4 text-teal-600" /> Register a device</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="mb-1 block text-xs font-medium text-slate-600">Device name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Harrow front entrance" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div className="min-w-[180px]">
            <label className="mb-1 block text-xs font-medium text-slate-600">Branch</label>
            <select value={branch} onChange={(e) => setBranch(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {branches.map((b) => <option key={b.slug} value={b.slug}>{branchShortName(b)}</option>)}
            </select>
          </div>
          <button type="button" onClick={create} disabled={creating || !name.trim() || !branch} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">{creating ? "Creating…" : "Create device"}</button>
        </div>
      </div>

      {/* Token reveal (once) */}
      {issued && (
        <div className="rounded-xl border-2 border-teal-300 bg-teal-50 p-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold text-teal-900">Device code for “{issued.name}”</h3>
            <button onClick={() => setIssued(null)} className="rounded p-1 text-teal-700 hover:bg-teal-100"><X className="h-4 w-4" /></button>
          </div>
          <p className="mb-3 text-sm text-teal-800">Copy this now — it&apos;s shown <b>once</b>. Enter it on the tablet at <span className="font-mono">/kiosk</span> to pair. If lost, delete the device and create a new one.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 select-all rounded-lg border border-teal-200 bg-white px-4 py-3 font-mono text-sm text-slate-900">{issued.token}</code>
            <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-3 text-sm font-medium text-white hover:bg-teal-700">
              {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
            </button>
          </div>
        </div>
      )}

      {/* Device list */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>{["Device", "Branch", "Code", "Last seen", "Status", ""].map((h) => <th key={h} className="px-4 py-2.5 text-left font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
            ) : devices.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400"><Monitor className="mx-auto mb-2 h-6 w-6" />No devices yet. Register one above.</td></tr>
            ) : devices.map((d) => (
              <tr key={d.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-900">{d.name}</td>
                <td className="px-4 py-3 text-slate-600">{branchLabel(d.branch_slug)}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-400">…{d.token_hint}</td>
                <td className="px-4 py-3 text-slate-500">{d.last_seen_at ? new Date(d.last_seen_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${d.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{d.active ? "Active" : "Disabled"}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => toggle(d)} title={d.active ? "Disable" : "Enable"} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Power className="h-4 w-4" /></button>
                    <button onClick={() => remove(d)} title="Remove" className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
