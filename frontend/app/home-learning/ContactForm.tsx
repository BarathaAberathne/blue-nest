"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { BRANCH_FALLBACKS } from "@/lib/branch-public";
import { trackEvent } from "@/lib/analytics";

type ApiBranch = { slug: string; name?: string; status?: string };

const INPUT =
  "w-full rounded-[1rem] border border-[rgba(90,74,66,0.12)] bg-[#fdf9f6] px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[rgba(90,74,66,0.85)] focus:outline-none focus:ring-2 focus:ring-[#6ecfc9]/40";

// The backend enquiry endpoint requires name, email, branch, enquiry_type and
// consent — this form submits a real CRM enquiry (source "home-learning"),
// exactly like the contact page. It previously rendered a success message
// without sending anything anywhere.
export function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", branch: "", message: "" });
  const [consent, setConsent] = useState(false);
  const [branches, setBranches] = useState(
    BRANCH_FALLBACKS.map((b) => ({ slug: b.slug, label: b.label })),
  );
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .getBranches()
      .then((raw) => {
        if (!alive) return;
        const live = (raw as ApiBranch[]) ?? [];
        if (Array.isArray(live) && live.length > 0) {
          setBranches(live.map((b) => ({ slug: b.slug, label: b.name ?? b.slug })));
        }
      })
      .catch(() => {}); // fallback list already rendered
    return () => {
      alive = false;
    };
  }, []);

  const set =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      await api.submitEnquiry({
        name: form.name,
        email: form.email,
        phone: form.phone,
        branch: form.branch,
        enquiry_type: "General enquiry",
        message: form.message,
        source: "home-learning",
        consent,
      });
      trackEvent("contact_form_submit", {
        form_name: "home_learning",
        branch: form.branch || undefined,
        page_path: typeof window !== "undefined" ? window.location.pathname : undefined,
      });
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStatus("idle");
    }
  }

  if (status === "success") {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-[2rem] bg-white/90 px-6 py-10 text-center shadow-[0_4px_16px_rgba(90,74,66,0.07)] ring-1 ring-[rgba(90,74,66,0.08)]">
        <div>
          <p className="font-heading text-[2rem] text-[#5fc8c7]">Thanks for submitting!</p>
          <p className="body-text mt-3 text-sm">We&rsquo;ll be in touch soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] bg-white px-6 py-7 shadow-[0_4px_16px_rgba(90,74,66,0.07)] ring-1 ring-[rgba(90,74,66,0.08)] sm:px-8">
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="text"
            name="name"
            aria-label="Your name"
            placeholder="Your Name"
            required
            value={form.name}
            onChange={set("name")}
            className={INPUT}
          />
          <input
            type="email"
            name="email"
            aria-label="Email address"
            placeholder="Email Address"
            required
            value={form.email}
            onChange={set("email")}
            className={INPUT}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="tel"
            name="phone"
            aria-label="Phone number"
            placeholder="Phone Number"
            value={form.phone}
            onChange={set("phone")}
            className={INPUT}
          />
          <select
            name="branch"
            aria-label="Preferred nursery"
            required
            value={form.branch}
            onChange={set("branch")}
            className={INPUT}
          >
            <option value="">Preferred Nursery…</option>
            {branches.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
        <textarea
          rows={4}
          name="message"
          aria-label="Your message"
          placeholder="Your Message"
          value={form.message}
          onChange={set("message")}
          className={`${INPUT} resize-none`}
        />
        <label className="flex items-start gap-2.5 text-xs text-[rgba(90,74,66,0.85)]">
          <input
            type="checkbox"
            required
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[rgba(90,74,66,0.25)] accent-[#5fc8c7]"
          />
          <span>
            I consent to Blue Nest Montessori storing my details to respond to this enquiry.
          </span>
        </label>
        {error && (
          <p className="rounded-[1rem] bg-red-50 px-4 py-2.5 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={status === "submitting"} className="btn-primary w-full disabled:opacity-60">
          {status === "submitting" ? "Sending…" : "Send"} <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
