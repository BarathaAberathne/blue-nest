import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Motion";
import PastelButton from "@/components/ui/PastelButton";

/*
 * "Soft Autumn Leaves" announcement banner — Aldershot opening.
 * A slim (~120–170px on desktop) pale warm-cream band with a few tiny
 * hand-drawn leaves/acorns tucked into the edges (muted sage / peach /
 * mustard) and an airy centre so it reads premium, not flyer. The mobile
 * version is deliberately simpler: headline + button, one leaf, no subtext.
 * All SVG coordinates are integers (SSR hydration convention: no unrounded
 * trig output).
 */

function Leaf({ className, fill, rotate = 0 }: { className?: string; fill: string; rotate?: number }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      {/* simple stemmed leaf with a mid-vein */}
      <path d="M16 3 C25 8 27 19 16 29 C5 19 7 8 16 3 Z" fill={fill} />
      <path d="M16 6 L16 26" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M16 12 L11 9 M16 17 L21 13 M16 22 L12 19" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1.1" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Acorn({ className, rotate = 0 }: { className?: string; rotate?: number }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      {/* nut */}
      <path d="M9 14 C9 22 13 27 16 27 C19 27 23 22 23 14 Z" fill="#c99b62" />
      {/* cap */}
      <path d="M7 13 C7 9 11 6 16 6 C21 6 25 9 25 13 C25 14 24 15 23 15 L9 15 C8 15 7 14 7 13 Z" fill="#8a6a45" />
      {/* stalk */}
      <path d="M16 6 C16 4 17 3 19 3" stroke="#8a6a45" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export default function AldershotBanner() {
  return (
    <section
      aria-label="Aldershot nursery announcement"
      className="relative overflow-hidden px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
      style={{ backgroundColor: "#fbf6ec" }}
    >
      {/* Edge decorations — tiny, muted, out of the reading path.
          Mobile keeps just one leaf + the acorn. */}
      <Leaf className="absolute left-[3%] top-1/2 h-6 w-6 -translate-y-1/2 opacity-70" fill="#a9b89a" rotate={-24} />
      <Leaf className="absolute right-[16%] top-3 h-5 w-5 opacity-60 hidden lg:block" fill="#e8b48f" rotate={30} />
      <Leaf className="absolute bottom-3 left-[14%] h-5 w-5 opacity-60 hidden lg:block" fill="#d3a94e" rotate={16} />
      <Acorn className="absolute right-[3%] top-1/2 h-6 w-6 -translate-y-1/2 opacity-70" rotate={-12} />

      <div className="container-site">
        <Reveal>
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 text-center lg:flex-row lg:justify-center lg:gap-10 lg:text-left">
            <div>
              <h2 className="font-heading text-xl font-bold text-[var(--ink)] sm:text-2xl">
                A New Blue Nest Has Arrived in Aldershot{" "}
                <span aria-hidden="true">🍂</span>
              </h2>
              <p className="mt-1.5 hidden text-sm leading-6 text-[rgba(90,74,66,0.75)] sm:block">
                Registrations are now open. Come and discover a nurturing Montessori environment where little minds can grow.
              </p>
            </div>
            <div className="shrink-0">
              <PastelButton href="/branches/aldershot" variant="sage">
                Discover Aldershot
                <ArrowRight className="h-4 w-4" />
              </PastelButton>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
