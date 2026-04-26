import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, Bird, BookOpen, Leaf, Shield, Sun, TreePine, Users } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import PastelButton from "@/components/ui/PastelButton";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";

export const metadata: Metadata = {
  title: "Prospectus — Blue Nest Montessori School",
};

const offerings = [
  {
    icon: BookOpen,
    title: "Montessori learning approach",
    desc: "Child-led exploration with specially designed materials that nurture independence, focus, and a genuine love of discovery.",
    color: "#cf7d9c",
    bg: "rgba(246,213,223,0.35)",
  },
  {
    icon: Users,
    title: "Qualified and caring staff",
    desc: "Our team of experienced educators are passionate about early childhood development and deeply committed to every child.",
    color: "#5a8c9c",
    bg: "rgba(127,216,210,0.22)",
  },
  {
    icon: Shield,
    title: "Safe and inspiring classrooms",
    desc: "Thoughtfully designed spaces where beautiful Montessori materials invite children to explore at their own pace.",
    color: "#5fc8c7",
    bg: "rgba(127,216,210,0.25)",
  },
  {
    icon: TreePine,
    title: "Outdoor and forest school",
    desc: "Regular outdoor learning sessions that develop physical confidence, creativity, and a lifelong connection with nature.",
    color: "#5a8c6a",
    bg: "rgba(142,203,155,0.25)",
  },
];

const routineItems = [
  {
    icon: Sun,
    color: "#f7d774",
    time: "Morning",
    title: "Arrival & free exploration",
    desc: "Children settle in at their own pace, choosing from Montessori shelf activities that interest them most.",
  },
  {
    icon: BookOpen,
    color: "#cf7d9c",
    time: "Mid-morning",
    title: "Independent work period",
    desc: "A focused, calm period where children work individually or in small groups with Montessori materials.",
  },
  {
    icon: Users,
    color: "#7fd8d2",
    time: "Late morning",
    title: "Group activities & circle time",
    desc: "Songs, stories, language games and collaborative projects that build communication and social skills.",
  },
  {
    icon: Leaf,
    color: "#8ecb9b",
    time: "Afternoon",
    title: "Outdoor time & creative play",
    desc: "Fresh air, physical play, nature exploration and creative arts in our outdoor learning spaces.",
  },
];

export default function ProspectusPage() {
  return (
    <PublicLayout>

      {/* ══════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative flex min-h-[58vh] items-center">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Image
            src="/home/structured-routine.jpg"
            alt="Children learning at Blue Nest Montessori"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[#fff8f2]/70" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_60%,rgba(246,213,223,0.50),transparent_48%),radial-gradient(ellipse_at_80%_20%,rgba(127,216,210,0.22),transparent_40%)]" />
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(90,74,66,0.07) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
        </div>

        <Doodle kind="bird"      className="left-[5%]   top-8     h-9  w-9  text-[#7fd8d2]  opacity-60" />
        <Doodle kind="leaf"      className="right-[6%]  top-10    h-10 w-10 text-[#8ecb9b]  opacity-50 hidden sm:block" />
        <Doodle kind="solidstar" className="right-[5%]  bottom-8  h-8  w-8  text-[#f7d774]  opacity-55 hidden sm:block" />
        <Doodle kind="flower"    className="left-[42%]  bottom-6  h-9  w-9  text-[#ef8cab]  opacity-40 hidden lg:block" />

        <div className="container-site relative z-10 py-16 sm:py-20">
          <Reveal>
            <div className="max-w-xl">
              <span className="section-kicker">Admissions</span>
              <h1 className="mt-4 font-heading text-[2.5rem] leading-[1.1] text-white sm:text-[3rem] lg:text-[3.4rem]">
                Blue Nest Montessori Prospectus
              </h1>
              <p className="mt-5 max-w-lg body-text !text-white/90">
                Learn more about our Montessori approach, daily routines, and how we support
                your child&rsquo;s development in a nurturing environment.
              </p>
              <div className="mt-7">
                <PastelButton href="/contact" variant="rose">
                  Contact Us <ArrowRight className="h-4 w-4" />
                </PastelButton>
              </div>
            </div>
          </Reveal>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          INTRODUCTION
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="heart"  className="right-[5%]  top-10    h-9  w-9  text-[#f4aac8]  opacity-50" />
        <Doodle kind="leaf"   className="left-[2%]   bottom-10 h-10 w-10 text-[#8ecb9b]  opacity-45 hidden sm:block" />

        <div className="container-site">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <span className="section-kicker">Our approach</span>
              <h2 className="section-title mt-4 text-[#cf7d9c]">
                A nurturing start for your child
              </h2>
              <p className="body-text mt-5">
                At Blue Nest Montessori School, we provide a warm, safe, and stimulating
                environment where children can learn, grow, and develop confidence. Our
                Montessori approach encourages independence, curiosity, and a lifelong
                love of learning.
              </p>
            </div>
          </Reveal>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          WHAT WE OFFER
      ══════════════════════════════════════════════════════ */}
      <section className="blush-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="solidstar" className="left-[3%]   top-10    h-8  w-8  text-[#f7d774]  opacity-55" />
        <Doodle kind="cloud"     className="right-[4%]  bottom-8  h-12 w-12 text-[#aee6dd]  opacity-40 hidden sm:block" />
        <Doodle kind="bird"      className="right-[10%] top-8     h-9  w-9  text-[#7fd8d2]  opacity-50 hidden lg:block" />

        <div className="container-site">
          <Reveal>
            <div className="mb-10 text-center">
              <span className="section-kicker">What we offer</span>
              <h2 className="section-title mt-4 text-[var(--ink)]">
                Everything your child needs to thrive
              </h2>
            </div>
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {offerings.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.08}>
                <div
                  className="flex h-full flex-col rounded-[2rem] px-6 py-7 ring-1 ring-[rgba(90,74,66,0.07)]"
                  style={{ background: item.bg }}
                >
                  <span
                    className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/70"
                  >
                    <item.icon className="h-5 w-5" style={{ color: item.color }} strokeWidth={1.8} />
                  </span>
                  <h3 className="font-heading text-[1.35rem] leading-snug" style={{ color: item.color }}>
                    {item.title}
                  </h3>
                  <p className="body-text mt-3 text-sm">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          DAILY ROUTINE
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="rainbow"   className="left-[1%]   bottom-8  h-14 w-14              opacity-30 hidden sm:block" />
        <Doodle kind="flower"    className="right-[4%]  top-10    h-10 w-10 text-[#ef8cab]  opacity-45 hidden sm:block" />
        <Doodle kind="solidstar" className="left-[45%]  top-8     h-7  w-7  text-[#f7d774]  opacity-40" />

        <div className="container-site">
          <Reveal>
            <div className="mb-10 text-center">
              <span className="section-kicker">Daily life</span>
              <h2 className="section-title mt-4 text-[#5a8c9c]">
                A typical day at Blue Nest
              </h2>
            </div>
          </Reveal>

          <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2">
            {routineItems.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.08}>
                <div className="flex gap-4 rounded-[1.8rem] bg-white/80 px-6 py-6 shadow-[0_8px_28px_rgba(90,74,66,0.07)] ring-1 ring-[rgba(90,74,66,0.06)]">
                  <span
                    className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                    style={{ background: `${item.color}22` }}
                  >
                    <item.icon className="h-5 w-5" style={{ color: item.color }} strokeWidth={1.8} />
                  </span>
                  <div>
                    <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em]" style={{ color: item.color }}>
                      {item.time}
                    </p>
                    <h3 className="font-heading text-[1.25rem] leading-snug text-[var(--ink)]">{item.title}</h3>
                    <p className="body-text mt-1.5 text-sm">{item.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          CTA
      ══════════════════════════════════════════════════════ */}
      <section className="chalk-bg relative overflow-hidden px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="solidstar" className="left-[6%]   top-10   h-8  w-8  text-[#f7d774]/70" />
        <Doodle kind="leaf"      className="right-[5%]  top-10   h-10 w-10 text-white/40   hidden sm:block" />
        <Doodle kind="flower"    className="right-[16%] bottom-6 h-9  w-9  text-[#f4aac8]/55 hidden lg:block" />

        <div className="container-site">
          <Reveal>
            <div className="mx-auto max-w-xl text-center">
              <h2 className="font-heading text-[2.2rem] leading-[1.2] text-white sm:text-[2.6rem]">
                Download our prospectus or get in touch
              </h2>
              <div className="mt-7 flex flex-wrap justify-center gap-4">
                <PastelButton href="/contact" variant="blush">
                  Contact Us <ArrowRight className="h-4 w-4" />
                </PastelButton>
                <PastelButton href="/application-form" variant="butter">
                  Application Form <ArrowRight className="h-4 w-4" />
                </PastelButton>
              </div>
            </div>
          </Reveal>
        </div>
      </section>


    </PublicLayout>
  );
}
