import type { Metadata } from "next";
import {
  ArrowRight,
  Heart,
  Leaf,
  Mail,
  MapPin,
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
import BranchFeeCalculatorSection from "@/components/sections/BranchFeeCalculatorSection";
import BranchHero from "@/components/sections/BranchHero";
import { branchContactView, getPublicBranch } from "@/lib/branch-public";
import { faqPageJsonLd, branchFaqs } from "@/lib/faq";

export const metadata: Metadata = {
  alternates: { canonical: "/branches/aldershot" },
  // The layout's title template appends "| Blue Nest Montessori" — don't
  // repeat it here (it rendered doubled).
  title: "Montessori Nursery in Aldershot — Ages 3 months to 5 years",
  description:
    "Montessori day nursery on Belle Vue Road, Aldershot (GU12) for ages 3 months\u20135 years. Forest school, 15/30 hours funded childcare, halal food. Book a visit.",
  keywords: [
    "montessori nursery aldershot", "nursery in aldershot", "aldershot nursery", "day nursery aldershot",
    "preschool aldershot", "baby nursery aldershot", "forest school aldershot", "funded childcare aldershot",
    "15 hours funded childcare", "30 hours funded childcare", "nursery near aldershot station",
    "childcare for military families aldershot", "halal food nursery", "nursery ash vale", "nursery farnborough",
  ],
  openGraph: {
    title: "Montessori Nursery in Aldershot | Blue Nest Montessori",
    description:
      "Aldershot's first dedicated Montessori day nursery, for ages 3 months to 5 years. Forest school, 15/30 hours funded childcare, open 7:30am-6:00pm. Book a visit.",
    url: "/branches/aldershot",
    images: [{ url: "/home/branches/aldershot/aldershot-hero.webp", width: 2000, height: 1500, alt: "The Blue Nest Montessori Aldershot nursery building and artificial-lawn garden" }],
    type: "website",
  },
};

// ── Features ───────────────────────────────────────────────────────────────────

type Feature = { icon: LucideIcon; title: string; desc: string; accent: string };

const features: Feature[] = [
  {
    icon: Sparkles,
    title: "Aldershot's First Montessori Setting",
    desc: "Authentic Montessori materials and prepared environments you won't find anywhere else in town. The real method, not a buzzword.",
    accent: "#ef8cab",
  },
  {
    icon: Heart,
    title: "Babies Welcome from 3 Months",
    desc: "Full baby room provision where most local settings start at age 2, with gentle key-person care from your child's very first months.",
    accent: "#f4aac8",
  },
  {
    icon: TreePine,
    title: "Forest School Access",
    desc: "Regular forest school sessions that build confidence, resilience and a love of the natural world. Unique in Aldershot.",
    accent: "#8ecb9b",
  },
  {
    icon: SunMedium,
    title: "Open 7:30am – 6:00pm",
    desc: "The earliest drop-off in town for commuting parents, minutes from Aldershot station, with easy links to Farnborough and Guildford.",
    accent: "#6ecfc9",
  },
  {
    icon: Leaf,
    title: "Halal Food & Inclusive Menus",
    desc: "Freshly prepared meals from our 5-star hygiene rated kitchen, with halal, vegetarian and allergy-aware options as standard.",
    accent: "#9FC6A8",
  },
  {
    icon: ShieldCheck,
    title: "Safe & Secure",
    desc: "Enhanced DBS-checked staff, secure entry systems and rigorously maintained safety standards in an Ofsted registered setting.",
    accent: "#b99fe0",
  },
];

// ── Gallery — the real Aldershot photo set ────────────────────────────────────

const gallery = [
  {
    src: "/home/branches/aldershot/aldershot-welcome-board.webp",
    alt: "The Aldershot welcome board greeting families in many languages, from Fàilte to Witaj",
    rotate: -2,
    caption: "Welcome, in every language",
  },
  {
    src: "/home/branches/aldershot/aldershot-gallery-02.webp",
    alt: "The outdoor playground at Blue Nest Montessori Aldershot with swings and a slide under mature trees",
    rotate: 2,
    caption: "Our shaded playground",
  },
  {
    src: "/home/branches/aldershot/aldershot-gallery-03.webp",
    alt: "The wooden climbing frame and slide on the bark-chip play surface at Blue Nest Montessori Aldershot",
    rotate: -1,
    caption: "Climb, balance and slide",
  },
  {
    src: "/home/branches/aldershot/aldershot-gallery-04.webp",
    alt: "The baby room play area with a mirrored arch, dinosaur play mat and treasure baskets at Blue Nest Montessori Aldershot",
    rotate: 2,
    caption: "Our baby room",
  },
  {
    src: "/home/branches/aldershot/aldershot-gallery-05.webp",
    alt: "A cosy reading den with soft toys, board books and a play mat at Blue Nest Montessori Aldershot",
    rotate: -2,
    caption: "The cosy corner",
  },
  {
    src: "/home/branches/aldershot/aldershot-gallery-06.webp",
    alt: "A wooden sensory tent with liquid floor tiles and discovery bottles at Blue Nest Montessori Aldershot",
    rotate: 1,
    caption: "Sensory discovery",
  },
  {
    src: "/home/branches/aldershot/aldershot-gallery-07.webp",
    alt: "The book corner and wooden calendar board at Blue Nest Montessori Aldershot",
    rotate: -1,
    caption: "Stories every day",
  },
  {
    src: "/home/branches/aldershot/aldershot-gallery-08.webp",
    alt: "A toddler activity room with a half-moon table and Montessori practical-life shelves at Blue Nest Montessori Aldershot",
    rotate: 2,
    caption: "Room to grow",
  },
  {
    src: "/home/branches/aldershot/aldershot-gallery-09.webp",
    alt: "The bright preschool room with floor-to-ceiling garden windows at Blue Nest Montessori Aldershot",
    rotate: -2,
    caption: "Light-filled classrooms",
  },
  {
    src: "/home/branches/aldershot/aldershot-gallery-01.webp",
    alt: "The Blue Nest Montessori Aldershot sign beneath the maple trees on Belle Vue Road",
    rotate: 1,
    caption: "Look out for our sign",
  },
];

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function AldershotBranchPage() {
  // Live contact data from the backend (phone/address/hours/status), with the
  // roster fallback so the page renders even when the API is unreachable.
  const branch = await getPublicBranch("aldershot");
  const c = branchContactView("aldershot", branch);

  const branchJsonLd = {
    "@context": "https://schema.org",
    "@type": ["Preschool", "ChildCare", "LocalBusiness"],
    "@id": "https://bluenest.uk/branches/aldershot#preschool",
    name: "Blue Nest Montessori School — Aldershot",
    url: "https://bluenest.uk/branches/aldershot",
    image: "https://bluenest.uk/home/branches/aldershot/aldershot-hero.webp",
    telephone: "+44 " + c.phone.replace(/^0/, "").replace(/\s+/g, " "),
    email: c.email,
    priceRange: "££",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Belle Vue Rd",
      addressLocality: "Aldershot",
      postalCode: "GU12 4RZ",
      addressCountry: "GB",
    },
    geo: { "@type": "GeoCoordinates", latitude: c.lat, longitude: c.lng },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "07:30",
        closes: "18:00",
      },
    ],
    areaServed: ["Aldershot", "Farnborough", "Ash", "Ash Vale", "Farnham", "Fleet"],
    parentOrganization: { "@id": "https://bluenest.uk/#organization" },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://bluenest.uk/" },
      { "@type": "ListItem", position: 2, name: "Aldershot", item: "https://bluenest.uk/branches/aldershot" },
    ],
  };

  return (
    <PublicLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(branchJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd(branchFaqs.aldershot)) }} />

      <BranchHero
        location="Aldershot, Hampshire"
        heading="Montessori Nursery in Aldershot"
        description="Aldershot's first dedicated Montessori day nursery on Belle Vue Road, for children aged 3 months to 5 years. Authentic Montessori learning, forest school sessions and 15/30 hours funded childcare, open Monday–Friday 7:30am–6:00pm."
        image="/home/branches/aldershot/aldershot-hero.webp"
        imageAlt="The Blue Nest Montessori Aldershot nursery building and its artificial-lawn garden"
        primaryCta={{ label: "Book a Visit", href: "/contact?enquiry=book-visit&branch=aldershot", variant: "rose" }}
        secondaryCta={{ label: "Contact Us", href: "#visit", variant: "mint" }}
        trustLine={"Ofsted Registered\u2002\u00b7\u20025-Star Food Hygiene Rated\u2002\u00b7\u2002Mon\u2013Fri 7:30 am \u2013 6:00 pm"}
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
                  src="/home/branches/aldershot/aldershot-sign.webp"
                  alt="The Blue Nest Montessori School Aldershot branch sign on Belle Vue Road"
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
              <h2 className="section-title mt-4" style={{ color: "#9FC6A8" }}>
                Welcome to Our Aldershot Nursery
              </h2>
              <div className="body-text mt-5 space-y-5">
                <p>
                  Blue Nest is a private Montessori day nursery on Belle Vue Road in Aldershot,
                  welcoming children aged 3 months to 5 years from families across Aldershot, Ash,
                  Ash Vale, Badshot Lea, Tongham, North Camp, Farnborough and Fleet. Our calm,
                  structured classrooms blend authentic Montessori principles with the EYFS
                  framework, so independence, language and a genuine love of early years learning
                  grow side by side.
                </p>
                <p>
                  If you&apos;ve been searching for a &ldquo;Montessori nursery near me&rdquo; in
                  Aldershot, you&apos;ve found Hampshire&apos;s newest, and the town&apos;s first,
                  dedicated Montessori setting. We accept 15 and 30 hours of funded
                  childcare. Try our fee calculator below to estimate weekly fees, then apply for a
                  place.
                </p>
                <h3 className="font-heading text-lg text-[var(--ink)]">
                  Proud to serve Aldershot&apos;s forces families
                </h3>
                <p>
                  As the home of the British Army, Aldershot is full of families who move often and
                  need childcare that settles children quickly. Our key-person approach, flexible
                  sessions and term-time or all-year contracts are designed to make transitions
                  gentle, and we&apos;re experienced in supporting funded hours and Tax-Free
                  Childcare for serving parents.
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
              <h2 className="section-title mt-4" style={{ color: "#cf7d9c" }}>
                Why Choose Our Aldershot Nursery
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
                  <h3 className="feature-card-title" style={{ color: f.accent }}>
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
          3.5 — FEE CALCULATOR
      ══════════════════════════════════════════════════════ */}
      <BranchFeeCalculatorSection branch="aldershot" branchName="Aldershot" />

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
              <h2 className="section-title mt-4" style={{ color: "#9FC6A8" }}>
                Our Aldershot Nursery
              </h2>
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
              <h2 className="section-title mt-4" style={{ color: "#cf7d9c" }}>
                A Day at Our Aldershot Nursery
              </h2>
              <div className="body-text mt-5 space-y-5">
                <p>
                  Each day is thoughtfully structured to balance focused Montessori work cycles with
                  creative play, outdoor exploration and quiet reflection. Children move freely through
                  their prepared environment, choosing activities that spark genuine interest.
                </p>
                <p>
                  From morning circle time to afternoon garden sessions and regular{" "}
                  <a href="/forest-school" className="font-semibold underline">forest school</a>{" "}
                  outings, every moment is designed to nurture the whole child: building
                  independence, social confidence and a deep love of learning that lasts a lifetime.
                </p>
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <PastelButton href="/why-montessori" variant="mint">
                  About Montessori <ArrowRight className="h-4 w-4" />
                </PastelButton>
                <PastelButton href="/admission" variant="rose">
                  Apply for a Place <ArrowRight className="h-4 w-4" />
                </PastelButton>
              </div>
            </Reveal>

            {/* Image — right */}
            <Reveal delay={0.1}>
              <div className="mx-auto w-full max-w-[420px]">
                <StickerCard
                  src="/home/children-outdoor-play.jpg"
                  alt="Children enjoying outdoor play at Blue Nest Montessori Aldershot"
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
          6 — CONTACT DETAILS (live from the backend)
      ══════════════════════════════════════════════════════ */}
      <section id="visit" className="blush-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="blue-bird" animated="float" className="absolute left-[3%] top-10 h-10 w-10 opacity-50 hidden lg:block" />

        <div className="container-site">
          <Reveal>
            <div className="mb-10 text-center">
              <span className="section-kicker">Find us</span>
              <h2 className="section-title mt-4" style={{ color: "#9FC6A8" }}>
                Visit Our Aldershot Nursery
              </h2>
            </div>
          </Reveal>

          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">

            {/* Contact info card */}
            <Reveal>
              <div className="flex h-full flex-col justify-center rounded-[2rem] bg-white px-7 py-8 shadow-[0_10px_24px_rgba(90,74,66,0.08)] ring-1 ring-[rgba(90,74,66,0.05)]">
                <h3 className="font-heading text-[1.6rem] leading-tight" style={{ color: "#9FC6A8" }}>
                  Blue Nest Montessori School
                </h3>
                <p className="body-text mt-1 text-sm font-semibold">Aldershot Branch</p>

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

                <p className="body-text mt-6 text-sm">
                  We&apos;re a short walk from Aldershot town centre and Aldershot railway station,
                  with easy drop-off for parents commuting to Farnborough, Guildford or London.
                </p>

                <div className="mt-8">
                  <PastelButton href="/contact?enquiry=arrange-a-visit&branch=aldershot" variant="rose">
                    Book a Visit <ArrowRight className="h-4 w-4" />
                  </PastelButton>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="h-[320px] overflow-hidden rounded-[1.8rem] shadow-[0_4px_20px_rgba(90,74,66,0.10)] sm:h-[400px]">
                <BranchMap branchId="aldershot" />
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
                Come and See Our Aldershot Nursery
              </h2>
              <p className="body-text mx-auto mt-5 max-w-lg">
                We would love to welcome you and your child to Blue Nest Montessori School Aldershot.
                Get in touch today to arrange a visit and experience our warm, nature-rich environment.
              </p>
              <div className="mt-8">
                <PastelButton href="/contact?enquiry=arrange-a-visit&branch=aldershot" variant="rose">
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
