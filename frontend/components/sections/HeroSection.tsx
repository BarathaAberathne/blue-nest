import Image from "next/image";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";
import PastelButton from "@/components/ui/PastelButton";

const trustItems = [
  "Rated Good by Ofsted",
  "5-Star Food Hygiene",
  "Trusted by local families",
];

export default function HeroSection() {
  return (
    // h = 100dvh minus the trust-strip + sticky header heights
    // mobile  ≈ 48px strip + 80px header  = ~128px → 8.5rem buffer
    // sm+     ≈ 48px strip + 120px header = ~168px → 11rem buffer
    <section className="paper-bg relative overflow-hidden h-[calc(100dvh-8.5rem)] sm:h-[calc(100dvh-11rem)]">

      {/* Dot texture */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(90,74,66,0.05) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
        aria-hidden="true"
      />

      {/* Colour blooms */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 10% 60%, rgba(246,213,223,0.32) 0%, transparent 42%), " +
            "radial-gradient(ellipse at 88% 18%, rgba(127,216,210,0.18) 0%, transparent 38%)",
        }}
        aria-hidden="true"
      />

      {/* Doodles — max 2, desktop only */}
      <Doodle kind="pink-flower" animated="subtle" className="absolute left-[2%]  bottom-10 h-11 w-11 opacity-55 hidden lg:block" />
      <Doodle kind="blue-bird"   animated="float"  className="absolute right-[3%] top-12   h-10 w-10 opacity-50 hidden lg:block" />

      {/* ── Grid — fills section height ──────────────────────────────── */}
      <div className="container-site relative z-10 grid h-full items-center gap-6 px-4 py-5 sm:px-6 sm:py-6 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:py-8">

        {/* ── Left: copy ── */}
        <Reveal className="flex flex-col items-start gap-3 sm:gap-4 lg:gap-5">

          <span className="section-kicker">
            Award-winning Montessori · Ofsted Good
          </span>

          <h1 className="section-title max-w-xl">
            Montessori Nursery in Harrow, Pinner &amp; Borehamwood
          </h1>

          <p className="font-heading text-[1.05rem] leading-snug text-[var(--ink)] max-w-lg sm:text-[1.22rem]">
            A calm, nurturing start where your child can grow in confidence, independence and joy.
          </p>

          {/* Hidden on mobile — too much text for small screens */}
          <p className="body-text max-w-lg hidden sm:block">
            At Blue Nest Montessori School, we provide a warm and inspiring environment for children
            aged 3 months to 5 years, combining Montessori learning with the EYFS framework.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 pt-1 sm:gap-4 sm:pt-2">
            <PastelButton href="/contact?enquiry=book-visit" variant="blush">
              Book a Visit
              <ArrowRight className="h-4 w-4" />
            </PastelButton>
            <PastelButton href="#our-nurseries" variant="mint">
              View Our Nurseries
            </PastelButton>
          </div>

          {/* Trust bar */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {trustItems.map((item) => (
              <span key={item} className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[var(--muted)]">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#6ecfc9]" aria-hidden="true" />
                {item}
              </span>
            ))}
          </div>

        </Reveal>

        {/* ── Right: image stretches to fill the hero height (desktop only) ── */}
        <Reveal
          delay={0.14}
          className="relative hidden lg:flex lg:flex-col lg:self-stretch lg:py-6"
        >
          {/* Image fills the column height */}
          <div className="relative flex-1 overflow-hidden rounded-[3rem] shadow-[0_24px_60px_rgba(90,74,66,0.13)] ring-4 ring-white/55">
            <Image
              src="/home/branches/harrow/harrow-home-hero.webp"
              alt="Two children dressed as astronauts at the Blue Nest Montessori space-station role-play area"
              fill
              priority
              className="object-cover object-center"
              sizes="45vw"
            />
            <div className="absolute inset-0 bg-[rgba(255,248,242,0.10)]" aria-hidden="true" />
          </div>

          {/* Floating info badge */}
          <div className="absolute -bottom-1 -left-5 rounded-[1.5rem] bg-[rgba(255,253,249,0.96)] px-5 py-4 shadow-[0_10px_28px_rgba(90,74,66,0.12)] ring-1 ring-[rgba(90,74,66,0.07)] backdrop-blur-sm">
            <p className="font-heading text-[1.55rem] leading-none text-[var(--ink)]">Ages 3m – 5yrs</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Mon–Fri · 7:30am–6:00pm</p>
          </div>

        </Reveal>

      </div>
    </section>
  );
}
