import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, CalendarDays, Clock, Download, Info, Phone, Star, Sun, Sunset } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";

export const metadata: Metadata = {
  alternates: { canonical: "/admission/our-fees" },
  title: "Our Fees — Blue Nest Montessori School",
  description:
    "View nursery fees for Blue Nest Montessori in Harrow, Pinner, and Borehamwood. Flexible sessions, government funding available, sibling discounts, and childcare vouchers accepted.",
  openGraph: {
    title: "Our Fees — Blue Nest Montessori School",
    description:
      "View nursery fees for Blue Nest Montessori. Flexible sessions, government funding, sibling discounts, and childcare vouchers.",
    url: "/admission/our-fees",
    images: [{ url: "/home/montessori-learning.jpeg", width: 1280, height: 854, alt: "Blue Nest Montessori fees and sessions" }],
    type: "website",
  },
};

const downloads = [
  { branch: "Harrow",      color: "#7fd8d2", bg: "rgba(127,216,210,0.18)", border: "rgba(127,216,210,0.55)", file: "/fees-harrow.pdf"      },
  { branch: "Pinner",      color: "#ef8cab", bg: "rgba(246,213,223,0.35)", border: "rgba(239,140,171,0.45)", file: "/fees-pinner.pdf"      },
  { branch: "Borehamwood", color: "#f0bd55", bg: "rgba(247,215,116,0.22)", border: "rgba(240,189,85,0.45)",  file: "/fees-borehamwood.pdf" },
];

const sessions = [
  { icon: Clock,      color: "#f0bd55", label: "Early Bird Session",  time: "7:30 AM – 8:00 AM"  },
  { icon: Sun,        color: "#ef8cab", label: "Morning Session",     time: "8:00 AM – 12:30 PM" },
  { icon: Sunset,     color: "#7fd8d2", label: "Afternoon Session",   time: "12:30 PM – 5:00 PM" },
  { icon: Clock,      color: "#cf7d9c", label: "Full Day",            time: "8:00 AM – 5:00 PM"  },
  { icon: Star,       color: "#7fd8d2", label: "Full Week (Full Day)", time: "Monday – Friday"   },
];

const notes = [
  "Fees are subject to change. Please contact us for the most up-to-date information.",
  "We accept government funding and childcare vouchers.",
  "Sibling discounts may apply. Terms and conditions available upon request.",
];

const highlights = [
  { label: "Flexible sessions available",       color: "#7fd8d2" },
  { label: "Full-time and part-time options",   color: "#ef8cab" },
  { label: "Childcare vouchers accepted",       color: "#7fd8d2" },
  { label: "Government funding support",        color: "#f0bd55" },
];

export default function OurFeesPage() {
  return (
    <PublicLayout>

      {/* ══════════════════════════════════════════════════════
          HERO — 2-column: text left, photo right
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative overflow-hidden">
        <Doodle kind="blue-bird"  className="left-[2%]  top-6  h-9  w-9  opacity-55 hidden sm:block" />

        <div className="container-site">
          <div className="grid min-h-[58vh] items-center gap-0 lg:grid-cols-2">

            {/* Left — content */}
            <Reveal>
              <div className="py-14 pr-0 sm:py-16 lg:pr-10">
                <span className="section-kicker">Admissions</span>
                <h1 className="mt-4 font-heading text-[3rem] leading-[1.05] text-[var(--ink)] sm:text-[3.6rem]">
                  Our Fees
                </h1>
                {/* Pink dotted underline */}
                <div className="mt-2 flex gap-1" aria-hidden="true">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <div key={i} className="h-[3px] w-3 rounded-full bg-[#f1a8ca]" />
                  ))}
                </div>

                <p className="body-text mt-5 max-w-sm">
                  We offer flexible childcare options tailored to your family&rsquo;s needs.
                  Contact us for full details and availability.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <a
                    href="/contact?enquiry=fees"
                    className="inline-flex items-center gap-2 rounded-full bg-[#ef8cab] px-6 py-3 font-heading text-[1.3rem] leading-none tracking-[0.04em] text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#e8719a]"
                  >
                    <Phone className="h-4 w-4" strokeWidth={2} />
                    Contact Us
                  </a>
                  <a
                    href="/contact?enquiry=arrange-a-visit"
                    className="inline-flex items-center gap-2 rounded-full bg-[#7fd8d2] px-6 py-3 font-heading text-[1.3rem] leading-none tracking-[0.04em] text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#6ecfc9]"
                  >
                    <CalendarDays className="h-4 w-4" strokeWidth={2} />
                    Book a Visit
                  </a>
                </div>
              </div>
            </Reveal>

            {/* Right — photo */}
            <div className="relative hidden h-full min-h-[58vh] lg:block">
              <Image
                src="/home/DSC_0177.jpg"
                alt="Child working with Montessori materials"
                fill
                priority
                className="object-cover object-center"
                sizes="50vw"
              />
              {/* Soft left fade to blend with paper-bg */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--paper)_0%,transparent_30%)]" />
            </div>
          </div>
        </div>

        {/* Mobile photo strip */}
        <div className="relative h-48 sm:h-64 lg:hidden">
          <Image
            src="/home/DSC_0177.jpg"
            alt="Child working with Montessori materials"
            fill
            className="object-cover object-top"
            sizes="100vw"
          />
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          KEY INFO STRIP — 4 highlights
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative px-4 py-8 sm:px-6 lg:px-8">
        <div className="container-site">
          <Reveal>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {highlights.map((h) => (
                <div
                  key={h.label}
                  className="flex items-center gap-3 rounded-[1.4rem] bg-white/80 px-5 py-4 ring-1 ring-[rgba(90,74,66,0.07)] shadow-[0_4px_14px_rgba(90,74,66,0.05)]"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: h.color }}
                  />
                  <span className="text-sm font-bold text-[var(--ink)]">{h.label}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          DOWNLOAD FEES BY BRANCH
      ══════════════════════════════════════════════════════ */}
      <section className="relative px-4 py-10 sm:px-6 lg:px-8 lg:py-14" style={{ backgroundColor: "rgba(246,213,223,0.22)" }}>
        <Doodle kind="leaf"      className="left-[2%]  bottom-6 h-9 w-9 opacity-42 hidden sm:block" />

        <div className="container-site">
          <Reveal>
            <div className="mb-7 text-center">
              <h2 className="font-heading text-[2rem] leading-snug text-[var(--ink)] sm:text-[2.4rem]">
                Download our fees
              </h2>
              <p className="body-text mx-auto mt-2 max-w-md">
                You can download our fees for each of our nurseries using the links below.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-3">
              {downloads.map((d) => (
                <a
                  key={d.branch}
                  href={d.file}
                  download
                  className="group flex items-center justify-between rounded-[1.6rem] px-5 py-4 ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(90,74,66,0.10)]"
                  style={{ background: d.bg, borderColor: d.border }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/70"
                    >
                      <Download className="h-4 w-4" style={{ color: d.color }} strokeWidth={2} />
                    </span>
                    <span className="text-sm font-bold text-[var(--ink)]">
                      Download Fees<br />
                      <span className="font-extrabold" style={{ color: d.color }}>– {d.branch} (PDF)</span>
                    </span>
                  </div>
                  <Download className="h-4 w-4 opacity-50 transition group-hover:opacity-100" style={{ color: d.color }} strokeWidth={2} />
                </a>
              ))}
            </div>
          </Reveal>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          SESSIONS TABLE
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <Doodle kind="pink-flower"    className="right-[4%] top-8    h-9 w-9 opacity-42 hidden sm:block" />

        <div className="container-site">
          <Reveal>
            <h2 className="font-heading text-[2rem] leading-snug text-[var(--ink)] sm:text-[2.4rem]">
              Our Sessions
            </h2>
            {/* Pink dotted underline */}
            <div className="mt-2 flex gap-1" aria-hidden="true">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-[3px] w-3 rounded-full bg-[#f1a8ca]" />
              ))}
            </div>
            <p className="body-text mt-3">
              We offer a variety of sessions to suit your child&rsquo;s needs.
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="mt-6 overflow-hidden rounded-[1.8rem] shadow-[0_8px_28px_rgba(90,74,66,0.08)] ring-1 ring-[rgba(90,74,66,0.07)]">

              {/* Table header */}
              <div className="grid grid-cols-2 bg-[#ef8cab] px-6 py-3.5 sm:px-8">
                <span className="text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-white">Session Type</span>
                <span className="text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-white">Time</span>
              </div>

              {/* Rows */}
              {sessions.map((row, i) => (
                <div
                  key={row.label}
                  className={`grid grid-cols-2 items-center px-6 py-4 sm:px-8 ${
                    i < sessions.length - 1 ? "border-b border-[rgba(90,74,66,0.06)]" : ""
                  } ${i % 2 === 1 ? "bg-[rgba(246,213,223,0.12)]" : "bg-white/80"}`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                      style={{ background: `${row.color}22` }}
                    >
                      <row.icon className="h-4 w-4" style={{ color: row.color }} strokeWidth={1.8} />
                    </span>
                    <span className="font-heading text-[1.1rem] leading-snug text-[var(--ink)]">{row.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-[rgba(90,74,66,0.78)]">{row.time}</span>
                </div>
              ))}
            </div>
          </Reveal>

          {/* Notes panel */}
          <Reveal delay={0.12}>
            <div className="mt-5 flex gap-4 rounded-[1.4rem] bg-[rgba(247,215,116,0.14)] px-5 py-5 ring-1 ring-[rgba(247,215,116,0.35)]">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(127,216,210,0.25)]">
                <Info className="h-4 w-4 text-[#5a8c9c]" strokeWidth={2} />
              </span>
              <ul className="space-y-1.5">
                {notes.map((note) => (
                  <li key={note} className="flex items-start gap-2 text-sm text-[rgba(90,74,66,0.78)]">
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#ef8cab]" strokeWidth={2.5} />
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>


    </PublicLayout>
  );
}
