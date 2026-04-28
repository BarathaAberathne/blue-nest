import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, Mail, Phone } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import PastelButton from "@/components/ui/PastelButton";
import StickerCard from "@/components/ui/StickerCard";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";
import ZigzagBand from "@/components/ui/ZigzagBand";

export const metadata: Metadata = {
  title: "Why Montessori — Blue Nest Montessori School",
};

export default function WhyMontessoriPage() {
  return (
    <PublicLayout>

      {/* ══════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative flex min-h-[62vh] items-center">
        {/* Background image + layered overlays */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Image
            src="/home/outdoor-learning-and-play-area.jpg"
            alt="Blue Nest Montessori learning environment"
            fill
            priority
            className="object-cover object-right"
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
          <Reveal>
            <span className="section-kicker">Blue Nest Montessori School</span>
            <h1 className="mt-4 font-heading text-[2.5rem] leading-[1.1] text-white sm:text-[3rem] lg:text-[3.4rem] max-w-3xl">
              Montessori nursery in Harrow, Pinner and Borehamwood
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
                  founded the Montessori Method of teaching. She believed that children have
                  sensitive periods for learning. These are the times when the child will be
                  sensitive to a certain type of knowledge and will learn effortlessly.
                </p>
                <p>
                  The Montessori nursery environment is carefully designed to respond to the
                  child&rsquo;s needs at the early stages and provides maximum opportunity for
                  their development.
                </p>
              </div>
            </Reveal>

          </div>
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
                  src="/home/outdoor-childrens-play-area.jpg"
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
                <p className="font-heading text-[1.5rem] leading-[1.65] text-[rgba(90,74,66,0.75)] sm:text-[1.75rem]">
                  The best nursery I could&rsquo;ve chosen for my daughter. She is so happy there.
                  The staff are so caring and thoughtful. I would go there myself if I only could.
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#ef8cab] opacity-60" />
                  <cite className="font-body text-[0.7rem] font-extrabold not-italic uppercase tracking-[0.22em] text-[rgba(90,74,66,0.45)]">
                    Agnieszka G
                  </cite>
                </div>
              </div>

            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          CTA / CONTACT
      ══════════════════════════════════════════════════════ */}
      <ZigzagBand className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="leaf"      className="right-[3%]  top-12   h-10 w-10 hidden sm:block opacity-40" />
        <Doodle kind="pink-flower"    className="right-[18%] bottom-6 h-9  w-9  hidden lg:block opacity-40" />

        <div className="container-site">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-16">

            {/* Left — heading + contact details */}
            <Reveal>
              <h2 className="font-heading text-[2.2rem] leading-[1.2] text-[var(--ink)] sm:text-[2.6rem]">
                We provide a wonderful environment where children can learn and grow
              </h2>

              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(90,74,66,0.08)]">
                    <Phone className="h-4 w-4 text-[#5fc8c7]" />
                  </div>
                  <div className="text-sm font-semibold leading-relaxed text-[rgba(90,74,66,0.72)]">
                    <div>020 8863 2076</div>
                    <div>020 8429 5411</div>
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
