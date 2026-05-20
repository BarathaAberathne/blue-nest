import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, ClipboardList, Eye, Heart, PoundSterling } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import PastelButton from "@/components/ui/PastelButton";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";
import ZigzagBand from "@/components/ui/ZigzagBand";

export const metadata: Metadata = {
  alternates: { canonical: "/admission" },
  title: "Admission — Apply, Prospectus & Fees",
  description:
    "Start your child's nursery journey at Blue Nest Montessori in Harrow, Pinner and Borehamwood. Download the prospectus, estimate fees with our calculator, or send your application online. We reply within one working day.",
  openGraph: {
    title: "Admission — Blue Nest Montessori",
    description:
      "Apply, view fees and download the prospectus for Blue Nest Montessori in Harrow, Pinner and Borehamwood.",
    url: "/admission",
    images: [{ url: "/home/branches/harrow/harrow-home-hero.jpg", width: 1920, height: 1440, alt: "Blue Nest Montessori admission" }],
    type: "website",
  },
};

const cards = [
  {
    href: "/admission/prospectus",
    icon: BookOpen,
    color: "#7fd8d2",
    bg: "rgba(127,216,210,0.15)",
    border: "rgba(127,216,210,0.35)",
    label: "Prospectus",
    desc: "Learn about our Montessori approach, daily routines, curriculum and what makes Blue Nest special.",
    cta: "Download Prospectus",
  },
  {
    href: "/admission/our-fees",
    icon: PoundSterling,
    color: "#cf7d9c",
    bg: "rgba(246,213,223,0.35)",
    border: "rgba(207,125,156,0.30)",
    label: "Our Fees",
    desc: "View our flexible session options, funding eligibility, and download the full fee schedule for your branch.",
    cta: "View Our Fees",
  },
  {
    href: "/admission/application-form",
    icon: ClipboardList,
    color: "#f0bd55",
    bg: "rgba(247,215,116,0.22)",
    border: "rgba(240,189,85,0.35)",
    label: "Application Form",
    desc: "Ready to apply? Complete our simple online application and our admissions team will be in touch within 2 working days.",
    cta: "Apply Now",
  },
];

export default function AdmissionPage() {
  return (
    <PublicLayout>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="paper-bg relative flex min-h-[52vh] items-center">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Image
            src="/home/outdoor-learning-and-play-area.jpg"
            alt="Blue Nest Montessori learning environment"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[#fff8f2]/70" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_58%,rgba(246,213,223,0.50),transparent_46%),radial-gradient(ellipse_at_80%_20%,rgba(127,216,210,0.20),transparent_40%)]" />
        </div>

        <Doodle kind="pink-flower" className="left-[4%]  top-8    h-9 w-9 opacity-45" />
        <Doodle kind="leaf"        className="right-[4%] bottom-8 h-9 w-9 opacity-40 hidden sm:block" />

        <div className="relative z-10 w-full px-6 sm:px-10 lg:px-16 xl:px-20 py-16 sm:py-20 lg:py-24">
          <Reveal>
            <span className="section-kicker">Join Blue Nest</span>
            <h1 className="mt-4 font-heading text-[2.5rem] leading-[1.1] text-white sm:text-[3rem] lg:text-[3.4rem] max-w-3xl">
              Admission
            </h1>
            <p className="body-text mt-5 max-w-xl !text-white/90">
              We welcome children from 3 months to 5 years across our Harrow, Pinner
              and Borehamwood branches. Places are limited — we recommend enquiring
              early to avoid disappointment.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── 3 Navigation Cards ───────────────────────────────── */}
      <section className="paper-bg relative px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <Doodle kind="blue-bird" className="right-[3%] top-10 h-9 w-9 opacity-45 hidden sm:block" />

        <div className="container-site">
          <Reveal>
            <div className="mb-10 text-center">
              <span className="section-kicker">Where would you like to start?</span>
              <h2 className="section-title mt-4 text-[#cf7d9c]">Your next step</h2>
            </div>
          </Reveal>

          <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
            {cards.map((card, i) => (
              <Reveal key={card.href} delay={i * 0.08} className="h-full">
                <Link
                  href={card.href}
                  className="group flex h-full flex-col rounded-[2rem] px-7 py-8 ring-1 shadow-[0_6px_24px_rgba(90,74,66,0.08)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(90,74,66,0.12)]"
                  style={{ background: card.bg, borderColor: card.border }}
                >
                  <span
                    className="mb-5 flex h-13 w-13 items-center justify-center rounded-full bg-white/80 shadow-[0_2px_10px_rgba(90,74,66,0.08)]"
                    style={{ width: "3.25rem", height: "3.25rem" }}
                  >
                    <card.icon className="h-6 w-6" style={{ color: card.color }} strokeWidth={1.8} />
                  </span>
                  <h2 className="font-heading text-[1.6rem] leading-snug" style={{ color: card.color }}>
                    {card.label}
                  </h2>
                  <p className="body-text mt-3 flex-1 text-sm">{card.desc}</p>
                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-bold transition-colors duration-200 group-hover:gap-3" style={{ color: card.color }}>
                    {card.cta}
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Admissions journey — 4-step strip ──────────────── */}
      <section className="blush-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="leaf"        className="left-[2%]  top-10    h-9 w-9 opacity-45 hidden sm:block" />
        <Doodle kind="pink-flower" className="right-[4%] bottom-10 h-9 w-9 opacity-45 hidden sm:block" />

        <div className="container-site">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <span className="section-kicker">The admissions journey</span>
              <h2 className="section-title mt-4 text-[#cf7d9c]">From first hello to first day</h2>
              <p className="body-text mt-5">
                Joining Blue Nest is simple. We reply to every enquiry within one working day and
                guide you through a calm, family-friendly process from your first visit through to
                a tailored settling-in plan.
              </p>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Eye,          color: "#cf7d9c", bg: "rgba(246,213,223,0.35)", n: "01", t: "Visit",      d: "Come and meet our team in Harrow, Pinner or Borehamwood. See the prepared environments, ask any questions and feel the atmosphere of a Montessori day." },
              { icon: ClipboardList,color: "#5fc8c7", bg: "rgba(127,216,210,0.18)", n: "02", t: "Apply",      d: "Send your online application — choose your branch, preferred start week and sessions. We confirm within two working days." },
              { icon: Heart,        color: "#f0bd55", bg: "rgba(247,215,116,0.22)", n: "03", t: "Settle in", d: "We design a gentle settling-in plan around your child — short visits, a familiar key person and a slow ramp into full sessions." },
              { icon: CalendarDays, color: "#b89bdd", bg: "rgba(185,159,224,0.20)", n: "04", t: "Start",     d: "Your child joins their Blue Nest classroom for their full week of sessions, ready to learn, play and grow." },
            ].map((s, i) => (
              <Reveal key={s.t} delay={i * 0.06} className="h-full">
                <article
                  className="flex h-full flex-col rounded-[2rem] px-6 py-7 ring-1 ring-[rgba(90,74,66,0.07)] shadow-[0_4px_16px_rgba(90,74,66,0.07)]"
                  style={{ background: s.bg }}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-heading text-[1.1rem] tracking-[0.06em]" style={{ color: s.color }}>{s.n}</span>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 shadow-[0_2px_8px_rgba(90,74,66,0.08)]">
                      <s.icon className="h-4 w-4" style={{ color: s.color }} strokeWidth={1.8} />
                    </span>
                  </div>
                  <h3 className="mt-4 font-heading text-[1.25rem] leading-snug" style={{ color: s.color }}>{s.t}</h3>
                  <p className="body-text mt-2 flex-1 text-sm">{s.d}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Funded childcare reassurance ─────────────────── */}
      <section className="paper-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="blue-bird" className="right-[3%] top-10 h-9 w-9 opacity-45 hidden sm:block" />

        <div className="container-site">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <span className="section-kicker">Funded childcare</span>
              <h2 className="section-title mt-4 text-[#5fc8c7]">15 and 30 hours funded childcare</h2>
              <p className="body-text mt-5">
                Blue Nest accepts the universal 15-hour offer and the expanded 30-hour offer for
                working parents. We also welcome childcare vouchers and Tax-Free Childcare. Most
                families use funding alongside paid sessions — try the{" "}
                <Link href="/admission/our-fees#fee-calculator" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">
                  fee calculator
                </Link>{" "}
                to see your weekly cost, and read the{" "}
                <Link href="/admission/our-fees" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">
                  fees page
                </Link>{" "}
                for the full breakdown.
              </p>
              <p className="body-text mt-4">
                Need cover during school holidays? Our{" "}
                <Link href="/admission/holiday-club" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">
                  holiday club
                </Link>{" "}
                runs at Harrow, Pinner and Borehamwood for ages 2-5.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────── */}
      <ZigzagBand className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="pink-bird"   animated="float" className="absolute left-[4%]  top-10   h-10 w-10 opacity-50 hidden lg:block" />
        <Doodle kind="blue-flower"                  className="absolute right-[3%] bottom-8 h-9  w-9  opacity-45 hidden sm:block" />

        <div className="container-site">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <span className="section-kicker">Ready when you are</span>
              <h2 className="section-title mt-4 text-[var(--ink)]">Start your child&rsquo;s Blue Nest journey</h2>
              <p className="body-text mx-auto mt-5 max-w-lg">
                Children aged 3 months to 5 years — Montessori day nursery places in Harrow,
                Pinner and Borehamwood. We reply within one working day.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <PastelButton href="/contact?enquiry=book-visit" variant="rose">
                  Book a Visit <ArrowRight className="h-4 w-4" />
                </PastelButton>
                <PastelButton href="/admission/application-form" variant="mint">
                  Apply Online <ArrowRight className="h-4 w-4" />
                </PastelButton>
              </div>
              <p className="mt-6 text-xs font-semibold text-[rgba(90,74,66,0.85)]">
                Discover our{" "}
                <Link href="/branches/harrow" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">Harrow</Link>
                ,{" "}
                <Link href="/branches/pinner" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">Pinner</Link>{" "}
                and{" "}
                <Link href="/branches/borehamwood" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">Borehamwood</Link>{" "}
                branches, or explore{" "}
                <Link href="/why-montessori" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">why Montessori</Link>
                .
              </p>
            </div>
          </Reveal>
        </div>
      </ZigzagBand>

    </PublicLayout>
  );
}
