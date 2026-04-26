import Link from "next/link";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";
import { MoveRight } from "lucide-react";

// ── Zigzag path — 48 sharp triangles across 1440px viewbox ───────────────────

const ZIGZAG = (() => {
  const W = 1440, step = 30, half = step / 2;
  let d = "M0,60";
  for (let x = 0; x < W; x += step) d += ` L${x + half},0 L${x + step},60`;
  return d + ` L${W},70 L0,70 Z`;
})();

const BG    = "#DFF5F3"; // light teal strip background
const TEAL  = "#5fc8c7"; // main teal — triangle colour
const CREAM = "#f9f4ee"; // surrounding page cream

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
    <>
      {/* Top scallop — cream → teal */}
      <div
        aria-hidden="true"
        className="pointer-events-none -mb-px w-full overflow-hidden leading-none"
        style={{ background: CREAM }}
      >
        <svg
          viewBox="0 0 1440 70"
          preserveAspectRatio="none"
          className="block h-[10px] w-full sm:h-[12px] lg:h-[14px]"
        >
          <path d={ZIGZAG} fill={TEAL} />
        </svg>
      </div>

      {/* Main strip */}
      <section
        className="relative overflow-hidden px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7"
        style={{ background: BG }}
        aria-label="Take a Virtual Tour"
      >
        {/* Animated bird */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <AnimatedBird />
        </div>

        {/* Ambient doodles */}
        <Doodle kind="heart"     className="absolute left-[2%]  top-1/2 h-7  w-7  -translate-y-1/2 text-[#ef8cab] opacity-55 hidden sm:block" />
        <Doodle kind="flower"    className="absolute left-[38%] bottom-2 h-6  w-6  text-[#ef8cab] opacity-50 hidden md:block" />
        <Doodle kind="solidstar" className="absolute left-[58%] bottom-1 h-5  w-5  text-[#f0bd55] opacity-58 hidden md:block" />
        <Doodle kind="leaf"      className="absolute right-[3%] bottom-2 h-7  w-7  text-[#8ecb9b] opacity-48 hidden sm:block" />

        {/* Content */}
        <div className="container-site">
          <Reveal>
            <div className="relative z-10 flex flex-col items-start justify-between gap-4 sm:items-center sm:flex-row">

              {/* Text */}
              <div>
                <p className="font-heading text-[2rem] leading-none text-[var(--ink)] sm:text-[2.4rem] lg:text-[2.6rem]">
                  Take a Virtual Tour
                </p>
                <p className="mt-1.5 max-w-lg text-[0.9rem] leading-relaxed text-[rgba(90,74,66,0.68)] sm:text-base">
                  Explore our bright classrooms, cozy reading corners and outdoor learning spaces before your visit.
                </p>
              </div>

              {/* CTA */}
              <Link
                href="/gallery"
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#f4aac8] px-7 py-3 font-heading text-[1.25rem] leading-none tracking-[0.04em] text-white shadow-[0_5px_18px_rgba(244,170,200,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#e8719a]"
              >
                Start Exploring
                <MoveRight className="h-4 w-4" />
              </Link>

            </div>
          </Reveal>
        </div>
      </section>

      {/* Bottom zigzag — teal triangles on cream base */}
      <div
        aria-hidden="true"
        className="pointer-events-none -mt-px w-full overflow-hidden leading-none"
        style={{ background: CREAM }}
      >
        <svg
          viewBox="0 0 1440 70"
          preserveAspectRatio="none"
          className="block h-[10px] w-full sm:h-[12px] lg:h-[14px]"
          style={{ transform: "scaleY(-1)" }}
        >
          <path d={ZIGZAG} fill={TEAL} />
        </svg>
      </div>
    </>
  );
}
