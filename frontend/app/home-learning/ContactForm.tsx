"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
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
            placeholder="Your Name"
            required
            className="w-full rounded-[1rem] border border-[rgba(90,74,66,0.12)] bg-[#fdf9f6] px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[rgba(90,74,66,0.85)] focus:outline-none focus:ring-2 focus:ring-[#6ecfc9]/40"
          />
          <input
            type="email"
            placeholder="Email Address"
            required
            className="w-full rounded-[1rem] border border-[rgba(90,74,66,0.12)] bg-[#fdf9f6] px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[rgba(90,74,66,0.85)] focus:outline-none focus:ring-2 focus:ring-[#6ecfc9]/40"
          />
        </div>
        <input
          type="tel"
          placeholder="Phone Number"
          className="w-full rounded-[1rem] border border-[rgba(90,74,66,0.12)] bg-[#fdf9f6] px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[rgba(90,74,66,0.85)] focus:outline-none focus:ring-2 focus:ring-[#6ecfc9]/40"
        />
        <textarea
          rows={4}
          placeholder="Your Message"
          className="w-full resize-none rounded-[1rem] border border-[rgba(90,74,66,0.12)] bg-[#fdf9f6] px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[rgba(90,74,66,0.85)] focus:outline-none focus:ring-2 focus:ring-[#6ecfc9]/40"
        />
        <button type="submit" className="btn-primary w-full">
          Send <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
