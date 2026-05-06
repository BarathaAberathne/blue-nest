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
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";
import { LightboxGallery } from "@/components/ui/LightboxGallery";
import BranchMap from "@/components/contact/BranchMap";
import BranchHero from "@/components/sections/BranchHero";

export const metadata: Metadata = {
  title: "Borehamwood Nursery — Blue Nest Montessori School",
  description:
    "Blue Nest Montessori School Borehamwood — a warm, nurturing Montessori nursery for children aged 3 months to 5 years in Borehamwood, Hertfordshire.",
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

const gallery = [
  { src: "/home/children-outdoor-play.jpg",    alt: "Children enjoying outdoor play at Borehamwood nursery", rotate: -2, caption: "Outdoor play"      },
  { src: "/home/outdoor-play-for-children.jpg", alt: "Outdoor learning at Blue Nest Borehamwood",            rotate:  2, caption: "Learning outside"  },
  { src: "/home/DSC_0151.jpg",                  alt: "Montessori learning environment",                       rotate: -1, caption: "Learning through play" },
  { src: "/home/structured-routine.jpg",        alt: "Calm structured routine at nursery",                    rotate:  2, caption: "Calm routines"    },
];

export default function BorehamwoodBranchPage() {
  return (
    <PublicLayout>

      <BranchHero
        branch="borehamwood"
        location="Borehamwood, Hertfordshire"
        heading="Montessori Nursery in Borehamwood"
        description="At Blue Nest Montessori School Borehamwood, we bring the same outstanding Montessori experience to families in Hertfordshire. A warm, stimulating environment where children aged 3 months to 5 years can learn, play and truly thrive."
        image="/home/children-outdoor-play.jpg"
        imageAlt="Blue Nest Montessori Borehamwood nursery"
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
                  src="/home/outdoor-play-for-children.jpg"
                  alt="Children at Blue Nest Montessori Borehamwood"
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
                  Our Borehamwood nursery provides a calm, structured Montessori environment where
                  children are encouraged to explore, build independence and develop essential life skills
                  through purposeful, hands-on activities.
                </p>
                <p>
                  We accept children aged 3 months to 5 years and welcome government funding including
                  15-hour and 30-hour free childcare for eligible families.
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
                  <h3 className="font-heading text-[1.5rem] leading-snug text-[var(--ink)]">{f.title}</h3>
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
              <h2 className="section-title mt-4">Our Borehamwood Nursery</h2>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <LightboxGallery images={gallery} columns={2} />
          </Reveal>
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
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(90,74,66,0.06)]">
                      <Phone className="h-4 w-4 text-[#5fc8c7]" />
                    </div>
                    <a href="tel:02089531718" className="text-sm font-semibold text-[rgba(90,74,66,0.72)] transition hover:text-[var(--ink)]">
                      020 8953 1718
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(90,74,66,0.06)]">
                      <Mail className="h-4 w-4 text-[#5fc8c7]" />
                    </div>
                    <a href="mailto:manager@bluenest.uk" className="text-sm font-semibold text-[rgba(90,74,66,0.72)] transition hover:text-[var(--ink)]">
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
