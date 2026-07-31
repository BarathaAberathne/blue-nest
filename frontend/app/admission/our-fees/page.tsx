import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, Clock, Download, Info, Star, Sun, Sunset } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import Doodle from "@/components/ui/Doodle";
import FeeCalculatorCard from "@/components/ui/FeeCalculatorCard";
import PastelButton from "@/components/ui/PastelButton";
import ZigzagBand from "@/components/ui/ZigzagBand";
import { Reveal } from "@/components/ui/Motion";

export const metadata: Metadata = {
  alternates: { canonical: "/admission/our-fees" },
  title: "Nursery Fees & Fee Calculator — Harrow, Pinner & Borehamwood",
  description:
    "Estimate your weekly and monthly nursery fees with our interactive Fee Calculator for Harrow, Pinner and Borehamwood. 15 and 30 hours funded childcare, sibling and staff discounts, childcare vouchers accepted, term-time or full-year basis.",
  openGraph: {
    title: "Nursery Fees & Fee Calculator — Blue Nest Montessori",
    description:
      "Interactive nursery fee calculator with funded childcare (15/30 hours), term-time vs. full-year, sibling and staff discounts. Harrow, Pinner and Borehamwood branches.",
    url: "/admission/our-fees",
    images: [{ url: "/home/branches/harrow/harrow-home-hero.jpg", width: 1920, height: 1440, alt: "Blue Nest Montessori — nursery fees and fee calculator" }],
    type: "website",
  },
};

// FAQ JSON-LD covers the highest-impression informational queries from
// the Yell ranking report (funded childcare, term-time stretching,
// sibling discounts, when fees are paid). Each answer is short so it
// surfaces cleanly as a Google Q&A snippet.
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Do you accept 15 or 30 hours of funded childcare?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes — Blue Nest Montessori School accepts both the universal 15-hour offer (eligible 3- and 4-year-olds, and some 2-year-olds with extra support) and the 30-hour expanded offer for working parents (from 9 months to 4 years, subject to HMRC eligibility). Use our fee calculator to see how funding affects your weekly cost.",
      },
    },
    {
      "@type": "Question",
      name: "Do funded hours cover the school holidays?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Government-funded hours are a term-time entitlement covering 38 weeks. If your child attends all year round, the remaining holiday weeks are charged at our standard (unfunded) rate. Our fee calculator works this out for you — pick 'term time' for the 38-week basis or 'all year' to include the full-fee holiday weeks.",
      },
    },
    {
      "@type": "Question",
      name: "Are there sibling or staff discounts?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes — siblings attending Blue Nest at the same time receive a 10% discount, and staff families receive a 50% discount. Both are applied automatically in the fee calculator and confirmed in our personalised quote.",
      },
    },
    {
      "@type": "Question",
      name: "When are nursery fees paid?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Fees are invoiced monthly in advance and can be paid by bank transfer, childcare vouchers or Tax-Free Childcare. We accept all major employer voucher schemes and the HMRC childcare account.",
      },
    },
    {
      "@type": "Question",
      name: "What does Early Bird drop-off include?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Early Bird is an optional 7:30am–8:00am drop-off window for £8 per day. It runs in addition to your child's chosen session and never changes the standard session start time.",
      },
    },
  ],
};

const downloads = [
  { branch: "Harrow",      color: "#7fd8d2", bg: "rgba(127,216,210,0.18)", border: "rgba(127,216,210,0.55)", file: "/fees-harrow.pdf"      },
  { branch: "Pinner",      color: "#ef8cab", bg: "rgba(246,213,223,0.35)", border: "rgba(239,140,171,0.45)", file: "/fees-pinner.pdf"      },
  { branch: "Borehamwood", color: "#f0bd55", bg: "rgba(247,215,116,0.22)", border: "rgba(240,189,85,0.45)",  file: "/fees-borehamwood.pdf" },
];

const sessions = [
  { icon: Clock,      color: "#f0bd55", label: "Early Bird Session",  time: "7:30am – 8:00am"  },
  { icon: Sun,        color: "#ef8cab", label: "Morning Session",     time: "8:00am – 1:00pm"  },
  { icon: Sunset,     color: "#7fd8d2", label: "Afternoon Session",   time: "1:00pm – 6:00pm"  },
  { icon: Clock,      color: "#cf7d9c", label: "Full Day",            time: "8:00am – 6:00pm"  },
  { icon: Clock,      color: "#b89bdd", label: "School Session",      time: "9:00am – 4:00pm"  },
  { icon: Star,       color: "#7fd8d2", label: "Full Week (Full Day)", time: "Monday – Friday" },
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* ══════════════════════════════════════════════════════
          HERO — split layout: content left, fee calculator right
          Calculator lives in the hero so it's visible without
          scrolling on both desktop and mobile. The #fee-calculator
          anchor is preserved here so existing CTAs (home hero,
          branch pages) still scroll to the calculator card.
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative overflow-hidden">
        {/* Soft full-bleed Montessori classroom background — sits behind
            everything at low opacity so the calculator stays the visual
            anchor. Matches the layered-overlay pattern used on the
            /admission and /admission/prospectus heroes. */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Image
            src="/home/DSC_0177.jpg"
            alt=""
            fill
            priority
            fetchPriority="high"
            className="object-cover object-center"
            quality={55}
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[#fff8f2]/82" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_55%,rgba(246,213,223,0.45),transparent_50%),radial-gradient(ellipse_at_82%_20%,rgba(127,216,210,0.20),transparent_40%)]" />
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(90,74,66,0.07) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
        </div>

        <Doodle kind="blue-bird"   className="left-[2%]  top-6    h-9 w-9 opacity-55 hidden sm:block" />
        <Doodle kind="pink-flower" className="right-[3%] bottom-8 h-9 w-9 opacity-45 hidden lg:block" />

        <div className="container-site relative">
          <div className="grid items-start gap-10 py-8 sm:py-10 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:py-12">

            {/* Left — content */}
            <Reveal className="lg:pt-2">
              <div>
                <span className="section-kicker">Admissions</span>
                <h1 className="mt-4 font-heading text-[2.2rem] leading-[1.12] text-[var(--ink)] sm:text-[2.7rem] lg:text-[3rem]">
                  Our Nursery Fees
                </h1>

                <p className="body-text mt-5 max-w-md">
                  Flexible childcare options tailored to your family&rsquo;s needs across every
                  Blue Nest branch. Estimate your weekly and monthly fees instantly with our
                  interactive calculator &mdash; funding support, sibling discounts and
                  flexible sessions are all built in.
                </p>

                {/* CTAs */}
                <div className="mt-6 flex flex-nowrap gap-2 pt-1 sm:flex-wrap sm:gap-3">
                  <PastelButton
                    href="/contact?enquiry=arrange-a-visit"
                    variant="rose"
                    className="flex-1 min-w-0 whitespace-nowrap !px-3 !text-sm sm:flex-initial sm:!px-6 sm:!text-[1.45rem]"
                  >
                    Book a Visit <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </PastelButton>
                  <PastelButton
                    href="/contact?enquiry=fees"
                    variant="mint"
                    className="flex-1 min-w-0 whitespace-nowrap !px-3 !text-sm sm:flex-initial sm:!px-6 sm:!text-[1.45rem]"
                  >
                    Contact Us <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </PastelButton>
                </div>

                {/* Trust pills — compact, two columns on mobile, single row on sm+ */}
                <ul className="mt-6 flex flex-wrap gap-2">
                  {highlights.map((h) => (
                    <li
                      key={h.label}
                      className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-[0.8rem] font-semibold text-[var(--ink)] ring-1 ring-[rgba(90,74,66,0.08)] shadow-[0_2px_8px_rgba(90,74,66,0.05)] backdrop-blur-sm"
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: h.color }}
                        aria-hidden="true"
                      />
                      {h.label}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            {/* Right — Fee Calculator (the hero's primary conversion element) */}
            <Reveal delay={0.08}>
              <div id="fee-calculator" className="lg:sticky lg:top-24">
                <FeeCalculatorCard defaultBranch="harrow" />
              </div>
            </Reveal>

          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          DOWNLOAD FEES BY BRANCH
      ══════════════════════════════════════════════════════ */}
      <section className="blush-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="leaf"      className="left-[2%]  bottom-6 h-9 w-9 opacity-42 hidden sm:block" />

        <div className="container-site">
          <Reveal eager>
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <span className="section-kicker">Branch fee sheets</span>
              <h2 className="section-title mt-4 text-[#cf7d9c]">
                Download Our Fees
              </h2>
              <p className="body-text mx-auto mt-5 max-w-md">
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
      <section className="paper-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="pink-flower"    className="right-[4%] top-8    h-9 w-9 opacity-42 hidden sm:block" />

        <div className="container-site">
          <Reveal>
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <span className="section-kicker">Times that fit your week</span>
              <h2 className="section-title mt-4 text-[#58c5c7]">
                Our Sessions
              </h2>
              <p className="body-text mt-5">
                We offer a variety of sessions to suit your child&rsquo;s needs.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="overflow-hidden rounded-[1.8rem] shadow-[0_8px_28px_rgba(90,74,66,0.08)] ring-1 ring-[rgba(90,74,66,0.07)]">

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
                  <span className="text-sm font-semibold text-[rgba(90,74,66,0.85)]">{row.time}</span>
                </div>
              ))}
            </div>
          </Reveal>

          {/* Notes panel */}
          <Reveal delay={0.12}>
            <div className="mx-auto mt-6 flex max-w-3xl gap-4 rounded-[1.4rem] bg-[rgba(247,215,116,0.14)] px-5 py-5 ring-1 ring-[rgba(247,215,116,0.35)]">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(127,216,210,0.25)]">
                <Info className="h-4 w-4 text-[#5a8c9c]" strokeWidth={2} />
              </span>
              <ul className="space-y-1.5">
                {notes.map((note) => (
                  <li key={note} className="flex items-start gap-2 text-sm text-[rgba(90,74,66,0.85)]">
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#ef8cab]" strokeWidth={2.5} />
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════════════════════ */}
      <ZigzagBand className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="pink-bird"   animated="float" className="absolute left-[4%]  top-10   h-10 w-10 opacity-50 hidden lg:block" />
        <Doodle kind="blue-flower"                  className="absolute right-[3%] bottom-8 h-9  w-9  opacity-45 hidden sm:block" />

        <div className="container-site">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <span className="section-kicker">Ready when you are</span>
              <h2 className="section-title mt-4 text-[var(--ink)]">
                Have Questions About Fees?
              </h2>
              <p className="body-text mx-auto mt-5 max-w-lg">
                Our team is happy to talk through funded hours, sibling discounts and what your
                weekly invoice will look like &mdash; or you can come and see us in person.
              </p>
              <div className="mt-8 flex flex-nowrap justify-center gap-2 sm:flex-wrap sm:gap-3">
                <PastelButton
                  href="/contact?enquiry=arrange-a-visit"
                  variant="rose"
                  className="whitespace-nowrap !px-3 !text-sm sm:!px-6 sm:!text-[1.45rem]"
                >
                  Book a Visit <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </PastelButton>
                <PastelButton
                  href="/contact?enquiry=fees"
                  variant="mint"
                  className="whitespace-nowrap !px-3 !text-sm sm:!px-6 sm:!text-[1.45rem]"
                >
                  Contact Us <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </PastelButton>
              </div>
            </div>
          </Reveal>
        </div>
      </ZigzagBand>

    </PublicLayout>
  );
}
