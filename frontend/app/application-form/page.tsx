"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight, CheckCircle2, Heart, Sparkles } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import PastelButton from "@/components/ui/PastelButton";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";

const steps = [
  {
    num: "01",
    color: "#cf7d9c",
    bg: "rgba(246,213,223,0.35)",
    title: "Complete this form",
    desc: "Fill in your child's details and preferred start date — it only takes a few minutes.",
  },
  {
    num: "02",
    color: "#7fd8d2",
    bg: "rgba(127,216,210,0.20)",
    title: "We'll be in touch",
    desc: "A member of our friendly admissions team will contact you within 2 working days.",
  },
  {
    num: "03",
    color: "#7fd8d2",
    bg: "rgba(127,216,210,0.22)",
    title: "Book a visit",
    desc: "Come and see our nursery, meet the team, and let your child explore their new environment.",
  },
];

const branches = ["Harrow", "Pinner", "Borehamwood"];

export default function ApplicationFormPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <PublicLayout>

      {/* ══════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative flex min-h-[52vh] items-center">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Image
            src="/home/outdoor-learning-and-play-area.jpg"
            alt="Blue Nest Montessori learning environment"
            fill
            priority
            className="object-cover object-right"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[#fff6f8]/70" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_58%,rgba(246,213,223,0.52),transparent_46%),radial-gradient(ellipse_at_82%_20%,rgba(127,216,210,0.22),transparent_40%)]" />
          <div
            className="absolute inset-0 opacity-28"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(90,74,66,0.07) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
        </div>

        <Doodle kind="blue-bird"      className="right-[18%] top-8     h-9  w-9   opacity-45 hidden lg:block" />
        <Doodle kind="pink-flower"    className="left-[42%]  bottom-6  h-9  w-9   opacity-38 hidden lg:block" />

        <div className="container-site relative z-10 py-16 sm:py-20">
          <Reveal>
            <div className="max-w-xl">
              <span className="section-kicker">Admissions</span>
              <h1 className="mt-4 font-heading text-[2.5rem] leading-[1.1] text-white sm:text-[3rem] lg:text-[3.4rem]">
                Application Form
              </h1>
              <p className="mt-5 max-w-lg body-text !text-white/90">
                Start your child&rsquo;s journey with Blue Nest Montessori School by completing
                the application form below.
              </p>
            </div>
          </Reveal>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          INTRO — process steps
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="leaf"   className="right-[5%]  top-10    h-10 w-10  opacity-48 hidden sm:block" />
        <Doodle kind="blue-bird"   className="left-[2%]   bottom-10 h-9  w-9   opacity-45 hidden sm:block" />

        <div className="container-site">
          <Reveal>
            <div className="mb-10 text-center">
              <span className="section-kicker">How it works</span>
              <h2 className="section-title mt-4 text-[#cf7d9c]">
                We&rsquo;re excited to welcome you
              </h2>
              <p className="body-text mx-auto mt-5 max-w-xl">
                Our admissions process is simple and friendly. Here&rsquo;s what happens
                once you submit your application.
              </p>
            </div>
          </Reveal>

          <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.num} delay={i * 0.1}>
                <div
                  className="rounded-[2rem] px-6 py-7 ring-1 ring-[rgba(90,74,66,0.07)]"
                  style={{ background: s.bg }}
                >
                  <span className="font-heading text-[2.4rem] leading-none" style={{ color: s.color }}>
                    {s.num}
                  </span>
                  <h3 className="mt-2 font-heading text-[1.25rem] leading-snug text-[var(--ink)]">
                    {s.title}
                  </h3>
                  <p className="body-text mt-2 text-sm">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          FORM
      ══════════════════════════════════════════════════════ */}
      <section className="blush-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="pink-flower"    className="left-[44%]  top-8     h-8  w-8   opacity-38" />

        <div className="container-site">
          <Reveal>
            <div className="mx-auto max-w-2xl">

              {submitted ? (
                /* ── Success state ────────────────────────────── */
                <div className="rounded-[2rem] bg-white/90 px-8 py-12 text-center shadow-[0_16px_48px_rgba(90,74,66,0.10)] ring-1 ring-[rgba(90,74,66,0.06)]">
                  <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(127,216,210,0.25)]">
                    <CheckCircle2 className="h-8 w-8 text-[#7fd8d2]" strokeWidth={1.8} />
                  </span>
                  <h2 className="font-heading text-[2rem] leading-snug text-[var(--ink)]">
                    Thank you!
                  </h2>
                  <p className="body-text mx-auto mt-4 max-w-sm">
                    We&rsquo;ve received your application. A member of our team will be in
                    touch within 2 working days.
                  </p>
                  <div className="mt-7 flex justify-center gap-4">
                    <PastelButton href="/" variant="mint">
                      Back to Home <ArrowRight className="h-4 w-4" />
                    </PastelButton>
                  </div>
                </div>
              ) : (
                /* ── Form ────────────────────────────────────── */
                <div className="rounded-[2rem] bg-white/90 px-6 py-8 shadow-[0_16px_48px_rgba(90,74,66,0.10)] ring-1 ring-[rgba(90,74,66,0.06)] sm:px-10 sm:py-10">
                  <div className="mb-7 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(246,213,223,0.6)]">
                      <Heart className="h-4 w-4 text-[#cf7d9c]" strokeWidth={1.8} />
                    </span>
                    <h2 className="font-heading text-[1.7rem] leading-none text-[var(--ink)]">
                      Child&rsquo;s Application
                    </h2>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Parent name + Email */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-[0.7rem] font-extrabold uppercase tracking-[0.14em] text-[rgba(90,74,66,0.6)]">
                          Parent / Guardian name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Sarah Johnson"
                          className="w-full rounded-[1rem] border border-[rgba(90,74,66,0.12)] bg-[#fdfaf7] px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[rgba(90,74,66,0.35)] focus:border-[#f4aac8] focus:outline-none focus:ring-2 focus:ring-[rgba(246,213,223,0.45)]"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[0.7rem] font-extrabold uppercase tracking-[0.14em] text-[rgba(90,74,66,0.6)]">
                          Email address
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="e.g. sarah@email.com"
                          className="w-full rounded-[1rem] border border-[rgba(90,74,66,0.12)] bg-[#fdfaf7] px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[rgba(90,74,66,0.35)] focus:border-[#f4aac8] focus:outline-none focus:ring-2 focus:ring-[rgba(246,213,223,0.45)]"
                        />
                      </div>
                    </div>

                    {/* Child name + Age */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-[0.7rem] font-extrabold uppercase tracking-[0.14em] text-[rgba(90,74,66,0.6)]">
                          Child&rsquo;s name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Emma"
                          className="w-full rounded-[1rem] border border-[rgba(90,74,66,0.12)] bg-[#fdfaf7] px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[rgba(90,74,66,0.35)] focus:border-[#f4aac8] focus:outline-none focus:ring-2 focus:ring-[rgba(246,213,223,0.45)]"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[0.7rem] font-extrabold uppercase tracking-[0.14em] text-[rgba(90,74,66,0.6)]">
                          Child&rsquo;s age
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 2 years 6 months"
                          className="w-full rounded-[1rem] border border-[rgba(90,74,66,0.12)] bg-[#fdfaf7] px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[rgba(90,74,66,0.35)] focus:border-[#f4aac8] focus:outline-none focus:ring-2 focus:ring-[rgba(246,213,223,0.45)]"
                        />
                      </div>
                    </div>

                    {/* Contact + Branch */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-[0.7rem] font-extrabold uppercase tracking-[0.14em] text-[rgba(90,74,66,0.6)]">
                          Contact number
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="e.g. 07700 900000"
                          className="w-full rounded-[1rem] border border-[rgba(90,74,66,0.12)] bg-[#fdfaf7] px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[rgba(90,74,66,0.35)] focus:border-[#f4aac8] focus:outline-none focus:ring-2 focus:ring-[rgba(246,213,223,0.45)]"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[0.7rem] font-extrabold uppercase tracking-[0.14em] text-[rgba(90,74,66,0.6)]">
                          Preferred branch
                        </label>
                        <select
                          required
                          defaultValue=""
                          className="w-full rounded-[1rem] border border-[rgba(90,74,66,0.12)] bg-[#fdfaf7] px-4 py-3 text-sm text-[var(--ink)] focus:border-[#f4aac8] focus:outline-none focus:ring-2 focus:ring-[rgba(246,213,223,0.45)]"
                        >
                          <option value="" disabled>Select a branch…</option>
                          {branches.map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Funding eligibility */}
                    <div>
                      <label className="mb-1.5 block text-[0.7rem] font-extrabold uppercase tracking-[0.14em] text-[rgba(90,74,66,0.6)]">
                        Funding eligibility
                      </label>
                      <select
                        name="fundingEligibility"
                        defaultValue=""
                        className="w-full rounded-[1rem] border border-[rgba(90,74,66,0.12)] bg-[#fdfaf7] px-4 py-3 text-sm text-[var(--ink)] focus:border-[#f4aac8] focus:outline-none focus:ring-2 focus:ring-[rgba(246,213,223,0.45)]"
                      >
                        <option value="" disabled>Select funding type…</option>
                        <option value="15-hours">15 hours funding</option>
                        <option value="30-hours">30 hours funding</option>
                        <option value="not-sure">Not sure / need guidance</option>
                        <option value="not-eligible">Not eligible / not applying</option>
                      </select>
                    </div>

                    {/* Message */}
                    <div>
                      <label className="mb-1.5 block text-[0.7rem] font-extrabold uppercase tracking-[0.14em] text-[rgba(90,74,66,0.6)]">
                        Message (optional)
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Tell us anything helpful — preferred session times, questions, or anything else you'd like us to know."
                        className="w-full resize-none rounded-[1rem] border border-[rgba(90,74,66,0.12)] bg-[#fdfaf7] px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[rgba(90,74,66,0.35)] focus:border-[#f4aac8] focus:outline-none focus:ring-2 focus:ring-[rgba(246,213,223,0.45)]"
                      />
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      className="btn-primary mt-2 w-full"
                    >
                      <Sparkles className="h-4 w-4" />
                      Submit Application
                    </button>
                  </form>
                </div>
              )}

            </div>
          </Reveal>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          CTA
      ══════════════════════════════════════════════════════ */}
      <section className="chalk-bg relative overflow-hidden px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="leaf"      className="right-[5%]  top-10   h-10 w-10 text-white/40   hidden sm:block opacity-40" />
        <Doodle kind="blue-bird"      className="right-[14%] bottom-8 h-9  w-9  text-white/30   hidden lg:block opacity-40" />

        <div className="container-site">
          <Reveal>
            <div className="mx-auto max-w-xl text-center">
              <h2 className="font-heading text-[2.2rem] leading-[1.2] text-white sm:text-[2.6rem]">
                Any questions before you apply?
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-white/80">
                Our admissions team are happy to answer any questions — just get in touch.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-4">
                <PastelButton href="/contact" variant="blush">
                  Contact Us <ArrowRight className="h-4 w-4" />
                </PastelButton>
                <PastelButton href="/prospectus" variant="butter">
                  Read Prospectus <ArrowRight className="h-4 w-4" />
                </PastelButton>
              </div>
            </div>
          </Reveal>
        </div>
      </section>


    </PublicLayout>
  );
}
