"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Lock } from "lucide-react";
import { api } from "@/lib/api";

export default function ActivateClient() {
  const params = useSearchParams();
  const parentId = params.get("parent") ?? "";
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Your password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("The passwords do not match."); return; }
    setBusy(true); setError(null);
    try {
      await api.portalActivate(parentId, token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Activation failed — the link may have expired.");
    } finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f8fb] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
        <div className="mb-6 text-center">
          <Image src="/logo/bluenest-logo.png" alt="Blue Nest Montessori" width={140} height={76} className="mx-auto" style={{ width: 140, height: "auto" }} />
          <h1 className="mt-4 font-heading text-xl font-bold text-slate-900">Activate your parent account</h1>
          <p className="mt-1 text-sm text-slate-500">Set a password to access the Blue Nest parent portal.</p>
        </div>

        {done ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-teal-600" />
            <p className="mt-3 text-sm text-slate-600">Your account is active. Sign in with your email and new password.</p>
            <Link href="/login?next=%2Fportal" className="mt-4 inline-block rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700">
              Go to sign in
            </Link>
          </div>
        ) : !parentId || !token ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            This activation link is incomplete. Please use the link from your invitation email, or ask the nursery to send a new one.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">New password</span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm" />
              </div>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Confirm password</span>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
            </label>
            <button type="submit" disabled={busy} className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
              {busy ? "Activating…" : "Activate account"}
            </button>
            <p className="text-center text-xs text-slate-400">The link is single-use and expires 14 days after it was sent.</p>
          </form>
        )}
      </div>
    </div>
  );
}
