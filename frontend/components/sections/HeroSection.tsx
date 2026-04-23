import { ArrowRight, Mail, Phone, Sparkles } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import ChatBotCard from "@/components/ui/ChatBotCard";
import Doodle from "@/components/ui/Doodle";
import { Float, Reveal } from "@/components/ui/Motion";
import PastelButton from "@/components/ui/PastelButton";

// ── Branch button icons ───────────────────────────────────────────────────────

function BirdIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {/* body */}
      <ellipse cx="11" cy="14" rx="5" ry="4" />
      {/* head */}
      <circle cx="16.5" cy="9" r="2.5" />
      {/* beak */}
      <path d="M19 8.2 L23 9 L19 10.2" />
      {/* wing feathers */}
      <path d="M7 13 C5 10 6 7 10 10" />
      {/* feet */}
      <path d="M9 18 L8 21 M12 18 L12 21" />
    </svg>
  );
}

function BeeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {/* body */}
      <ellipse cx="12" cy="15.5" rx="3.5" ry="4.5" />
      {/* body stripes */}
      <line x1="8.5" y1="14.5" x2="15.5" y2="14.5" />
      <line x1="8.5" y1="17" x2="15.5" y2="17" />
      {/* head */}
      <circle cx="12" cy="9.5" r="2.2" />
      {/* antennae */}
      <path d="M10.8 7.5 L9 4.5" /><circle cx="8.7" cy="4" r="0.8" fill="currentColor" stroke="none" />
      <path d="M13.2 7.5 L15 4.5" /><circle cx="15.3" cy="4" r="0.8" fill="currentColor" stroke="none" />
      {/* left wing */}
      <path d="M8.5 13 C5.5 11 5 7.5 7.5 7.5 C9.5 7.5 10 11 8.5 13" />
      {/* right wing */}
      <path d="M15.5 13 C18.5 11 19 7.5 16.5 7.5 C14.5 7.5 14 11 15.5 13" />
    </svg>
  );
}

function ButterflyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {/* body */}
      <path d="M12 6 Q11.5 12 12 19" />
      {/* antennae */}
      <path d="M12 6 L10 3" /><circle cx="9.5" cy="2.5" r="0.8" fill="currentColor" stroke="none" />
      <path d="M12 6 L14 3" /><circle cx="14.5" cy="2.5" r="0.8" fill="currentColor" stroke="none" />
      {/* upper-left wing */}
      <path d="M12 9 C10 5 4 4 4 9 C4 13 10 12 12 9" />
      {/* upper-right wing */}
      <path d="M12 9 C14 5 20 4 20 9 C20 13 14 12 12 9" />
      {/* lower-left wing */}
      <path d="M12 13 C9.5 16 4.5 17 5 13 C5.5 11 9.5 12 12 13" />
      {/* lower-right wing */}
      <path d="M12 13 C14.5 16 19.5 17 19 13 C18.5 11 14.5 12 12 13" />
    </svg>
  );
}

// ── Branch button data ────────────────────────────────────────────────────────

const branchButtons: { label: string; href: string; variant: "blush" | "mint" | "lavender"; icon: ReactNode }[] = [
  { label: "Harrow",      href: "/branches/harrow",      variant: "blush",    icon: <BirdIcon />      },
  { label: "Borehamwood", href: "/branches/borehamwood", variant: "mint",     icon: <BeeIcon />       },
  { label: "Pinner",      href: "/branches/pinner",      variant: "lavender", icon: <ButterflyIcon /> },
];

// Note: outlined prop removed — PastelButton solid→outline-hover is now universal

// ─────────────────────────────────────────────────────────────────────────────

export default function HeroSection() {
  return (
    <section className="relative min-h-[calc(100vh-5.5rem)] overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/home/outdoor-learning-and-play-area.jpg"
          alt="Outdoor learning and play area at Blue Nest Montessori"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(249,244,238,0.9)_0%,rgba(249,244,238,0.75)_28%,rgba(249,244,238,0.5)_52%,rgba(249,244,238,0.78)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_30%,rgba(246,213,223,0.45),transparent_25%),radial-gradient(circle_at_82%_18%,rgba(127,216,210,0.28),transparent_20%),radial-gradient(circle_at_50%_90%,rgba(191,166,232,0.2),transparent_22%)]" />
      </div>

      <Doodle kind="star"  className="left-[2%]  top-16 h-9 w-9  text-[#f0b55f]" />
      <Doodle kind="cloud" className="left-[30%] top-16 h-10 w-10 text-[#85d6f1]" />
      <Doodle kind="heart" className="right-[10%] top-20 h-9 w-9 text-[#f49cb5]" />
      <Doodle kind="leaf"  className="left-[4%]  bottom-8 h-10 w-10 text-[#7fd8d2]" />

      <div className="relative mx-auto grid min-h-[calc(100vh-5.5rem)] max-w-[1800px] gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[0.85fr_1.2fr_0.95fr] lg:px-10 lg:py-7">

        {/* ── Left card — visit us ── */}
        <Reveal className="order-2 lg:order-1 lg:self-center">
          <div className="rounded-[2rem] border border-white/70 bg-[rgba(255,253,249,0.9)] p-3 shadow-[0_18px_45px_rgba(90,74,66,0.12)] backdrop-blur">
            <div className="relative mb-3 aspect-video overflow-hidden rounded-[1.4rem]">
              <Image
                src="/home/structured-routine.jpg"
                alt="Structured Montessori routine"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 26vw"
              />
            </div>

            <div className="px-1 pb-2">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#cf7d9c]">Visit Blue Nest</p>
              <h2 className="mt-1.5 font-heading text-[2.1rem] leading-none text-[#4ec0c3]">Come and say hello</h2>
              <p className="mt-2 text-sm leading-6 text-[rgba(90,74,66,0.82)]">
                Book a visit, ask about sessions, or chat with our team about the right branch for your child.
              </p>

              <div className="mt-3 space-y-2 text-[var(--ink)]">
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
        <Reveal className="order-1 flex flex-col justify-center lg:order-2 lg:px-4">
          <span className="section-kicker w-fit">
            <Sparkles className="h-4 w-4" />
            Montessori for ages 3 months to 5 years
          </span>
          <h1 className="text-balance mt-4 max-w-3xl font-heading text-[3.2rem] leading-[0.94] text-[#cf7d9c] sm:text-[4.4rem] lg:text-[5.2rem]">
            Excellent children&apos;s nurseries in Harrow, Pinner &amp; Borehamwood
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[rgba(90,74,66,0.88)] sm:text-lg">
            A warm, safe and inspiring Montessori environment where children learn, play and grow with confidence.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            {branchButtons.map((branch) => (
              <PastelButton key={branch.label} href={branch.href} variant={branch.variant}>
                {branch.icon}
                {branch.label}
              </PastelButton>
            ))}
          </div>
        </Reveal>

        {/* ── Right — chatbot ── */}
        <Reveal delay={0.12} className="order-3 flex items-center justify-center lg:justify-end lg:self-center">
          <Float className="w-full max-w-[22rem]" delay={0.25}>
            <ChatBotCard />
          </Float>
        </Reveal>
      </div>
    </section>
  );
}
