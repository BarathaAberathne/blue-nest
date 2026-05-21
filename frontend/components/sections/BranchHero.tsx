import Image from "next/image";
import { ArrowRight } from "lucide-react";
import PastelButton from "@/components/ui/PastelButton";
import FeeCalculatorCard from "@/components/ui/FeeCalculatorCard";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";
import type { PastelVariant } from "@/components/ui/PastelButton";

type BranchSlug = "harrow" | "pinner" | "borehamwood" | "pinner-green" | "northwood";

interface Cta {
  label:    string;
  href:     string;
  variant?: PastelVariant;
}

interface BranchHeroProps {
  branch:       BranchSlug;
  location:     string;
  heading:      string;
  description:  string;
  image:        string;
  imageAlt:     string;
  primaryCta:   Cta;
  secondaryCta: Cta;
  badge?:       string;
}

export default function BranchHero({
  branch,
  location,
  heading,
  description,
  image,
  imageAlt,
  primaryCta,
  secondaryCta,
  badge,
}: BranchHeroProps) {
  return (
    <section className="flex flex-col lg:flex-row lg:min-h-[calc(100dvh-11rem)]">

      {/* ── LEFT — text on paper background ──────────────────── */}
      <div className="paper-bg relative flex w-full items-start lg:w-1/2">

        <Doodle
          kind="pink-flower"
          className="absolute bottom-8 left-5 h-9 w-9 opacity-35 hidden lg:block pointer-events-none"
        />

        <div className="w-full px-8 py-10 sm:px-12 sm:py-12 lg:px-14 lg:pt-8 lg:pb-8 xl:px-20">
          <Reveal className="flex flex-col gap-5">

            {/* Optional badge (e.g. Coming Soon) */}
            {badge && (
              <span className="w-fit inline-flex items-center rounded-full bg-[rgba(247,215,116,0.28)] px-5 py-2 text-xs font-bold uppercase tracking-[0.22em] text-[#8a6d00] ring-1 ring-[rgba(247,215,116,0.55)]">
                {badge}
              </span>
            )}

            <span className="section-kicker">{location}</span>

            <h1 className="font-heading text-[2.2rem] leading-[1.12] text-[var(--ink)] sm:text-[2.7rem] lg:text-[3rem]">
              {heading}
            </h1>

            <p className="body-text max-w-md hidden sm:block">{description}</p>

            <div className="flex flex-wrap gap-3 pt-1">
              <PastelButton href={primaryCta.href} variant={primaryCta.variant ?? "rose"}>
                {primaryCta.label} <ArrowRight className="h-4 w-4" />
              </PastelButton>
              <PastelButton href={secondaryCta.href} variant={secondaryCta.variant ?? "mint"}>
                {secondaryCta.label} <ArrowRight className="h-4 w-4" />
              </PastelButton>
            </div>

            {/* Trust line */}
            <p className="text-[0.68rem] text-[var(--muted)] hidden sm:block">
              Ofsted Good Provider&ensp;·&ensp;5-Star Food Hygiene Rated&ensp;·&ensp;Mon–Fri 7:30 am – 6:00 pm
            </p>

            {/* Calculator — mobile & tablet only */}
            <div className="lg:hidden mt-1">
              <p className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                Quick fee estimate
              </p>
              <FeeCalculatorCard compact defaultBranch={branch} />
            </div>

          </Reveal>
        </div>
      </div>

      {/* ── RIGHT — branch image + calculator (desktop only) ──── */}
      <div className="relative hidden lg:flex w-1/2 overflow-x-hidden">

        {/* Branch photo fills the right pane */}
        <Image
          src={image}
          alt={imageAlt}
          fill
          priority
          fetchPriority="high"
          className="object-cover object-center"
          sizes="50vw"
        />

        {/* Soft warm overlay — keeps calculator readable without killing the photo */}
        <div className="absolute inset-0 bg-[rgba(255,248,242,0.48)]" />

        {/* Subtle dot grain */}
        <div
          className="absolute inset-0 opacity-[0.18]"
          aria-hidden="true"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(90,74,66,0.08) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        {/* Calculator — centred in right pane, intentionally placed */}
        <div className="relative z-10 w-full max-w-[27rem] px-6 xl:px-0 my-8 mx-auto">
          <Reveal delay={0.1}>
            <FeeCalculatorCard defaultBranch={branch} />
          </Reveal>
        </div>

        <Doodle
          kind="blue-bird"
          animated="float"
          className="absolute right-6 top-8 h-10 w-10 opacity-45 pointer-events-none"
        />
      </div>

    </section>
  );
}
