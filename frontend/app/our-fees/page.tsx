import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, Clock, Mail, Phone } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import PastelButton from "@/components/ui/PastelButton";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";
import ZigzagBand from "@/components/ui/ZigzagBand";

export const metadata: Metadata = {
  title: "Our Fees — Blue Nest Montessori School",
};

const sessions = [
  { type: "Full Day",          time: "8:00 am – 6:00 pm",  price: "Contact us" },
  { type: "Morning Session",   time: "8:00 am – 1:00 pm",  price: "Contact us" },
  { type: "Afternoon Session", time: "1:00 pm – 6:00 pm",  price: "Contact us" },
  { type: "Part-Time (3 days)", time: "Flexible",           price: "Contact us" },
];

const extras = [
  {
    title: "Government funding",
    desc: "We accept 15-hour and 30-hour free childcare funding for eligible 2, 3, and 4 year olds. Our team will guide you through the process.",
    color: "#7fd8d2",
    bg: "rgba(127,216,210,0.15)",
  },
  {
    title: "Childcare vouchers",
    desc: "We accept childcare vouchers and Tax-Free Childcare payments from all major providers.",
    color: "#cf7d9c",
    bg: "rgba(246,213,223,0.35)",
  },
  {
    title: "Flexible arrangements",
    desc: "We understand every family is different. Speak to our team to discuss a tailored session plan that works for you.",
    color: "#5fc8c7",
    bg: "rgba(127,216,210,0.22)",
  },
];

export default function OurFeesPage() {
  return (
    <PublicLayout>

      {/* ══════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative flex min-h-[52vh] items-center">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Image
            src="/home/DSC_0151.jpg"
            alt="Blue Nest Montessori classroom"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[#fff8f2]/72" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_55%,rgba(127,216,210,0.38),transparent_46%),radial-gradient(ellipse_at_78%_22%,rgba(127,216,210,0.22),transparent_40%)]" />
          <div
            className="absolute inset-0 opacity-28"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(90,74,66,0.07) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
        </div>

        <Doodle kind="leaf"      className="left-[4%]   top-8     h-10 w-10  opacity-50" />

        <div className="container-site relative z-10 py-16 sm:py-20">
          <Reveal>
            <div className="max-w-xl">
              <span className="section-kicker">Admissions</span>
              <h1 className="mt-4 font-heading text-[2.5rem] leading-[1.1] text-white sm:text-[3rem] lg:text-[3.4rem]">
                Our Fees
              </h1>
              <p className="mt-5 max-w-lg body-text !text-white/90">
                We offer flexible childcare options designed to suit your family&rsquo;s needs.
                Contact us for full details on sessions and availability.
              </p>
            </div>
          </Reveal>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          FLEXIBLE SESSIONS
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="leaf"   className="left-[2%]   bottom-10 h-10 w-10  opacity-42 hidden sm:block" />

        <div className="container-site">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <span className="section-kicker">Session options</span>
              <h2 className="section-title mt-4 text-[#7fd8d2]">
                Flexible sessions for every family
              </h2>
              <p className="body-text mt-5">
                We offer a range of full-time and part-time sessions to fit around your family.
                Morning, afternoon, and full-day options are available across all branches, with
                tailored support to match your child&rsquo;s needs and your schedule.
              </p>
            </div>
          </Reveal>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          FEES TABLE
      ══════════════════════════════════════════════════════ */}
      <section
        className="relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16"
        style={{ backgroundColor: "rgba(174,230,221,0.18)" }}
      >
        <Doodle kind="blue-bird"      className="left-[3%]   top-10   h-9  w-9   opacity-48 hidden sm:block" />

        <div className="container-site">
          <Reveal>
            <div className="mb-8 text-center">
              <span className="section-kicker">Session pricing</span>
              <h2 className="section-title mt-4 text-[#cf7d9c]">
                Session types &amp; times
              </h2>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="mx-auto max-w-3xl overflow-hidden rounded-[2rem] bg-white/80 shadow-[0_10px_32px_rgba(90,74,66,0.08)] ring-1 ring-[rgba(90,74,66,0.07)]">
              {/* Table header */}
              <div className="grid grid-cols-3 border-b border-[rgba(90,74,66,0.08)] bg-[rgba(127,216,210,0.15)] px-6 py-4">
                <span className="text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-[#5a8c9c]">Session Type</span>
                <span className="text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-[#5a8c9c]">
                  <Clock className="mb-0.5 mr-1 inline h-3 w-3" />Time
                </span>
                <span className="text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-[#5a8c9c]">Price</span>
              </div>

              {/* Rows */}
              {sessions.map((row, i) => (
                <div
                  key={row.type}
                  className={`grid grid-cols-3 items-center px-6 py-4 ${
                    i < sessions.length - 1 ? "border-b border-[rgba(90,74,66,0.06)]" : ""
                  } ${i % 2 === 1 ? "bg-[rgba(246,213,223,0.12)]" : ""}`}
                >
                  <span className="font-heading text-[1.1rem] leading-snug text-[var(--ink)]">{row.type}</span>
                  <span className="body-text text-sm">{row.time}</span>
                  <span className="inline-flex items-center">
                    <span className="rounded-full bg-[rgba(127,216,210,0.22)] px-3 py-1 text-sm font-bold text-[#5a8c9c]">
                      {row.price}
                    </span>
                  </span>
                </div>
              ))}

              {/* Footer note */}
              <div className="border-t border-[rgba(90,74,66,0.06)] bg-[rgba(246,213,223,0.15)] px-6 py-4">
                <p className="text-sm text-[rgba(90,74,66,0.62)]">
                  Fees are reviewed annually. Please contact your nearest branch for the current
                  fee schedule and availability.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          ADDITIONAL INFO
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="pink-flower"    className="right-[5%]  top-10    h-10 w-10  opacity-42 hidden sm:block" />

        <div className="container-site">
          <Reveal>
            <div className="mb-10 text-center">
              <span className="section-kicker">Funding &amp; support</span>
              <h2 className="section-title mt-4 text-[#7fd8d2]">
                Making childcare accessible
              </h2>
            </div>
          </Reveal>

          <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
            {extras.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.08}>
                <div
                  className="h-full rounded-[2rem] px-6 py-7 ring-1 ring-[rgba(90,74,66,0.07)]"
                  style={{ background: item.bg }}
                >
                  <h3 className="font-heading text-[1.3rem] leading-snug" style={{ color: item.color }}>
                    {item.title}
                  </h3>
                  <p className="body-text mt-3 text-sm">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          CTA
      ══════════════════════════════════════════════════════ */}
      <ZigzagBand className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="leaf"      className="right-[5%]  top-10   h-10 w-10 hidden sm:block opacity-40" />
        <Doodle kind="pink-flower"    className="right-[16%] bottom-6 h-9  w-9  hidden lg:block opacity-40" />

        <div className="container-site">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-16">

            {/* Left */}
            <Reveal>
              <h2 className="font-heading text-[2.2rem] leading-[1.2] text-[var(--ink)] sm:text-[2.6rem]">
                Speak to our team about fees and availability
              </h2>
              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(90,74,66,0.08)]">
                    <Phone className="h-4 w-4 text-[#5fc8c7]" />
                  </div>
                  <div className="text-sm font-semibold leading-relaxed text-[rgba(90,74,66,0.72)]">
                    <div>020 8863 2076</div>
                    <div>020 8429 5411</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(90,74,66,0.08)]">
                    <Mail className="h-4 w-4 text-[#5fc8c7]" />
                  </div>
                  <a
                    href="mailto:info@bluenest.uk"
                    className="text-sm font-semibold text-[rgba(90,74,66,0.72)] transition hover:text-[var(--ink)]"
                  >
                    info@bluenest.uk
                  </a>
                </div>
              </div>
              <div className="mt-8 flex flex-wrap gap-4">
                <PastelButton href="/contact" variant="blush">
                  Contact Us <ArrowRight className="h-4 w-4" />
                </PastelButton>
                <PastelButton href="/contact" variant="butter">
                  Book a Visit <ArrowRight className="h-4 w-4" />
                </PastelButton>
              </div>
            </Reveal>

            {/* Right — quick info panel */}
            <Reveal delay={0.1}>
              <div className="rounded-[2rem] bg-white px-6 py-7 ring-1 ring-[rgba(90,74,66,0.08)] shadow-[0_4px_16px_rgba(90,74,66,0.07)] sm:px-8">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[rgba(90,74,66,0.50)]">Opening hours</p>
                <div className="mt-4 space-y-3">
                  {[
                    { label: "Monday – Friday", value: "8:00 am – 6:00 pm" },
                    { label: "Saturday",        value: "Closed" },
                    { label: "Sunday",          value: "Closed" },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center justify-between border-b border-[rgba(90,74,66,0.08)] pb-3 last:border-0 last:pb-0">
                      <span className="text-sm font-semibold text-[rgba(90,74,66,0.65)]">{r.label}</span>
                      <span className="text-sm font-bold text-[var(--ink)]">{r.value}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-xs leading-relaxed text-[rgba(90,74,66,0.55)]">
                  We are closed on UK bank holidays. Please check with your branch for term-time
                  and holiday opening arrangements.
                </p>
              </div>
            </Reveal>

          </div>
        </div>
      </ZigzagBand>

    </PublicLayout>
  );
}
