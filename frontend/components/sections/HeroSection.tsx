import { ArrowRight, Leaf, Mail, Phone, Sparkles } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import ChatBotCard from "@/components/ui/ChatBotCard";
import ChatBotFAB from "@/components/ui/ChatBotFAB";
import Doodle from "@/components/ui/Doodle";
import { Float, Reveal } from "@/components/ui/Motion";
import BlobButton, { type BlobVariant } from "@/components/ui/BlobButton";
import PastelButton from "@/components/ui/PastelButton";

// ── Branch button icons ───────────────────────────────────────────────────────

function BirdIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="11" cy="14" rx="5" ry="4" />
      <circle cx="16.5" cy="9" r="2.5" />
      <path d="M19 8.2 L23 9 L19 10.2" />
      <path d="M7 13 C5 10 6 7 10 10" />
      <path d="M9 18 L8 21 M12 18 L12 21" />
    </svg>
  );
}

function BeeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="12" cy="15.5" rx="3.5" ry="4.5" />
      <line x1="8.5" y1="14.5" x2="15.5" y2="14.5" />
      <line x1="8.5" y1="17" x2="15.5" y2="17" />
      <circle cx="12" cy="9.5" r="2.2" />
      <path d="M10.8 7.5 L9 4.5" /><circle cx="8.7" cy="4" r="0.8" fill="currentColor" stroke="none" />
      <path d="M13.2 7.5 L15 4.5" /><circle cx="15.3" cy="4" r="0.8" fill="currentColor" stroke="none" />
      <path d="M8.5 13 C5.5 11 5 7.5 7.5 7.5 C9.5 7.5 10 11 8.5 13" />
      <path d="M15.5 13 C18.5 11 19 7.5 16.5 7.5 C14.5 7.5 14 11 15.5 13" />
    </svg>
  );
}

function ButterflyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 6 Q11.5 12 12 19" />
      <path d="M12 6 L10 3" /><circle cx="9.5" cy="2.5" r="0.8" fill="currentColor" stroke="none" />
      <path d="M12 6 L14 3" /><circle cx="14.5" cy="2.5" r="0.8" fill="currentColor" stroke="none" />
      <path d="M12 9 C10 5 4 4 4 9 C4 13 10 12 12 9" />
      <path d="M12 9 C14 5 20 4 20 9 C20 13 14 12 12 9" />
      <path d="M12 13 C9.5 16 4.5 17 5 13 C5.5 11 9.5 12 12 13" />
      <path d="M12 13 C14.5 16 19.5 17 19 13 C18.5 11 14.5 12 12 13" />
    </svg>
  );
}

// ── Branch button data ────────────────────────────────────────────────────────

const branchButtons: {
  label: string;
  href: string;
  variant: BlobVariant;
  icon: ReactNode;
  comingSoon?: boolean;
}[] = [
  { label: "Harrow",      href: "/branches/harrow",      variant: "blush",    icon: <BirdIcon />                  },
  { label: "Borehamwood", href: "/branches/borehamwood", variant: "mint",     icon: <BeeIcon />                   },
  { label: "Pinner",      href: "/branches/pinner",      variant: "lavender", icon: <ButterflyIcon />             },
  { label: "Northwood",   href: "/branches/northwood",   variant: "butter",   icon: <Leaf className="h-5 w-5" />, comingSoon: true },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function HeroSection() {
  return (
    <section className="paper-bg relative">

      {/* ── Background + doodles (overflow-hidden isolated here) ────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <Image
          src="/home/outdoor-learning-and-play-area.jpg"
          alt="Outdoor learning and play area at Blue Nest Montessori"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        {/* Warm cream overlay */}
        <div className="absolute inset-0 bg-[#fff8f2]/65" />
        {/* Pastel colour blooms */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_30%,rgba(246,213,223,0.45),transparent_25%),radial-gradient(circle_at_82%_18%,rgba(127,216,210,0.28),transparent_20%),radial-gradient(circle_at_50%_90%,rgba(191,166,232,0.2),transparent_22%)]" />
        {/* Paper dot-texture */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(90,74,66,0.07) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        {/* Mobile doodles */}
        <Doodle kind="heart"     className="right-5     top-5     h-7  w-7  text-[#f4aac8]    lg:hidden" />
        <Doodle kind="solidstar" className="left-[42%]  top-4     h-6  w-6  text-[#f7d774]    lg:hidden" />
        <Doodle kind="cloud"     className="left-3      top-[52%] h-9  w-9  text-[#85d6f1]/75 lg:hidden" />

        {/* Desktop doodles */}
        <Doodle kind="star"      className="left-[2%]   top-16    h-9  w-9  text-[#f0b55f]  hidden lg:block" />
        <Doodle kind="cloud"     className="left-[30%]  top-14    h-12 w-12 text-[#85d6f1]  hidden lg:block" />
        <Doodle kind="heart"     className="right-[10%] top-20    h-9  w-9  text-[#f49cb5]  hidden lg:block" />
        <Doodle kind="leaf"      className="left-[4%]   bottom-8  h-10 w-10 text-[#7fd8d2]  hidden lg:block" />
        <Doodle kind="rainbow"   className="right-[3%]  bottom-16 h-18 w-18                 hidden lg:block" />
        <Doodle kind="bird"      className="left-[18%]  bottom-12 h-9  w-9  text-[#b99fe0]  hidden lg:block" />
        <Doodle kind="solidstar" className="left-[46%]  top-10    h-8  w-8  text-[#f7d774]  hidden lg:block" />
        <Doodle kind="sun"       className="right-[22%] top-8     h-12 w-12 text-[#f7d774]  hidden lg:block" />
        <Doodle kind="flower"    className="right-[32%] bottom-10 h-9  w-9  text-[#f49cb5]  hidden lg:block" />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MOBILE LAYOUT  (hidden on lg+)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative z-10 flex min-h-[calc(100svh-4.5rem)] flex-col space-y-6 px-5 pb-20 pt-8 lg:hidden">

        {/* 1 ── Contact card */}
        <Reveal>
          <div className="rounded-[2rem] bg-[rgba(255,253,249,0.92)] p-4 shadow-[0_6px_20px_rgba(90,74,66,0.09)] backdrop-blur-sm">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#cf7d9c]">Visit Blue Nest</p>
            <h2 className="mt-1 font-heading text-[1.9rem] leading-tight text-[#4ec0c3]">Come and say hello</h2>
            <p className="mt-1.5 text-sm leading-6 text-[rgba(90,74,66,0.78)]">
              Book a visit or ask our team about sessions and admissions.
            </p>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-[0_4px_12px_rgba(90,74,66,0.06)]">
                <Phone className="h-4 w-4 shrink-0 text-[#7fd8d2]" />
                <span className="text-sm font-semibold">020 8861 5574</span>
              </div>
              <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-[0_4px_12px_rgba(90,74,66,0.06)]">
                <Mail className="h-4 w-4 shrink-0 text-[#7fd8d2]" />
                <span className="text-sm font-semibold">manager@bluenest.uk</span>
              </div>
            </div>
            <PastelButton href="/contact" variant="mint" className="mt-4 px-5 py-2.5 text-[1.15rem]">
              Contact Us
              <ArrowRight className="h-4 w-4" />
            </PastelButton>
          </div>
        </Reveal>

        {/* 2 ── Text content */}
        <Reveal delay={0.06}>
          <span className="section-kicker w-fit tracking-[0.18em]">
            <Sparkles className="h-3.5 w-3.5" />
            Montessori for ages 3 months to 5 years
          </span>

          <h1 className="mt-5 max-w-[22rem] font-heading leading-[0.97]">
            <span className="block text-[2.9rem] text-white">Excellent</span>
            <span className="block text-[2.9rem] text-white">Children&apos;s</span>
            <span className="block text-[2.9rem] text-white">Nurseries</span>
            <span className="block text-[2.9rem] text-white">in Harrow,</span>
            <span className="block text-[2.9rem] text-white">Pinner &amp;</span>
            <span className="block text-[2.9rem] text-white">Borehamwood</span>
          </h1>

          <p className="mt-6 max-w-[22rem] text-[1.05rem] leading-8 text-[rgba(90,74,66,0.88)]">
            A warm, safe and inspiring Montessori environment where children learn, play and grow with confidence.
          </p>

          <div className="mt-6 flex flex-row flex-wrap gap-3">
            {branchButtons.map((branch) => (
              <BlobButton
                key={branch.label}
                href={branch.href}
                variant={branch.variant}
                className="px-4 py-2.5 text-[1.2rem]"
              >
                {branch.icon}
                {branch.label}
                {branch.comingSoon && (
                  <span className="ml-1.5 rounded-full bg-white/30 px-1.5 py-0.5 font-body text-[0.62rem] font-bold uppercase tracking-wide">
                    Soon
                  </span>
                )}
              </BlobButton>
            ))}
          </div>
        </Reveal>

      </div>

      {/* Floating chatbot FAB — mobile only, renders fixed button + slide-up panel */}
      <ChatBotFAB />

      {/* ══════════════════════════════════════════════════════════════════════
          DESKTOP LAYOUT  (hidden below lg)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative z-10 mx-auto hidden min-h-[80vh] max-w-[1800px] items-center gap-6 px-4 py-8 lg:grid lg:grid-cols-[0.85fr_1.2fr_0.95fr] lg:px-10">

        {/* ── Left — contact card ── */}
        <Reveal className="self-center">
          <div
            className="rounded-[2.5rem] bg-[rgba(255,253,249,0.88)] p-3 shadow-[0_8px_22px_rgba(90,74,66,0.07)] backdrop-blur-sm"
            style={{ transform: "rotate(-1.5deg)" }}
          >
            <div className="relative mb-3 aspect-video overflow-hidden rounded-[1.4rem]">
              <Image
                src="/home/structured-routine.jpg"
                alt="Structured Montessori routine"
                fill
                className="object-cover"
                sizes="(max-width: 1280px) 30vw, 24vw"
              />
            </div>
            <div className="px-1 pb-2">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#cf7d9c]">Visit Blue Nest</p>
              <h2 className="mt-1.5 font-heading text-[2.1rem] leading-none text-[#4ec0c3]">Come and say hello</h2>
              <p className="mt-2 text-sm leading-6 text-[rgba(90,74,66,0.82)]">
                Book a visit, ask about sessions, or chat with our team about the right branch for your child.
              </p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-[0_8px_20px_rgba(90,74,66,0.06)]">
                  <Phone className="h-4 w-4 text-[#7fd8d2]" />
                  <span className="text-sm font-semibold">020 8861 5574</span>
                </div>
                <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-[0_8px_20px_rgba(90,74,66,0.06)]">
                  <Mail className="h-4 w-4 text-[#7fd8d2]" />
                  <span className="text-sm font-semibold">manager@bluenest.uk</span>
                </div>
              </div>
              <PastelButton href="/contact" variant="mint" className="mt-4 px-5 py-2.5 text-[1.3rem]">
                Contact Us
                <ArrowRight className="h-4 w-4" />
              </PastelButton>
            </div>
          </div>
        </Reveal>

        {/* ── Centre — headline + branch buttons ── */}
        <Reveal className="flex flex-col justify-center px-4">
          <span className="section-kicker w-fit">
            <Sparkles className="h-4 w-4" />
            Montessori for ages 3 months to 5 years
          </span>
          <h1 className="mt-4 max-w-3xl font-heading leading-[0.94]">
            <span className="block text-[3.2rem] text-white xl:text-[4.4rem]">Excellent children&apos;s nurseries</span>
            <span className="block text-[3.2rem] text-white xl:text-[4.4rem]">in Harrow, Pinner</span>
            <span className="block text-[3.2rem] text-white xl:text-[4.4rem]">&amp; Borehamwood</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[rgba(90,74,66,0.88)] lg:text-lg">
            A warm, safe and inspiring Montessori environment where children learn, play and grow with confidence.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {branchButtons.map((branch) => (
              <BlobButton key={branch.label} href={branch.href} variant={branch.variant}>
                {branch.icon}
                {branch.label}
                {branch.comingSoon && (
                  <span className="ml-1 rounded-full bg-white/25 px-1.5 py-0.5 font-body text-[0.62rem] font-bold uppercase tracking-wide">
                    Soon
                  </span>
                )}
              </BlobButton>
            ))}
          </div>
        </Reveal>

        {/* ── Right — chatbot (sticky) ── */}
        <Reveal delay={0.12} className="self-center">
          <div className="sticky top-8 flex justify-end">
            <Float delay={0.25}>
              <ChatBotCard />
            </Float>
          </div>
        </Reveal>

      </div>
    </section>
  );
}
