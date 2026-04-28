import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowRight,
  Heart,
  Leaf,
  Lightbulb,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  SunMedium,
  TreePine,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import PastelButton from "@/components/ui/PastelButton";
import StickerCard from "@/components/ui/StickerCard";
import ZigzagBand from "@/components/ui/ZigzagBand";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";
import { LightboxGallery } from "@/components/ui/LightboxGallery";

export const metadata: Metadata = {
  title: "Harrow Nursery — Blue Nest Montessori School",
  description:
    "Blue Nest Montessori School Harrow — a warm, nurturing Montessori nursery for children aged 3 months to 5 years in Harrow, London.",
};

// ── Features ───────────────────────────────────────────────────────────────────

type Feature = { icon: LucideIcon; title: string; desc: string; accent: string };

const features: Feature[] = [
  {
    icon: Sparkles,
    title: "Spacious Classrooms",
    desc: "Bright, airy rooms filled with natural light and thoughtfully arranged Montessori spaces.",
    accent: "#ef8cab",
  },
  {
    icon: Lightbulb,
    title: "Montessori Materials",
    desc: "Carefully selected hands-on learning materials that spark curiosity and independent thinking.",
    accent: "#6ecfc9",
  },
  {
    icon: Leaf,
    title: "Outdoor Play Areas",
    desc: "Dedicated outdoor spaces where children explore nature, develop motor skills and breathe fresh air.",
    accent: "#7fd8d2",
  },
  {
    icon: TreePine,
    title: "Forest School Access",
    desc: "Regular forest school sessions that build confidence, resilience and a love of the natural world.",
    accent: "#8ecb9b",
  },
  {
    icon: Heart,
    title: "Caring, Experienced Staff",
    desc: "Our dedicated team nurtures every child individually, building strong bonds and genuine trust.",
    accent: "#f4aac8",
  },
  {
    icon: ShieldCheck,
    title: "Safe & Secure",
    desc: "Rigorously maintained safety standards, enhanced DBS-checked staff and secure entry systems.",
    accent: "#b99fe0",
  },
];

// ── Gallery ────────────────────────────────────────────────────────────────────

const gallery = [
  {
    src: "/home/DSC_0151.jpg",
    alt: "Children engaged in a learning activity",
    rotate: -2,
    caption: "Learning through play",
  },
  {
    src: "/home/DSC_0177.jpg",
    alt: "Prepared Montessori classroom",
    rotate: 2,
    caption: "Prepared environments",
  },
  {
    src: "/home/outdoor-learning-and-play-area.jpg",
    alt: "Outdoor learning and play area",
    rotate: -1,
    caption: "Outdoor classroom",
  },
  {
    src: "/home/outdoor-childrens-play-area.jpg",
    alt: "Children's outdoor play area",
    rotate: 2,
    caption: "Garden and play",
  },
  {
    src: "/home/outdoor-childrens-play-area2.jpg",
    alt: "Outdoor activities at Blue Nest",
    rotate: -2,
    caption: "Fresh air every day",
  },
  {
    src: "/home/structured-routine.jpg",
    alt: "Structured routine at Blue Nest",
    rotate: 1,
    caption: "Calm, consistent routines",
  },
];

// ── Page ───────────────────────────────────────────────────────────────────────

export default function HarrowBranchPage() {
  return (
    <PublicLayout>

      {/* ══════════════════════════════════════════════════════
          1 — HERO
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative flex min-h-[62vh] items-center">

        {/* Background image + soft overlays */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Image
            src="/home/outdoor-learning-and-play-area.jpg"
            alt="Blue Nest Montessori Harrow nursery environment"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[#fff8f2]/72" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_55%,rgba(246,213,223,0.55),transparent_50%),radial-gradient(ellipse_at_80%_22%,rgba(127,216,210,0.2),transparent_42%)]" />
          <div
            className="absolute inset-0 opacity-[0.28]"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(90,74,66,0.07) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
        </div>

        {/* Doodles */}
        <Doodle kind="blue-bird"   animated="float" className="absolute right-[5%]  top-8     h-11 w-11 opacity-55 hidden lg:block" />
        <Doodle kind="pink-flower"                  className="absolute left-[3%]   bottom-10 h-10 w-10 opacity-50 hidden sm:block" />

        <div className="relative z-10 w-full px-6 sm:px-10 lg:px-16 xl:px-20 py-16 sm:py-20 lg:py-24">
          <Reveal>
            <span className="section-kicker">Harrow, London</span>
            <h1 className="mt-4 font-heading text-[2.4rem] leading-[1.15] text-[var(--ink)] sm:text-[2.9rem] lg:text-[3.2rem] max-w-3xl">
              Montessori Nursery in Harrow
            </h1>
            <p className="body-text mt-5 max-w-xl">
              At Blue Nest Montessori School Harrow, we provide a warm, nurturing and stimulating
              environment where children can learn, develop and grow with confidence. Our Harrow
              nursery is designed to feel like a home away from home, supporting every child&rsquo;s
              early years journey.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <PastelButton href="/contact" variant="rose">
                Contact Us <ArrowRight className="h-4 w-4" />
              </PastelButton>
              <PastelButton href="#visit" variant="mint">
                Book a Visit <ArrowRight className="h-4 w-4" />
              </PastelButton>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          2 — ABOUT / WELCOME
      ══════════════════════════════════════════════════════ */}
      <section className="blush-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="leaf"        className="right-[4%] top-10    h-9 w-9 opacity-45 hidden sm:block" />
        <Doodle kind="blue-flower" className="left-[3%]  bottom-10 h-9 w-9 opacity-45 hidden sm:block" />

        <div className="container-site">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">

            {/* Image — left */}
            <Reveal>
              <div className="mx-auto w-full max-w-[420px]">
                <StickerCard
                  src="/home/children-outdoor-play.jpg"
                  alt="Children at Blue Nest Montessori Harrow"
                  rotate={-3}
                  sizes="(max-width: 1024px) 80vw, 38vw"
                  className="w-full"
                  aspectRatio="4/5"
                />
              </div>
            </Reveal>

            {/* Text — right */}
            <Reveal delay={0.1}>
              <span className="section-kicker">Welcome</span>
              <h2 className="section-title mt-4 text-[#58c5c7]">
                Welcome to Our Harrow Nursery
              </h2>
              <div className="body-text mt-5 space-y-5">
                <p>
                  Our Harrow nursery offers a calm, structured environment based on Montessori
                  principles. Children are encouraged to explore, learn independently and develop
                  essential life skills through hands-on activities.
                </p>
                <p>
                  We provide carefully prepared classrooms, outdoor play areas and a caring team
                  who support each child&rsquo;s development at their own pace.
                </p>
              </div>
            </Reveal>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          3 — FEATURES
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="pink-bird" animated="wiggle" className="absolute right-[3%] top-10 h-10 w-10 opacity-50 hidden lg:block" />

        <div className="container-site">
          <Reveal>
            <div className="mb-10 text-center">
              <span className="section-kicker">What makes us special</span>
              <h2 className="section-title mt-4 text-[#cf7d9c]">
                Why Choose Our Harrow Nursery
              </h2>
            </div>
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={0.06 * i}>
                <div className="flex h-full flex-col rounded-[2rem] bg-white px-6 py-7 shadow-[0_10px_24px_rgba(90,74,66,0.08)] ring-1 ring-[rgba(90,74,66,0.05)]">
                  <div
                    className="mb-5 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_8px_20px_rgba(90,74,66,0.12)]"
                    style={{ backgroundColor: f.accent }}
                  >
                    <f.icon className="h-6 w-6" strokeWidth={1.8} />
                  </div>
                  <h3
                    className="font-heading text-[1.5rem] leading-snug"
                    style={{ color: f.accent }}
                  >
                    {f.title}
                  </h3>
                  <p className="body-text mt-3 flex-1 text-sm">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          4 — GALLERY
      ══════════════════════════════════════════════════════ */}
      <section className="blush-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="leaf"        className="left-[2%]  top-10    h-9 w-9 opacity-45 hidden sm:block" />
        <Doodle kind="blue-flower" className="right-[3%] bottom-10 h-9 w-9 opacity-45 hidden lg:block" />

        <div className="container-site">
          <Reveal>
            <div className="mb-10 text-center">
              <span className="section-kicker">A peek inside</span>
              <h2 className="section-title mt-4 text-[#58c5c7]">Our Harrow Nursery</h2>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <LightboxGallery images={gallery} columns={3} />
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          5 — DAILY LIFE
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="pink-flower" className="right-[4%] top-10    h-9 w-9 opacity-45 hidden lg:block" />
        <Doodle kind="leaf"        className="left-[3%]  bottom-10 h-9 w-9 opacity-40 hidden sm:block" />

        <div className="container-site">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">

            {/* Text — left */}
            <Reveal>
              <span className="section-kicker">Every day at Blue Nest</span>
              <h2 className="section-title mt-4 text-[#cf7d9c]">
                A Day at Our Harrow Nursery
              </h2>
              <div className="body-text mt-5 space-y-5">
                <p>
                  Children take part in a variety of activities including practical life skills,
                  sensory exploration, creative play and outdoor learning. Our Montessori approach
                  encourages independence, curiosity and confidence.
                </p>
                <p>
                  From morning circle time to afternoon garden play, every moment of the day is
                  purposefully designed to nurture the whole child — socially, emotionally and
                  intellectually.
                </p>
              </div>
              <div className="mt-7">
                <PastelButton href="/why-montessori" variant="mint">
                  About Montessori <ArrowRight className="h-4 w-4" />
                </PastelButton>
              </div>
            </Reveal>

            {/* Image — right */}
            <Reveal delay={0.1}>
              <div className="mx-auto w-full max-w-[420px]">
                <StickerCard
                  src="/home/outdoor-play-for-children.jpg"
                  alt="Children enjoying outdoor play at Blue Nest Harrow"
                  rotate={4}
                  sizes="(max-width: 1024px) 80vw, 38vw"
                  className="w-full"
                  aspectRatio="4/5"
                />
              </div>
            </Reveal>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          6 — CONTACT DETAILS
      ══════════════════════════════════════════════════════ */}
      <section id="visit" className="blush-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="blue-bird" animated="float" className="absolute left-[3%] top-10 h-10 w-10 opacity-50 hidden lg:block" />

        <div className="container-site">
          <Reveal>
            <div className="mb-10 text-center">
              <span className="section-kicker">Find us</span>
              <h2 className="section-title mt-4 text-[#58c5c7]">
                Visit Our Harrow Nursery
              </h2>
            </div>
          </Reveal>

          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">

            {/* Contact info card */}
            <Reveal>
              <div className="flex h-full flex-col justify-center rounded-[2rem] bg-white px-7 py-8 shadow-[0_10px_24px_rgba(90,74,66,0.08)] ring-1 ring-[rgba(90,74,66,0.05)]">
                <h3 className="font-heading text-[1.6rem] leading-tight text-[#cf7d9c]">
                  Blue Nest Montessori School
                </h3>
                <p className="body-text mt-1 text-sm font-semibold">Harrow Branch</p>

                <div className="mt-7 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(90,74,66,0.06)]">
                      <Phone className="h-4 w-4 text-[#5fc8c7]" />
                    </div>
                    <a
                      href="tel:02088615574"
                      className="text-sm font-semibold text-[rgba(90,74,66,0.72)] transition hover:text-[var(--ink)]"
                    >
                      020 8861 5574
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(90,74,66,0.06)]">
                      <Mail className="h-4 w-4 text-[#5fc8c7]" />
                    </div>
                    <a
                      href="mailto:manager@bluenest.uk"
                      className="text-sm font-semibold text-[rgba(90,74,66,0.72)] transition hover:text-[var(--ink)]"
                    >
                      manager@bluenest.uk
                    </a>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(90,74,66,0.06)]">
                      <SunMedium className="h-4 w-4 text-[#5fc8c7]" />
                    </div>
                    <div className="text-sm font-semibold leading-relaxed text-[rgba(90,74,66,0.72)]">
                      <div>Monday – Friday</div>
                      <div>7:30 am – 6:00 pm</div>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <PastelButton href="/contact" variant="rose">
                    Book a Visit <ArrowRight className="h-4 w-4" />
                  </PastelButton>
                </div>
              </div>
            </Reveal>

            {/* Map placeholder */}
            <Reveal delay={0.1}>
              <div
                className="relative overflow-hidden rounded-[2rem] shadow-[0_10px_24px_rgba(90,74,66,0.08)]"
                style={{ minHeight: "320px" }}
              >
                <div className="absolute inset-0 bg-[#5fc8c7]">
                  {/* Grid lines */}
                  <svg className="absolute inset-0 h-full w-full opacity-20" aria-hidden="true">
                    <defs>
                      <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#5a4a42" strokeWidth="0.5" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#map-grid)" />
                  </svg>
                  {/* Stylised roads */}
                  <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
                    <rect x="0" y="42%" width="100%" height="11%" fill="rgba(255,255,255,0.55)" />
                    <rect x="38%" y="0" width="9%" height="100%" fill="rgba(255,255,255,0.55)" />
                    <rect x="66%" y="18%" width="6%" height="55%" fill="rgba(255,255,255,0.35)" />
                  </svg>
                  {/* Location pin */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ef8cab] shadow-[0_6px_18px_rgba(239,140,171,0.45)]">
                        <div className="h-3 w-3 rounded-full bg-white" />
                      </div>
                      <div className="h-3 w-0.5 bg-[#ef8cab]" />
                      <p className="rounded-full bg-white px-3 py-1 text-xs font-bold shadow-sm" style={{ color: "var(--ink)" }}>
                        Blue Nest Harrow
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          7 — FINAL CTA
      ══════════════════════════════════════════════════════ */}
      <ZigzagBand className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="pink-bird"   animated="float" className="absolute left-[4%]  top-10   h-10 w-10 opacity-50 hidden lg:block" />
        <Doodle kind="blue-flower"                  className="absolute right-[3%] bottom-8 h-9  w-9  opacity-45 hidden sm:block" />

        <div className="container-site">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <span className="section-kicker">Come and see us</span>
              <h2 className="section-title mt-4 text-[var(--ink)]">
                Come and See Our Harrow Nursery
              </h2>
              <p className="body-text mx-auto mt-5 max-w-lg">
                We would love to welcome you and your child to Blue Nest Montessori School Harrow.
                Get in touch today to arrange a visit and experience our nurturing environment.
              </p>
              <div className="mt-8">
                <PastelButton href="/contact" variant="rose">
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
