import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, BookOpen, Gift, Globe, Users } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import PastelButton from "@/components/ui/PastelButton";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";
import { LightboxGallery } from "@/components/ui/LightboxGallery";

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
    logo:  "/site-images/charity/BBC_Children_in_Need.svg.webp",
    color: "#cf7d9c",
    bg:    "rgba(246,213,223,0.35)",
    href:  "#",
  },
  {
    name:  "Woodland Trust",
    desc:  "As a certified Green Tree School, our connection to nature extends beyond our garden. We support the mission to protect and restore woodland for future generations.",
    logo:  "/site-images/charity/Woodland_Trust.svg.png",
    color: "#3d8a52",
    bg:    "rgba(142,203,155,0.25)",
    href:  "#",
  },
  {
    name:  "Magic Breakfast",
    desc:  "Every child deserves a good start to the day. Magic Breakfast ensures children from disadvantaged backgrounds have the nutrition they need to learn, play, and thrive.",
    logo:  "/site-images/charity/magic-breakfast.webp",
    color: "#f0bd55",
    bg:    "rgba(247,215,116,0.22)",
    href:  "#",
  },
  {
    name:  "Headstone Green",
    desc:  "A local community initiative close to our Harrow nursery. We work alongside Headstone Green to support community events, green spaces and activities that bring local families together.",
    logo:  "/site-images/charity/headstone-green.jpg",
    color: "#5fc8c7",
    bg:    "rgba(127,216,210,0.18)",
    href:  "#",
  },
];

const GALLERY = [
  { src: "/home/children-outdoor-play.jpg",       alt: "Children taking part in a charity fundraising activity", rotate: -2, caption: "Fundraising fun"        },
  { src: "/home/forest-school.jpg",               alt: "Forest school charity day at Blue Nest",                 rotate:  2, caption: "Forest School day"      },
  { src: "/home/outdoor-learning-and-play-area.jpg", alt: "Outdoor learning during a community event",           rotate: -1, caption: "Community event"        },
  { src: "/home/DSC_0151.jpg",                    alt: "Children engaged in a charity craft activity",           rotate:  2, caption: "Charity craft morning"  },
  { src: "/home/outdoor-childrens-play-area.jpg", alt: "Outdoor charity event at Blue Nest nursery",             rotate: -2, caption: "Outdoor charity day"    },
  { src: "/home/structured-routine.jpg",          alt: "Blue Nest team at a community initiative",               rotate:  1, caption: "Community initiative"   },
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
            src="/home/blue-nest-school-exterior.jpg"
            alt="Children playing together at Blue Nest Montessori"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[#fff8f2]/10" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_58%,rgba(246,213,223,0.50),transparent_48%),radial-gradient(ellipse_at_80%_20%,rgba(127,216,210,0.22),transparent_40%)]" />
          <div
            className="absolute inset-0 opacity-28"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(90,74,66,0.07) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
        </div>

        <Doodle kind="pink-flower"    className="left-[4%]   top-8    h-9  w-9   opacity-45" />
        <Doodle kind="blue-bird"      className="left-[5%]   bottom-8 h-8  w-8   opacity-55 hidden sm:block" />

        <div className="relative z-10 w-full px-6 sm:px-10 lg:px-16 xl:px-20 py-16 sm:py-20 lg:py-24">
          <Reveal>
            <span className="section-kicker">Community &amp; Giving</span>
            <h1 className="mt-4 font-heading text-[2.5rem] leading-[1.1] text-white sm:text-[3rem] lg:text-[3.4rem] max-w-3xl">
              Our Charities
            </h1>
            <p className="body-text mt-5 max-w-xl !text-white/90">
              At Blue Nest Montessori School, we believe children learn best when they see
              care, kindness and compassion in action. Our charity work helps us support
              meaningful causes while teaching children the importance of giving back.
            </p>
            <div className="mt-7">
              <PastelButton href="/contact" variant="blush">
                Contact Us <ArrowRight className="h-4 w-4" />
              </PastelButton>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          INTRO — short community intro
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="leaf"        className="left-[2%]   bottom-10 h-9 w-9 opacity-42 hidden sm:block" />
        <Doodle kind="pink-flower" className="right-[4%]  top-10    h-8 w-8 opacity-38 hidden lg:block" />

        <div className="container-site">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <span className="section-kicker">Community &amp; Charity Work</span>
              <h2 className="section-title mt-4 text-[#7fd8d2]">
                Giving back is part of who we are
              </h2>
              <p className="body-text mt-5">
                At Blue Nest Montessori, charity and community involvement are woven into
                daily nursery life. We believe the most powerful lessons children learn
                come from seeing the adults around them act with generosity and purpose.
                Below you will find the charities and community projects we proudly support.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          CHARITIES & COMMUNITY PROJECTS — moved to top
      ══════════════════════════════════════════════════════ */}
      <section className="blush-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="pink-flower" className="left-[44%] bottom-6 h-8 w-8 opacity-38 hidden md:block" />
        <Doodle kind="blue-bird"   className="left-[3%]  top-10  h-9 w-9 opacity-45 hidden sm:block" />

        <div className="container-site">
          <Reveal>
            <div className="mb-10 text-center">
              <span className="section-kicker">Our Projects</span>
              <h2 className="section-title mt-4 text-[#cf7d9c]">Charities &amp; community initiatives</h2>
            </div>
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
            {CHARITIES.map((charity, i) => (
              <Reveal key={charity.name} delay={i * 0.08} className="h-full">
                <article className="flex h-full flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_4px_16px_rgba(90,74,66,0.08)] ring-1 ring-[rgba(90,74,66,0.06)]">
                  <div
                    className="flex h-[110px] w-full items-center justify-center px-6"
                    style={{ background: charity.bg }}
                  >
                    <div className="relative h-16 w-full">
                      <Image
                        src={charity.logo}
                        alt={`${charity.name} logo`}
                        fill
                        className="object-contain"
                        sizes="240px"
                      />
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col px-6 py-5">
                    <h3 className="font-heading text-[1.25rem] leading-snug" style={{ color: charity.color }}>
                      {charity.name}
                    </h3>
                    <p className="body-text mt-2 flex-1 text-sm">{charity.desc}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          GALLERY — charity event photos
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="leaf"      className="left-[2%]  top-10    h-9 w-9 opacity-42 hidden sm:block" />
        <Doodle kind="blue-bird" className="right-[3%] bottom-10 h-9 w-9 opacity-45 hidden lg:block" />

        <div className="container-site">
          <Reveal>
            <div className="mb-10 text-center">
              <span className="section-kicker">Our events</span>
              <h2 className="section-title mt-4 text-[#7fd8d2]">Charity moments &amp; memories</h2>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <LightboxGallery images={GALLERY} columns={3} />
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          HOW WE GIVE BACK — 4 approach cards
      ══════════════════════════════════════════════════════ */}
      <section
        className="relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16"
        style={{ backgroundColor: "rgba(174,230,221,0.18)" }}
      >
        <div className="container-site">
          <Reveal>
            <div className="mb-10 text-center">
              <span className="section-kicker">How we give back</span>
              <h2 className="section-title mt-4 text-[#7fd8d2]">Our approach</h2>
            </div>
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HIGHLIGHTS.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.07} className="h-full">
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
        </div>
      </section>
    </PublicLayout>
  );
}
