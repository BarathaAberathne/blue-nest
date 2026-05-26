import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Compass,
  Hammer,
  Heart,
  Leaf,
  Mail,
  Phone,
  Sparkles,
  Sun,
  TreePine,
  Users,
} from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import PastelButton from "@/components/ui/PastelButton";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";
import ZigzagBand from "@/components/ui/ZigzagBand";

export const metadata: Metadata = {
  alternates: { canonical: "/admission/holiday-club" },
  // Yell shows /product-page/holiday-club-pinner and similar legacy URLs
  // still pull organic traffic for "holiday club pinner" and
  // "nursery holiday club". Lead the title with the strongest phrase.
  title: "Holiday Club — Nursery Holiday Childcare in Harrow, Pinner & Borehamwood",
  description:
    "School holiday childcare at Blue Nest Montessori — themed activities, forest school, indoor and outdoor play for ages 2-5. Holiday club Pinner, Harrow and Borehamwood. Term-break and half-term sessions, weekly bookings welcome.",
  openGraph: {
    title: "Holiday Club — Blue Nest Montessori",
    description:
      "Term-break and half-term nursery holiday club for ages 2-5 in Harrow, Pinner and Borehamwood. Forest school, themed activities and warm Montessori care.",
    url: "/admission/holiday-club",
    images: [{ url: "/home/branches/harrow/harrow-home-hero.jpg", width: 1920, height: 1440, alt: "Blue Nest Montessori holiday club" }],
    type: "website",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Who is the Blue Nest holiday club for?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Our nursery holiday club is open to children aged 2 to 5 — both current Blue Nest families and children from other settings. It's a friendly bridge for parents who need warm, structured school holiday childcare without the chaos of a big holiday camp.",
      },
    },
    {
      "@type": "Question",
      name: "Which branches run a holiday club?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Holiday club currently runs at our Harrow, Pinner and Borehamwood Montessori nurseries during half-term weeks and main school holidays. Some weeks may run at fewer branches depending on demand — please check with the branch when you enquire.",
      },
    },
    {
      "@type": "Question",
      name: "What are the holiday club session times?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Holiday club mirrors our regular nursery day, running Monday to Friday from 8:00am to 6:00pm. Optional Early Bird drop-off is available from 7:30am. You can book individual days or a full week.",
      },
    },
    {
      "@type": "Question",
      name: "What activities run during holiday club?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Each week has a theme — from forest school adventures and mud kitchen cooking, to Montessori practical-life workshops, story-led art and music. Children also get outdoor garden play, structured snack-and-meal times and quiet rest moments.",
      },
    },
    {
      "@type": "Question",
      name: "How do I book a place at holiday club?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Get in touch via our contact form or call your nearest branch and tell us which dates you'd like. We'll confirm availability and send a simple booking form — most weeks book up at least a fortnight ahead so it's worth enquiring early.",
      },
    },
  ],
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home",       item: "https://bluenest.uk/" },
    { "@type": "ListItem", position: 2, name: "Admission",  item: "https://bluenest.uk/admission" },
    { "@type": "ListItem", position: 3, name: "Holiday Club", item: "https://bluenest.uk/admission/holiday-club" },
  ],
};

const audiences = [
  {
    icon: Users,
    color: "#cf7d9c",
    bg: "rgba(246,213,223,0.45)",
    title: "Blue Nest families",
    blurb: "Continuity for your child during half-terms and main school holidays.",
  },
  {
    icon: Heart,
    color: "#5fc8c7",
    bg: "rgba(127,216,210,0.28)",
    title: "Children from other settings",
    blurb: "A warm, structured alternative to large holiday camps for ages 2-5.",
  },
  {
    icon: Sun,
    color: "#f0bd55",
    bg: "rgba(247,215,116,0.32)",
    title: "Working parents",
    blurb: "Reliable 8am-6pm cover during school holidays, with Early Bird option.",
  },
];

const branches = [
  {
    name: "Harrow",
    href: "/branches/harrow",
    locality: "Harrow on the Hill · South Harrow · Rayners Lane",
    accent: "#cf7d9c",
    bg: "rgba(246,213,223,0.45)",
  },
  {
    name: "Pinner",
    href: "/branches/pinner",
    locality: "Pinner · Hatch End · Eastcote · Northwood Hills",
    accent: "#5fc8c7",
    bg: "rgba(127,216,210,0.28)",
  },
  {
    name: "Borehamwood",
    href: "/branches/borehamwood",
    locality: "Borehamwood · Elstree · Radlett · Bushey",
    accent: "#8ecb9b",
    bg: "rgba(142,203,155,0.25)",
  },
];

const sessions = [
  { icon: Sun,         label: "Early Bird drop-off", value: "7:30 am – 8:00 am",  note: "Optional add-on" },
  { icon: Clock,       label: "Full Day session",    value: "8:00 am – 6:00 pm",  note: "Most popular" },
  { icon: Sparkles,    label: "Morning session",     value: "8:00 am – 1:00 pm",  note: "Includes lunch" },
  { icon: CalendarDays,label: "Afternoon session",   value: "1:00 pm – 6:00 pm",  note: "Includes tea" },
];

const activities = [
  { icon: TreePine,   color: "#8ecb9b", title: "Forest school adventures",      blurb: "Log piles, mud kitchen, nature treasure hunts with our forest school leaders." },
  { icon: Hammer,     color: "#cf7d9c", title: "Montessori practical-life",     blurb: "Real-life baking, gardening, watering and craft work that builds focus and care." },
  { icon: Compass,    color: "#5fc8c7", title: "Themed weekly adventures",      blurb: "Each week has a theme — from ocean explorers to mini-chefs to space scientists." },
  { icon: Sparkles,   color: "#f0bd55", title: "Story-led art & music",         blurb: "Songs, percussion and large-scale collaborative art tied to the week's story." },
  { icon: Leaf,       color: "#82cfc4", title: "Outdoor garden play",           blurb: "Daily fresh-air play, scooters, balance frames and den building in every weather." },
  { icon: Heart,      color: "#f4aac8", title: "Calm rest moments",             blurb: "Quiet reading, sensory exploration and rest time woven through the day." },
];

export default function HolidayClubPage() {
  return (
    <PublicLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* ══════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <Doodle kind="blue-bird"   className="left-[4%]  top-10   h-10 w-10 opacity-60 hidden sm:block" />
        <Doodle kind="leaf"        className="right-[5%] top-12   h-9  w-9  opacity-50 hidden sm:block" />
        <Doodle kind="pink-flower" className="left-[8%]  bottom-8 h-9  w-9  opacity-50 hidden lg:block" />

        <div className="container-site">
          <Reveal eager>
            <div className="mx-auto max-w-3xl text-center">
              <span className="section-kicker">Holiday childcare</span>
              <h1 className="mt-4 font-heading text-[2.5rem] leading-[1.1] text-[var(--ink)] sm:text-[3rem] lg:text-[3.4rem]">
                Nursery Holiday Club in Harrow, Pinner &amp; Borehamwood
              </h1>
              <p className="body-text mx-auto mt-5 max-w-2xl">
                Warm, structured school holiday childcare for children aged 2 to 5. Forest school
                adventures, Montessori practical-life sessions and themed weekly fun across our
                Harrow, Pinner and Borehamwood Montessori nurseries.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <PastelButton href="/contact?enquiry=holiday-club" variant="rose">
                  Enquire about holiday club <ArrowRight className="h-4 w-4" />
                </PastelButton>
                <PastelButton href="#sessions" variant="mint">
                  See session times <ArrowRight className="h-4 w-4" />
                </PastelButton>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          WHO IT'S FOR
      ══════════════════════════════════════════════════════ */}
      <section className="blush-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="leaf"        className="right-[4%] top-10    h-9 w-9 opacity-45 hidden sm:block" />
        <Doodle kind="blue-flower" className="left-[3%]  bottom-10 h-9 w-9 opacity-45 hidden sm:block" />

        <div className="container-site">
          <Reveal>
            <div className="mb-10 text-center">
              <span className="section-kicker">Who it&rsquo;s for</span>
              <h2 className="section-title mt-4 text-[#cf7d9c]">A friendly bridge through the holidays</h2>
              <p className="body-text mx-auto mt-4 max-w-2xl">
                Holiday club is open to current Blue Nest families and children from other
                settings. It&rsquo;s a calm, familiar place for younger children who would find a
                large holiday camp overwhelming.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {audiences.map((a, i) => (
              <Reveal key={a.title} delay={0.06 * i}>
                <div
                  className="flex items-start gap-3 rounded-[1.6rem] px-5 py-5 ring-1 ring-[rgba(90,74,66,0.07)]"
                  style={{ background: a.bg }}
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/70">
                    <a.icon className="h-4 w-4" style={{ color: a.color }} strokeWidth={1.8} />
                  </span>
                  <div>
                    <p className="font-heading text-[1.05rem] leading-snug" style={{ color: a.color }}>
                      {a.title}
                    </p>
                    <p className="mt-1 text-sm leading-[1.6] text-[rgba(90,74,66,0.85)]">{a.blurb}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          AVAILABLE BRANCHES
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="pink-bird" animated="wiggle" className="absolute right-[3%] top-10 h-10 w-10 opacity-50 hidden lg:block" />

        <div className="container-site">
          <Reveal>
            <div className="mb-10 text-center">
              <span className="section-kicker">Available branches</span>
              <h2 className="section-title mt-4 text-[#58c5c7]">Where holiday club runs</h2>
            </div>
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {branches.map((b, i) => (
              <Reveal key={b.name} delay={0.06 * i}>
                <Link
                  href={b.href}
                  className="group flex h-full flex-col justify-between rounded-[2rem] px-6 py-7 ring-1 ring-[rgba(90,74,66,0.07)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(90,74,66,0.10)]"
                  style={{ background: b.bg }}
                >
                  <div>
                    <h3 className="font-heading text-[1.6rem] leading-tight" style={{ color: b.accent }}>
                      {b.name}
                    </h3>
                    <p className="mt-2 text-sm leading-[1.6] text-[rgba(90,74,66,0.85)]">{b.locality}</p>
                  </div>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: b.accent }}>
                    Visit branch page <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.18}>
            <p className="body-text mx-auto mt-8 max-w-2xl text-center text-sm">
              Most weeks run at all three sites. During quieter weeks we may consolidate to one
              branch — please{" "}
              <Link href="/contact?enquiry=holiday-club" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">
                check with us
              </Link>{" "}
              before you book.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SESSION TIMES
      ══════════════════════════════════════════════════════ */}
      <section id="sessions" className="blush-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="leaf" className="left-[3%] bottom-10 h-9 w-9 opacity-45 hidden sm:block" />

        <div className="container-site">
          <Reveal>
            <div className="mb-10 text-center">
              <span className="section-kicker">Session times</span>
              <h2 className="section-title mt-4 text-[#cf7d9c]">Daily holiday club sessions</h2>
              <p className="body-text mx-auto mt-4 max-w-2xl">
                Book individual days or whole weeks. Sessions mirror our regular nursery day so
                children settle in fast.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {sessions.map((s, i) => (
              <Reveal key={s.label} delay={0.06 * i}>
                <div className="flex h-full flex-col items-center rounded-[1.6rem] bg-white px-5 py-6 text-center shadow-[0_10px_24px_rgba(90,74,66,0.08)] ring-1 ring-[rgba(90,74,66,0.05)]">
                  <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(127,216,210,0.22)]">
                    <s.icon className="h-5 w-5 text-[#5fc8c7]" strokeWidth={1.8} />
                  </span>
                  <p className="font-heading text-[1.05rem] leading-tight text-[var(--ink)]">{s.label}</p>
                  <p className="mt-1.5 text-sm font-semibold text-[#cf7d9c]">{s.value}</p>
                  <p className="mt-1 text-xs text-[rgba(90,74,66,0.85)]">{s.note}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          ACTIVITIES
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="leaf"        className="right-[4%] top-10    h-9 w-9 opacity-45 hidden sm:block" />
        <Doodle kind="pink-flower" className="left-[3%]  bottom-10 h-9 w-9 opacity-45 hidden lg:block" />

        <div className="container-site">
          <Reveal>
            <div className="mb-10 text-center">
              <span className="section-kicker">Activities</span>
              <h2 className="section-title mt-4 text-[#58c5c7]">What children get up to</h2>
              <p className="body-text mx-auto mt-4 max-w-2xl">
                Every week has a theme that weaves through outdoor exploration, Montessori
                practical-life moments and creative story-led art.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {activities.map((a, i) => (
              <Reveal key={a.title} delay={0.05 * i}>
                <div className="flex h-full flex-col rounded-[2rem] bg-white px-6 py-7 shadow-[0_10px_24px_rgba(90,74,66,0.08)] ring-1 ring-[rgba(90,74,66,0.05)]">
                  <div
                    className="mb-5 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-[0_8px_20px_rgba(90,74,66,0.12)]"
                    style={{ backgroundColor: a.color }}
                  >
                    <a.icon className="h-5 w-5" strokeWidth={1.8} />
                  </div>
                  <h3 className="font-heading text-[1.35rem] leading-snug" style={{ color: a.color }}>
                    {a.title}
                  </h3>
                  <p className="body-text mt-2 flex-1 text-sm">{a.blurb}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          HOW TO ENQUIRE
      ══════════════════════════════════════════════════════ */}
      <section className="blush-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="blue-bird" animated="float" className="absolute left-[3%] top-10 h-10 w-10 opacity-50 hidden lg:block" />

        <div className="container-site">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <span className="section-kicker">How to book</span>
              <h2 className="section-title mt-4 text-[#cf7d9c]">Reserve your child&rsquo;s place</h2>
              <p className="body-text mt-5">
                Most weeks book up at least a fortnight ahead. Send us the dates you&rsquo;d like
                and we&rsquo;ll confirm availability with a simple booking form.
              </p>

              <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <a
                  href="tel:02088615574"
                  className="inline-flex items-center gap-2.5 rounded-full bg-white px-6 py-3 font-heading text-[1.15rem] leading-none tracking-[0.04em] text-[var(--ink)] shadow-[0_6px_18px_rgba(90,74,66,0.10)] transition hover:-translate-y-0.5"
                >
                  <Phone className="h-4 w-4 text-[#5fc8c7]" />
                  020 8861 5574
                </a>
                <a
                  href="mailto:manager@bluenest.uk?subject=Holiday%20Club%20enquiry"
                  className="inline-flex items-center gap-2.5 rounded-full bg-white px-6 py-3 font-heading text-[1.15rem] leading-none tracking-[0.04em] text-[var(--ink)] shadow-[0_6px_18px_rgba(90,74,66,0.10)] transition hover:-translate-y-0.5"
                >
                  <Mail className="h-4 w-4 text-[#5fc8c7]" />
                  manager@bluenest.uk
                </a>
              </div>

              <div className="mt-8">
                <PastelButton href="/contact?enquiry=holiday-club" variant="rose">
                  Send a holiday club enquiry <ArrowRight className="h-4 w-4" />
                </PastelButton>
              </div>
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
              <span className="section-kicker">Make the holidays warm</span>
              <h2 className="section-title mt-4 text-[var(--ink)]">
                A nursery holiday club children love
              </h2>
              <p className="body-text mx-auto mt-5 max-w-lg">
                Whether you&rsquo;re searching for holiday club Pinner, Harrow or Borehamwood —
                we&rsquo;d love to welcome your child to Blue Nest these school holidays.
              </p>
              <div className="mt-8">
                <PastelButton href="/contact?enquiry=holiday-club" variant="rose">
                  Contact Us <ArrowRight className="h-4 w-4" />
                </PastelButton>
              </div>
            </div>
          </Reveal>
        </div>
      </ZigzagBand>

    </PublicLayout>
  );
}
