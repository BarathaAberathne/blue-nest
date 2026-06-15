import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles, Clock } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import { Reveal } from "@/components/ui/Motion";
import { Bird, Twigs, Leaf, Feather, Grass, Flower } from "../build-the-blue-nest/illustrations";
import { TreasureIcon } from "@/components/games/treasure-hunt/icons";
import { PlantFull, SunIcon, WateringCan } from "@/components/games/garden/icons";
import { AnimalIcon } from "@/components/games/animals/icons";

export const metadata: Metadata = {
  alternates: { canonical: "/play-area" },
  title: "Online Play Area — Gentle Games for Little Explorers",
  description:
    "The Blue Nest Online Play Area — calm, Montessori-inspired games for children aged 2–6. Play together at home or on the tablet, with friendly nature themes and gentle, screen-light fun.",
  openGraph: {
    title: "Online Play Area — Blue Nest Montessori",
    description:
      "Calm, Montessori-inspired online games for children aged 2–6. Play together at home or on the tablet.",
    url: "/play-area",
    type: "website",
  },
};

/* A small registry so new games are a one-line addition. */
type Game = {
  title: string;
  href: string;
  blurb: string;
  ages: string;
  /** thumbnail accent gradient (brand-coloured) */
  accent: string;
  thumb: React.ReactNode;
};

const games: Game[] = [
  {
    title: "Build the Blue Nest",
    href: "/build-the-blue-nest",
    blurb: "Help Blue Bird gather twigs, leaves, feathers, soft grass and flowers to build a cosy nest.",
    ages: "Ages 2–6",
    accent: "from-[#eef6f0] to-[#dcece0]",
    thumb: (
      <div className="relative flex h-full w-full items-end justify-center">
        <Twigs className="absolute left-6 top-6 h-9 w-9 -rotate-12 opacity-90" />
        <Flower className="absolute right-7 top-7 h-9 w-9 opacity-90" />
        <Feather className="absolute right-12 bottom-7 h-9 w-9 rotate-12 opacity-80" />
        <Bird className="relative z-10 h-28 w-28 sm:h-32 sm:w-32" />
        <Leaf className="absolute left-9 bottom-6 h-8 w-8 opacity-80" />
        <Grass className="absolute bottom-3 left-1/2 h-10 w-10 -translate-x-1/2 opacity-80" />
      </div>
    ),
  },
  {
    title: "Forest School Treasure Hunt",
    href: "/games/forest-school-treasure-hunt",
    blurb: "Explore a calm woodland scene and find six hidden treasures — acorn, pinecone, feather, ladybird, bird and oak leaf.",
    ages: "Ages 2–6",
    accent: "from-[#eef4ef] to-[#dfe9e1]",
    thumb: (
      <div className="relative flex h-full w-full items-center justify-center">
        <TreasureIcon id="acorn" className="absolute left-6 top-6 h-9 w-9 -rotate-6 opacity-90" />
        <TreasureIcon id="leaf" className="absolute right-7 top-7 h-9 w-9 rotate-12 opacity-90" />
        <TreasureIcon id="ladybird" className="absolute right-10 bottom-7 h-8 w-8 opacity-90" />
        <TreasureIcon id="bird" className="relative z-10 h-28 w-28 sm:h-32 sm:w-32" />
        <TreasureIcon id="pinecone" className="absolute left-9 bottom-6 h-8 w-8 opacity-80" />
        <TreasureIcon id="feather" className="absolute left-1/2 top-4 h-9 w-9 -translate-x-1/2 -rotate-12 opacity-80" />
      </div>
    ),
  },
  {
    title: "Grow Your Own Garden",
    href: "/games/grow-your-garden",
    blurb: "Choose a plant, sow the seed, water it and give it sunshine — then watch your garden grow strong and healthy.",
    ages: "Ages 2–6",
    accent: "from-[#eef4ef] to-[#e3ecdf]",
    thumb: (
      <div className="relative flex h-full w-full items-end justify-center">
        <SunIcon className="absolute right-7 top-5 h-10 w-10 opacity-90" />
        <WateringCan className="absolute left-6 top-8 h-10 w-10 -rotate-6 opacity-90" />
        <PlantFull id="sunflower" className="relative z-10 h-28 w-20 sm:h-32 sm:w-24" />
      </div>
    ),
  },
  {
    title: "Match the Animals",
    href: "/games/match-the-animals",
    blurb: "Help each woodland animal find its home — robin, hedgehog, squirrel, duck, bee and rabbit — and learn a fun fact.",
    ages: "Ages 2–6",
    accent: "from-[#eaf3ec] to-[#dcebe0]",
    thumb: (
      <div className="relative grid h-full w-full grid-cols-3 items-center justify-items-center gap-1 px-6 py-4">
        <AnimalIcon id="robin" className="h-12 w-12" />
        <AnimalIcon id="duck" className="h-14 w-14" />
        <AnimalIcon id="squirrel" className="h-12 w-12" />
        <AnimalIcon id="bee" className="h-11 w-11" />
        <AnimalIcon id="rabbit" className="h-12 w-12" />
        <AnimalIcon id="hedgehog" className="h-11 w-11" />
      </div>
    ),
  },
];

/* Teasers for the games still being made — keeps the area feeling alive. */
const comingSoon: string[] = [];

export default function PlayAreaPage() {
  return (
    <PublicLayout>
      {/* ── Header ─────────────────────────────────────────────── */}
      <section className="paper-bg relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(90,74,66,0.05) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
          aria-hidden="true"
        />
        <div className="container-site relative z-10 px-4 py-12 text-center sm:py-16">
          <Reveal className="flex flex-col items-center gap-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/75 px-4 py-1 text-sm font-semibold text-[#5e9c6b] shadow-sm">
              <Sparkles className="h-4 w-4" /> For little nature explorers
            </span>
            <h1 className="section-title max-w-2xl">Online Play Area</h1>
            <p className="body-text max-w-xl">
              A growing collection of calm, Montessori-inspired games for children aged 2–6.
              Gentle, screen-light fun to enjoy together at home or on the tablet.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Games grid ─────────────────────────────────────────── */}
      <section className="bg-[var(--paper)] pb-16">
        <div className="container-site px-4">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((game, i) => (
              <Reveal key={game.href} delay={0.06 * i}>
                <Link
                  href={game.href}
                  className="group flex h-full flex-col overflow-hidden rounded-[1.6rem] border border-[#e6ddcd] bg-white/85 shadow-[0_12px_36px_-20px_rgba(90,74,66,0.4)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_48px_-22px_rgba(90,74,66,0.45)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#bfe0c7]"
                >
                  <div className={`relative h-44 w-full bg-gradient-to-b ${game.accent} p-4`}>
                    {game.thumb}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <span className="mb-2 inline-flex w-fit rounded-full bg-[rgba(127,216,210,0.18)] px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-[#3f8f88]">
                      {game.ages}
                    </span>
                    <h2 className="font-heading text-[1.4rem] leading-snug text-[#4a92ba]">{game.title}</h2>
                    <p className="mt-2 flex-1 text-sm text-[var(--muted)]">{game.blurb}</p>
                    <span className="mt-4 inline-flex items-center gap-2 font-heading text-lg text-[#5e9c6b]">
                      Play now
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}

            {/* Coming-soon teasers */}
            {comingSoon.map((title, i) => (
              <Reveal key={title} delay={0.06 * (games.length + i)}>
                <div className="flex h-full flex-col overflow-hidden rounded-[1.6rem] border border-dashed border-[#d8cbbb] bg-white/55">
                  <div className="flex h-44 w-full items-center justify-center bg-[rgba(247,215,116,0.10)]">
                    <Clock className="h-10 w-10 text-[#caa86a]" aria-hidden="true" />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <span className="mb-2 inline-flex w-fit rounded-full bg-[rgba(247,215,116,0.30)] px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-[#8a6d00]">
                      Coming Soon
                    </span>
                    <h2 className="font-heading text-[1.4rem] leading-snug text-[var(--ink)]/70">{title}</h2>
                    <p className="mt-2 text-sm text-[var(--muted)]">A new gentle game is on its way to the play area.</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
