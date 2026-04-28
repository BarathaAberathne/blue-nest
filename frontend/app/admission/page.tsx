import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardList, PoundSterling } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";

export const metadata: Metadata = {
  title: "Admission — Blue Nest Montessori School",
  description:
    "Start your child's journey with Blue Nest Montessori School. Download our prospectus, view our fees, or complete an application form.",
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

    </PublicLayout>
  );
}
