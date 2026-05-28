import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, Heart, Sparkles } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import ApplicationFormClient from "./ApplicationFormClient";

export const metadata: Metadata = {
  alternates: { canonical: "/admission/application-form" },
  title: "Apply Online — Nursery Application",
  description:
    "Apply for a nursery place at Blue Nest Montessori in Harrow, Pinner or Borehamwood. Quick online application form — choose your branch, sessions and start week. We respond within two working days.",
  openGraph: {
    title: "Apply Online — Blue Nest Montessori",
    description:
      "Online nursery application form for Blue Nest Montessori in Harrow, Pinner and Borehamwood. Two-working-day response.",
    url: "/admission/application-form",
    images: [{ url: "/home/branches/harrow/harrow-home-hero.jpg", width: 1920, height: 1440, alt: "Blue Nest Montessori application form" }],
    type: "website",
  },
};

const NEXT_STEPS = [
  {
    icon: CheckCircle2,
    color: "#5fc8c7",
    bg:    "rgba(127,216,210,0.18)",
    title: "Within 2 working days",
    desc:  "Our admissions team confirms receipt of your application and any next steps by email.",
  },
  {
    icon: Heart,
    color: "#cf7d9c",
    bg:    "rgba(246,213,223,0.35)",
    title: "Branch visit",
    desc:  "We arrange a visit to your chosen Harrow, Pinner or Borehamwood nursery so you can meet the team.",
  },
  {
    icon: Sparkles,
    color: "#f0bd55",
    bg:    "rgba(247,215,116,0.22)",
    title: "Settling-in plan",
    desc:  "Together we design a gentle, personalised settling-in schedule before your child&rsquo;s start week.",
  },
];

export default function ApplicationFormPage() {
  return (
    <PublicLayout>
      {/* Server-rendered helper strip — SEO + reassurance before the form */}
      <section className="paper-bg relative px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        <div className="container-site">
          <div className="mx-auto max-w-3xl text-center">
            <span className="section-kicker">Nursery application</span>
            <h1 className="mt-3 font-heading text-[2.1rem] leading-tight text-[var(--ink)] sm:text-[2.5rem]">
              Apply for a place at Blue Nest Montessori
            </h1>
            <p className="body-text mx-auto mt-4 max-w-xl">
              Children aged 3 months to 5 years are welcome at our Harrow, Pinner and Borehamwood
              Montessori day nurseries. The form below takes about five minutes — choose your
              branch, sessions and preferred start week. We accept 15 and 30 hours of funded
              childcare. Need to estimate fees first?{" "}
              <Link href="/admission/our-fees#fee-calculator" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">
                Use the fee calculator
              </Link>
              .
            </p>
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-xs font-semibold text-[rgba(90,74,66,0.85)] ring-1 ring-[rgba(90,74,66,0.08)]">
              <Clock className="h-3.5 w-3.5 text-[#5fc8c7]" strokeWidth={2} />
              We reply within two working days
            </p>
          </div>
        </div>
      </section>

      <ApplicationFormClient />

      {/* What happens next — three small reassurance cards */}
      <section className="blush-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="container-site">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <span className="section-kicker">What happens next</span>
            <h2 className="section-title mt-4 text-[#cf7d9c]">After you submit</h2>
            <p className="body-text mt-4">
              A real person reads every application — no automated triage. Here&rsquo;s what to expect.
            </p>
          </div>

          <div className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-3">
            {NEXT_STEPS.map((s) => (
              <article
                key={s.title}
                className="feature-card"
                style={{ background: s.bg }}
              >
                <span className="mb-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/70 shadow-[0_2px_8px_rgba(90,74,66,0.08)]">
                  <s.icon className="h-5 w-5" style={{ color: s.color }} strokeWidth={1.8} />
                </span>
                <h3 className="feature-card-title" style={{ color: s.color }}>
                  {s.title}
                </h3>
                <p className="body-text mt-3 flex-1" dangerouslySetInnerHTML={{ __html: s.desc }} />
              </article>
            ))}
          </div>

          <p className="body-text mx-auto mt-10 max-w-2xl text-center text-sm">
            Questions before you apply?{" "}
            <Link href="/contact" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">
              Get in touch
            </Link>{" "}
            or read more about our{" "}
            <Link href="/why-montessori" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">
              Montessori approach
            </Link>
            .
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}
