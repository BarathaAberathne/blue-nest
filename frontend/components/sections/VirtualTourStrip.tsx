import Link from "next/link";
import Doodle from "@/components/ui/Doodle"; // Already imported, just ensuring it's there
import { Reveal } from "@/components/ui/Motion";
import { MoveRight } from "lucide-react";

const BG = "#5fc8c7";

// ── Animated bird ─────────────────────────────────────────────────────────────

function AnimatedBird() {
  return (
    <div
      className="pointer-events-none absolute z-10 will-change-transform"
      style={{
        animation: "bird-fly-left 22s ease-in-out infinite",
        left: 0,
        top: "28%",
      }}
    >
      <svg
        width="52"
        height="39"
        viewBox="0 0 32 24"
        fill="none"
        aria-hidden="true"
        style={{ animation: "bird-float 4s ease-in-out infinite" }}
      >
        {/* Dashed trail behind bird */}
        <path
          d="M 0 12 Q 16 8 32 12"
          stroke="rgba(58,173,169,0.30)"
          strokeWidth="1"
          strokeDasharray="4,4"
          fill="none"
          style={{ animation: "bird-trail-dash 0.8s linear infinite" }}
        />
        {/* Body */}
        <ellipse cx="16" cy="12" rx="7" ry="5.5" fill="none" stroke="#3aada9" strokeWidth="1.5" />
        {/* Head */}
        <circle cx="22" cy="10.5" r="4.5" fill="#7fd8d2" stroke="#3aada9" strokeWidth="1.2" />
        {/* Eye */}
        <circle cx="24" cy="9.5" r="1.1" fill="#3a2e29" />
        <circle cx="24.4" cy="9.1" r="0.4" fill="white" />
        {/* Beak */}
        <path d="M 26.5 10.5 L 29 10 L 26.5 11.5 Z" fill="#f0bd55" />
        {/* Wings */}
        <path
          d="M 16 10 Q 10 6 8 9 Z"
          stroke="#3aada9" strokeWidth="1.3" strokeLinecap="round"
          fill="rgba(127,216,210,0.55)"
          style={{ transformOrigin: "16px 10px", animation: "bird-wing-flap 2.4s ease-in-out infinite" }}
        />
        <path
          d="M 16 10 Q 22 6 24 9 Z"
          stroke="#3aada9" strokeWidth="1.3" strokeLinecap="round"
          fill="rgba(127,216,210,0.55)"
          style={{ transformOrigin: "16px 10px", animation: "bird-wing-flap 3.3s ease-in-out infinite 0.7s" }}
        />
        {/* Tail */}
        <path d="M 9 12 Q 5 11.5 3 13.5" stroke="#3aada9" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function VirtualTourStrip() {
  return (
    <section
      className="relative overflow-hidden px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7"
      style={{ background: BG }}
      aria-label="Explore Our Gallery"
    >
      {/* Animated bird */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <AnimatedBird />
      </div>

      {/* Ambient doodles */}
      <Doodle kind="pink-flower" animated="pulse" className="absolute left-[30%] top-1  h-6 w-6 opacity-50 hidden md:block" />
      <Doodle kind="leaf"        className="absolute right-[3%] bottom-2 h-7 w-7 opacity-48 hidden sm:block" />

      {/* Content */}
      <div className="container-site">
        <Reveal>
          <div className="relative z-10 flex flex-col items-start justify-between gap-4 sm:items-center sm:flex-row">

            {/* Text */}
            <div>
              <p className="font-heading text-[2rem] leading-none text-[var(--ink)] sm:text-[2.4rem] lg:text-[2.6rem]">
                Explore Our Gallery
              </p>
              <p className="mt-1.5 max-w-lg text-[0.9rem] leading-relaxed text-[rgba(90,74,66,0.68)] sm:text-base">
                Browse photos of our bright classrooms, cosy reading corners and outdoor learning spaces.
              </p>
            </div>

            {/* CTA */}
            <Link
              href="/gallery"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#f4aac8] px-7 py-3 font-heading text-[1.25rem] leading-none tracking-[0.04em] text-white shadow-[0_5px_18px_rgba(244,170,200,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#e8719a]"
            >
              View Gallery
              <MoveRight className="h-4 w-4" />
            </Link>

          </div>
        </Reveal>
      </div>
    </section>
  );
}
