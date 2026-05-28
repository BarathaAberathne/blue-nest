import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Compass, Hammer, MessageCircle } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import PastelButton from "@/components/ui/PastelButton";
import StickerCard from "@/components/ui/StickerCard";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";
import ZigzagBand from "@/components/ui/ZigzagBand";

export const metadata: Metadata = {
  alternates: { canonical: "/why-montessori" },
  title: "Why Montessori — Play-Based Learning at Blue Nest",
  description:
    "Why parents in Harrow, Pinner and Borehamwood choose Montessori. Compare Montessori vs traditional nursery, see how play-based learning supports independence, language development and school readiness, and discover Blue Nest's Montessori method.",
  openGraph: {
    title: "Why Montessori — Blue Nest Montessori",
    description:
      "Compare Montessori vs traditional nursery. See how play-based learning, prepared environments and child-led discovery build independence and school readiness at Blue Nest.",
    url: "/why-montessori",
    images: [{ url: "/home/outdoor-learning-and-play-area.jpg", width: 1280, height: 854, alt: "Children learning in a Montessori environment" }],
    type: "website",
  },
};

// FAQ JSON-LD covers the highest-impression informational queries from
// the Yell ranking report — Montessori vs traditional, play-based
// learning, independent learning, school readiness, language development.
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the Montessori method?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Montessori is a child-led approach to early years education developed by Dr. Maria Montessori. Children work at their own pace with carefully designed materials in mixed-age, prepared environments. The adult's role is to observe and gently guide rather than direct, building independence, concentration, language and a genuine love of learning.",
      },
    },
    {
      "@type": "Question",
      name: "How is Montessori different from a traditional nursery?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Traditional nurseries usually run group-led activities on a set timetable; Montessori classrooms let children choose work from a prepared environment and stay with each activity as long as they need. The result is deeper concentration, stronger independence and a slower-paced, calmer day. Blue Nest blends Montessori with the EYFS framework so children also meet every UK early-years goal.",
      },
    },
    {
      "@type": "Question",
      name: "What age is best to start nursery?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Children can join Blue Nest from 3 months. Many families start their child between 9 months and 2 years for the routine, social and language benefits, but the right age depends on each family. Our settling-in programme is gentle and personalised — visits, short sessions and a key person — so children of any age join confidently.",
      },
    },
    {
      "@type": "Question",
      name: "Does Montessori prepare children for school?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes — and arguably more thoroughly than many settings. By the time Blue Nest children move to reception class they are practised at making choices, finishing tasks independently, sharing space with mixed ages and self-regulating their emotions. Pre-writing, early phonics, number sense and practical-life skills are part of the daily prepared environment.",
      },
    },
    {
      "@type": "Question",
      name: "Does Montessori support language development?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Strongly. Conversation-rich routines, vocabulary cards, the sandpaper letters, storytelling and one-to-one teacher time all build receptive and expressive language. Children regularly meet the EYFS communication-and-language milestones a term ahead of average, in our experience.",
      },
    },
  ],
};

export default function WhyMontessoriPage() {
  return (
    <PublicLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* ══════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative flex min-h-[62vh] items-center">
        {/* Background image + layered overlays */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Image
            src="/home/branches/harrow/harrow-preview-02.jpg"
            alt="Blue Nest Montessori learning environment"
            fill
            priority
            fetchPriority="high"
            className="object-cover object-right"
            quality={55}
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[#fff8f2]/68" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_55%,rgba(246,213,223,0.52),transparent_48%),radial-gradient(ellipse_at_82%_20%,rgba(127,216,210,0.18),transparent_38%)]" />
          <div
            className="absolute inset-0 opacity-35"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(90,74,66,0.07) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
        </div>

        <Doodle kind="blue-bird"      className="left-[6%]   top-8    h-9  w-9    opacity-70" />

        <div className="relative z-10 w-full px-6 sm:px-10 lg:px-16 xl:px-20 py-16 sm:py-20 lg:py-24">
          <Reveal eager>
            <span className="section-kicker">Blue Nest Montessori School</span>
            <h1 className="mt-4 font-heading text-[2.5rem] leading-[1.1] text-white sm:text-[3rem] lg:text-[3.4rem] max-w-3xl">
              Why Choose Montessori for Your Child?
            </h1>
            <p className="body-text mt-5 max-w-xl !text-white/90">
              Blue Nest Montessori School provides a home away from home, where children can
              learn, develop and grow. If you&rsquo;d like any information about our prospectus
              or fee structure, contact us today.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <PastelButton href="/contact" variant="rose">
                Contact Us <ArrowRight className="h-4 w-4" />
              </PastelButton>
              <PastelButton href="/admission" variant="mint">
                Application Form <ArrowRight className="h-4 w-4" />
              </PastelButton>
            </div>
          </Reveal>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          MARIA MONTESSORI
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="leaf"   className="right-[8%]  bottom-10 h-10 w-10 opacity-55" />
        <Doodle kind="pink-flower" className="left-[2%]   bottom-12 h-10 w-10 opacity-45 hidden sm:block" />

        <div className="container-site">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">

            {/* Image — left */}
            <Reveal>
              <div className="mx-auto w-full max-w-[360px]">
                <StickerCard
                  src="/home/DSC_0151.jpg"
                  alt="Blue Nest Montessori classroom"
                  rotate={-3}
                  sizes="(max-width: 1024px) 80vw, 36vw"
                  className="w-full"
                  aspectRatio="4/5"
                />
              </div>
            </Reveal>

            {/* Text — right */}
            <Reveal delay={0.1}>
              <h2 className="section-title text-[#cf7d9c]">Maria Montessori</h2>
              <div className="mt-3 flex gap-1.5" aria-hidden="true">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="h-[3px] w-5 rounded-full bg-[#f1a8ca]" />
                ))}
              </div>
              <div className="body-text mt-5 space-y-5">
                <p>
                  Dr. Maria Montessori was a pioneer in the education of young children and
                  founded the Montessori method. She believed children have sensitive periods —
                  times when a child absorbs a particular kind of knowledge almost effortlessly.
                  Her approach has shaped early years learning for over a century and sits at
                  the heart of every Blue Nest classroom across{" "}
                  <Link href="/branches/harrow" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">
                    Harrow
                  </Link>
                  ,{" "}
                  <Link href="/branches/pinner" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">
                    Pinner
                  </Link>{" "}
                  and{" "}
                  <Link href="/branches/borehamwood" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">
                    Borehamwood
                  </Link>
                  .
                </p>
                <p>
                  A Montessori nursery environment is carefully designed to respond to a child&rsquo;s
                  developmental needs and gives them the maximum opportunity to lead their own
                  learning. We blend Montessori with the UK EYFS framework so children meet every
                  early-years milestone alongside the deeper independence, focus and language that
                  Montessori is known for.
                </p>
              </div>
            </Reveal>

          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          MONTESSORI PILLARS — 4 cards
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="leaf"        className="left-[2%]  top-10    h-9 w-9 opacity-42 hidden sm:block" />
        <Doodle kind="pink-flower" className="right-[4%] bottom-10 h-9 w-9 opacity-42 hidden lg:block" />

        <div className="container-site">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <span className="section-kicker">Four pillars</span>
              <h2 className="section-title mt-4 text-[#cf7d9c]">How Montessori shapes the day</h2>
              <p className="body-text mt-5">
                Children aged 3 months to 5 years learn through prepared environments and
                purposeful materials. Every pillar below maps onto the EYFS framework so
                Blue Nest children meet every UK early-years goal — and usually a bit more.
              </p>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Compass,
                color: "#cf7d9c",
                bg:    "rgba(246,213,223,0.35)",
                title: "Independence",
                desc:  "Children choose their own work from the prepared shelves and see each activity through — building focus, agency and quiet confidence.",
              },
              {
                icon: Hammer,
                color: "#5fc8c7",
                bg:    "rgba(127,216,210,0.18)",
                title: "Practical Life",
                desc:  "Pouring, buttoning, watering plants, preparing snack. Real tools, real care — the skills that build coordination, order and self-belief.",
              },
              {
                icon: MessageCircle,
                color: "#f0bd55",
                bg:    "rgba(247,215,116,0.22)",
                title: "Language Development",
                desc:  "Sandpaper letters, conversation-rich routines, songs and one-to-one storytelling grow vocabulary, phonics and confident self-expression.",
              },
              {
                icon: BookOpen,
                color: "#b89bdd",
                bg:    "rgba(185,159,224,0.20)",
                title: "School Readiness",
                desc:  "Pre-writing, number sense, social problem-solving and quiet rest. Children arrive at reception class ready to listen, ask and lead.",
              },
            ].map((p, i) => (
              <Reveal key={p.title} delay={i * 0.06} className="h-full">
                <article
                  className="feature-card"
                  style={{ background: p.bg }}
                >
                  <span className="mb-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/70 shadow-[0_2px_8px_rgba(90,74,66,0.08)]">
                    <p.icon className="h-5 w-5" style={{ color: p.color }} strokeWidth={1.8} />
                  </span>
                  <h3 className="feature-card-title" style={{ color: p.color }}>
                    {p.title}
                  </h3>
                  <p className="body-text mt-3 flex-1">{p.desc}</p>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.2}>
            <p className="body-text mx-auto mt-8 max-w-2xl text-center text-sm">
              Pair Montessori indoors with weekly{" "}
              <Link href="/forest-school" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">
                forest school
              </Link>{" "}
              sessions and you have the Blue Nest day — calm, child-led and full of real learning.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          GREAT START TO SCHOOL LIFE
      ══════════════════════════════════════════════════════ */}
      <section className="blush-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="blue-bird"      className="right-[12%] bottom-8  h-8  w-8  opacity-50 hidden sm:block" />

        <div className="container-site">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">

            {/* Text — left */}
            <Reveal>
              <h2 className="section-title text-[#7fd8d2]">
                Give your child a great start to school life
              </h2>
              <div className="body-text mt-5 space-y-5">
                <p>
                  The Montessori philosophy is founded upon the child&rsquo;s natural curiosity
                  and love of learning with all materials required for learning within their reach.
                  This is a time when teachers allow the children to &lsquo;work&rsquo; at various
                  activities. These activities may be adult-led or the ones that children choose
                  independently from the shelves. These include Montessori equipment and other
                  carefully selected materials from a wide variety of sources.
                </p>
                <p>
                  The teachers have a clear understanding of each child&rsquo;s stage of
                  development, so they will be able to &lsquo;direct&rsquo; the child to any
                  particular activity which the teacher feels they need to achieve. This is a time
                  when teachers will show children how to use the Montessori equipment, either on
                  a 1&nbsp;:&nbsp;1 basis or in a group, according to the guidance given by the
                  Montessori philosophy.
                </p>
              </div>
            </Reveal>

            {/* Image — right */}
            <Reveal delay={0.1}>
              <div className="mx-auto w-full max-w-[360px]">
                <StickerCard
                  src="/home/DSC_0177.jpg"
                  alt="Child working with Montessori materials"
                  rotate={4}
                  sizes="(max-width: 1024px) 80vw, 36vw"
                  className="w-full"
                  aspectRatio="4/5"
                />
              </div>
            </Reveal>

          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          TESTIMONIAL
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <Doodle kind="blue-bird"      className="right-[5%]  top-10   h-9  w-9  opacity-55" />
        <Doodle kind="pink-flower"    className="left-[2%]   bottom-8 h-10 w-10 opacity-50 hidden sm:block" />

        <div className="container-site">
          <Reveal>
            <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_1.35fr] lg:items-center">

              {/* Image — left */}
              <div className="mx-auto w-full max-w-[300px]">
                <StickerCard
                  src="/home/outdoor-childrens-play-area2.jpg"
                  alt="Cosy learning space at Blue Nest"
                  rotate={-3}
                  sizes="(max-width: 1024px) 70vw, 26vw"
                  className="w-full"
                  aspectRatio="4/3"
                />
              </div>

              {/* Quote — right */}
              <div>
                <span
                  className="font-heading text-[5rem] leading-none text-[#ef8cab] opacity-30 sm:text-[6rem]"
                  aria-hidden="true"
                >
                  &ldquo;
                </span>
                <p className="font-heading text-[1.5rem] leading-[1.65] text-[rgba(90,74,66,0.85)] sm:text-[1.75rem]">
                  The best nursery I could&rsquo;ve chosen for my daughter. She is so happy there.
                  The staff are so caring and thoughtful. I would go there myself if I only could.
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#ef8cab] opacity-60" />
                  <cite className="font-body text-[0.7rem] font-extrabold not-italic uppercase tracking-[0.22em] text-[rgba(90,74,66,0.85)]">
                    Agnieszka G
                  </cite>
                </div>
              </div>

            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          CTA
      ══════════════════════════════════════════════════════ */}
      <ZigzagBand className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="leaf"        className="right-[3%]  top-12   h-10 w-10 hidden sm:block opacity-40" />
        <Doodle kind="pink-flower" className="right-[18%] bottom-6 h-9  w-9  hidden lg:block opacity-40" />

        <div className="container-site">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <span className="section-kicker">Take the next step</span>
              <h2 className="section-title mt-4 text-[var(--ink)]">
                See Montessori in action
              </h2>
              <p className="body-text mx-auto mt-5 max-w-lg">
                Book a visit at our Harrow, Pinner or Borehamwood nursery and watch a Montessori
                day unfold. We&rsquo;ll show you the prepared environments, introduce your child&rsquo;s
                key person and talk you through fees and funded childcare.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <PastelButton href="/contact" variant="rose">
                  Book a Visit <ArrowRight className="h-4 w-4" />
                </PastelButton>
                <PastelButton href="/admission" variant="mint">
                  Start an Application <ArrowRight className="h-4 w-4" />
                </PastelButton>
                <PastelButton href="/admission/our-fees" variant="blush">
                  See Our Fees <ArrowRight className="h-4 w-4" />
                </PastelButton>
              </div>
            </div>
          </Reveal>
        </div>
      </ZigzagBand>

    </PublicLayout>
  );
}
