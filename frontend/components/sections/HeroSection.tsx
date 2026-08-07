import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Reveal } from "@/components/ui/Motion";
import PastelButton from "@/components/ui/PastelButton";

const trustItems = [
  "Rated Good by Ofsted",
  "5-Star Food Hygiene",
  "Trusted by local families",
];

// Branch picker — colour tokens match the per-branch `--branch-*` variables
// defined in styles/globals.css so the chips line up with the rest of the
// site's branch identity.
const branches: {
  name:        string;
  href:        string;
  colour:      string;
  comingSoon?: boolean;
}[] = [
  { name: "Harrow",       href: "/branches/harrow",       colour: "var(--branch-harrow)" },
  { name: "Pinner",       href: "/branches/pinner",       colour: "var(--branch-pinner)" },
  { name: "Borehamwood",  href: "/branches/borehamwood",  colour: "var(--branch-borehamwood)" },
  { name: "Pinner Green", href: "/branches/pinner-green", colour: "var(--branch-pinner-green)", comingSoon: true },
  { name: "Northwood",    href: "/branches/northwood",    colour: "var(--branch-northwood)",    comingSoon: true },
  { name: "Aldershot",    href: "/branches/aldershot",    colour: "var(--branch-aldershot)" },
];

export default function HeroSection() {
  return (
    // Height policy (preserved from the earlier tablet fix):
    //   mobile  (<sm) fills viewport
    //   tablet  (sm)  content-driven
    //   desktop (lg)  fills viewport (with full-bleed background image)
    <section className="paper-bg relative overflow-hidden min-h-[calc(100dvh-8.5rem)] sm:min-h-0 lg:min-h-[calc(100dvh-11rem)]">

      {/* Full-bleed background image (the astronaut photo previously
          shown only on the desktop right pane). priority+sizes=100vw
          because it's above the fold and now spans the whole hero. */}
      <Image
        src="/home/branches/harrow/harrow-home-hero.webp"
        alt=""
        fill
        priority
        fetchPriority="high"
        quality={55}
        sizes="100vw"
        className="object-cover object-center"
        aria-hidden="true"
      />

      {/* Cream-to-transparent gradient — keeps the left-side h1 readable
          while letting the photo bleed through on the right (where the
          branch-picker card sits with its own backdrop-blur). */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[rgba(255,253,249,0.95)] via-[rgba(255,253,249,0.78)] to-[rgba(255,253,249,0.18)]"
        aria-hidden="true"
      />

      {/* Subtle dot grain (kept from the original) — sits over both the
          image and the gradient to give the cream area its paper feel. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(90,74,66,0.05) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
        aria-hidden="true"
      />

      {/* ── Grid — fills section height ──────────────────────────────── */}
      <div className="container-site relative z-10 grid h-full items-center gap-6 px-4 py-5 sm:px-6 sm:py-6 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:py-8">

        {/* ── Left: copy ── */}
        <Reveal className="flex flex-col items-start gap-3 sm:gap-4 lg:gap-5">

          <span className="section-kicker">
            Award-winning Montessori · Ofsted Good
          </span>

          <h1 className="section-title max-w-xl">
            Montessori Nursery in Harrow, Pinner, Borehamwood &amp; Aldershot
          </h1>

          <p className="font-heading text-[1.05rem] leading-snug text-[var(--ink)] max-w-lg sm:text-[1.22rem]">
            A calm, nurturing start where your child can grow in confidence, independence and joy.
          </p>

          {/* Hidden on mobile — too much text for small screens */}
          <p className="body-text max-w-lg hidden sm:block">
            At Blue Nest Montessori School, we provide a warm and inspiring environment for children
            aged 3 months to 5 years, combining Montessori learning with the EYFS framework.
          </p>

          {/* CTAs — wrap on mobile/tablet; single row on desktop */}
          <div className="flex flex-wrap gap-3 pt-1 sm:gap-4 sm:pt-2 lg:flex-nowrap lg:gap-2.5">
            <PastelButton href="/contact?enquiry=book-visit" variant="blush" className="whitespace-nowrap lg:px-4 lg:text-[1.2rem]">
              Book a Visit
              <ArrowRight className="h-4 w-4" />
            </PastelButton>
            <PastelButton href="/admission/our-fees#fee-calculator" variant="mint" className="whitespace-nowrap lg:px-4 lg:text-[1.2rem]">
              Fee Calculator
            </PastelButton>
            <PastelButton href="/play-area" variant="sky" className="whitespace-nowrap lg:px-4 lg:text-[1.2rem]">
              <Sparkles className="h-4 w-4" />
              Play Area
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

        {/* ── Branch picker ──
            Single card, responsive: stacks full-width in the content flow on
            mobile/tablet (the grid is one column below lg) and sits on the
            right pane on desktop. Compact padding/title on small screens so
            the hero doesn't feel crowded; full styling restored at lg. */}
        <Reveal
          delay={0.14}
          className="flex w-full lg:justify-end"
        >
          <div className="w-full max-w-full rounded-[1.6rem] bg-white/85 p-4 shadow-[0_12px_36px_rgba(90,74,66,0.16)] ring-1 ring-white/60 backdrop-blur-sm sm:p-5 lg:max-w-[22rem] lg:rounded-[2rem] lg:p-6 lg:shadow-[0_18px_48px_rgba(90,74,66,0.18)]">
            <span className="section-kicker">Our nurseries</span>
            <h2 className="mt-2 font-heading text-[1.2rem] leading-snug text-[var(--ink)] lg:mt-3 lg:text-[1.55rem]">
              Find your nearest Blue Nest
            </h2>

            <ul className="mt-3 flex flex-col gap-1.5 lg:mt-5 lg:gap-2">
              {branches.map((b) => (
                <li key={b.href}>
                  <Link
                    href={b.href}
                    className="group flex min-h-[44px] items-center gap-3 rounded-[1.1rem] bg-[var(--soft-white)] px-3.5 py-2.5 ring-1 ring-[rgba(90,74,66,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_8px_22px_rgba(90,74,66,0.10)] lg:px-4 lg:py-3"
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ background: b.colour }}
                      aria-hidden="true"
                    />
                    <span className="flex-1 text-sm font-bold text-[var(--ink)]">
                      {b.name}
                    </span>
                    {b.comingSoon && (
                      <span className="rounded-full bg-[rgba(247,215,116,0.30)] px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.12em] text-[#8a6d00]">
                        Coming Soon
                      </span>
                    )}
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--muted)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--ink)]" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

      </div>
    </section>
  );
}
