import type { Metadata } from "next";
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
import BranchMap from "@/components/contact/BranchMap";
import BranchHero from "@/components/sections/BranchHero";

export const metadata: Metadata = {
  alternates: { canonical: "/branches/pinner-green" },
  title: "Pinner Green Nursery — Blue Nest Montessori School",
  description:
    "Blue Nest Montessori School Pinner Green — a child-led Montessori nursery for children aged 3 months to 5 years, set in the heart of Pinner Green.",
  openGraph: {
    title: "Pinner Green Nursery — Blue Nest Montessori School",
    description:
      "Montessori nursery in Pinner Green for children aged 3 months to 5 years. Government funding available.",
    url: "/branches/pinner-green",
    images: [{ url: "/home/outdoor-learning-and-play-area.jpg", width: 1280, height: 854, alt: "Blue Nest Montessori Pinner Green nursery" }],
    type: "website",
  },
};

// ── Features ───────────────────────────────────────────────────────────────────

type Feature = { icon: LucideIcon; title: string; desc: string; accent: string };

const features: Feature[] = [
  {
    icon: Sparkles,
    title: "Montessori Classrooms",
    desc: "Thoughtfully arranged rooms with carefully selected materials that invite exploration, concentration and independent discovery.",
    accent: "#ef8cab",
  },
  {
    icon: Leaf,
    title: "Nature-Rich Setting",
    desc: "Surrounded by the greenery of Pinner Green, children enjoy daily access to outdoor spaces that foster a love of the natural world.",
    accent: "#9FC6A8",
  },
  {
    icon: TreePine,
    title: "Forest School",
    desc: "Regular forest school sessions build confidence, resilience and environmental curiosity from the earliest years.",
    accent: "#8ecb9b",
  },
  {
    icon: Lightbulb,
    title: "EYFS & Montessori",
    desc: "We weave the EYFS framework seamlessly into our Montessori approach so every child thrives academically and personally.",
    accent: "#6ecfc9",
  },
  {
    icon: Heart,
    title: "Warm, Caring Team",
    desc: "Our dedicated, highly qualified educators form genuine bonds with every child, supporting their growth and wellbeing each day.",
    accent: "#f4aac8",
  },
  {
    icon: ShieldCheck,
    title: "Safe & Secure",
    desc: "Enhanced DBS-checked staff, rigorous safety standards and secure entry systems ensure your child is always protected.",
    accent: "#b99fe0",
  },
];

// ── Gallery ────────────────────────────────────────────────────────────────────

const gallery = [
  {
    src: "/home/forest-school-2.jpg",
    alt: "Forest school at Pinner Green nursery",
    rotate: -2,
    caption: "Forest School",
  },
  {
    src: "/home/outdoor-learning-and-play-area.jpg",
    alt: "Outdoor learning area at Blue Nest Pinner Green",
    rotate: 2,
    caption: "Outdoor classroom",
  },
  {
    src: "/home/DSC_0177.jpg",
    alt: "Montessori classroom activity",
    rotate: -1,
    caption: "Learning through play",
  },
  {
    src: "/home/outdoor-childrens-play-area2.jpg",
    alt: "Children's outdoor play area at Pinner Green",
    rotate: 2,
    caption: "Garden and play",
  },
  {
    src: "/home/DSC_0151.jpg",
    alt: "Children engaged in a Montessori activity",
    rotate: -2,
    caption: "Prepared environments",
  },
  {
    src: "/home/structured-routine.jpg",
    alt: "Calm structured routine at Blue Nest",
    rotate: 1,
    caption: "Calm, consistent routines",
  },
];

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PinnerGreenBranchPage() {
  return (
    <PublicLayout>

      <BranchHero
        branch="pinner-green"
        location="Pinner Green, London"
        heading="Montessori Nursery in Pinner Green"
        description="At Blue Nest Montessori School Pinner Green, child-led learning meets a beautifully natural setting. Authentic Montessori principles with rich outdoor experiences — where every child's curiosity and confidence can truly flourish."
        image="/home/forest-school-2.jpg"
        imageAlt="Blue Nest Montessori Pinner Green outdoor nursery environment"
        primaryCta={{ label: "Book a Visit", href: "/contact?enquiry=book-visit&branch=pinner-green", variant: "rose" }}
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
                  src="/home/outdoor-play-for-children.jpg"
                  alt="Children at Blue Nest Montessori Pinner Green"
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
                Welcome to Our Pinner Green Nursery
              </h2>
              <div className="body-text mt-5 space-y-5">
                <p>
                  Our Pinner Green nursery offers a calm, structured environment rooted in
                  Montessori principles. Children are gently encouraged to explore, develop
                  independence and build essential life skills through purposeful, hands-on activity.
                </p>
                <p>
                  Sitting within a green and leafy neighbourhood, our nursery makes the most of its
                  natural surroundings — weaving outdoor learning, Forest School sessions and garden
                  time into every week.
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
                Why Choose Our Pinner Green Nursery
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
              <h2 className="section-title mt-4" style={{ color: "#9FC6A8" }}>
                Our Pinner Green Nursery
              </h2>
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
              <h2 className="section-title mt-4" style={{ color: "#cf7d9c" }}>
                A Day at Our Pinner Green Nursery
              </h2>
              <div className="body-text mt-5 space-y-5">
                <p>
                  Each day is thoughtfully structured to balance focused Montessori work cycles with
                  creative play, outdoor exploration and quiet reflection. Children move freely through
                  their prepared environment, choosing activities that spark genuine interest.
                </p>
                <p>
                  From morning circle time to afternoon garden sessions, every moment is designed to
                  nurture the whole child — building independence, social confidence and a deep love
                  of learning that lasts a lifetime.
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
                  src="/home/children-outdoor-play.jpg"
                  alt="Children enjoying outdoor play at Blue Nest Pinner Green"
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
              <h2 className="section-title mt-4" style={{ color: "#9FC6A8" }}>
                Visit Our Pinner Green Nursery
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
                <p className="body-text mt-1 text-sm font-semibold">Pinner Green Branch</p>

                <div className="mt-7 space-y-4">
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
                  <PastelButton href="/contact?enquiry=arrange-a-visit&branch=pinner-green" variant="rose">
                    Book a Visit <ArrowRight className="h-4 w-4" />
                  </PastelButton>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="h-[320px] overflow-hidden rounded-[1.8rem] shadow-[0_4px_20px_rgba(90,74,66,0.10)] sm:h-[400px]">
                <BranchMap branchId="pinner-green" />
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
                Come and See Our Pinner Green Nursery
              </h2>
              <p className="body-text mx-auto mt-5 max-w-lg">
                We would love to welcome you and your child to Blue Nest Montessori School Pinner Green.
                Get in touch today to arrange a visit and experience our warm, nature-rich environment.
              </p>
              <div className="mt-8">
                <PastelButton href="/contact?enquiry=arrange-a-visit&branch=pinner-green" variant="rose">
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
