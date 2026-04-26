import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, Mail, Phone, Users } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import PastelButton from "@/components/ui/PastelButton";
import StickerCard from "@/components/ui/StickerCard";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";
import ZigzagBand from "@/components/ui/ZigzagBand";

export const metadata: Metadata = {
  title: "Forest School — Blue Nest Montessori School",
};

export default function ForestSchoolPage() {
  return (
    <PublicLayout>

      {/* ══════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative flex min-h-[62vh] items-center">
        {/* Background image + layered overlays */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Image
            src="/home/outdoor-play-for-children-new.jpg"
            alt="Children exploring the outdoors at Blue Nest Forest School"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[#fff8f0]/65" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_16%_60%,rgba(174,230,221,0.45),transparent_46%),radial-gradient(ellipse_at_80%_18%,rgba(246,213,223,0.30),transparent_40%)]" />
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(90,74,66,0.07) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
        </div>

        <Doodle kind="bird"      className="left-[5%]   top-8    h-9  w-9  text-[#7fd8d2]  opacity-65" />
        <Doodle kind="leaf"      className="right-[6%]  top-12   h-10 w-10 text-[#8ecb9b]  opacity-55 hidden sm:block" />
        <Doodle kind="cloud"     className="right-[18%] top-8    h-12 w-12 text-[#aee6dd]  opacity-40 hidden lg:block" />
        <Doodle kind="solidstar" className="right-[5%]  bottom-8 h-8  w-8  text-[#f7d774]  opacity-55 hidden sm:block" />
        <Doodle kind="flower"    className="left-[40%]  bottom-6 h-9  w-9  text-[#ef8cab]  opacity-40 hidden lg:block" />

        <div className="container-site relative z-10 py-16 sm:py-20 lg:py-24">
          <Reveal>
            <div className="max-w-xl">
              <span className="section-kicker">Blue Nest Montessori School</span>
              <h1 className="mt-4 font-heading text-[2.5rem] leading-[1.1] text-white sm:text-[3rem] lg:text-[3.4rem]">
                A Forest School that fosters creativity and independence
              </h1>
              <p className="mt-5 max-w-lg !text-white/90 body-text">
                At Blue Nest Montessori School, we are delighted to bring you the Forest School.
                Children of all ages can benefit from the &lsquo;hands-on learning&rsquo;
                opportunities presented in a wonderful woodland environment. Contact our nurseries
                in Harrow and Pinner for more information.
              </p>
              <div className="mt-7">
                <PastelButton href="/contact" variant="sage">
                  Contact Us <ArrowRight className="h-4 w-4" />
                </PastelButton>
              </div>
            </div>
          </Reveal>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          OUTDOOR LEARNING
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="leaf"   className="left-[2%]   top-10    h-10 w-10 text-[#8ecb9b]  opacity-50" />
        <Doodle kind="bird"   className="right-[5%]  top-8     h-9  w-9  text-[#7fd8d2]  opacity-55 hidden sm:block" />
        <Doodle kind="flower" className="right-[8%]  bottom-10 h-10 w-10 text-[#ef8cab]  opacity-45 hidden sm:block" />

        <div className="container-site">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">

            {/* Image — left */}
            <Reveal>
              <div className="relative mx-auto flex w-full max-w-[380px] items-center justify-center">
                <div
                  className="absolute h-[90%] w-[90%] bg-[rgba(142,203,155,0.18)]"
                  style={{ borderRadius: "54% 46% 42% 58% / 48% 56% 44% 52%" }}
                />
                <StickerCard
                  src="/home/outdoor-learning-and-play-area.jpg"
                  alt="Children learning outdoors"
                  rotate={-2}
                  sizes="(max-width: 1024px) 80vw, 38vw"
                  className="relative z-10 w-[88%]"
                  aspectRatio="4/5"
                />
              </div>
            </Reveal>

            {/* Text — right */}
            <Reveal delay={0.1}>
              <span className="section-kicker">Outdoor Education</span>
              <h2 className="section-title mt-4 text-[#7fd8d2]">
                Where children can explore and learn in the outdoors
              </h2>
              <div className="mt-3 flex gap-1.5" aria-hidden="true">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="h-[3px] w-5 rounded-full bg-[#8ecb9b]" />
                ))}
              </div>
              <div className="body-text mt-5 space-y-5">
                <p>
                  The Forest School approach to learning in the outdoors is rooted firmly in the
                  key progressive education theorists of the past one hundred and fifty years &ndash;
                  from Froebel to Steiner, Vygotsky to Montessori, Dewey to Gardner &ndash; all of
                  them put the child at the centre of their own learning; all talk of the importance
                  of children being allowed to explore the world with appropriate support. Forest
                  School encourages children to explore their own innate learning in the richest
                  classroom we have &ndash; the outdoors.
                </p>
                <p>
                  If you&rsquo;d like more information about our nursery or preschool policies,
                  contact us today.
                </p>
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <PastelButton href="/our-team" variant="mint">
                  <Users className="h-4 w-4" /> Our Team
                </PastelButton>
              </div>
            </Reveal>

          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          LEARNING PROCESS
      ══════════════════════════════════════════════════════ */}
      <section
        className="relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16"
        style={{ backgroundColor: "rgba(174,230,221,0.22)" }}
      >
        <Doodle kind="solidstar" className="right-[4%]  top-10    h-8  w-8  text-[#f7d774]  opacity-55" />
        <Doodle kind="leaf"      className="left-[3%]   bottom-10 h-10 w-10 text-[#8ecb9b]  opacity-50 hidden sm:block" />
        <Doodle kind="cloud"     className="right-[14%] bottom-8  h-12 w-12 text-[#aee6dd]  opacity-45 hidden lg:block" />

        <div className="container-site">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">

            {/* Text — left */}
            <Reveal>
              <span className="section-kicker">How it works</span>
              <h2 className="section-title mt-4 text-[#cf7d9c]">
                The learning process
              </h2>
              <div className="body-text mt-5 space-y-5">
                <p>
                  The Forest School ethos focuses on an approach to learning that maximises the
                  emotional, social and developmental benefits of education. Forest School works
                  with children and young people in the outdoors over a period of time, working
                  with a higher than normal staffing ratio, introducing responsible risk-taking and
                  setting participants up to achieve.
                </p>
                <p>
                  Forest School is run by a qualified Forest Leader (level&nbsp;3), together with
                  other staff that are well-versed in the process.
                </p>
              </div>
            </Reveal>

            {/* Image — right */}
            <Reveal delay={0.1}>
              <div className="mx-auto w-full max-w-[380px]">
                <StickerCard
                  src="/home/children-outdoor-play.jpg"
                  alt="Forest School session in progress"
                  rotate={3}
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
          VISUAL / VALUES — dedicated to helping minds grow
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <Doodle kind="rainbow"   className="left-[1%]   bottom-10 h-14 w-14              opacity-35 hidden sm:block" />
        <Doodle kind="bird"      className="right-[4%]  top-10    h-9  w-9  text-[#7fd8d2]  opacity-55" />
        <Doodle kind="flower"    className="left-[5%]   top-12    h-10 w-10 text-[#ef8cab]  opacity-45 hidden sm:block" />
        <Doodle kind="leaf"      className="right-[10%] bottom-8  h-10 w-10 text-[#8ecb9b]  opacity-50 hidden lg:block" />
        <Doodle kind="solidstar" className="left-[44%]  top-8     h-7  w-7  text-[#f7d774]  opacity-45" />

        <div className="container-site">
          <Reveal>
            <div className="mb-10 text-center">
              <span className="section-kicker">Our commitment</span>
              <h2 className="section-title mt-4 text-[#cf7d9c]">
                We are dedicated to helping young minds grow
              </h2>
            </div>
          </Reveal>

          {/* Three photo cards in an organic scattered row */}
          <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-end sm:justify-center sm:gap-6 lg:gap-10">
            <Reveal delay={0}>
              <StickerCard
                src="/home/outdoor-childrens-play-area.jpg"
                alt="Children playing outdoors at Blue Nest"
                rotate={-3}
                sizes="(max-width: 640px) 80vw, (max-width: 1024px) 32vw, 26vw"
                className="w-[80vw] max-w-[260px] sm:w-[28vw]"
                aspectRatio="4/5"
              />
            </Reveal>

            <Reveal delay={0.1}>
              <StickerCard
                src="/home/DSC_0177.jpg"
                alt="Hands-on Montessori learning"
                rotate={1}
                sizes="(max-width: 640px) 80vw, (max-width: 1024px) 32vw, 28vw"
                className="w-[80vw] max-w-[300px] sm:w-[30vw] sm:mb-8"
                aspectRatio="3/4"
              />
            </Reveal>

            <Reveal delay={0.2}>
              <StickerCard
                src="/home/outdoor-play-for-children.jpg"
                alt="Outdoor play at Blue Nest Forest School"
                rotate={2}
                sizes="(max-width: 640px) 80vw, (max-width: 1024px) 32vw, 26vw"
                className="w-[80vw] max-w-[260px] sm:w-[28vw]"
                aspectRatio="4/5"
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          CTA / CONTACT
      ══════════════════════════════════════════════════════ */}
      <ZigzagBand className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="rainbow"   className="left-[2%]   bottom-8 h-14 w-14              opacity-35 hidden sm:block" />
        <Doodle kind="leaf"      className="right-[3%]  top-12   h-10 w-10 text-[rgba(90,74,66,0.45)] hidden sm:block" />
        <Doodle kind="solidstar" className="left-[8%]   top-10   h-8  w-8  text-[#f7d774]/70" />
        <Doodle kind="flower"    className="right-[18%] bottom-6 h-9  w-9  text-[#f4aac8]/60 hidden lg:block" />

        <div className="container-site">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-16">

            {/* Left — heading + contact details */}
            <Reveal>
              <h2 className="font-heading text-[2.2rem] leading-[1.2] text-[var(--ink)] sm:text-[2.6rem]">
                We provide a wonderful environment where children can learn and grow
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-[rgba(90,74,66,0.68)]">
                Email or call the Blue Nest Montessori School to find out more about our
                admission process.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(90,74,66,0.08)]">
                    <Phone className="h-4 w-4 text-[#5fc8c7]" />
                  </div>
                  <div className="text-sm font-semibold leading-relaxed text-[rgba(90,74,66,0.72)]">
                    <div>020 8861 5574</div>
                    <div>07400 430630</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(90,74,66,0.08)]">
                    <Mail className="h-4 w-4 text-[#5fc8c7]" />
                  </div>
                  <a
                    href="mailto:info@bluenest.uk"
                    className="text-sm font-semibold text-[rgba(90,74,66,0.72)] transition hover:text-[var(--ink)]"
                  >
                    info@bluenest.uk
                  </a>
                </div>
              </div>

              <p className="mt-8 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[rgba(90,74,66,0.48)]">
                Follow us
              </p>
              <div className="mt-3 flex gap-3">
                {["Facebook", "Instagram", "TikTok"].map((name) => (
                  <a
                    key={name}
                    href="#"
                    aria-label={name}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(90,74,66,0.08)] text-[0.6rem] font-bold text-[var(--ink)] transition hover:bg-[rgba(90,74,66,0.12)]"
                  >
                    {name[0]}
                  </a>
                ))}
              </div>
            </Reveal>

            {/* Right — contact form */}
            <Reveal delay={0.1}>
              <div className="rounded-[2rem] bg-white px-6 py-7 ring-1 ring-[rgba(90,74,66,0.08)] shadow-[0_4px_16px_rgba(90,74,66,0.07)] sm:px-8">
                <form className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Your Name"
                      className="w-full rounded-[1rem] border-0 bg-white/90 px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[rgba(90,74,66,0.4)] focus:outline-none focus:ring-2 focus:ring-white"
                    />
                    <input
                      type="email"
                      placeholder="Email Address"
                      className="w-full rounded-[1rem] border-0 bg-white/90 px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[rgba(90,74,66,0.4)] focus:outline-none focus:ring-2 focus:ring-white"
                    />
                  </div>
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    className="w-full rounded-[1rem] border-0 bg-white/90 px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[rgba(90,74,66,0.4)] focus:outline-none focus:ring-2 focus:ring-white"
                  />
                  <textarea
                    rows={4}
                    placeholder="Your Message"
                    className="w-full resize-none rounded-[1rem] border-0 bg-white/90 px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[rgba(90,74,66,0.4)] focus:outline-none focus:ring-2 focus:ring-white"
                  />
                  <button type="submit" className="btn-primary w-full">
                    Send Message <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </Reveal>

          </div>
        </div>
      </ZigzagBand>

    </PublicLayout>
  );
}
