import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Heart,
  Languages,
  Leaf,
  Lightbulb,
  Mail,
  MapPin,
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
import { faqPageJsonLd, branchFaqs } from "@/lib/faq";
import PastelButton from "@/components/ui/PastelButton";
import StickerCard from "@/components/ui/StickerCard";
import ZigzagBand from "@/components/ui/ZigzagBand";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";
import { LightboxGallery } from "@/components/ui/LightboxGallery";
import BranchMap from "@/components/contact/BranchMap";
import BranchHero from "@/components/sections/BranchHero";
import BranchEnrichmentSection, { type EnrichmentActivity } from "@/components/sections/BranchEnrichmentSection";
import FeeCalculatorCard from "@/components/ui/FeeCalculatorCard";

// Branch JSON-LD. Uses Preschool as the primary @type (Google's most
// well-supported nursery/early-years type) alongside ChildCare and
// LocalBusiness for breadth. Links up to the site-wide organisation via
// parentOrganization @id. Includes session offers + opening-hours spec.
const branchJsonLd = {
  "@context": "https://schema.org",
  "@type": ["Preschool", "ChildCare", "LocalBusiness"],
  "@id": "https://bluenest.uk/branches/harrow#preschool",
  name: "Blue Nest Montessori School — Harrow",
  url: "https://bluenest.uk/branches/harrow",
  image: "https://bluenest.uk/home/branches/harrow/harrow-hero.jpg",
  telephone: "+44 20 8861 5574",
  email: "manager@bluenest.uk",
  priceRange: "££",
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
  // Nearby areas families travel from — helps the local-pack surface this
  // branch for searches like "nursery near me" outside the exact postcode.
  areaServed: [
    "Harrow",
    "Harrow on the Hill",
    "South Harrow",
    "North Harrow",
    "West Harrow",
    "Rayners Lane",
    "Wealdstone",
    "Headstone",
    "Pinner",
  ],
  openingHoursSpecification: [{
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "07:30",
    closes: "18:00",
  }],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Nursery sessions",
    itemListElement: [
      { "@type": "Offer", name: "Full Day session",  description: "Monday–Friday, 8:00am–6:00pm" },
      { "@type": "Offer", name: "Morning session",   description: "Monday–Friday, 8:00am–1:00pm" },
      { "@type": "Offer", name: "Afternoon session", description: "Monday–Friday, 1:00pm–6:00pm" },
      { "@type": "Offer", name: "School Day session",description: "Monday–Friday, 9:00am–4:00pm" },
      { "@type": "Offer", name: "Early Bird drop-off", description: "Optional 7:30am–8:00am add-on" },
    ],
  },
  parentOrganization: { "@id": "https://bluenest.uk/#organization" },
};

// Breadcrumb trail for the rich-results breadcrumb chip in search.
const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://bluenest.uk/" },
    { "@type": "ListItem", position: 2, name: "Our nurseries", item: "https://bluenest.uk/#our-nurseries" },
    { "@type": "ListItem", position: 3, name: "Harrow", item: "https://bluenest.uk/branches/harrow" },
  ],
};

export const metadata: Metadata = {
  alternates: { canonical: "/branches/harrow" },
  title: "Montessori Nursery in Harrow — Ages 3 months to 5 years",
  description:
    "Ofsted Good Montessori day nursery in Harrow (HA2) for ages 3 months to 5 years. Serving families across South Harrow, North Harrow, Rayners Lane and Wealdstone. Forest school, funded childcare and warm Montessori care, Mon–Fri 7:30am–6:00pm.",
  openGraph: {
    title: "Montessori Nursery in Harrow — Blue Nest Montessori",
    description:
      "Ofsted Good Montessori nursery in Harrow for ages 3 months to 5 years. Forest school, 15/30 hours funded childcare, weekly enrichment activities. Book a visit today.",
    url: "/branches/harrow",
    images: [{ url: "/home/branches/harrow/harrow-hero.jpg", width: 1920, height: 1440, alt: "Blue Nest Montessori Harrow educator engaging with a young child at a farm-animal sensory tray" }],
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
  {
    src: "/home/branches/harrow/harrow-gallery-11.webp",
    alt: "Children gathered around an outdoor activity table in the Blue Nest Montessori Harrow garden",
    rotate: -2,
    caption: "Outdoor activities",
  },
  {
    src: "/home/branches/harrow/harrow-gallery-12.webp",
    alt: "The outdoor play area with a slide, climbing toys and pergola at Blue Nest Montessori Harrow",
    rotate: 2,
    caption: "Our garden",
  },
  {
    src: "/home/branches/harrow/harrow-gallery-13.webp",
    alt: "Children exploring colourful dough and craft materials at Blue Nest Montessori Harrow",
    rotate: -1,
    caption: "Creative craft",
  },
  {
    src: "/home/branches/harrow/harrow-gallery-14.webp",
    alt: "A colourful small-world village and animal display set up for imaginative play at Blue Nest Montessori Harrow",
    rotate: 1,
    caption: "Small-world play",
  },
  {
    src: "/home/branches/harrow/harrow-gallery-15.webp",
    alt: "An educator guiding two children through a tabletop Montessori activity at Blue Nest Montessori Harrow",
    rotate: -2,
    caption: "Guided learning",
  },
  {
    src: "/home/branches/harrow/harrow-gallery-16.webp",
    alt: "An educator supporting a small group at the activity table at Blue Nest Montessori Harrow",
    rotate: 2,
    caption: "Working together",
  },
  {
    src: "/home/branches/harrow/harrow-gallery-17.webp",
    alt: "Children busy at activity tables across the bright Montessori classroom at Blue Nest Montessori Harrow",
    rotate: -1,
    caption: "Our classroom",
  },
  {
    src: "/home/branches/harrow/harrow-gallery-18.webp",
    alt: "Close-up of a child and educator working on a craft activity at Blue Nest Montessori Harrow",
    rotate: 1,
    caption: "Hands-on making",
  },
  {
    src: "/home/branches/harrow/harrow-gallery-19.webp",
    alt: "Toddler concentrating on a colourful threading activity at Blue Nest Montessori Harrow",
    rotate: -2,
    caption: "Fine-motor focus",
  },
  {
    src: "/home/branches/harrow/harrow-gallery-20.webp",
    alt: "Children together at a group snack-time table at Blue Nest Montessori Harrow",
    rotate: 2,
    caption: "Mealtimes together",
  },
  {
    src: "/home/branches/harrow/harrow-gallery-21.webp",
    alt: "Children using laptops during an ICT session at Blue Nest Montessori Harrow",
    rotate: -1,
    caption: "ICT lessons",
  },
  {
    src: "/home/branches/harrow/harrow-gallery-22.webp",
    alt: "Children gathered for group circle time at Blue Nest Montessori Harrow",
    rotate: 1,
    caption: "Circle time",
  },
  {
    src: "/home/branches/harrow/harrow-gallery-23.webp",
    alt: "A child building words on a letter board with an educator at Blue Nest Montessori Harrow",
    rotate: -2,
    caption: "Early literacy",
  },
  {
    src: "/home/branches/harrow/harrow-gallery-24.webp",
    alt: "A well-prepared Montessori classroom with natural materials and open shelves at Blue Nest Montessori Harrow",
    rotate: 2,
    caption: "Prepared environment",
  },
];

// ── Page ───────────────────────────────────────────────────────────────────────

export default function HarrowBranchPage() {
  return (
    <PublicLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(branchJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd(branchFaqs.harrow)) }}
      />

      <BranchHero
        location="Harrow, London"
        heading="Montessori Nursery in Harrow"
        description="At Blue Nest Montessori School Harrow, we provide a warm, nurturing and stimulating environment where children can learn, develop and grow with confidence — a home away from home for every child's early years journey."
        image="/home/branches/harrow/harrow-hero.webp"
        imageAlt="Blue Nest Montessori Harrow educator engaging with a young child at a farm-animal sensory tray"
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

            {/* Image — left on desktop, below text on mobile */}
            <Reveal className="order-last lg:order-none">
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

            {/* Text — right on desktop, above image on mobile */}
            <Reveal delay={0.1} className="order-first lg:order-none">
              <span className="section-kicker">Welcome</span>
              <h2 className="section-title mt-4 text-[#58c5c7]">
                Welcome to Our Harrow Nursery
              </h2>
              <div className="body-text mt-5 space-y-5">
                <p>
                  Blue Nest is a private Montessori day nursery in Harrow, welcoming children aged
                  3 months to 5 years from families across South Harrow, North Harrow, Rayners
                  Lane, Wealdstone and Headstone. Our calm, structured classrooms blend authentic
                  Montessori principles with the EYFS framework, so independence, language and a
                  genuine love of early years learning grow side by side.
                </p>
                <p>
                  If you&rsquo;ve been searching for a &ldquo;nursery near me&rdquo; in Harrow,
                  we&rsquo;d love to show you our prepared environments, outdoor play areas and
                  forest school sessions. We accept 15 and 30 hours of funded childcare — try our{" "}
                  <Link href="#fee-calculator" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">
                    fee calculator
                  </Link>{" "}
                  to estimate weekly fees, then{" "}
                  <Link href="/admission" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">
                    apply for a place
                  </Link>
                  .
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
                    className="feature-card-title"
                    style={{ color: f.accent }}
                  >
                    {f.title}
                  </h3>
                  <p className="body-text mt-3 flex-1">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          3.5 — WEEKLY ENRICHMENT ACTIVITIES + FEE CALCULATOR
      ══════════════════════════════════════════════════════ */}
      <BranchEnrichmentSection
        activities={enrichmentActivities}
        branchName="Harrow"
        rightSlot={
          <div id="fee-calculator">
            <Reveal>
              <div className="mb-8 text-center">
                <span className="section-kicker">Fees made simple</span>
                <h2 className="section-title mt-4">Estimate Your Harrow Fees</h2>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="mx-auto w-full max-w-[27rem]">
                <FeeCalculatorCard defaultBranch="harrow" />
              </div>
            </Reveal>
          </div>
        }
      />

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
          <LightboxGallery images={gallery} columns={3} />
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
                  A typical day at our Harrow nursery weaves Montessori practical life, sensory
                  exploration, language work and number sense around regular outdoor learning.
                  Children meet EYFS communication, literacy and physical development goals through
                  hands-on materials rather than rigid worksheets.
                </p>
                <p>
                  From morning circle time to afternoon garden play and weekly{" "}
                  <Link href="/forest-school" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">
                    forest school
                  </Link>{" "}
                  sessions, every part of the day is purposefully planned to nurture the whole
                  child — socially, emotionally and intellectually. Read more about our{" "}
                  <Link href="/why-montessori" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">
                    Montessori approach
                  </Link>{" "}
                  or{" "}
                  <Link href="/contact?branch=harrow" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">
                    get in touch
                  </Link>{" "}
                  to book a visit.
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
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(90,74,66,0.06)]">
                      <MapPin className="h-4 w-4 text-[#5fc8c7]" />
                    </div>
                    <address className="not-italic text-sm font-semibold leading-relaxed text-[rgba(90,74,66,0.85)]">
                      29 Churchfield Close<br />Harrow HA2 6BD
                    </address>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(90,74,66,0.06)]">
                      <Phone className="h-4 w-4 text-[#5fc8c7]" />
                    </div>
                    <a
                      href="tel:02088615574"
                      className="text-sm font-semibold text-[rgba(90,74,66,0.85)] transition hover:text-[var(--ink)]"
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
                      className="text-sm font-semibold text-[rgba(90,74,66,0.85)] transition hover:text-[var(--ink)]"
                    >
                      manager@bluenest.uk
                    </a>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(90,74,66,0.06)]">
                      <SunMedium className="h-4 w-4 text-[#5fc8c7]" />
                    </div>
                    <div className="text-sm font-semibold leading-relaxed text-[rgba(90,74,66,0.85)]">
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
