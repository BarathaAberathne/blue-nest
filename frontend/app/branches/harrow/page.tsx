import type { Metadata } from "next";
import Script from "next/script";
import {
  Activity,
  ArrowRight,
  Heart,
  Languages,
  Leaf,
  Lightbulb,
  Mail,
  Monitor,
  Music,
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
import BranchMap from "@/components/contact/BranchMap";
import BranchHero from "@/components/sections/BranchHero";
import BranchEnrichmentSection, { type EnrichmentActivity } from "@/components/sections/BranchEnrichmentSection";

const branchJsonLd = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "ChildCare"],
  name: "Blue Nest Montessori School — Harrow",
  url: "https://bluenest.uk/branches/harrow",
  telephone: "02088615574",
  email: "manager@bluenest.uk",
  openingHours: "Mo-Fr 07:30-18:00",
  address: {
    "@type": "PostalAddress",
    streetAddress: "29 Churchfield Close",
    addressLocality: "Harrow",
    postalCode: "HA2 6BD",
    addressCountry: "GB",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 51.5795,
    longitude: -0.3668,
  },
  parentOrganization: { "@id": "https://bluenest.uk/#organization" },
};

export const metadata: Metadata = {
  alternates: { canonical: "/branches/harrow" },
  title: "Harrow Nursery — Blue Nest Montessori School",
  description:
    "Blue Nest Montessori School Harrow — a warm, nurturing Montessori nursery for children aged 3 months to 5 years in Harrow, London.",
  openGraph: {
    title: "Harrow Nursery — Blue Nest Montessori School",
    description:
      "Montessori nursery in Harrow for children aged 3 months to 5 years. Ofsted Good · Award-winning · Government funding available.",
    url: "/branches/harrow",
    images: [{ url: "/home/branches/harrow/harrow-hero.jpg", width: 1920, height: 1440, alt: "Children playing in the wisteria-shaded garden at Blue Nest Montessori Harrow" }],
    type: "website",
  },
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

// ── Weekly enrichment activities ──────────────────────────────────────────────

const enrichmentActivities: EnrichmentActivity[] = [
  { name: "Lunge & Leap",    icon: Activity,  accent: "#ef8cab" },
  { name: "Yoga",            icon: Sparkles,  accent: "#82cfc4" },
  { name: "Music Sessions",  icon: Music,     accent: "#f0bd55" },
  { name: "French Lesson",   icon: Languages, accent: "#cf7d9c" },
  { name: "Computer Lesson", icon: Monitor,   accent: "#6ecfc9" },
];

// ── Gallery ────────────────────────────────────────────────────────────────────

const gallery = [
  {
    src: "/home/branches/harrow/harrow-gallery-01.webp",
    alt: "Storytelling table at Blue Nest Montessori Harrow with Little Red Riding Hood book and Montessori letter cards",
    rotate: -2,
    caption: "Prepared environments",
  },
  {
    src: "/home/branches/harrow/harrow-gallery-02.webp",
    alt: "Toddler at the Little Ducks water-play table with a Blue Nest Montessori Harrow teacher",
    rotate: 2,
    caption: "Sensory water play",
  },
  {
    src: "/home/branches/harrow/harrow-gallery-03.webp",
    alt: "Teacher and toddler exploring a citrus water sensory tray at Blue Nest Montessori Harrow",
    rotate: -1,
    caption: "Hands-on discovery",
  },
  {
    src: "/home/branches/harrow/harrow-gallery-04.webp",
    alt: "Child walking on Montessori balance frames at Blue Nest Montessori Harrow",
    rotate: 2,
    caption: "Practical life",
  },
  {
    src: "/home/branches/harrow/harrow-gallery-05.webp",
    alt: "Three children running a fizzy volcano science experiment at Blue Nest Montessori Harrow",
    rotate: -2,
    caption: "Curious experiments",
  },
  {
    src: "/home/branches/harrow/harrow-gallery-06.webp",
    alt: "Blue Nest Montessori Harrow teacher reading Little Red Riding Hood with a child",
    rotate: 1,
    caption: "Calm, focused moments",
  },
  {
    src: "/home/branches/harrow/harrow-gallery-07.webp",
    alt: "Young child focused on an outdoor wood-and-water sensory tray at Blue Nest Montessori Harrow",
    rotate: -1,
    caption: "Outdoor exploration",
  },
  {
    src: "/home/branches/harrow/harrow-gallery-08.webp",
    alt: "Smiling toddler with a food sensory tray at Blue Nest Montessori Harrow",
    rotate: 2,
    caption: "Joyful learning",
  },
  {
    src: "/home/branches/harrow/harrow-gallery-09.webp",
    alt: "Child playing a drum kit during a music session at Blue Nest Montessori Harrow",
    rotate: -2,
    caption: "Music sessions",
  },
  {
    src: "/home/branches/harrow/harrow-gallery-10.webp",
    alt: "Children at the ice-cream parlour role-play area at Blue Nest Montessori Harrow",
    rotate: 1,
    caption: "Imaginative play",
  },
];

// ── Page ───────────────────────────────────────────────────────────────────────

export default function HarrowBranchPage() {
  return (
    <PublicLayout>
      <Script
        id="harrow-branch-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(branchJsonLd) }}
      />

      <BranchHero
        branch="harrow"
        location="Harrow, London"
        heading="Montessori Nursery in Harrow"
        description="At Blue Nest Montessori School Harrow, we provide a warm, nurturing and stimulating environment where children can learn, develop and grow with confidence — a home away from home for every child's early years journey."
        image="/home/branches/harrow/harrow-hero.webp"
        imageAlt="Children playing in the wisteria-shaded garden at Blue Nest Montessori Harrow"
        primaryCta={{ label: "Book a Visit", href: "/contact?enquiry=book-visit&branch=harrow", variant: "rose" }}
        secondaryCta={{ label: "Contact Us", href: "#visit", variant: "mint" }}
      />

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
                  src="/home/branches/harrow/harrow-welcome.webp"
                  alt="Two children reading inside the leaf-covered teepee in the Blue Nest Montessori Harrow garden"
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
          3.5 — WEEKLY ENRICHMENT ACTIVITIES
      ══════════════════════════════════════════════════════ */}
      <BranchEnrichmentSection activities={enrichmentActivities} branchName="Harrow" />

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
                  src="/home/branches/harrow/harrow-daily.webp"
                  alt="A Blue Nest Montessori Harrow teacher at play with a young child"
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
                  <PastelButton href="/contact?enquiry=arrange-a-visit&branch=harrow" variant="rose">
                    Book a Visit <ArrowRight className="h-4 w-4" />
                  </PastelButton>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="h-[320px] overflow-hidden rounded-[1.8rem] shadow-[0_4px_20px_rgba(90,74,66,0.10)] sm:h-[400px]">
                <BranchMap branchId="harrow" />
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
                <PastelButton href="/contact?enquiry=arrange-a-visit&branch=harrow" variant="rose">
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
