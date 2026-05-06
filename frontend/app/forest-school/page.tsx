import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Compass,
  Hammer,
  BookOpen,
  Star,
  Lightbulb,
  Sprout,
  Shield,
  TreePine,
  Heart,
  Check,
} from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import { Reveal } from "@/components/ui/Motion";

export const metadata: Metadata = {
  title: "Forest School — Blue Nest Montessori School",
  description:
    "Blue Nest Forest School in Harrow & London. Outdoor learning that nurtures curiosity, creativity and independence in children.",
};

// ── Colour tokens derived directly from the Forest School logo ────────────────
// Logo background: deep forest green
// Logo icons/type: warm cream
const C = {
  deep:   "#3a5c38",   // logo background — primary
  darker: "#2c4629",   // CTA section bg
  mid:    "#4e7a4c",   // card borders / accents
  muted:  "#6a9168",   // secondary text on green
  cream:  "#e8e4d9",   // logo icon colour
  bg:     "#f4f1e8",   // warm off-white page bg
  bgAlt:  "#ede9df",   // slightly deeper cream for alternating sections
  text:   "#2a3c29",   // dark green for headings (not pure black)
  body:   "#4a5c48",   // body text
};

// ── SVG icons matching the four logo quadrant symbols ─────────────────────────

function SunIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3.5" fill="currentColor" />
    </svg>
  );
}

function WaterIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none" aria-hidden="true">
      <line x1="3" y1="7"  x2="21" y2="7"  stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="3" y1="11" x2="21" y2="11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="3" y1="15" x2="21" y2="15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="3" y1="19" x2="21" y2="19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function PlantIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor" aria-hidden="true">
      <path d="M11.5 20 C11.5 20 3 16 4.5 7.5 C4.5 7.5 9 5.5 11.5 13" />
      <path d="M12.5 15 C12.5 15 20 11 18.5 3.5 C18.5 3.5 14 3 12.5 11" />
    </svg>
  );
}

function SocietyIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor" aria-hidden="true">
      <circle cx="8.5"  cy="8.5"  r="3" />
      <circle cx="15.5" cy="8.5"  r="3" />
      <circle cx="8.5"  cy="15.5" r="3" />
      <circle cx="15.5" cy="15.5" r="3" />
    </svg>
  );
}

// ── Reusable styled components ─────────────────────────────────────────────────

function GreenBtn({ href, children, outline = false }: { href: string; children: React.ReactNode; outline?: boolean }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
      style={
        outline
          ? { border: `2px solid ${C.deep}`, color: C.deep, background: "transparent" }
          : { background: C.deep, color: C.cream }
      }
    >
      {children}
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ForestSchoolPage() {
  return (
    <PublicLayout>

      {/* ══════════════════════════════════════════════════════════
          HERO — split layout (matches branch page pattern)
      ══════════════════════════════════════════════════════════ */}
      <section
        className="flex flex-col lg:flex-row lg:h-[calc(100dvh-11rem)] overflow-hidden"
        style={{ background: C.bg }}
      >

        {/* ── Left: text panel ─────────────────────────────────── */}
        <div className="relative flex w-full items-center lg:w-1/2" style={{ background: C.bg }}>
          <div className="w-full px-6 py-10 sm:px-10 lg:px-14 xl:px-20 lg:py-0">
            <Reveal className="flex flex-col gap-4">

              <span
                className="text-xs font-bold uppercase tracking-[0.2em]"
                style={{ color: C.muted }}
              >
                Blue Nest Forest School
              </span>

              <h1
                className="font-heading text-[2.4rem] leading-[1.08] sm:text-[3rem] lg:text-[3.4rem]"
                style={{ color: C.text }}
              >
                Forest School<br />in Harrow &amp; London
              </h1>

              <p
                className="text-base font-semibold tracking-wide"
                style={{ color: C.mid }}
              >
                Learn. Explore. Grow. Together.
              </p>

              <p
                className="max-w-md text-[0.95rem] leading-[1.75]"
                style={{ color: C.body }}
              >
                We bring children and nature together through a Montessori-rooted Forest School
                programme — building confidence, curiosity and a lifelong love of the outdoors
                in a safe, nurturing environment.
              </p>

              <div className="flex flex-wrap gap-3 pt-1">
                <GreenBtn href="/contact?enquiry=book-a-visit">
                  Book a Visit <ArrowRight className="h-4 w-4" />
                </GreenBtn>
                <GreenBtn href="/admission" outline>
                  Explore Our Nurseries
                </GreenBtn>
              </div>

              {/* 4 icon pillars */}
              <div
                className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3 border-t pt-4 sm:grid-cols-4"
                style={{ borderColor: `${C.deep}22` }}
              >
                {[
                  { Icon: SunIcon,     label: "Sun",     sub: "Curiosity & Energy" },
                  { Icon: WaterIcon,   label: "Water",   sub: "Adaptability" },
                  { Icon: PlantIcon,   label: "Plant",   sub: "Growth" },
                  { Icon: SocietyIcon, label: "Society", sub: "Community" },
                ].map(({ Icon, label, sub }) => (
                  <div key={label} className="flex items-center gap-3">
                    <Icon className="h-6 w-6 shrink-0" style={{ color: C.deep }} />
                    <div>
                      <p
                        className="text-[0.65rem] font-bold uppercase tracking-[0.18em]"
                        style={{ color: C.deep }}
                      >
                        {label}
                      </p>
                      <p className="text-[0.7rem]" style={{ color: C.body }}>
                        {sub}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

            </Reveal>
          </div>
        </div>

        {/* ── Right: forest school logo fills the column ───────── */}
        <div className="relative hidden lg:block w-1/2 overflow-hidden">
          <Image
            src="/site-images/forest-school-logo.jpg"
            alt="Blue Nest Forest School logo"
            fill
            priority
            className="object-cover object-center"
            sizes="50vw"
          />
        </div>

      </section>


      {/* ══════════════════════════════════════════════════════════
          WHY FOREST SCHOOL? — dark green section
      ══════════════════════════════════════════════════════════ */}
      <section style={{ background: C.deep }} className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">

            {/* Left: text */}
            <Reveal>
              <span
                className="text-[0.65rem] font-bold uppercase tracking-[0.22em]"
                style={{ color: `${C.cream}80` }}
              >
                The Case for Outdoor Learning
              </span>
              <h2
                className="mt-4 font-heading text-[2rem] leading-[1.15] sm:text-[2.5rem]"
                style={{ color: C.cream }}
              >
                Why Forest School?
              </h2>
              <p
                className="mt-4 text-[0.9rem] leading-[1.75]"
                style={{ color: `${C.cream}bb` }}
              >
                Forest School is a child-led approach to outdoor education rooted in progressive
                learning theory — from Froebel to Montessori. It gives children time, space and
                freedom to explore, take managed risks and build genuine self-belief.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Confidence &amp; independence through self-directed learning",
                  "Creativity &amp; problem solving in real-world settings",
                  "Physical wellbeing through active outdoor play",
                  "Social development and cooperative teamwork",
                  "Deep connection with the natural world",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                      style={{ background: `${C.cream}22` }}
                    >
                      <Check className="h-3 w-3" style={{ color: C.cream }} />
                    </span>
                    <span
                      className="text-[0.9rem] leading-relaxed"
                      style={{ color: `${C.cream}cc` }}
                      dangerouslySetInnerHTML={{ __html: item }}
                    />
                  </li>
                ))}
              </ul>
            </Reveal>

            {/* Right: image */}
            <Reveal delay={0.1}>
              <div
                className="relative overflow-hidden rounded-[2.5rem] shadow-2xl aspect-[4/5]"
                style={{ boxShadow: `0 24px 64px ${C.darker}60` }}
              >
                <Image
                  src="/home/forest-school-2.jpg"
                  alt="Children learning in the forest"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 90vw, 44vw"
                />
                <div
                  className="absolute inset-0 opacity-20"
                  style={{ background: `linear-gradient(to top, ${C.darker}, transparent 50%)` }}
                />
              </div>
            </Reveal>

          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════════
          OUR VALUES IN ACTION — 4-column grid
      ══════════════════════════════════════════════════════════ */}
      <section style={{ background: C.bgAlt }} className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="mb-10 text-center">
              <span
                className="text-[0.65rem] font-bold uppercase tracking-[0.22em]"
                style={{ color: C.muted }}
              >
                Our Philosophy
              </span>
              <h2
                className="mt-4 font-heading text-[1.85rem] sm:text-[2.3rem]"
                style={{ color: C.text }}
              >
                Our Values in Action
              </h2>
              <p
                className="mx-auto mt-3 max-w-xl text-[0.9rem] leading-relaxed"
                style={{ color: C.body }}
              >
                Every element of our Forest School programme is guided by four natural principles,
                drawn from the symbols at the heart of our identity.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                Icon: SunIcon,
                label: "Sun",
                title: "Curiosity & Energy",
                body: "Like the sun, children radiate natural energy and wonder. We channel that spark into guided discovery and joyful exploration.",
              },
              {
                Icon: WaterIcon,
                label: "Water",
                title: "Adaptability",
                body: "Water finds its own path. We teach children to adapt, persist and flow around challenges with resilience and calm.",
              },
              {
                Icon: PlantIcon,
                label: "Plant",
                title: "Growth",
                body: "Every child grows at their own pace. We tend each learner individually, nurturing roots that support a lifetime of flourishing.",
              },
              {
                Icon: SocietyIcon,
                label: "Society",
                title: "Community",
                body: "We are stronger together. Forest School builds empathy, cooperation and a sense of belonging in every child.",
              },
            ].map(({ Icon, label, title, body }, i) => (
              <Reveal key={label} delay={i * 0.08}>
                <div
                  className="group flex h-full flex-col rounded-3xl p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  style={{
                    background: "white",
                    boxShadow: `0 4px 20px ${C.deep}0d`,
                    border: `1px solid ${C.deep}12`,
                  }}
                >
                  <div
                    className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
                    style={{ background: `${C.deep}12` }}
                  >
                    <Icon className="h-7 w-7" style={{ color: C.deep } as React.CSSProperties} />
                  </div>
                  <p
                    className="mb-0.5 text-[0.6rem] font-bold uppercase tracking-[0.2em]"
                    style={{ color: C.muted }}
                  >
                    {label}
                  </p>
                  <h3
                    className="mb-2 font-heading text-[1.05rem] leading-snug"
                    style={{ color: C.text }}
                  >
                    {title}
                  </h3>
                  <p className="text-[0.85rem] leading-relaxed" style={{ color: C.body }}>
                    {body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════════
          WHAT CHILDREN DO — 6-activity grid
      ══════════════════════════════════════════════════════════ */}
      <section style={{ background: C.bg }} className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="mb-10 text-center">
              <span
                className="text-[0.65rem] font-bold uppercase tracking-[0.22em]"
                style={{ color: C.muted }}
              >
                A Day in Forest School
              </span>
              <h2
                className="mt-4 font-heading text-[1.85rem] sm:text-[2.3rem]"
                style={{ color: C.text }}
              >
                What Children Do
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { Icon: Compass,    label: "Explore",  desc: "Map their world with wonder" },
              { Icon: Hammer,     label: "Build",    desc: "Create with sticks, stones & mud" },
              { Icon: BookOpen,   label: "Learn",    desc: "Discover through doing" },
              { Icon: Star,       label: "Play",     desc: "Imagination without limits" },
              { Icon: Lightbulb,  label: "Reflect",  desc: "Pause, observe, understand" },
              { Icon: Sprout,     label: "Grow",     desc: "In body, mind and spirit" },
            ].map(({ Icon, label, desc }, i) => (
              <Reveal key={label} delay={i * 0.07}>
                <div
                  className="group flex flex-col items-center rounded-2xl p-4 text-center transition-all duration-200 hover:-translate-y-1"
                  style={{
                    background: "white",
                    border: `1px solid ${C.deep}10`,
                    boxShadow: `0 2px 12px ${C.deep}08`,
                  }}
                >
                  <div
                    className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-200 group-hover:scale-110"
                    style={{ background: `${C.deep}10` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: C.deep }} />
                  </div>
                  <p
                    className="mb-1.5 font-heading text-[0.95rem] font-semibold"
                    style={{ color: C.text }}
                  >
                    {label}
                  </p>
                  <p className="text-[0.72rem] leading-snug" style={{ color: C.body }}>
                    {desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Image strip */}
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { src: "/home/outdoor-childrens-play-area.jpg",  alt: "Children playing outdoors" },
              { src: "/home/children-outdoor-play.jpg",        alt: "Outdoor play" },
              { src: "/home/outdoor-learning-and-play-area.jpg", alt: "Outdoor learning area" },
              { src: "/home/outdoor-play-for-children-new.jpg", alt: "Forest school activities" },
            ].map(({ src, alt }) => (
              <div
                key={src}
                className="relative aspect-square overflow-hidden rounded-2xl"
                style={{ boxShadow: `0 4px 16px ${C.deep}15` }}
              >
                <Image
                  src={src}
                  alt={alt}
                  fill
                  className="object-cover object-center transition-transform duration-500 hover:scale-105"
                  sizes="(max-width: 640px) 50vw, 25vw"
                />
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════════
          CTA — full-width dark green
      ══════════════════════════════════════════════════════════ */}
      <section style={{ background: C.darker }} className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">

            {/* Left: heading + buttons */}
            <Reveal>
              {/* Logo mark */}
              <div className="mb-5 flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/site-images/forest-school-logo.jpg"
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <p
                    className="text-xs font-bold uppercase tracking-[0.18em]"
                    style={{ color: C.cream }}
                  >
                    Blue Nest
                  </p>
                  <p
                    className="text-[0.65rem] font-medium uppercase tracking-[0.15em]"
                    style={{ color: `${C.cream}80` }}
                  >
                    Forest School
                  </p>
                </div>
              </div>

              <h2
                className="font-heading text-[2rem] leading-[1.15] sm:text-[2.5rem]"
                style={{ color: C.cream }}
              >
                Come and Experience Forest School
              </h2>
              <p
                className="mt-4 max-w-md text-[0.9rem] leading-[1.75]"
                style={{ color: `${C.cream}99` }}
              >
                Join us for a visit and see how our Forest School programme helps children
                discover their strengths in the natural world. Places are limited — book early
                to avoid disappointment.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/contact?enquiry=book-a-visit"
                  className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold transition-all duration-200 hover:opacity-90 hover:scale-[1.02]"
                  style={{ background: C.cream, color: C.darker }}
                >
                  Book a Visit <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-full border px-7 py-3.5 text-sm font-semibold transition-all duration-200 hover:bg-white/10"
                  style={{ borderColor: `${C.cream}55`, color: C.cream }}
                >
                  Contact Us
                </Link>
              </div>
            </Reveal>

            {/* Right: feature highlights */}
            <Reveal delay={0.1}>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    Icon: TreePine,
                    title: "Natural Environment",
                    desc: "Woodland settings designed for safe, open-ended outdoor learning.",
                  },
                  {
                    Icon: Shield,
                    title: "Safe &amp; Secure",
                    desc: "Level 3 qualified Forest Leaders with enhanced DBS clearance.",
                  },
                  {
                    Icon: Heart,
                    title: "Experienced Educators",
                    desc: "Staff trained in Montessori principles and Forest School practice.",
                  },
                  {
                    Icon: SocietyIcon,
                    title: "Part of Blue Nest",
                    desc: "Backed by an award-winning Montessori school established since 2019.",
                  },
                ].map(({ Icon, title, desc }, i) => (
                  <div
                    key={title}
                    className="rounded-2xl p-5"
                    style={{
                      background: `${C.cream}0f`,
                      border: `1px solid ${C.cream}18`,
                    }}
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ background: `${C.cream}15` }}>
                      <Icon className="h-5 w-5" style={{ color: C.cream } as React.CSSProperties} />
                    </div>
                    <h3
                      className="mb-1 font-heading text-[0.95rem]"
                      style={{ color: C.cream }}
                      dangerouslySetInnerHTML={{ __html: title }}
                    />
                    <p
                      className="text-[0.8rem] leading-relaxed"
                      style={{ color: `${C.cream}88` }}
                      dangerouslySetInnerHTML={{ __html: desc }}
                    />
                  </div>
                ))}
              </div>
            </Reveal>

          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
