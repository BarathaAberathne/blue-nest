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
import FeeCalculatorCard from "@/components/ui/FeeCalculatorCard";

// Borehamwood branch JSON-LD. Preschool + ChildCare + LocalBusiness for
// schema breadth; linked to the site-wide org via parentOrganization @id.
const branchJsonLd = {
  "@context": "https://schema.org",
  "@type": ["Preschool", "ChildCare", "LocalBusiness"],
  "@id": "https://bluenest.uk/branches/borehamwood#preschool",
  name: "Blue Nest Montessori School — Borehamwood",
  url: "https://bluenest.uk/branches/borehamwood",
  image: "https://bluenest.uk/home/branches/borehamwood/borehamwood-hero.jpg",
  telephone: "+44 20 8953 1718",
  email: "manager@bluenest.uk",
  priceRange: "££",
  address: {
    "@type": "PostalAddress",
    streetAddress: "31-33 Farriers Way",
    addressLocality: "Borehamwood",
    addressRegion: "Hertfordshire",
    postalCode: "WD6 2TB",
    addressCountry: "GB",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 51.6594,
    longitude: -0.2724,
  },
  // Yell data shows we rank well for "private daycare" (SV 1600, rank #6)
  // mainly from Borehamwood SERPs, with strong signals from Watford. Both
  // are listed so the local-pack reaches families across the corridor.
  areaServed: [
    "Borehamwood",
    "Elstree",
    "Radlett",
    "Bushey",
    "Edgware",
    "Stanmore",
    "Watford",
    "Hertfordshire",
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
    { "@type": "ListItem", position: 3, name: "Borehamwood", item: "https://bluenest.uk/branches/borehamwood" },
  ],
};

export const metadata: Metadata = {
  alternates: { canonical: "/branches/borehamwood" },
  // Lead with the high-volume keyword "Private Day Nursery" — Yell shows
  // we already rank #6 for "private daycare" (SV 1600). Borehamwood
  // also pulls strong signals for "infant care" (#1) and "infant
  // nursery" (#3), so we mention both age framing and the borough.
  title: "Borehamwood Nursery — Private Montessori Day Nursery (WD6)",
  description:
    "Ofsted Good private Montessori day nursery in Borehamwood (WD6) for infants and children aged 3 months to 5 years. Serving Borehamwood, Elstree, Radlett, Bushey and Edgware families. Forest school, 15/30 hours funded childcare, mud kitchen and reading garden.",
  openGraph: {
    title: "Borehamwood Nursery — Blue Nest Montessori",
    description:
      "Private Montessori day nursery in Borehamwood for ages 3 months to 5 years. Ofsted Good · forest school · funded childcare · enrichment activities.",
    url: "/branches/borehamwood",
    images: [{ url: "/home/branches/borehamwood/borehamwood-office.jpg", width: 1200, height: 800, alt: "Blue Nest Montessori Borehamwood nursery" }],
    type: "website",
  },
};

type Feature = { icon: LucideIcon; title: string; desc: string; accent: string };

const features: Feature[] = [
  {
    icon: Sparkles,
    title: "Montessori Classrooms",
    desc: "Light-filled rooms arranged with carefully selected Montessori materials that spark curiosity and independent discovery.",
    accent: "#ef8cab",
  },
  {
    icon: Leaf,
    title: "Nature & Outdoor Play",
    desc: "Spacious outdoor areas where children connect with the natural world, build motor skills and enjoy fresh air daily.",
    accent: "#82cfc4",
  },
  {
    icon: TreePine,
    title: "Forest School",
    desc: "Weekly forest school sessions building confidence, resilience and a genuine love for nature in our youngest learners.",
    accent: "#8ecb9b",
  },
  {
    icon: Lightbulb,
    title: "EYFS & Montessori",
    desc: "We blend the EYFS curriculum with Montessori principles, giving every child the best of both educational approaches.",
    accent: "#6ecfc9",
  },
  {
    icon: Heart,
    title: "Caring Team",
    desc: "Our dedicated, highly trained educators nurture every child individually, building trust and genuine bonds every day.",
    accent: "#f4aac8",
  },
  {
    icon: ShieldCheck,
    title: "Safe & Secure",
    desc: "Rigorous safety standards, DBS-checked staff and secure entry systems ensure every child is always protected.",
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
    src: "/home/branches/borehamwood/borehamwood-gallery-01.webp",
    alt: "Children exploring a small-world sand sensory tray at Blue Nest Montessori Borehamwood",
    rotate: -2,
    caption: "Small-world play",
  },
  {
    src: "/home/branches/borehamwood/borehamwood-gallery-02.webp",
    alt: "Child practising early mark-making with a practitioner at Blue Nest Montessori Borehamwood",
    rotate: 2,
    caption: "Mark-making",
  },
  {
    src: "/home/branches/borehamwood/borehamwood-gallery-03.webp",
    alt: "Children exploring the immersive underwater sensory projection room at Blue Nest Montessori Borehamwood",
    rotate: -1,
    caption: "Sensory room",
  },
  {
    src: "/home/branches/borehamwood/borehamwood-gallery-04.webp",
    alt: "Children and a practitioner watching the erupting volcano science experiment at Blue Nest Montessori Borehamwood",
    rotate: 2,
    caption: "Volcano science",
  },
  {
    src: "/home/branches/borehamwood/borehamwood-gallery-05.webp",
    alt: "Child learning about the human body on the anatomy floor mat at Blue Nest Montessori Borehamwood",
    rotate: -2,
    caption: "Human body",
  },
  {
    src: "/home/branches/borehamwood/borehamwood-gallery-06.webp",
    alt: "Children exploring the life-size skeleton model during the Human Body topic at Blue Nest Montessori Borehamwood",
    rotate: 1,
    caption: "Our skeleton",
  },
  {
    src: "/home/branches/borehamwood/borehamwood-gallery-07.webp",
    alt: "Children playing together in the role-play shop at Blue Nest Montessori Borehamwood",
    rotate: -1,
    caption: "Role-play shop",
  },
  {
    src: "/home/branches/borehamwood/borehamwood-gallery-08.webp",
    alt: "Arctic small-world display with igloos and polar animals at Blue Nest Montessori Borehamwood",
    rotate: 2,
    caption: "Arctic world",
  },
  {
    src: "/home/branches/borehamwood/borehamwood-gallery-09.webp",
    alt: "Children and a practitioner laughing during a hands-on sensory activity at Blue Nest Montessori Borehamwood",
    rotate: -2,
    caption: "Sensory fun",
  },
  {
    src: "/home/branches/borehamwood/borehamwood-gallery-10.webp",
    alt: "Child delighted by the colourful sensory light projection at Blue Nest Montessori Borehamwood",
    rotate: 1,
    caption: "Light play",
  },
  {
    src: "/home/branches/borehamwood/borehamwood-gallery-11.webp",
    alt: "Friends enjoying a healthy snack together at Blue Nest Montessori Borehamwood",
    rotate: -1,
    caption: "Snack time",
  },
  {
    src: "/home/branches/borehamwood/borehamwood-gallery-12.webp",
    alt: "Children investigating the volcano experiment by the Explore board at Blue Nest Montessori Borehamwood",
    rotate: 2,
    caption: "Exploring volcanoes",
  },
  {
    src: "/home/branches/borehamwood/borehamwood-gallery-13.webp",
    alt: "Children and a practitioner exploring the human body organs learning mat at Blue Nest Montessori Borehamwood",
    rotate: -2,
    caption: "Body explorers",
  },
  {
    src: "/home/branches/borehamwood/borehamwood-gallery-14.webp",
    alt: "Child reaching up to the skeleton model with a practitioner at Blue Nest Montessori Borehamwood",
    rotate: 1,
    caption: "Skeleton discovery",
  },
  {
    src: "/home/branches/borehamwood/borehamwood-gallery-15.webp",
    alt: "The home-corner role-play kitchen at Blue Nest Montessori Borehamwood",
    rotate: -1,
    caption: "Home corner",
  },
  {
    src: "/home/branches/borehamwood/borehamwood-gallery-16.webp",
    alt: "Child mark-making in the blue sensory writing tray at Blue Nest Montessori Borehamwood",
    rotate: 2,
    caption: "Sensory writing",
  },
  {
    src: "/home/branches/borehamwood/borehamwood-gallery-17.webp",
    alt: "Children gathered at the colourful sensory light table at Blue Nest Montessori Borehamwood",
    rotate: -2,
    caption: "Light table",
  },
  {
    src: "/home/branches/borehamwood/borehamwood-gallery-18.webp",
    alt: "Little Artists display board of children's artwork at Blue Nest Montessori Borehamwood",
    rotate: 1,
    caption: "Little Artists",
  },
  {
    src: "/home/branches/borehamwood/borehamwood-gallery-19.webp",
    alt: "Children playing at the role-play market stall at Blue Nest Montessori Borehamwood",
    rotate: -1,
    caption: "Market stall",
  },
  {
    src: "/home/branches/borehamwood/borehamwood-gallery-20.webp",
    alt: "Children and a practitioner at the water exploration tray at Blue Nest Montessori Borehamwood",
    rotate: 2,
    caption: "Water play",
  },
  {
    src: "/home/branches/borehamwood/borehamwood-gallery-21.webp",
    alt: "Child exploring the human body organs activity at Blue Nest Montessori Borehamwood",
    rotate: -2,
    caption: "Inside the body",
  },
  {
    src: "/home/branches/borehamwood/borehamwood-gallery-22.webp",
    alt: "Child delighted while exploring the skeleton model at Blue Nest Montessori Borehamwood",
    rotate: 1,
    caption: "Big discovery",
  },
];

export default function BorehamwoodBranchPage() {
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd(branchFaqs.borehamwood)) }}
      />

      <BranchHero
        location="Borehamwood, Hertfordshire"
        heading="Montessori Nursery in Borehamwood"
        description="At Blue Nest Montessori School Borehamwood, we bring the same outstanding Montessori experience to families in Hertfordshire. A warm, stimulating environment where children aged 3 months to 5 years can learn, play and truly thrive."
        image="/home/branches/borehamwood/borehamwood-hero.webp"
        imageAlt="Children exploring the role-play farm shop at Blue Nest Montessori Borehamwood"
        primaryCta={{ label: "Book a Visit", href: "/contact?enquiry=book-visit&branch=borehamwood", variant: "rose" }}
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
                  src="/home/branches/borehamwood/borehamwood-welcome.webp"
                  alt="A practitioner smiling with a toddler at the dinosaur sand sensory tray at Blue Nest Montessori Borehamwood"
                  rotate={-3}
                  sizes="(max-width: 1024px) 80vw, 38vw"
                  className="w-full"
                  aspectRatio="4/5"
                />
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <span className="section-kicker">Welcome</span>
              <h2 className="section-title mt-4">Welcome to Our Borehamwood Nursery</h2>
              <div className="body-text mt-5 space-y-5">
                <p>
                  Blue Nest is a private Montessori day nursery in Borehamwood (WD6), welcoming
                  infants and children aged 3 months to 5 years from families across Borehamwood,
                  Elstree, Radlett, Bushey and Edgware. Our infant nursery rooms are calm,
                  settled and run by long-serving key persons, while our older Montessori
                  classrooms blend the EYFS framework with authentic Montessori materials.
                </p>
                <p>
                  We accept 15 and 30 hours of funded childcare for eligible families and welcome
                  childcare vouchers and Tax-Free Childcare. Use our{" "}
                  <Link href="#fee-calculator" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">
                    fee calculator
                  </Link>{" "}
                  to estimate weekly fees,{" "}
                  <Link href="/admission" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">
                    apply for a place
                  </Link>{" "}
                  or{" "}
                  <Link href="/contact?branch=borehamwood" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">
                    book a visit
                  </Link>{" "}
                  to see our Borehamwood nursery. Weekly{" "}
                  <Link href="/forest-school" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">
                    forest school
                  </Link>{" "}
                  sessions run year-round.
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
              <h2 className="section-title mt-4">Why Choose Our Borehamwood Nursery</h2>
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
          3.5 — WEEKLY ENRICHMENT ACTIVITIES
      ══════════════════════════════════════════════════════ */}
      <BranchEnrichmentSection
        activities={enrichmentActivities}
        branchName="Borehamwood"
        rightSlot={
          <div id="fee-calculator">
            <Reveal>
              <div className="mb-8 text-center">
                <span className="section-kicker">Fees made simple</span>
                <h2 className="section-title mt-4">Estimate Your Borehamwood Fees</h2>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="mx-auto w-full max-w-[27rem]">
                <FeeCalculatorCard defaultBranch="borehamwood" />
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
              <h2 className="section-title mt-4">Our Borehamwood Nursery</h2>
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
              <h2 className="section-title mt-4">Visit Our Borehamwood Nursery</h2>
            </div>
          </Reveal>

          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            <Reveal>
              <div className="flex h-full flex-col justify-center rounded-[2rem] bg-white px-7 py-8 shadow-[0_10px_24px_rgba(90,74,66,0.08)] ring-1 ring-[rgba(90,74,66,0.05)]">
                <h3 className="font-heading text-[1.6rem] leading-tight text-[var(--ink)]">
                  Blue Nest Montessori School
                </h3>
                <p className="body-text mt-1 text-sm font-semibold">Borehamwood Branch</p>

                <div className="mt-7 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(90,74,66,0.06)]">
                      <MapPin className="h-4 w-4 text-[#5fc8c7]" />
                    </div>
                    <address className="not-italic text-sm font-semibold leading-relaxed text-[rgba(90,74,66,0.85)]">
                      31-33 Farriers Way<br />Borehamwood WD6 2TB
                    </address>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(90,74,66,0.06)]">
                      <Phone className="h-4 w-4 text-[#5fc8c7]" />
                    </div>
                    <a href="tel:02089531718" className="text-sm font-semibold text-[rgba(90,74,66,0.85)] transition hover:text-[var(--ink)]">
                      020 8953 1718
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(90,74,66,0.06)]">
                      <Mail className="h-4 w-4 text-[#5fc8c7]" />
                    </div>
                    <a href="mailto:manager@bluenest.uk" className="text-sm font-semibold text-[rgba(90,74,66,0.85)] transition hover:text-[var(--ink)]">
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
                  <PastelButton href="/contact?enquiry=arrange-a-visit&branch=borehamwood" variant="rose">
                    Book a Visit <ArrowRight className="h-4 w-4" />
                  </PastelButton>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="h-[320px] overflow-hidden rounded-[1.8rem] shadow-[0_4px_20px_rgba(90,74,66,0.10)] sm:h-[400px]">
                <BranchMap branchId="borehamwood" />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
