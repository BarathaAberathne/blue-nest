"use client";

// Parent induction wizard: one section per step (save & continue — parents
// can leave and return, the induction resumes where they left off), then a
// consents signing step, then submit for the nursery's review.

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Banknote, CheckCircle2, Send } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken, getAuthUser } from "@/lib/auth";
import { sectionMissing } from "@/lib/induction";
import InductionSectionForm from "@/components/induction/InductionSectionForm";
import type { ConsentsBundle, FamilyView, InductionBundle } from "@/types";

export default function InductionWizardClient({ childId }: { childId: string }) {
  const router = useRouter();
  const [bundle, setBundle] = useState<InductionBundle | null>(null);
  const [consents, setConsents] = useState<ConsentsBundle | null>(null);
  const [step, setStep] = useState(0); // section index; sections.length = consents; +1 = review/submit
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [signature, setSignature] = useState("");
  const [finance, setFinance] = useState<FamilyView | null>(null);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) { router.replace("/login?next=%2Fportal"); return; }
    try {
      const [b, c] = await Promise.all([api.portalGetInduction(token, childId), api.portalGetConsents(token, childId)]);
      setBundle(b);
      setConsents(c);
      setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load the induction."); }
    // Direct Debit state (best-effort) — setting it up is part of completing
    // the child's profile, so the wizard surfaces it as a real step.
    api.portalGetFinance(token).then((v) => { if (v && "family" in (v as object)) setFinance(v as FamilyView); }).catch(() => null);
  }, [childId, router]);
  useEffect(() => { void load(); }, [load]);

  // Parents never see the safeguarding-sensitive S8 section (manager-only) or
  // the equality section marked optional-for-monitoring? Equality stays (it is
  // addressed to parents); legal_contact is completed with the nursery.
  const sections = useMemo(() => (bundle?.sections ?? []).filter((s) => s.key !== "legal_contact"), [bundle]);
  const current = sections[step];
  const isConsentStep = step === sections.length;
  const isSubmitStep = step === sections.length + 1;

  useEffect(() => {
    if (!current || !bundle) return;
    setDraft(bundle.induction.sections?.[current.key]?.data ?? {});
  }, [current, bundle]);

  const saveSection = async (goNext: boolean) => {
    const token = getAccessToken();
    if (!token || !current || busy) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      // A section is complete ONLY when its required answers are actually
      // filled in (sectionMissing) — clicking Next on an untouched section
      // saves progress but never marks it complete, and Submit stays blocked
      // until every required section genuinely is.
      const missing = sectionMissing(current.key, draft);
      await api.portalSaveInductionSection(token, childId, current.key, { data: draft, complete: missing.length === 0 });
      await load();
      if (missing.length > 0) {
        setNotice(`Saved as in progress — still needed before this section is complete: ${missing.join(" · ")}`);
      }
      if (goNext) setStep((s) => s + 1);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save — please try again."); }
    finally { setBusy(false); }
  };

  const sign = async (key: string, granted: boolean) => {
    const token = getAccessToken();
    if (!token || busy) return;
    const name = signature.trim() || `${getAuthUser()?.first_name ?? ""} ${getAuthUser()?.last_name ?? ""}`.trim();
    if (!name) { setError("Please type your full name as your signature first."); return; }
    setBusy(true); setError(null);
    try {
      await api.portalRecordConsent(token, childId, { key, granted, signature_name: name });
      setConsents(await api.portalGetConsents(token, childId));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not record the consent."); }
    finally { setBusy(false); }
  };

  const submit = async () => {
    const token = getAccessToken();
    if (!token || busy) return;
    setBusy(true); setError(null);
    try {
      await api.portalSubmitInduction(token, childId);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Some sections are not complete yet."); }
    finally { setBusy(false); }
  };

  if (!bundle) return <div className="flex min-h-screen items-center justify-center bg-[#f6f8fb] text-slate-400">{error ?? "Loading…"}</div>;

  const ind = bundle.induction;
  const doneCount = sections.filter((s) => ind.sections?.[s.key]?.complete).length;
  const requiredSections = sections.filter((s) => s.required);
  const requiredDone = requiredSections.filter((s) => ind.sections?.[s.key]?.complete).length;

  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/portal" className="flex items-center gap-2 text-sm text-slate-500 hover:text-teal-600"><ArrowLeft className="h-4 w-4" /> Portal</Link>
          <Image src="/logo/bluenest-logo.png" alt="Blue Nest Montessori" width={100} height={54} style={{ width: 100, height: "auto" }} />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-heading text-2xl font-bold text-slate-900">Child induction</h1>
        <p className="mt-1 text-sm text-slate-500">
          {doneCount}/{sections.length} sections complete · save any time and come back later.
          {ind.status === "submitted" && " Submitted — the nursery is reviewing it."}
          {ind.status === "reviewed" && " Signed off by the nursery — thank you!"}
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {sections.map((s, i) => (
            <button key={s.key} type="button" onClick={() => setStep(i)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${i === step ? "bg-teal-600 text-white" : ind.sections?.[s.key]?.complete ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"}`}>
              {i + 1}. {s.label}{ind.sections?.[s.key]?.complete ? " ✓" : ""}
            </button>
          ))}
          <button type="button" onClick={() => setStep(sections.length)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${isConsentStep ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-500"}`}>
            Permissions
          </button>
          <button type="button" onClick={() => setStep(sections.length + 1)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${isSubmitStep ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-500"}`}>
            Review & submit
          </button>
        </div>

        {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
        {notice && <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{notice}</p>}

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {current && !isConsentStep && !isSubmitStep && (
            <>
              <h2 className="mb-4 font-heading text-lg font-bold text-slate-900">{current.label}</h2>
              <InductionSectionForm key={current.key} sectionKey={current.key} data={draft} onChange={setDraft} readOnly={ind.status === "reviewed"} />
              {ind.status !== "reviewed" && (
                <div className="mt-5 flex justify-between">
                  <button type="button" disabled={step === 0} onClick={() => setStep((s) => s - 1)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40">Back</button>
                  <button type="button" onClick={() => saveSection(true)} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
                    {busy ? "Saving…" : "Save & continue"} <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}

          {isConsentStep && consents && (
            <>
              <h2 className="mb-1 font-heading text-lg font-bold text-slate-900">Permissions & consents</h2>
              <p className="mb-4 text-sm text-slate-500">Type your full name once as your signature, then record each decision.</p>
              <input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Type your full name (signature)" className="mb-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <ul className="space-y-3">
                {consents.catalogue.map((def) => {
                  const cur = consents.latest[def.key];
                  return (
                    <li key={def.key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">{def.label}{def.required && <span className="ml-1 text-red-400">*</span>}</p>
                        {cur && <p className="text-xs text-slate-400">{cur.granted ? "Consented" : "Declined"} · signed {cur.signature_name}</p>}
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => sign(def.key, true)} disabled={busy} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${cur?.granted ? "bg-teal-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-white"}`}>I consent</button>
                        <button type="button" onClick={() => sign(def.key, false)} disabled={busy} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${cur && !cur.granted ? "bg-red-500 text-white" : "border border-slate-200 text-slate-600 hover:bg-white"}`}>I decline</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-5 flex justify-end">
                <button type="button" onClick={() => setStep((s) => s + 1)} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">Continue <ArrowRight className="h-4 w-4" /></button>
              </div>
            </>
          )}

          {isSubmitStep && (
            <>
              <h2 className="mb-1 font-heading text-lg font-bold text-slate-900">Review & submit</h2>
              {ind.status === "submitted" || ind.status === "reviewed" ? (
                <div className="mt-4 flex items-center gap-3 rounded-lg bg-teal-50 px-4 py-3 text-sm text-teal-800">
                  <CheckCircle2 className="h-5 w-5" /> {ind.status === "reviewed" ? "The nursery has signed off your induction. Thank you!" : "Submitted — the nursery will review it and be in touch."}
                </div>
              ) : (
                <>
                  <p className="mt-1 text-sm text-slate-500">
                    {requiredDone === requiredSections.length
                      ? "All required sections are complete — submit the induction for the nursery to review."
                      : `${requiredSections.length - requiredDone} required section(s) still need completing before you can submit.`}
                  </p>
                  <ul className="mt-3 space-y-1 text-sm">
                    {sections.map((s) => (
                      <li key={s.key} className={ind.sections?.[s.key]?.complete ? "text-teal-700" : "text-slate-400"}>
                        {ind.sections?.[s.key]?.complete ? "✓" : "○"} {s.label}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 flex justify-end">
                    <button type="button" onClick={submit} disabled={busy || requiredDone < requiredSections.length} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
                      <Send className="h-4 w-4" /> {busy ? "Submitting…" : "Submit induction"}
                    </button>
                  </div>
                </>
              )}

              {/* Direct Debit is part of completing the child's profile — the
                  nursery's onboarding gate holds the place at
                  finance_setup_required until the mandate is active and the
                  first payment is settled. */}
              {finance?.family && finance.family.mandate_status !== "active" ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="flex items-center gap-2 text-sm text-amber-800">
                    <Banknote className="h-4 w-4 shrink-0" /> One more step: set up your Direct Debit — the profile isn&apos;t complete until fees are in place.
                  </p>
                  <Link href="/portal/payments" className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">
                    Set up Direct Debit →
                  </Link>
                </div>
              ) : finance?.family ? (
                <p className="mt-4 flex items-center gap-2 rounded-lg bg-teal-50 px-4 py-3 text-sm text-teal-800">
                  <Banknote className="h-4 w-4" /> Direct Debit is set up — thank you.
                </p>
              ) : null}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
