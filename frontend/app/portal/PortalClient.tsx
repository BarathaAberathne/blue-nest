"use client";

// Parent Portal dashboard — the family-facing surface (family onboarding
// Phase 3 shell; induction, finance and profile-completeness sections attach
// here in later phases). Own lightweight shell (like the kiosk, deliberately
// outside AdminLayout); data comes exclusively from the /portal endpoints,
// which re-scope every request server-side.

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Baby, Banknote, CalendarDays, DoorOpen, LogOut, UtensilsCrossed } from "lucide-react";
import { api } from "@/lib/api";
import type { FamilyView, OnboardingView } from "@/types";
import { clearAuthSession, getAccessToken, getAuthUser } from "@/lib/auth";
import { ageLabel, fmtDate, fundingLabel } from "@/lib/child";
import { formatPence, mandateStatusLabel } from "@/lib/finance";
import type { Child } from "@/types";

export default function PortalClient() {
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [onboarding, setOnboarding] = useState<Map<string, OnboardingView>>(new Map());
  const [firstName, setFirstName] = useState("");
  const [finance, setFinance] = useState<FamilyView | null>(null);
  const [ddBusy, setDdBusy] = useState(false);
  const [ddNotice, setDdNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { router.replace("/login?next=%2Fportal"); return; }
    setFirstName(getAuthUser()?.first_name ?? "");
    api.portalGetChildren(token)
      .then(async (kids) => {
        setChildren(kids ?? []);
        setError(null);
        const views = await Promise.all((kids ?? []).map((k) => api.portalGetOnboarding(token, k.id).catch(() => null)));
        setOnboarding(new Map(views.filter(Boolean).map((v) => [(v as OnboardingView).child_id, v as OnboardingView])));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "We could not load your family right now."))
      .finally(() => setLoading(false));
    api.portalGetFinance(token)
      .then((v) => { if (v && "charges" in v) setFinance(v as FamilyView); })
      .catch(() => null);
    const dd = new URLSearchParams(window.location.search).get("dd");
    if (dd === "success") setDdNotice("Thank you — your Direct Debit is being set up. It becomes active once the bank confirms the mandate.");
    if (dd === "cancelled") setDdNotice("Direct Debit setup was cancelled. You can restart it below whenever you are ready.");
  }, [router]);

  const startDirectDebit = async () => {
    const token = getAccessToken();
    if (!token) return;
    setDdBusy(true);
    try {
      const { setup_url } = await api.portalSetupDirectDebit(token);
      window.location.href = setup_url;
    } catch (e) {
      setDdNotice(e instanceof Error ? e.message : "We could not start Direct Debit setup — please contact the nursery.");
      setDdBusy(false);
    }
  };

  const signOut = () => { clearAuthSession(); router.replace("/login"); };

  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/portal" className="flex items-center gap-3">
            <Image src="/logo/bluenest-logo.png" alt="Blue Nest Montessori" width={110} height={60} style={{ width: 110, height: "auto" }} />
            <span className="hidden text-xs font-bold uppercase tracking-[0.2em] text-slate-400 sm:block">Parent Portal</span>
          </Link>
          <button type="button" onClick={signOut} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="font-heading text-2xl font-bold text-slate-900">Welcome{firstName ? `, ${firstName}` : ""}</h1>
        <p className="mt-1 text-sm text-slate-500">Your children at Blue Nest Montessori.</p>

        {loading ? (
          <p className="mt-8 text-slate-400">Loading…</p>
        ) : error ? (
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            {error} If you believe this is a mistake, please contact the nursery.
          </div>
        ) : children.length === 0 ? (
          <p className="mt-8 text-slate-400">No children are linked to your account yet — please contact the nursery.</p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {children.map((c) => (
              <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-50 text-teal-600"><Baby className="h-5 w-5" /></span>
                  <div>
                    <h2 className="font-heading text-lg font-bold text-slate-900">{c.first_name} {c.last_name}</h2>
                    <p className="text-xs text-slate-500">{ageLabel(c.dob)}{c.room_name ? ` · ${c.room_name}` : ""}</p>
                  </div>
                </div>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600"><CalendarDays className="h-4 w-4 text-slate-400" /> Starts {fmtDate(c.start_date)}</div>
                  <div className="flex items-center gap-2 text-slate-600"><DoorOpen className="h-4 w-4 text-slate-400" /> {c.room_name || "Room to be confirmed"}</div>
                  <div className="flex items-center gap-2 text-slate-600"><UtensilsCrossed className="h-4 w-4 text-slate-400" /> Funding: {fundingLabel(c.funding_type)}</div>
                </dl>
                {onboarding.get(c.id) && (
                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Profile completion</span>
                      <span className="font-semibold text-slate-700">{onboarding.get(c.id)!.percent}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-teal-500" style={{ width: `${onboarding.get(c.id)!.percent}%` }} />
                    </div>
                    {(() => {
                      const missing = onboarding.get(c.id)!.categories.flatMap((cat) => cat.missing ?? []).slice(0, 3);
                      return missing.length > 0 ? (
                        <ul className="mt-2 space-y-0.5 text-xs text-slate-500">
                          {missing.map((m) => <li key={m}>• {m}</li>)}
                        </ul>
                      ) : null;
                    })()}
                    <Link href={`/portal/children/${c.id}/induction`} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">
                      {onboarding.get(c.id)!.induction_status === "reviewed" ? "View induction" : "Complete profile"}
                    </Link>
                  </div>
                )}
                {(c.allergy_tags?.length || c.dietary_tags?.length) ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(c.allergy_tags ?? []).map((t) => <span key={t} className="rounded-full bg-red-100 px-2 py-0.5 text-[0.65rem] font-semibold text-red-700">{t}</span>)}
                    {(c.dietary_tags ?? []).map((t) => <span key={t} className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-700">{t}</span>)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {finance?.family && (
          <section className="mt-8">
            <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-slate-900"><Banknote className="h-5 w-5 text-teal-600" /> Fees &amp; payments</h2>
            {ddNotice && <p className="mt-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">{ddNotice}</p>}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Outstanding balance</p>
                <p className={`mt-1 text-2xl font-bold ${finance.family.balance_pence > 0 ? "text-slate-900" : "text-green-700"}`}>{formatPence(finance.family.balance_pence)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Next payment</p>
                {finance.next_payment ? (
                  <>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{formatPence(finance.next_payment.amount_pence - (finance.next_payment.paid_pence ?? 0))}</p>
                    <p className="text-xs text-slate-500">due {fmtDate(finance.next_payment.due_date)} · {finance.next_payment.description}</p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-slate-500">Nothing due — you are all settled.</p>
                )}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Direct Debit</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{mandateStatusLabel[finance.family.mandate_status] ?? finance.family.mandate_status}</p>
                {finance.family.mandate_status !== "active" && (
                  <button
                    type="button"
                    onClick={() => void startDirectDebit()}
                    disabled={ddBusy}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {ddBusy ? "Redirecting…" : "Set up Direct Debit"}
                  </button>
                )}
              </div>
            </div>

            {finance.payments.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-400">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finance.payments.slice(0, 8).map((p) => (
                      <tr key={p.id} className="border-b border-slate-50">
                        <td className="px-4 py-2.5 text-slate-500">{fmtDate(p.created_at?.slice(0, 10))}</td>
                        <td className="px-4 py-2.5 text-slate-600">{p.method === "bacs_debit" ? "Direct Debit" : p.method === "manual" ? "Bank / cash" : p.method}</td>
                        <td className="px-4 py-2.5 text-slate-600">{p.status}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{formatPence(p.amount_pence)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
