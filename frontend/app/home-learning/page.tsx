import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, BookOpen, ExternalLink, Heart, Lightbulb, MessageCircle, Mic } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import PastelButton from "@/components/ui/PastelButton";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";

export const metadata: Metadata = {
  title: "Home Learning — Blue Nest Montessori School",
  description:
    "Explore the Blue Nest Home Learning Kit — a parent support resource designed to extend nursery learning at home through language, play and exploration.",
};

// ── Kit contents ───────────────────────────────────────────────────────────────

const kitItems = [
  {
    icon: BookOpen,
    color: "#cf7d9c",
    bg: "rgba(246,213,223,0.35)",
    title: "Activity Guides",
    desc: "Age-appropriate Montessori activities you can do at home with everyday materials — no special equipment needed.",
  },
  {
    icon: Mic,
    color: "#5fc8c7",
    bg: "rgba(127,216,210,0.18)",
    title: "Speech & Language Tips",
    desc: "Practical techniques to support your child's language development through conversation, songs and storytelling.",
  },
  {
    icon: Heart,
    color: "#f0bd55",
    bg: "rgba(247,215,116,0.22)",
    title: "Routine Cards",
    desc: "Simple visual routine cards that help children feel safe, settled and confident in their daily home environment.",
  },
  {
    icon: Lightbulb,
    color: "#b89bdd",
    bg: "rgba(185,159,224,0.20)",
    title: "Learning Inspiration",
    desc: "Ideas and conversation prompts to spark curiosity, creativity and a love of learning beyond the nursery.",
  },
];

// ── External resource links ────────────────────────────────────────────────────

const resources = [
  {
    label: "BBC Tiny Happy People",
    desc: "Expert advice, activities and films to support your child's language development from birth.",
    href: "https://www.bbc.co.uk/tiny-happy-people",
    accent: "#ef8cab",
  },
  {
    label: "Hungry Little Minds",
    desc: "Simple, fun activities for children aged 0–5 to support early learning at home.",
    href: "https://hungrylittleminds.campaign.gov.uk",
    accent: "#6ecfc9",
  },
];

// ── Page ───────────────────────────────────────────────────────────────────────

export default function HomeLearningPage() {
  return (
    <PublicLayout>

      {/* ══════════════════════════════════════════════════════
          1 — HERO  (Fees button prominent here)
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative flex min-h-[58vh] items-center">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Image
            src="/home/outdoor-learning-and-play-area.jpg"
            alt="Children learning outdoors at Blue Nest Montessori"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[#fff8f2]/70" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_55%,rgba(246,213,223,0.50),transparent_50%),radial-gradient(ellipse_at_80%_20%,rgba(127,216,210,0.18),transparent_40%)]" />
        </div>

        <Doodle kind="pink-bird"   animated="float" className="absolute right-[5%] top-8    h-11 w-11 opacity-50 hidden lg:block" />
        <Doodle kind="blue-flower"                  className="absolute left-[3%]  bottom-10 h-10 w-10 opacity-45 hidden sm:block" />

        <div className="relative z-10 w-full px-6 sm:px-10 lg:px-16 xl:px-20 py-16 sm:py-20 lg:py-24">
          <Reveal>
            <span className="section-kicker">Blue Nest Montessori School</span>
            <h1 className="mt-4 font-heading text-[2.4rem] leading-[1.15] text-white sm:text-[2.9rem] lg:text-[3.2rem] max-w-3xl">
              Home Learning with Blue Nest
            </h1>
            <p className="body-text mt-5 max-w-xl !text-white/90">
              We support families both inside and outside the classroom. Our Home
              Learning Kit gives parents practical tools to extend nursery learning
              at home building language, confidence, and a love of discovery.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <PastelButton href="/admission/our-fees" variant="rose">
                Our Fees <ArrowRight className="h-4 w-4" />
              </PastelButton>
              <PastelButton href="/admission/application-form" variant="mint">
                Apply Now <ArrowRight className="h-4 w-4" />
              </PastelButton>
            </div>
          </Reveal>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          2 — WHY WE CREATED THE HOME LEARNING PACKAGE
      ══════════════════════════════════════════════════════ */}
      <section className="blush-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="leaf"        className="right-[4%] top-10    h-9 w-9 opacity-42 hidden sm:block" />
        <Doodle kind="blue-flower" className="left-[3%] bottom-10  h-9 w-9 opacity-40 hidden sm:block" />

        <div className="container-site">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">

            {/* Text */}
            <Reveal>
              <span className="section-kicker">Why we created it</span>
              <h2 className="section-title mt-4 text-[#cf7d9c]">
                Learning doesn&rsquo;t stop at the nursery door
              </h2>
              <div className="body-text mt-5 space-y-5">
                <p>
                  At Blue Nest Montessori, we know that the most impactful learning
                  happens in everyday moments during mealtimes, bath time, on the
                  way to the shops, or while reading a bedtime story.
                </p>
                <p>
                  We created the Home Learning package because we wanted to give
                  every family regardless of background or resources, the tools
                  to continue the Montessori approach at home. Our educators see
                  what each child responds to and have translated that into
                  practical, parent-friendly guidance.
                </p>
                <p>
                  The result is a resource that supports speech, language,
                  independence, confidence and routine all the things that
                  make a real difference in early childhood.
                </p>
              </div>
            </Reveal>

            {/* Image */}
            <Reveal delay={0.1}>
              <div className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-[2rem] shadow-[0_10px_32px_rgba(90,74,66,0.12)]">
                <Image
                  src="/home/structured-routine.jpg"
                  alt="Child learning at home with parent"
                  width={840}
                  height={1050}
                  className="w-full object-cover"
                  sizes="(max-width: 1024px) 80vw, 38vw"
                />
              </div>
            </Reveal>

          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          3 — WHAT IS INCLUDED IN THE KIT
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="pink-bird" animated="wiggle" className="absolute right-[3%] top-10 h-10 w-10 opacity-48 hidden lg:block" />

        <div className="container-site">
          <Reveal>
            <div className="mb-10 text-center">
              <span className="section-kicker">What&rsquo;s included</span>
              <h2 className="section-title mt-4 text-[#5fc8c7]">
                Inside the Home Learning Kit
              </h2>
              <p className="body-text mx-auto mt-4 max-w-2xl">
                The kit is designed to be simple, joyful and genuinely useful — not
                overwhelming. Everything has been created by our Montessori educators.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {kitItems.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.08} className="h-full">
                <article
                  className="flex h-full flex-col rounded-[2rem] px-6 py-7 ring-1 ring-[rgba(90,74,66,0.07)] shadow-[0_4px_16px_rgba(90,74,66,0.07)]"
                  style={{ background: item.bg }}
                >
                  <span className="mb-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/70 shadow-[0_2px_8px_rgba(90,74,66,0.08)]">
                    <item.icon className="h-5 w-5" style={{ color: item.color }} strokeWidth={1.8} />
                  </span>
                  <h3 className="font-heading text-[1.2rem] leading-snug" style={{ color: item.color }}>
                    {item.title}
                  </h3>
                  <p className="body-text mt-3 flex-1 text-sm">{item.desc}</p>
                </article>
              </Reveal>
            ))}
          </div>

          {/* Fees CTA */}
          <Reveal delay={0.12}>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <PastelButton href="/contact" variant="mint">
                Ask About the Kit <ArrowRight className="h-4 w-4" />
              </PastelButton>
            </div>
          </Reveal>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          4 — SPEECH & LANGUAGE
      ══════════════════════════════════════════════════════ */}
      <section className="blush-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="leaf"        className="right-[4%] top-10    h-9 w-9 opacity-42 hidden sm:block" />

        <div className="container-site">
          <Reveal>
            <div className="mx-auto max-w-3xl">
              <span className="section-kicker">Early development</span>
              <h2 className="section-title mt-4 text-[#58c5c7]">
                Supporting speech, language and confidence
              </h2>
              <div className="body-text mt-6 space-y-5">
                <p>
                  Speech and language development is one of the most critical areas of
                  early childhood. It includes learning to speak, expanding vocabulary,
                  understanding grammar, and using language to express needs, thoughts
                  and feelings — laying the foundation for reading, writing and lifelong
                  communication.
                </p>
                <p>
                  Our Home Learning resources are designed to support children&rsquo;s
                  language development through exploration, conversation and creativity.
                  Small daily interactions — naming objects, asking open questions,
                  singing together — make an enormous difference over time.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          5 — EXTERNAL RESOURCES
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="container-site">
          <Reveal>
            <div className="mx-auto max-w-3xl">
              <span className="section-kicker">Trusted links</span>
              <h2 className="section-title mt-4 text-[#cf7d9c]">
                Resources for families
              </h2>
              <p className="body-text mt-5">
                Alongside our own kit, we recommend these trusted external resources
                to support your child&rsquo;s learning journey from home.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="mx-auto mt-8 grid max-w-3xl gap-5 sm:grid-cols-2">
              {resources.map((r) => (
                <a
                  key={r.label}
                  href={r.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col gap-3 rounded-[1.8rem] bg-white px-6 py-6 shadow-[0_6px_20px_rgba(90,74,66,0.09)] ring-1 ring-[rgba(90,74,66,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_28px_rgba(90,74,66,0.13)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-heading text-[1.35rem] leading-tight" style={{ color: r.accent }}>
                      {r.label}
                    </span>
                    <ExternalLink className="h-4 w-4 shrink-0 text-[rgba(90,74,66,0.3)] transition group-hover:text-[rgba(90,74,66,0.55)]" />
                  </div>
                  <p className="body-text text-sm">{r.desc}</p>
                </a>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

    </PublicLayout>
  );
}
