import type { Metadata } from "next";
import Link from "next/link";
import {
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
  Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import { faqPageJsonLd, branchFaqs } from "@/lib/faq";
import PastelButton from "@/components/ui/PastelButton";
import StickerCard from "@/components/ui/StickerCard";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";
import { LightboxGallery } from "@/components/ui/LightboxGallery";
import BranchMap from "@/components/contact/BranchMap";
import BranchEnrichmentSection, { type EnrichmentActivity } from "@/components/sections/BranchEnrichmentSection";
import BranchHero from "@/components/sections/BranchHero";
import { branchContactView, getPublicBranch } from "@/lib/branch-public";
import FeeCalculatorCard from "@/components/ui/FeeCalculatorCard";

// Pinner branch JSON-LD. Preschool is the most-recognised early-years
// schema type — used alongside ChildCare and LocalBusiness. Linked to
// the site-wide organisation via parentOrganization @id.
const branchJsonLd = {
  "@context": "https://schema.org",
  "@type": ["Preschool", "ChildCare", "LocalBusiness"],
  "@id": "https://bluenest.uk/branches/pinner#preschool",
  name: "Blue Nest Montessori School — Pinner",
  url: "https://bluenest.uk/branches/pinner",
  image: "https://bluenest.uk/home/branches/pinner/pinner-hero.jpg",
  telephone: "+44 7400 430630",
  email: "manager@bluenest.uk",
  priceRange: "££",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Cuckoo Hill Road",
    addressLocality: "Pinner",
    postalCode: "HA5 1AY",
    addressCountry: "GB",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 51.5919,
    longitude: -0.3795,
  },
  areaServed: [
    "Pinner",
    "Hatch End",
    "Eastcote",
    "Rayners Lane",
    "North Harrow",
    "Northwood Hills",
    "Pinner Green",
    "Harrow",
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
      { "@type": "Offer", name: "Full Day session",   description: "Monday–Friday, 8:00am–6:00pm" },
      { "@type": "Offer", name: "Morning session",    description: "Monday–Friday, 8:00am–1:00pm" },
      { "@type": "Offer", name: "Afternoon session",  description: "Monday–Friday, 1:00pm–6:00pm" },
      { "@type": "Offer", name: "School Day session", description: "Monday–Friday, 9:00am–4:00pm" },
      { "@type": "Offer", name: "Early Bird drop-off", description: "Optional 7:30am–8:00am add-on" },
      { "@type": "Offer", name: "Holiday Club Pinner", description: "Term-break childcare for ages 3–5" },
    ],
  },
  parentOrganization: { "@id": "https://bluenest.uk/#organization" },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://bluenest.uk/" },
    { "@type": "ListItem", position: 2, name: "Our nurseries", item: "https://bluenest.uk/#our-nurseries" },
    { "@type": "ListItem", position: 3, name: "Pinner", item: "https://bluenest.uk/branches/pinner" },
  ],
};

export const metadata: Metadata = {
  alternates: { canonical: "/branches/pinner" },
  // Title leads with "Pinner nursery" — the Yell ranking report shows
  // we sit at position 33 for "nursery pinner" despite getting 39
  // impressions/month, so prioritising that exact phrase in the title is
  // the single biggest CTR/rank lever for this page.
  title: "Pinner Nursery — Montessori Day Nursery in Pinner (HA5)",
  description:
    "Ofsted Good Montessori day nursery in Pinner (HA5) for ages 3 months to 5 years. Serving Pinner, Hatch End, Eastcote, Rayners Lane and Northwood Hills families. Forest school, 15/30 hours funded childcare and Pinner holiday club.",
  openGraph: {
    title: "Pinner Nursery — Blue Nest Montessori",
    description:
      "Montessori day nursery in Pinner for ages 3 months to 5 years. Ofsted Good · funded childcare · forest school · holiday club. Book a visit today.",
    url: "/branches/pinner",
    images: [{ url: "/home/branches/pinner/pinner-office.jpg", width: 1200, height: 800, alt: "An educator and children at a busy activity table at Blue Nest Pinner" }],
    type: "website",
  },
};

type Feature = { icon: LucideIcon; title: string; desc: string; accent: string };

const features: Feature[] = [
  {
    icon: Sparkles,
    title: "Prepared Classrooms",
    desc: "Bright, calm rooms arranged with authentic Montessori materials that invite exploration and independent thought.",
    accent: "#ef8cab",
  },
  {
    icon: Leaf,
    title: "Forest School",
    desc: "Our dedicated outdoor Forest School area gives children weekly connection with nature, building resilience and curiosity.",
    accent: "#82cfc4",
  },
  {
    icon: TreePine,
    title: "Outdoor Learning",
    desc: "Spacious garden and play areas where children develop motor skills, breathe fresh air and learn through movement.",
    accent: "#8ecb9b",
  },
  {
    icon: Lightbulb,
    title: "EYFS & Montessori",
    desc: "We blend the EYFS framework with Montessori principles so every child receives the very best of both approaches.",
    accent: "#6ecfc9",
  },
  {
    icon: Heart,
    title: "Experienced Team",
    desc: "Our caring, highly trained team builds genuine bonds with every child, supporting their growth and wellbeing daily.",
    accent: "#f4aac8",
  },
  {
    icon: ShieldCheck,
    title: "Safe & Secure",
    desc: "Rigorously maintained safety standards, enhanced DBS-checked staff and secure entry systems at every door.",
    accent: "#b99fe0",
  },
];

const enrichmentActivities: EnrichmentActivity[] = [
  { name: "Yoga",                       icon: Sparkles,  accent: "#ef8cab" },
  { name: "Super Star Sports",          icon: Trophy,    accent: "#f0bd55" },
  { name: "Music and Movement Session", icon: Music,     accent: "#82cfc4" },
  { name: "Spanish Lesson",             icon: Languages, accent: "#cf7d9c" },
  { name: "ICT Lesson",                 icon: Monitor,   accent: "#6ecfc9" },
];

const gallery = [
  {
    src: "/home/branches/pinner/pinner-gallery-01.webp",
    alt: "An educator and children at a tabletop snack and craft activity at Blue Nest Pinner",
    rotate: -2,
    caption: "Tabletop activity",
  },
  {
    src: "/home/branches/pinner/pinner-gallery-02.webp",
    alt: "Children exploring a small-world village and animal display in the Blue Nest Pinner garden",
    rotate: 2,
    caption: "Small-world garden",
  },
  {
    src: "/home/branches/pinner/pinner-gallery-03.webp",
    alt: "An educator with children at an outdoor activity table at Blue Nest Pinner",
    rotate: -1,
    caption: "Outdoor activity",
  },
  {
    src: "/home/branches/pinner/pinner-gallery-04.webp",
    alt: "Children at a reading and letters activity at Blue Nest Pinner",
    rotate: 2,
    caption: "Reading & letters",
  },
  {
    src: "/home/branches/pinner/pinner-gallery-05.webp",
    alt: "A child working on a tabletop activity with an educator at Blue Nest Pinner",
    rotate: -2,
    caption: "Guided learning",
  },
  {
    src: "/home/branches/pinner/pinner-gallery-06.webp",
    alt: "Children gathered around the outdoor water-play table at Blue Nest Pinner",
    rotate: 1,
    caption: "Water play",
  },
  {
    src: "/home/branches/pinner/pinner-gallery-07.webp",
    alt: "An educator and children at the outdoor water-play table at Blue Nest Pinner",
    rotate: -1,
    caption: "Sensory water play",
  },
  {
    src: "/home/branches/pinner/pinner-gallery-08.webp",
    alt: "Children at an outdoor floor activity on a colourful mat at Blue Nest Pinner",
    rotate: 2,
    caption: "Outdoor learning",
  },
  {
    src: "/home/branches/pinner/pinner-gallery-09.webp",
    alt: "Children gathered for a group activity on the mat outdoors at Blue Nest Pinner",
    rotate: -2,
    caption: "Group time outdoors",
  },
  {
    src: "/home/branches/pinner/pinner-gallery-10.webp",
    alt: "Children playing with toys on a mat in the Blue Nest Pinner garden",
    rotate: 1,
    caption: "Garden play",
  },
  {
    src: "/home/branches/pinner/pinner-gallery-11.webp",
    alt: "A child exploring the outdoor garden at Blue Nest Pinner",
    rotate: -1,
    caption: "Outdoor exploration",
  },
  {
    src: "/home/branches/pinner/pinner-gallery-12.webp",
    alt: "Children at the outdoor Mud Cafe mud-kitchen station at Blue Nest Pinner",
    rotate: 2,
    caption: "Mud kitchen",
  },
  {
    src: "/home/branches/pinner/pinner-gallery-13.webp",
    alt: "A child playing at the outdoor mud kitchen at Blue Nest Pinner",
    rotate: -2,
    caption: "Mud play",
  },
  {
    src: "/home/branches/pinner/pinner-gallery-14.webp",
    alt: "A small-world nature display with plants and toy animals in the Blue Nest Pinner garden",
    rotate: 1,
    caption: "Nature display",
  },
];

export default async function PinnerBranchPage() {
  // Live contact data (phone/address/hours) from the backend; the literals in
  // this file remain only inside the roster fallback (lib/branch-public).
  const branch = await getPublicBranch("pinner");
  const c = branchContactView("pinner", branch);
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd(branchFaqs.pinner)) }}
      />

      <BranchHero
        location="Pinner, London"
        heading="Montessori Nursery in Pinner"
        description="At Blue Nest Montessori School Pinner, we combine authentic Montessori learning with a calm, home-away-from-home atmosphere. Set in leafy Pinner, our nursery offers spacious outdoor spaces and a dedicated Forest School programme."
        image="/home/branches/pinner/pinner-hero.webp"
        imageAlt="An educator engaging two young children in a hands-on Montessori activity at Blue Nest Montessori Pinner"
        primaryCta={{ label: "Book a Visit", href: "/contact?enquiry=book-visit&branch=pinner", variant: "rose" }}
        secondaryCta={{ label: "Contact Us", href: "#visit", variant: "mint" }}
      />

      {/* ══════════════════════════════════════════════════════
          2 — ABOUT
      ══════════════════════════════════════════════════════ */}
      <section className="blush-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="leaf"        className="right-[4%] top-10    h-9 w-9 opacity-45 hidden sm:block" />
        <Doodle kind="blue-flower" className="left-[3%]  bottom-10 h-9 w-9 opacity-45 hidden sm:block" />

        <div className="container-site">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
            <Reveal>
              <div className="mx-auto w-full max-w-[420px]">
                <StickerCard
                  src="/home/branches/pinner/pinner-welcome.webp"
                  alt="An educator and child watering bean plants at a nature and plant-growing activity at Blue Nest Pinner"
                  rotate={-3}
                  sizes="(max-width: 1024px) 80vw, 38vw"
                  className="w-full"
                  aspectRatio="4/5"
                />
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <span className="section-kicker">Welcome</span>
              <h2 className="section-title mt-4">Welcome to Our Pinner Nursery</h2>
              <div className="body-text mt-5 space-y-5">
                <p>
                  Blue Nest is a Montessori day nursery in Pinner (HA5), welcoming children aged
                  3 months to 5 years from families across Pinner, Hatch End, Eastcote, Rayners
                  Lane and Northwood Hills. Our Pinner nursery blends authentic Montessori
                  materials with the EYFS framework, plus real-life practical activities and one-
                  to-one moments with a familiar key person.
                </p>
                <p>
                  Looking for a Montessori nursery in Pinner with its own outdoor space and a
                  proper forest school programme? That&rsquo;s us. We accept 15 and 30 hours of
                  funded childcare — use our{" "}
                  <Link href="#fee-calculator" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">
                    fee calculator
                  </Link>{" "}
                  to estimate weekly fees,{" "}
                  <Link href="/admission" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">
                    apply for a place
                  </Link>{" "}
                  or{" "}
                  <Link href="/contact?branch=pinner" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">
                    book a visit
                  </Link>{" "}
                  to come and see us.
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
              <h2 className="section-title mt-4">Why Choose Our Pinner Nursery</h2>
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
                  <h3 className="feature-card-title text-[var(--ink)]">{f.title}</h3>
                  <p className="body-text mt-3 flex-1">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          3.5 — FOREST SCHOOL AT PINNER
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="leaf"        className="left-[3%]  top-10    h-9 w-9 opacity-45 hidden sm:block" />
        <Doodle kind="pink-flower" className="right-[4%] bottom-10 h-9 w-9 opacity-45 hidden sm:block" />

        <div className="container-site">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <span className="section-kicker">Outdoor learning</span>
              <h2 className="section-title mt-4">Forest School at Pinner</h2>
              <div className="body-text mt-5 space-y-5">
                <p>
                  Our Pinner branch runs a weekly forest school programme led by qualified
                  practitioners. Children explore log piles, mud kitchens, nature treasure hunts
                  and storytelling by the fire circle — building resilience, curiosity and a
                  genuine connection with the natural world.
                </p>
                <p>
                  Sessions run year-round in every weather, and sit alongside our indoor Montessori
                  curriculum so children move naturally between focused indoor work and free
                  outdoor exploration.
                </p>
              </div>
              <div className="mt-7">
                <PastelButton href="/forest-school" variant="mint">
                  About our Forest School <ArrowRight className="h-4 w-4" />
                </PastelButton>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          3.6 — WEEKLY ENRICHMENT ACTIVITIES
      ══════════════════════════════════════════════════════ */}
      <BranchEnrichmentSection
        activities={enrichmentActivities}
        branchName="Pinner"
        rightSlot={
          <div id="fee-calculator">
            <Reveal>
              <div className="mb-8 text-center">
                <span className="section-kicker">Fees made simple</span>
                <h2 className="section-title mt-4">Estimate Your Pinner Fees</h2>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="mx-auto w-full max-w-[27rem]">
                <FeeCalculatorCard defaultBranch="pinner" />
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
              <h2 className="section-title mt-4">Our Pinner Nursery</h2>
            </div>
          </Reveal>
          <LightboxGallery images={gallery} columns={3} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          5 — CONTACT
      ══════════════════════════════════════════════════════ */}
      <section id="visit" className="paper-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="blue-bird" animated="float" className="absolute left-[3%] top-10 h-10 w-10 opacity-50 hidden lg:block" />

        <div className="container-site">
          <Reveal>
            <div className="mb-10 text-center">
              <span className="section-kicker">Find us</span>
              <h2 className="section-title mt-4">Visit Our Pinner Nursery</h2>
            </div>
          </Reveal>

          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            <Reveal>
              <div className="flex h-full flex-col justify-center rounded-[2rem] bg-white px-7 py-8 shadow-[0_10px_24px_rgba(90,74,66,0.08)] ring-1 ring-[rgba(90,74,66,0.05)]">
                <h3 className="font-heading text-[1.6rem] leading-tight text-[var(--ink)]">
                  Blue Nest Montessori School
                </h3>
                <p className="body-text mt-1 text-sm font-semibold">Pinner Branch</p>

                <div className="mt-7 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(90,74,66,0.06)]">
                      <MapPin className="h-4 w-4 text-[#5fc8c7]" />
                    </div>
                    <address className="not-italic text-sm font-semibold leading-relaxed text-[rgba(90,74,66,0.85)]">
                      {c.address}
                    </address>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(90,74,66,0.06)]">
                      <Phone className="h-4 w-4 text-[#5fc8c7]" />
                    </div>
                    <a href={c.telHref} className="text-sm font-semibold text-[rgba(90,74,66,0.85)] transition hover:text-[var(--ink)]">
                      {c.phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(90,74,66,0.06)]">
                      <Mail className="h-4 w-4 text-[#5fc8c7]" />
                    </div>
                    <a href={"mailto:" + c.email} className="text-sm font-semibold text-[rgba(90,74,66,0.85)] transition hover:text-[var(--ink)]">
                      {c.email}
                    </a>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(90,74,66,0.06)]">
                      <SunMedium className="h-4 w-4 text-[#5fc8c7]" />
                    </div>
                    <div className="text-sm font-semibold leading-relaxed text-[rgba(90,74,66,0.85)]">
                      <div>{c.hoursLine1}</div>
                      <div>{c.hoursLine2}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <PastelButton href="/contact?enquiry=arrange-a-visit&branch=pinner" variant="rose">
                    Book a Visit <ArrowRight className="h-4 w-4" />
                  </PastelButton>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="h-[320px] overflow-hidden rounded-[1.8rem] shadow-[0_4px_20px_rgba(90,74,66,0.10)] sm:h-[400px]">
                <BranchMap branchId="pinner" />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
