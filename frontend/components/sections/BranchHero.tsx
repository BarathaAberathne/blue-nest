import Image from "next/image";
import { ArrowRight } from "lucide-react";
import PastelButton from "@/components/ui/PastelButton";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";
import type { PastelVariant } from "@/components/ui/PastelButton";

interface Cta {
  label:    string;
  href:     string;
  variant?: PastelVariant;
}

interface BranchHeroProps {
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
    <section className="flex flex-col lg:flex-row lg:items-start">

      {/* ── LEFT — text on paper background (desktop) / over photo (mobile) ─ */}
      <div className="paper-bg relative flex w-full items-start overflow-hidden lg:w-1/2">

        {/* Mobile-only background photo */}
        <Image
          src={image}
          alt=""
          aria-hidden="true"
          fill
          priority
          fetchPriority="high"
          className="object-cover object-center lg:hidden"
          quality={55}
          sizes="100vw"
        />

        {/* Mobile-only dark overlay for text legibility */}
        <div
          className="absolute inset-0 bg-black/40 lg:hidden"
          aria-hidden="true"
        />

        <Doodle
          kind="pink-flower"
          className="absolute bottom-8 left-5 h-9 w-9 opacity-35 hidden lg:block pointer-events-none"
        />

        <div className="relative z-10 w-full px-8 py-10 sm:px-12 sm:py-12 lg:px-14 lg:pt-8 lg:pb-8 xl:px-20">
          <Reveal className="flex flex-col gap-5">

            {/* Optional badge (e.g. Coming Soon) */}
            {badge && (
              <span className="w-fit inline-flex items-center rounded-full bg-[rgba(247,215,116,0.28)] px-5 py-2 text-xs font-bold uppercase tracking-[0.22em] text-[#8a6d00] ring-1 ring-[rgba(247,215,116,0.55)]">
                {badge}
              </span>
            )}

            <span className="section-kicker text-white lg:text-[rgba(58,173,169,0.80)]">{location}</span>

            <h1 className="font-heading text-[2.2rem] leading-[1.12] text-white sm:text-[2.7rem] lg:text-[3rem] lg:text-[var(--ink)]">
              {heading}
            </h1>

            <p className="body-text max-w-md hidden sm:block text-white/90 lg:text-[rgba(90,74,66,0.95)]">{description}</p>

            <div className="flex flex-nowrap gap-2 pt-1 sm:flex-wrap sm:gap-3">
              <PastelButton
                href={primaryCta.href}
                variant={primaryCta.variant ?? "rose"}
                className="flex-1 min-w-0 whitespace-nowrap !px-3 !text-sm sm:flex-initial sm:!px-6 sm:!text-[1.45rem]"
              >
                {primaryCta.label} <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </PastelButton>
              <PastelButton
                href={secondaryCta.href}
                variant={secondaryCta.variant ?? "mint"}
                className="flex-1 min-w-0 whitespace-nowrap !px-3 !text-sm sm:flex-initial sm:!px-6 sm:!text-[1.45rem]"
              >
                {secondaryCta.label} <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </PastelButton>
            </div>

            {/* Trust line */}
            <p className="text-[0.68rem] text-white/90 hidden sm:block lg:text-[rgba(90,74,66,0.85)]">
              Ofsted Good Provider&ensp;·&ensp;5-Star Food Hygiene Rated&ensp;·&ensp;Mon–Fri 7:30 am – 6:00 pm
            </p>

          </Reveal>
        </div>
      </div>

      {/* ── RIGHT — branch image (desktop only) ────────────────── */}
      <div className="relative hidden lg:flex lg:self-stretch w-1/2 overflow-x-hidden">

        {/* Branch photo fills the right pane */}
        <Image
          src={image}
          alt={imageAlt}
          fill
          priority
          fetchPriority="high"
          className="object-cover object-center"
          quality={55}
          sizes="50vw"
        />

        <Doodle
          kind="blue-bird"
          animated="float"
          className="absolute right-6 top-8 h-10 w-10 opacity-45 pointer-events-none"
        />
      </div>

    </section>
  );
}
