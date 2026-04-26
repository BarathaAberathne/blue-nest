import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, BookOpen, Gift, Globe, Heart, Leaf, Users } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import PastelButton from "@/components/ui/PastelButton";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";
import ZigzagBand from "@/components/ui/ZigzagBand";

export const metadata: Metadata = {
  title: "Our Charities — Blue Nest Montessori School",
  description:
    "Discover how Blue Nest Montessori supports meaningful causes and teaches children the importance of kindness, empathy, and giving back.",
};

// ── Data ──────────────────────────────────────────────────────────────────────

const HIGHLIGHTS = [
  {
    icon:  Globe,
    color: "#5fc8c7",
    bg:    "rgba(127,216,210,0.15)",
    title: "Community Giving",
    desc:  "Supporting local causes and families within the communities our nurseries serve — close to home and close to our hearts.",
  },
  {
    icon:  Gift,
    color: "#cf7d9c",
    bg:    "rgba(246,213,223,0.35)",
    title: "Fundraising Activities",
    desc:  "Encouraging children, parents and staff to take part in meaningful fundraising moments throughout the year.",
  },
  {
    icon:  BookOpen,
    color: "#5fc8c7",
    bg:    "rgba(127,216,210,0.18)",
    title: "Learning Through Kindness",
    desc:  "Helping children understand compassion and generosity through age-appropriate activities, stories, and conversations.",
  },
  {
    icon:  Users,
    color: "#f0bd55",
    bg:    "rgba(247,215,116,0.22)",
    title: "Family Participation",
    desc:  "Working together with parents and carers to support positive causes that matter to our whole community.",
  },
];

const CHARITIES = [
  {
    name:  "Children in Need",
    desc:  "A cause we care about deeply — helping disadvantaged children across the UK. We organise awareness activities and fundraising moments with our children and families throughout the year.",
    icon:  Heart,
    color: "#cf7d9c",
    bg:    "rgba(246,213,223,0.35)",
    href:  "#",
  },
  {
    name:  "Woodland Trust",
    desc:  "As a certified Green Tree School, our connection to nature extends beyond our garden. We support the mission to protect and restore woodland for future generations.",
    icon:  Leaf,
    color: "#3d8a52",
    bg:    "rgba(142,203,155,0.25)",
    href:  "#",
  },
  {
    name:  "Magic Breakfast",
    desc:  "Every child deserves a good start to the day. Magic Breakfast ensures children from disadvantaged backgrounds have the nutrition they need to learn, play, and thrive.",
    icon:  Gift,
    color: "#f0bd55",
    bg:    "rgba(247,215,116,0.22)",
    href:  "#",
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OurCharitiesPage() {
  return (
    <PublicLayout>

      {/* ══════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative flex min-h-[55vh] items-center">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Image
            src="/home/outdoor-play-for-children.jpg"
            alt="Children playing together at Blue Nest Montessori"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[#fff8f2]/70" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_58%,rgba(246,213,223,0.50),transparent_48%),radial-gradient(ellipse_at_80%_20%,rgba(127,216,210,0.22),transparent_40%)]" />
          <div
            className="absolute inset-0 opacity-28"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(90,74,66,0.07) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
        </div>

        <Doodle kind="heart"     className="right-[6%]  top-10   h-9  w-9  text-[#f4aac8]  opacity-60 hidden sm:block" />
        <Doodle kind="flower"    className="left-[4%]   top-8    h-9  w-9  text-[#ef8cab]  opacity-45" />
        <Doodle kind="bird"      className="left-[5%]   bottom-8 h-8  w-8  text-[#7fd8d2]  opacity-55 hidden sm:block" />
        <Doodle kind="solidstar" className="right-[5%]  bottom-8 h-8  w-8  text-[#f7d774]  opacity-50 hidden sm:block" />

        <div className="container-site relative z-10 py-16 sm:py-20 lg:py-24">
          <Reveal>
            <div className="max-w-xl">
              <span className="section-kicker">Community &amp; Giving</span>
              <h1 className="mt-4 font-heading text-[2.5rem] leading-[1.1] text-white sm:text-[3rem] lg:text-[3.4rem]">
                Our Charities
              </h1>
              <p className="body-text mt-5 max-w-lg !text-white/90">
                At Blue Nest Montessori School, we believe children learn best when they see
                care, kindness and compassion in action. Our charity work helps us support
                meaningful causes while teaching children the importance of giving back.
              </p>
              <div className="mt-7">
                <PastelButton href="/contact" variant="blush">
                  Contact Us <ArrowRight className="h-4 w-4" />
                </PastelButton>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          INTRO — Teaching kindness
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="heart"  className="right-[5%]  top-10    h-9  w-9  text-[#f4aac8] opacity-48" />
        <Doodle kind="leaf"   className="left-[2%]   bottom-10 h-9  w-9  text-[#8ecb9b] opacity-42 hidden sm:block" />
        <Doodle kind="flower" className="right-[16%] bottom-6  h-8  w-8  text-[#ef8cab] opacity-38 hidden lg:block" />

        <div className="container-site">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <div className="text-center">
                <span className="section-kicker">Our Values in Action</span>
                <h2 className="section-title mt-4 text-[#7fd8d2]">
                  Teaching children the value of kindness
                </h2>
                <p className="body-text mt-5">
                  Charity and community involvement are woven into the fabric of life at Blue
                  Nest. We believe that the most powerful lessons children learn aren&rsquo;t
                  taught from a textbook — they come from seeing the adults around them act
                  with generosity and purpose.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {[
                  {
                    icon:  Heart,
                    color: "#cf7d9c",
                    bg:    "rgba(246,213,223,0.40)",
                    label: "Empathy",
                    text:  "Helping children recognise and respond to the feelings of others — a lifelong skill that begins in early years.",
                  },
                  {
                    icon:  Gift,
                    color: "#5fc8c7",
                    bg:    "rgba(127,216,210,0.20)",
                    label: "Generosity",
                    text:  "Encouraging a spirit of giving through small, meaningful actions that feel achievable and joyful for children.",
                  },
                  {
                    icon:  Globe,
                    color: "#f0bd55",
                    bg:    "rgba(247,215,116,0.22)",
                    label: "Community",
                    text:  "Supporting local and wider communities so children understand they are part of something bigger than themselves.",
                  },
                  {
                    icon:  Users,
                    color: "#cf7d9c",
                    bg:    "rgba(246,213,223,0.30)",
                    label: "Family",
                    text:  "Involving families wherever possible so that kindness becomes a shared value at home and at nursery.",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-3.5 rounded-[1.6rem] px-5 py-5 ring-1 ring-[rgba(90,74,66,0.06)]"
                    style={{ background: item.bg }}
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/70">
                      <item.icon className="h-4 w-4" style={{ color: item.color }} strokeWidth={1.8} />
                    </span>
                    <div>
                      <p className="font-heading text-[1.05rem] leading-snug" style={{ color: item.color }}>
                        {item.label}
                      </p>
                      <p className="mt-1 text-sm leading-[1.65] text-[rgba(90,74,66,0.70)]">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          HIGHLIGHTS — How we give back (4 equal-height cards)
      ══════════════════════════════════════════════════════ */}
      <section
        className="relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16"
        style={{ backgroundColor: "rgba(174,230,221,0.18)" }}
      >
        <Doodle kind="solidstar" className="right-[4%]  top-10    h-8  w-8  text-[#f7d774] opacity-52" />
        <Doodle kind="bird"      className="left-[3%]   top-10    h-9  w-9  text-[#7fd8d2] opacity-48 hidden sm:block" />
        <Doodle kind="cloud"     className="right-[18%] bottom-6  h-10 w-10 text-[#aee6dd] opacity-38 hidden lg:block" />

        <div className="container-site">
          <Reveal>
            <div className="mb-10 text-center">
              <span className="section-kicker">How we give back</span>
              <h2 className="section-title mt-4 text-[#cf7d9c]">Our approach to charity</h2>
              <p className="body-text mx-auto mt-4 max-w-2xl">
                We make giving back a natural part of nursery life — small, joyful and
                meaningful for every child and family.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HIGHLIGHTS.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.07} className="h-full">
                <article
                  className="flex h-full flex-col rounded-[2rem] px-6 py-7 ring-1 ring-[rgba(90,74,66,0.07)] shadow-[0_4px_16px_rgba(90,74,66,0.07)]"
                  style={{ background: item.bg }}
                >
                  <span
                    className="mb-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/70 shadow-[0_2px_8px_rgba(90,74,66,0.08)]"
                  >
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
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FEATURED CHARITIES
      ══════════════════════════════════════════════════════ */}
      <section className="blush-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="heart"     className="left-[2%]   top-10   h-9  w-9  text-[#f4aac8] opacity-45" />
        <Doodle kind="solidstar" className="right-[4%]  top-10   h-8  w-8  text-[#f7d774] opacity-48 hidden sm:block" />
        <Doodle kind="flower"    className="left-[44%]  bottom-6 h-8  w-8  text-[#ef8cab] opacity-38 hidden md:block" />

        <div className="container-site">
          <Reveal>
            <div className="mb-10 text-center">
              <span className="section-kicker">Our Partners</span>
              <h2 className="section-title mt-4 text-[#7fd8d2]">Charities we support</h2>
              <p className="body-text mx-auto mt-4 max-w-2xl">
                We are proud to support a small number of charities that align with our
                values. Charity details below are placeholders — contact us for the
                latest information on our current partnerships.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CHARITIES.map((charity, i) => (
              <Reveal key={charity.name} delay={i * 0.08} className="h-full">
                <article className="flex h-full flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_4px_16px_rgba(90,74,66,0.08)] ring-1 ring-[rgba(90,74,66,0.06)]">

                  {/* Logo / image area */}
                  <div
                    className="flex h-[120px] w-full items-center justify-center"
                    style={{ background: charity.bg }}
                  >
                    <div
                      className="flex h-16 w-16 items-center justify-center rounded-full bg-white/80 shadow-[0_2px_10px_rgba(90,74,66,0.10)]"
                    >
                      <charity.icon className="h-7 w-7" style={{ color: charity.color }} strokeWidth={1.6} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col px-6 py-6">
                    <h3
                      className="font-heading text-[1.3rem] leading-snug"
                      style={{ color: charity.color }}
                    >
                      {charity.name}
                    </h3>
                    <p className="body-text mt-3 flex-1 text-sm">{charity.desc}</p>
                    <div className="mt-5">
                      <PastelButton href={charity.href} variant="mint">
                        Learn More <ArrowRight className="h-4 w-4" />
                      </PastelButton>
                    </div>
                  </div>

                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          CTA
      ══════════════════════════════════════════════════════ */}
      <ZigzagBand className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="heart"     className="left-[5%]   top-10   h-8  w-8  text-[#f4aac8]            opacity-45" />
        <Doodle kind="solidstar" className="right-[5%]  top-10   h-8  w-8  text-[#f7d774]            opacity-48 hidden sm:block" />
        <Doodle kind="flower"    className="right-[18%] bottom-6 h-9  w-9  text-[#ef8cab]            opacity-38 hidden lg:block" />
        <Doodle kind="bird"      className="left-[20%]  bottom-6 h-8  w-8  text-[rgba(90,74,66,0.38)] opacity-45 hidden md:block" />

        <div className="container-site">
          <Reveal>
            <div className="mx-auto max-w-xl text-center">
              <h2 className="font-heading text-[2.2rem] leading-[1.2] text-[var(--ink)] sm:text-[2.6rem]">
                Would you like to work with Blue Nest?
              </h2>
              <p className="body-text mt-4 text-[rgba(90,74,66,0.68)]">
                If you are a charity, local organisation, or parent with a community
                initiative, we would love to hear from you. Let&rsquo;s explore how we
                can make a difference together.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <PastelButton href="/contact" variant="blush">
                  Contact Us <ArrowRight className="h-4 w-4" />
                </PastelButton>
                <PastelButton href="/contact" variant="butter">
                  Send an Enquiry <ArrowRight className="h-4 w-4" />
                </PastelButton>
              </div>
            </div>
          </Reveal>
        </div>
      </ZigzagBand>

    </PublicLayout>
  );
}
