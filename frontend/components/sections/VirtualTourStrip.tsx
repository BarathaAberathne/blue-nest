import { Bird, MoveRight } from "lucide-react";
import BlobButton from "@/components/ui/BlobButton";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";

// ── Animated Bird SVGs ──────────────────────────────────────────────────────
// Outer div carries the horizontal fly + opacity. Inner SVG carries the
// vertical float. Separating them prevents the transforms from overriding
// each other (CSS animations on the same property, last wins).

function AnimatedTealBird() {
  return (
    <div
      className="pointer-events-none absolute z-10 will-change-transform"
      style={{
        animation: "bird-fly-left 22s ease-in-out infinite",
        left: 0,
        top: "22%",
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
        <path
          d="M 0 12 Q 16 8 32 12"
          stroke="rgba(127,216,210,0.35)"
          strokeWidth="1"
          strokeDasharray="4,4"
          fill="none"
          style={{ animation: "bird-trail-dash 0.8s linear infinite" }}
        />
        <ellipse cx="16" cy="12" rx="7" ry="6" fill="#7fd8d2" opacity="0.9" />
        <circle cx="22" cy="10.5" r="4.5" fill="#7fd8d2" opacity="0.95" />
        <circle cx="24" cy="9.5" r="1.2" fill="rgba(90,74,66,0.6)" />
        <path
          d="M 16 10 Q 10 7 8 10 Z"
          stroke="white" strokeWidth="2" strokeLinecap="round" fill="rgba(255,255,255,0.75)" opacity="0.85"
          style={{ transformOrigin: "16px 10px", animation: "bird-wing-flap 2.4s ease-in-out infinite" }}
        />
        <path
          d="M 16 10 Q 22 7 24 10 Z"
          stroke="white" strokeWidth="2" strokeLinecap="round" fill="rgba(255,255,255,0.75)" opacity="0.85"
          style={{ transformOrigin: "16px 10px", animation: "bird-wing-flap 3.3s ease-in-out infinite 0.7s" }}
        />
        <path d="M 9 12 Q 5 12 3 13" stroke="#5fc8c7" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  );
}

function AnimatedPinkBird() {
  return (
    <div
      className="pointer-events-none absolute z-10 will-change-transform"
      style={{
        animation: "bird-fly-right 22s ease-in-out 11s infinite",
        right: 0,
        top: "58%",
      }}
    >
      <svg
        width="52"
        height="39"
        viewBox="0 0 32 24"
        fill="none"
        aria-hidden="true"
        style={{ animation: "bird-float 5s ease-in-out infinite" }}
      >
        <path
          d="M 32 12 Q 16 8 0 12"
          stroke="rgba(239,140,171,0.35)"
          strokeWidth="1"
          strokeDasharray="4,4"
          fill="none"
          style={{ animation: "bird-trail-dash 0.8s linear infinite" }}
        />
        <ellipse cx="16" cy="12" rx="7" ry="6" fill="#ef8cab" opacity="0.9" />
        <circle cx="10" cy="10.5" r="4.5" fill="#ef8cab" opacity="0.95" />
        <circle cx="8" cy="9.5" r="1.2" fill="rgba(90,74,66,0.6)" />
        <path
          d="M 16 10 Q 22 7 24 10 Z"
          stroke="white" strokeWidth="2" strokeLinecap="round" fill="rgba(255,255,255,0.75)" opacity="0.85"
          style={{ transformOrigin: "16px 10px", animation: "bird-wing-flap 3.1s ease-in-out infinite 0.4s" }}
        />
        <path
          d="M 16 10 Q 10 7 8 10 Z"
          stroke="white" strokeWidth="2" strokeLinecap="round" fill="rgba(255,255,255,0.75)" opacity="0.85"
          style={{ transformOrigin: "16px 10px", animation: "bird-wing-flap 2.6s ease-in-out infinite" }}
        />
        <path d="M 23 12 Q 27 12 29 13" stroke="#cf7d9c" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  );
}

export default function VirtualTourStrip() {
  return (
    <section className="chalk-bg relative overflow-hidden px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      {/* Birds fly across the full section */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <AnimatedTealBird />
        <AnimatedPinkBird />
      </div>

      <Doodle kind="star"   className="left-[3%]   top-8    h-10 w-10 text-white/70" />
      <Doodle kind="heart"  className="right-[5%]  top-10   h-9  w-9  text-[#f4aac8]" />
      <Doodle kind="cloud"  className="left-[25%]  bottom-8  h-12 w-12 text-white/50" />
      <Doodle kind="flower" className="right-[20%] bottom-6  h-10 w-10 text-[#f7d774]" />

      <div className="container-site">
        <Reveal>
          <div className="relative flex flex-col items-center justify-between gap-6 text-center text-white lg:flex-row lg:text-left">
            <div className="flex items-center gap-4">
              <span
                className="flex h-14 w-14 shrink-0 items-center justify-center bg-white/20"
                style={{ borderRadius: "62% 38% 46% 54% / 60% 44% 56% 40%" }}
              >
                <Bird className="h-7 w-7 text-[#f7d774]" />
              </span>
              <div>
                <p className="font-heading text-[2.4rem] leading-none sm:text-[2.8rem]">Take a Virtual Tour</p>
                <p className="mt-2 max-w-2xl text-base text-white/90 sm:text-lg">
                  Explore our bright classrooms, cozy reading corners and outdoor learning spaces before your visit.
                </p>
              </div>
            </div>
            <BlobButton href="/gallery" variant="blush" className="shrink-0">
              Start Exploring
              <MoveRight className="ml-2 h-5 w-5" />
            </BlobButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
