import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, BookOpen, Leaf, Shield, TreePine, Users } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import PastelButton from "@/components/ui/PastelButton";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";
import ProspectusDownloadLink from "./ProspectusDownloadLink";

export const metadata: Metadata = {
  alternates: { canonical: "/admission/prospectus" },
  title: "Nursery Prospectus — Blue Nest Montessori (Free PDF)",
  description:
    "Download the Blue Nest Montessori prospectus — a free PDF guide to our Harrow, Pinner and Borehamwood Montessori day nurseries. Covers daily routines, EYFS curriculum, forest school, fees and funded childcare.",
  openGraph: {
    title: "Nursery Prospectus — Blue Nest Montessori",
    description:
      "Free Blue Nest Montessori prospectus — daily routines, EYFS curriculum, forest school and fees for Harrow, Pinner and Borehamwood.",
    url: "/admission/prospectus",
    images: [{ url: "/home/branches/harrow/harrow-home-hero.jpg", width: 1920, height: 1440, alt: "Blue Nest Montessori prospectus" }],
    type: "website",
  },
};

const highlights = [
  {
    icon: BookOpen,
    color: "#cf7d9c",
    bg: "rgba(246,213,223,0.45)",
    label: "Montessori learning approach",
    blurb: "Child-led, hands-on discovery that builds focus and independence.",
  },
  {
    icon: Shield,
    color: "#5fc8c7",
    bg: "rgba(127,216,210,0.28)",
    label: "Safe and nurturing environment",
    blurb: "A warm space where every child feels secure and ready to grow.",
  },
  {
    icon: Users,
    color: "#5a8c9c",
    bg: "rgba(127,216,210,0.22)",
    label: "Qualified educators",
    blurb: "Experienced, DBS-checked staff passionate about early years.",
  },
  {
    icon: TreePine,
    color: "#5a8c6a",
    bg: "rgba(142,203,155,0.25)",
    label: "Outdoor and forest school",
    blurb: "Regular nature sessions that spark creativity and physical confidence.",
  },
];

const insideItems = [
  { icon: Leaf,     color: "#8ecb9b", text: "Daily routines and session timetables" },
  { icon: BookOpen, color: "#cf7d9c", text: "Our curriculum and Montessori approach" },
  { icon: Shield,   color: "#5fc8c7", text: "Facilities, meals, and safeguarding" },
  { icon: Users,    color: "#5a8c9c", text: "Admissions process and fee structure" },
];

export default function ProspectusPage() {
  return (
    <PublicLayout>

      {/* ══════════════════════════════════════════════════════
          HERO — download CTA above the fold
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative flex min-h-[72vh] items-center">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Image
            src="/home/structured-routine.jpg"
            alt="Children learning at Blue Nest Montessori"
            fill
            priority
            fetchPriority="high"
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[#fff8f2]/72" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_16%_62%,rgba(246,213,223,0.52),transparent_48%),radial-gradient(ellipse_at_82%_18%,rgba(127,216,210,0.20),transparent_40%)]" />
          <div
            className="absolute inset-0 opacity-28"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(90,74,66,0.07) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
        </div>

        <Doodle kind="blue-bird"      className="left-[5%]   top-8    h-9  w-9   opacity-60" />
        <Doodle kind="leaf"      className="right-[6%]  top-10   h-10 w-10  opacity-50 hidden sm:block" />

        <div className="relative z-10 w-full px-6 sm:px-10 lg:px-16 xl:px-20 py-14 sm:py-18">
          <Reveal>
            <span className="section-kicker">Admissions</span>
            <h1 className="mt-4 font-heading text-[2.5rem] leading-[1.1] text-white sm:text-[3rem] lg:text-[3.4rem] max-w-3xl">
              Blue Nest Montessori Prospectus
            </h1>
            <p className="mt-4 body-text !text-white/90 max-w-xl">
              Learn about our Montessori approach, daily routine, and how we support
              your child&rsquo;s development.
            </p>

            {/* PRIMARY action — visually strongest */}
            <div className="mt-7 flex flex-wrap gap-3">
              <ProspectusDownloadLink />
              <PastelButton href="/contact?enquiry=application-form" variant="blush">
                Contact Us <ArrowRight className="h-4 w-4" />
              </PastelButton>
            </div>
          </Reveal>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          QUICK HIGHLIGHTS — 4 items, scan in 10 seconds
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative px-4 py-10 sm:px-6 lg:px-8 lg:py-14">

        <div className="container-site">
          <Reveal>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {highlights.map((item, i) => (
                <div
                  key={item.label}
                  className="flex items-start gap-3 rounded-[1.6rem] px-5 py-5 ring-1 ring-[rgba(90,74,66,0.07)]"
                  style={{ background: item.bg }}
                >
                  <span
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/70"
                  >
                    <item.icon className="h-4 w-4" style={{ color: item.color }} strokeWidth={1.8} />
                  </span>
                  <div>
                    <p className="font-heading text-[1.05rem] leading-snug" style={{ color: item.color }}>
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm leading-[1.6] text-[rgba(90,74,66,0.85)]">{item.blurb}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          WHAT'S INSIDE — short paragraph + 4 bullet items
      ══════════════════════════════════════════════════════ */}
      <section className="blush-bg relative px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <Doodle kind="leaf"   className="left-[2%]  bottom-8 h-9 w-9 opacity-42 hidden sm:block" />

        <div className="container-site">
          <div className="mx-auto max-w-2xl">
            <Reveal>
              <span className="section-kicker">Inside the prospectus</span>
              <h2 className="section-title mt-4 text-[#cf7d9c]">
                What you&rsquo;ll find in our prospectus
              </h2>
              <p className="body-text mt-4">
                Our prospectus gives you a clear picture of life at Blue Nest — from how a
                typical day runs to the values that guide everything we do.
              </p>

              <ul className="mt-6 space-y-3">
                {insideItems.map((item) => (
                  <li key={item.text} className="flex items-center gap-3">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                      style={{ background: `${item.color}22` }}
                    >
                      <item.icon className="h-3.5 w-3.5" style={{ color: item.color }} strokeWidth={2} />
                    </span>
                    <span className="text-sm font-semibold text-[var(--ink)]">{item.text}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
