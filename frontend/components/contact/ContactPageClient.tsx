"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import BranchMap from "./BranchMap";

// ── Branch data ────────────────────────────────────────────────────────────────

interface Branch {
  id:       string;
  name:     string;
  address:  string;
  postcode: string;
  phone:    string;
  tel:      string;
  hours:    string;
  ageRange: string;
  colour:   string;
  bg:       string;
  mapUrl:   string;
  status:   "active" | "coming-soon";
}

const BRANCHES: Branch[] = [
  {
    id:       "harrow",
    name:     "Harrow",
    address:  "29 Churchfield Close, Harrow",
    postcode: "HA2 6BD",
    phone:    "020 8861 5574",
    tel:      "tel:02088615574",
    hours:    "Mon–Fri, 07:30–18:30",
    ageRange: "3 months – 5 years",
    colour:   "#3aada9",
    bg:       "rgba(127,216,210,0.13)",
    mapUrl:   "https://www.google.com/maps/search/?api=1&query=29+Churchfield+Close+Harrow+HA2+6BD",
    status:   "active",
  },
  {
    id:       "pinner",
    name:     "Pinner",
    address:  "Pinner, London",
    postcode: "HA5",
    phone:    "020 8861 5574",
    tel:      "tel:02088615574",
    hours:    "Mon–Fri, 07:30–18:30",
    ageRange: "3 months – 5 years",
    colour:   "#cf7d9c",
    bg:       "rgba(244,170,200,0.13)",
    mapUrl:   "https://www.google.com/maps/search/?api=1&query=Pinner+HA5",
    status:   "active",
  },
  {
    id:       "borehamwood",
    name:     "Borehamwood",
    address:  "Borehamwood, Hertfordshire",
    postcode: "WD6",
    phone:    "020 8861 5574",
    tel:      "tel:02088615574",
    hours:    "Mon–Fri, 07:30–18:30",
    ageRange: "3 months – 5 years",
    colour:   "#5fc8c7",
    bg:       "rgba(127,216,210,0.13)",
    mapUrl:   "https://www.google.com/maps/search/?api=1&query=Borehamwood+WD6",
    status:   "active",
  },
  {
    id:       "northwood",
    name:     "Northwood",
    address:  "Northwood, London",
    postcode: "HA6",
    phone:    "020 8861 5574",
    tel:      "tel:02088615574",
    hours:    "Opening soon",
    ageRange: "3 months – 5 years",
    colour:   "#c49a00",
    bg:       "rgba(247,215,116,0.16)",
    mapUrl:   "https://www.google.com/maps/search/?api=1&query=Northwood+HA6",
    status:   "coming-soon",
  },
];

const ENQUIRY_TYPES = [
  "Arrange a visit",
  "Fees and availability",
  "Application form",
  "General enquiry",
];

const CHILD_AGES = [
  "Under 1 year",
  "1 year",
  "2 years",
  "3 years",
  "4 years",
  "5 years",
];

// ── Form ───────────────────────────────────────────────────────────────────────

interface FormValues {
  name:        string;
  email:       string;
  phone:       string;
  branch:      string;
  childAge:    string;
  enquiryType: string;
  message:     string;
  consent:     boolean;
}

const EMPTY_FORM: FormValues = {
  name: "", email: "", phone: "", branch: "",
  childAge: "", enquiryType: "", message: "", consent: false,
};

function validate(f: FormValues): Record<string, string> {
  const e: Record<string, string> = {};
  if (!f.name.trim())  e.name = "Please enter your name.";
  if (!f.email.trim()) e.email = "Please enter your email address.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))
    e.email = "Please enter a valid email address.";
  if (!f.branch)       e.branch = "Please select a preferred branch.";
  if (!f.enquiryType)  e.enquiryType = "Please select an enquiry type.";
  if (!f.consent)      e.consent = "Please tick the box to continue.";
  return e;
}

// ── Input style constants ──────────────────────────────────────────────────────

const INPUT_BASE =
  "w-full rounded-full border bg-[#fdfaf7] px-4 py-2.5 text-[0.85rem] text-[var(--ink)] placeholder:text-[rgba(90,74,66,0.32)] outline-none transition-all duration-150 focus:ring-2";
const INPUT_NORMAL  = "border-[rgba(90,74,66,0.14)] focus:border-[#7fd8d2] focus:ring-[rgba(127,216,210,0.22)]";
const INPUT_ERROR   = "border-[#ef8cab] focus:border-[#ef8cab] focus:ring-[rgba(239,140,171,0.18)]";
const SELECT_BASE   = INPUT_BASE + " appearance-none cursor-pointer pr-9";
const TEXTAREA_BASE =
  "w-full rounded-2xl border bg-[#fdfaf7] px-4 py-2.5 text-[0.85rem] text-[var(--ink)] placeholder:text-[rgba(90,74,66,0.32)] outline-none transition-all duration-150 focus:ring-2 resize-none";

function FieldLabel({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-[0.73rem] font-bold text-[rgba(90,74,66,0.65)]">
      {children}
      {required && <span className="ml-0.5 text-[#ef8cab]" aria-hidden="true">*</span>}
    </label>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-[0.68rem] font-semibold text-[#c45820]">
      {message}
    </p>
  );
}

function SuccessMessage({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[1.6rem] bg-white px-8 py-14 text-center shadow-[0_4px_16px_rgba(90,74,66,0.08)]">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(142,203,155,0.20)]">
        <CheckCircle2 className="h-7 w-7 text-[#3d8a52]" strokeWidth={1.8} />
      </div>
      <div>
        <h3 className="font-heading text-[1.7rem] text-[var(--ink)]">Enquiry sent!</h3>
        <p className="mt-1.5 text-[0.82rem] leading-[1.65] text-[rgba(90,74,66,0.62)]">
          A member of our team will respond within one working day.
        </p>
      </div>
      <button
        onClick={onReset}
        className="text-[0.75rem] font-bold text-[#5fc8c7] underline underline-offset-2 transition hover:text-[#3db0af]"
      >
        Send another enquiry
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ContactPageClient() {
  const [form,   setForm]   = useState<FormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const formRef = useRef<HTMLFormElement>(null);

  const set = (field: keyof FormValues) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const value = e.target.type === "checkbox"
      ? (e.target as HTMLInputElement).checked
      : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((err) => { const n = { ...err }; delete n[field]; return n; });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const firstKey = Object.keys(errs)[0];
      const el = formRef.current?.querySelector(`[name="${firstKey}"]`) as HTMLElement | null;
      el?.focus();
      return;
    }
    setStatus("submitting");
    await new Promise((r) => setTimeout(r, 1400));
    setStatus("success");
  };

  return (
    <div className="paper-bg min-h-screen">

      {/* ── Page header ───────────────────────────────────────── */}
      <div className="border-b border-[rgba(90,74,66,0.08)] bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="container-site flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-kicker">Get in touch</p>
            <h1 className="mt-1 font-heading text-[2.2rem] leading-tight text-[var(--ink)] sm:text-[2.6rem]">
              Contact Us
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="tel:02088615574"
              className="inline-flex items-center gap-2 rounded-full bg-[#5fc8c7] px-5 py-2.5 text-[0.85rem] font-bold text-white shadow-[0_4px_14px_rgba(95,200,199,0.30)] transition hover:bg-[#3db0af]"
            >
              <Phone className="h-3.5 w-3.5" strokeWidth={2.2} />
              020 8861 5574
            </a>
            <a
              href="mailto:manager@bluenest.uk"
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(90,74,66,0.18)] bg-white px-5 py-2.5 text-[0.85rem] font-bold text-[rgba(90,74,66,0.70)] transition hover:border-[rgba(90,74,66,0.30)] hover:text-[var(--ink)]"
            >
              <Mail className="h-3.5 w-3.5" strokeWidth={2} />
              manager@bluenest.uk
            </a>
          </div>
        </div>
      </div>

      {/* ── Main two-column layout ─────────────────────────────── */}
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="container-site">
          <div className="grid gap-8 lg:grid-cols-2">

            {/* ── Left: Enquiry form ──────────────────────────── */}
            <div className="rounded-[1.8rem] bg-white p-6 shadow-[0_4px_20px_rgba(90,74,66,0.08)] ring-1 ring-[rgba(90,74,66,0.04)] lg:p-8">

              {status === "success" ? (
                <SuccessMessage onReset={() => { setForm(EMPTY_FORM); setStatus("idle"); }} />
              ) : (
                <>
                  <div className="mb-6">
                    <h2 className="font-heading text-[1.6rem] text-[var(--ink)]">Send an Enquiry</h2>
                    <p className="mt-1 text-[0.8rem] text-[rgba(90,74,66,0.55)]">
                      We&rsquo;ll get back to you within one working day.
                    </p>
                  </div>

                  <form ref={formRef} onSubmit={handleSubmit} noValidate aria-label="Enquiry form" className="space-y-4">

                    {/* Row 1: Name + Email */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <FieldLabel htmlFor="name" required>Parent / Guardian Name</FieldLabel>
                        <input
                          id="name" name="name" type="text" autoComplete="name"
                          placeholder="Jane Smith"
                          value={form.name} onChange={set("name")}
                          aria-required="true"
                          aria-describedby={errors.name ? "err-name" : undefined}
                          className={`${INPUT_BASE} ${errors.name ? INPUT_ERROR : INPUT_NORMAL}`}
                        />
                        <FieldError id="err-name" message={errors.name} />
                      </div>
                      <div>
                        <FieldLabel htmlFor="email" required>Email Address</FieldLabel>
                        <input
                          id="email" name="email" type="email" autoComplete="email"
                          placeholder="jane@example.com"
                          value={form.email} onChange={set("email")}
                          aria-required="true"
                          aria-describedby={errors.email ? "err-email" : undefined}
                          className={`${INPUT_BASE} ${errors.email ? INPUT_ERROR : INPUT_NORMAL}`}
                        />
                        <FieldError id="err-email" message={errors.email} />
                      </div>
                    </div>

                    {/* Row 2: Phone + Branch */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <FieldLabel htmlFor="phone">Phone Number</FieldLabel>
                        <input
                          id="phone" name="phone" type="tel" autoComplete="tel"
                          placeholder="07700 000000"
                          value={form.phone} onChange={set("phone")}
                          className={`${INPUT_BASE} ${INPUT_NORMAL}`}
                        />
                      </div>
                      <div>
                        <FieldLabel htmlFor="branch" required>Preferred Branch</FieldLabel>
                        <div className="relative">
                          <select
                            id="branch" name="branch"
                            value={form.branch} onChange={set("branch")}
                            aria-required="true"
                            aria-describedby={errors.branch ? "err-branch" : undefined}
                            className={`${SELECT_BASE} ${errors.branch ? INPUT_ERROR : INPUT_NORMAL}`}
                          >
                            <option value="">Select a branch…</option>
                            {BRANCHES.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}{b.status === "coming-soon" ? " (Coming Soon)" : ""}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[rgba(90,74,66,0.38)]" />
                        </div>
                        <FieldError id="err-branch" message={errors.branch} />
                      </div>
                    </div>

                    {/* Row 3: Child Age + Enquiry Type */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <FieldLabel htmlFor="childAge">Child&rsquo;s Age</FieldLabel>
                        <div className="relative">
                          <select
                            id="childAge" name="childAge"
                            value={form.childAge} onChange={set("childAge")}
                            className={`${SELECT_BASE} ${INPUT_NORMAL}`}
                          >
                            <option value="">Select age…</option>
                            {CHILD_AGES.map((a) => (
                              <option key={a} value={a}>{a}</option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[rgba(90,74,66,0.38)]" />
                        </div>
                      </div>
                      <div>
                        <FieldLabel htmlFor="enquiryType" required>Enquiry Type</FieldLabel>
                        <div className="relative">
                          <select
                            id="enquiryType" name="enquiryType"
                            value={form.enquiryType} onChange={set("enquiryType")}
                            aria-required="true"
                            aria-describedby={errors.enquiryType ? "err-enquiryType" : undefined}
                            className={`${SELECT_BASE} ${errors.enquiryType ? INPUT_ERROR : INPUT_NORMAL}`}
                          >
                            <option value="">Select type…</option>
                            {ENQUIRY_TYPES.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[rgba(90,74,66,0.38)]" />
                        </div>
                        <FieldError id="err-enquiryType" message={errors.enquiryType} />
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <FieldLabel htmlFor="message">Message</FieldLabel>
                      <textarea
                        id="message" name="message" rows={4}
                        placeholder="Tell us about your child and any questions you have…"
                        value={form.message} onChange={set("message")}
                        className={`${TEXTAREA_BASE} ${INPUT_NORMAL}`}
                      />
                    </div>

                    {/* Consent */}
                    <div>
                      <label className="flex cursor-pointer items-start gap-3">
                        <div className="relative mt-0.5 shrink-0">
                          <input
                            id="consent" name="consent" type="checkbox"
                            checked={form.consent} onChange={set("consent")}
                            aria-required="true"
                            aria-describedby={errors.consent ? "err-consent" : undefined}
                            className="sr-only"
                          />
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all duration-150 ${
                              form.consent
                                ? "border-[#5fc8c7] bg-[#5fc8c7]"
                                : errors.consent
                                ? "border-[#ef8cab]"
                                : "border-[rgba(90,74,66,0.20)] bg-white"
                            }`}
                          >
                            {form.consent && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                          </div>
                        </div>
                        <span className="text-[0.78rem] leading-[1.65] text-[rgba(90,74,66,0.65)]">
                          I consent to Blue Nest Montessori School contacting me about my enquiry.{" "}
                          <Link href="/privacy" className="text-[#5fc8c7] underline underline-offset-2 hover:text-[#3db0af]">
                            Privacy Policy
                          </Link>
                          <span className="ml-0.5 text-[#ef8cab]" aria-hidden="true">*</span>
                        </span>
                      </label>
                      <FieldError id="err-consent" message={errors.consent} />
                    </div>

                    <p className="text-[0.65rem] text-[rgba(90,74,66,0.38)]">
                      <span className="text-[#ef8cab]">*</span> Required fields
                    </p>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={status === "submitting"}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-[#f4aac8] px-8 py-3.5 font-heading text-[1.25rem] leading-none tracking-[0.04em] text-white shadow-[0_5px_18px_rgba(244,170,200,0.32)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#e8719a] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {status === "submitting" ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                          Sending…
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4" />
                          Send Enquiry
                        </>
                      )}
                    </button>

                  </form>
                </>
              )}
            </div>

            {/* ── Right: Map + branch rows ─────────────────────── */}
            <div className="flex flex-col gap-5 lg:sticky lg:top-[88px] lg:self-start">

              {/* Map */}
              <div className="h-[340px] overflow-hidden rounded-[1.8rem] shadow-[0_4px_20px_rgba(90,74,66,0.10)] sm:h-[380px] lg:h-[420px]">
                <BranchMap />
              </div>

              {/* Branch info rows */}
              <div className="rounded-[1.8rem] bg-white px-5 py-4 shadow-[0_4px_16px_rgba(90,74,66,0.07)] ring-1 ring-[rgba(90,74,66,0.04)]">
                <p className="mb-3 text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-[rgba(90,74,66,0.42)]">
                  Our Branches
                </p>
                <div className="divide-y divide-[rgba(90,74,66,0.06)]">
                  {BRANCHES.map((branch) => {
                    const isComing = branch.status === "coming-soon";
                    return (
                      <div key={branch.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Colour dot */}
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: branch.colour }}
                          />
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 text-[0.82rem] font-bold text-[var(--ink)]">
                              {branch.name}
                              {isComing && (
                                <span className="rounded-full bg-[#f7d774] px-1.5 py-0.5 text-[0.56rem] font-extrabold uppercase tracking-wide text-[#7a5800]">
                                  Soon
                                </span>
                              )}
                            </p>
                            <p className="truncate text-[0.70rem] text-[rgba(90,74,66,0.50)]">
                              {branch.address}, {branch.postcode}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {!isComing && (
                            <a
                              href={branch.tel}
                              className="flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-[rgba(90,74,66,0.06)]"
                              aria-label={`Call ${branch.name}`}
                              title={branch.phone}
                            >
                              <Phone className="h-3.5 w-3.5" style={{ color: branch.colour }} strokeWidth={1.8} />
                            </a>
                          )}
                          <a
                            href={branch.mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-[rgba(90,74,66,0.06)]"
                            aria-label={`Directions to ${branch.name}`}
                          >
                            <ExternalLink className="h-3.5 w-3.5 text-[rgba(90,74,66,0.42)]" strokeWidth={1.8} />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick contact strip */}
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[rgba(90,74,66,0.06)] pt-3 text-[0.72rem]">
                  <a href="tel:02088615574" className="flex items-center gap-1.5 font-bold text-[#3aada9] transition hover:text-[#2a8a87]">
                    <Phone className="h-3 w-3" strokeWidth={2} />
                    020 8861 5574
                  </a>
                  <a href="mailto:manager@bluenest.uk" className="flex items-center gap-1.5 font-bold text-[#cf7d9c] transition hover:text-[#b05e7e]">
                    <Mail className="h-3 w-3" strokeWidth={2} />
                    manager@bluenest.uk
                  </a>
                  <span className="flex items-center gap-1.5 text-[rgba(90,74,66,0.50)]">
                    <Clock className="h-3 w-3" strokeWidth={1.8} />
                    Mon–Fri, 07:30–18:30
                  </span>
                </div>
              </div>

            </div>
            {/* end right col */}

          </div>
        </div>
      </div>

    </div>
  );
}
