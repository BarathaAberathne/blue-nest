"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import { useChatBot } from "./ChatBotContext";
import type { LeadFormData } from "@/types/chat";

const BRANCHES = ["Harrow", "Pinner", "Borehamwood", "Northwood (Coming Soon)"];
const AGES = [
  "Under 1 year",
  "1–2 years",
  "2–3 years",
  "3–4 years",
  "4–5 years",
];

const EMPTY: LeadFormData = {
  name: "",
  email: "",
  phone: "",
  childAge: "",
  branch: "",
  consent: false,
};

export default function ChatBotLeadForm() {
  const { closeLeadForm, submitLead } = useChatBot();
  const [form, setForm] = useState<LeadFormData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof LeadFormData>(key: K, value: LeadFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.branch || !form.childAge || !form.consent) {
      setError("Please fill in all required fields and accept the privacy notice.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await submitLead(form);
      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again or call us on +44 20 8861 5574.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-[rgba(90,74,66,0.15)] bg-white px-3.5 py-2.5 text-sm text-[var(--ink)] placeholder:text-[rgba(90,74,66,0.85)] focus:outline-none focus:ring-2 focus:ring-[#6ecfc9]/50 transition";

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 320 }}
      className="absolute inset-x-0 bottom-0 z-10 rounded-t-[1.8rem] bg-[var(--soft-white)] shadow-[0_-8px_32px_rgba(90,74,66,0.16)] border-t border-[rgba(90,74,66,0.06)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-[1.8rem] bg-[linear-gradient(135deg,#8ee2dc,#6ecfc9)] px-5 py-4">
        <div>
          <p className="font-heading text-xl leading-tight text-white">Book a Show Around</p>
          <p className="mt-0.5 text-xs text-white/85">Leave your details — we'll be in touch soon 😊</p>
        </div>
        <button
          type="button"
          onClick={closeLeadForm}
          aria-label="Close enquiry form"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/35"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {success ? (
        <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
          <CheckCircle2 className="h-10 w-10 text-[#6ecfc9]" />
          <p className="font-heading text-2xl text-[var(--ink)]">All done!</p>
          <p className="text-sm text-[var(--muted)]">Our team will be in touch very soon. We can&apos;t wait to meet your family! 🌿</p>
          <button
            type="button"
            onClick={closeLeadForm}
            className="mt-2 rounded-full bg-[#6ecfc9] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#5bbfb8]"
          >
            Continue browsing
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 overflow-y-auto px-5 pb-5 pt-4 max-h-[60vh]">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                Your name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Sarah Ahmed"
                className={inputCls}
                autoComplete="name"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="your@email.com"
                className={inputCls}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                Phone
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+44 ..."
                className={inputCls}
                autoComplete="tel"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                Child&apos;s age <span className="text-red-400">*</span>
              </label>
              <select
                value={form.childAge}
                onChange={(e) => set("childAge", e.target.value)}
                className={inputCls}
              >
                <option value="">Select age</option>
                {AGES.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                Branch <span className="text-red-400">*</span>
              </label>
              <select
                value={form.branch}
                onChange={(e) => set("branch", e.target.value)}
                className={inputCls}
              >
                <option value="">Select branch</option>
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}

          <label className="flex cursor-pointer items-start gap-2.5 text-xs text-[var(--muted)]">
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(e) => set("consent", e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-[rgba(90,74,66,0.3)] accent-[#6ecfc9]"
            />
            <span>
              I consent to Blue Nest Montessori storing my details to respond to this enquiry, in line with their{" "}
              <a href="/privacy" className="underline text-[#4aa7a2]" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </a>
              . <span className="text-red-400">*</span>
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-[#6ecfc9] py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(110,207,201,0.4)] transition hover:bg-[#5bbfb8] disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              "Send Enquiry 🌿"
            )}
          </button>
        </form>
      )}
    </motion.div>
  );
}
