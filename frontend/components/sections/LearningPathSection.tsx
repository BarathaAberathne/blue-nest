"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Reveal } from "@/components/ui/Motion";

// ── Data ──────────────────────────────────────────────────────────────────────

const principles = [
  {
    number: 1,
    title: "Stimulation",
    description:
      "Our children's nursery provides an environment that encourages curiosity and stimulates intellectual growth. Rich materials and attentive educators inspire every child to explore with wonder.",
    color: "#ef8cab",
  },
  {
    number: 2,
    title: "Learning Through Senses",
    description:
      "By engaging multiple senses, children learn in a fun, memorable and deeply meaningful way. Tactile, visual and auditory experiences are woven into every activity.",
    color: "#6ecfc9",
  },
  {
    number: 3,
    title: "Freedom to Learn",
    description:
      "Each child is empowered to choose materials and activities, promoting confidence and responsibility. We trust children to guide their own learning journey.",
    color: "#7fd8d2",
  },
  {
    number: 4,
    title: "Independence",
    description:
      "Children at Blue Nest Montessori develop independence, which builds their self-esteem and personality. We gently support them to do things for themselves.",
    color: "#f0bd55",
  },
  {
    number: 5,
    title: "Interest in Learning",
    description:
      "We foster a genuine love of learning with an enthusiastic and supportive approach to education. When children are interested, deep and lasting learning follows naturally.",
    color: "#f49cb5",
  },
  {
    number: 6,
    title: "Self-Discipline",
    description:
      "The Montessori method encourages children to manage their learning pace, developing self-regulation. Clear boundaries and calm routines help children feel safe and focused.",
    color: "#7fd8d2",
  },
  {
    number: 7,
    title: "Repetition",
    description:
      "Through repetition of activities, children consolidate their knowledge in a stress-free, encouraging setting. Mastery builds confidence — we celebrate every small step.",
    color: "#f7d774",
  },
] as const;

type Principle = (typeof principles)[number];

// ── Desktop bubble ────────────────────────────────────────────────────────────

function PrincipleBubble({
  principle,
  isSelected,
  onClick,
}: {
  principle: Principle;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      aria-label={`Principle ${principle.number}: ${principle.title}`}
      className="group flex flex-col items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6ecfc9] focus-visible:ring-offset-2"
    >
      {/* Circle badge */}
      <div
        className="flex h-[88px] w-[88px] items-center justify-center rounded-full border-[3px] transition-all duration-300 group-hover:scale-105"
        style={{
          background: isSelected ? principle.color : `${principle.color}28`,
          borderColor: principle.color,
          transform: isSelected ? "scale(1.13) rotate(-2deg)" : undefined,
          boxShadow: isSelected
            ? `0 10px 28px ${principle.color}55`
            : "0 2px 8px rgba(90,74,66,0.07)",
          color: isSelected ? "#fff" : principle.color,
        }}
      >
        <span className="font-heading text-[2.4rem] leading-none">{principle.number}</span>
      </div>

      {/* Label */}
      <span
        className="max-w-[84px] text-center font-body text-[0.7rem] font-bold leading-snug transition-colors duration-200"
        style={{ color: isSelected ? principle.color : "rgba(90,74,66,0.55)" }}
      >
        {principle.title}
      </span>
    </button>
  );
}

// ── Desktop feature card ──────────────────────────────────────────────────────

function PrincipleFeatureCard({ principle }: { principle: Principle }) {
  return (
    <motion.div
      key={principle.number}
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -14, scale: 0.97 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      className="mx-auto max-w-2xl rounded-[2.5rem] px-8 py-7"
      style={{ background: `${principle.color}1a` }}
      role="region"
      aria-label={`Details for principle ${principle.number}`}
    >
      <div className="flex items-start gap-6">
        {/* Ghost number */}
        <span
          className="select-none font-heading text-[5.5rem] leading-none"
          aria-hidden="true"
          style={{ color: `${principle.color}55` }}
        >
          {principle.number}
        </span>
        <div>
          <h3 className="card-title" style={{ color: principle.color }}>
            {principle.title}
          </h3>
          <p className="body-text mt-4">
            {principle.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ── Mobile accordion item ─────────────────────────────────────────────────────

function AccordionItem({
  principle,
  isOpen,
  onToggle,
}: {
  principle: Principle;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="overflow-hidden rounded-[1.6rem] transition-colors duration-250"
      style={{
        background: isOpen ? `${principle.color}18` : "rgba(255,253,249,0.88)",
        boxShadow: isOpen
          ? `0 4px 18px ${principle.color}28`
          : "0 2px 8px rgba(90,74,66,0.06)",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`principle-body-${principle.number}`}
        className="flex w-full items-center gap-3 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6ecfc9]"
      >
        {/* Numbered badge */}
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-heading text-[1.5rem] leading-none text-white transition-transform duration-200"
          style={{
            background: principle.color,
            transform: isOpen ? "scale(1.1)" : "scale(1)",
          }}
        >
          {principle.number}
        </span>

        {/* Title */}
        <span
          className="flex-1 font-heading text-[1.45rem] leading-tight"
          style={{ color: principle.color }}
        >
          {principle.title}
        </span>

        {/* Chevron */}
        <ChevronDown
          className="h-5 w-5 shrink-0 transition-transform duration-250"
          style={{
            color: principle.color,
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={`principle-body-${principle.number}`}
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="body-text px-5 pb-6 pt-1">
              {principle.description}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

export default function LearningPathSection() {
  const [selected, setSelected] = useState(0);
  const [openMobile, setOpenMobile] = useState<number | null>(0);

  function toggleMobile(index: number) {
    setOpenMobile((prev) => (prev === index ? null : index));
  }

  return (
    <section className="paper-bg relative overflow-hidden px-4 pt-12 pb-0 sm:px-6 lg:px-8 lg:pt-16">
<div className="container-site">

        {/* ── Section header ──────────────────────────────────── */}
        <Reveal>
          <div className="mb-10 text-center">
            <span className="section-kicker">Our Natural Approach</span>
            <h2 className="section-title mt-4 text-[#cf7d9c]">Learning Through Play</h2>
            <p className="section-subtitle mx-auto max-w-2xl">
              Our day nursery&apos;s natural learning system is designed to help children develop and
              excel. These are the seven principles at the heart of everything we do.
            </p>
          </div>
        </Reveal>

        {/* ══════════════════════════════════════════════════════
            DESKTOP — interactive bubble path  (lg+)
        ══════════════════════════════════════════════════════ */}
        <div className="hidden lg:block">
          <Reveal>
            <div className="relative pb-4 pt-2">

              {/* Decorative wavy dashed path behind bubbles */}
              <svg
                className="pointer-events-none absolute inset-x-0 top-[48px] h-12 w-full"
                viewBox="0 0 1000 48"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="M0,24 C60,8 120,40 200,24 C280,8 360,40 450,24 C540,8 620,40 700,24 C780,8 860,40 940,24 C970,14 988,28 1000,24"
                  fill="none"
                  stroke="rgba(207,125,156,0.3)"
                  strokeWidth="3.5"
                  strokeDasharray="11 8"
                  strokeLinecap="round"
                />
              </svg>

              {/* Bubble row */}
              <div
                className="relative z-10 flex justify-around"
                role="group"
                aria-label="Learning principles — select one to read more"
              >
                {principles.map((p, i) => (
                  <PrincipleBubble
                    key={p.number}
                    principle={p}
                    isSelected={selected === i}
                    onClick={() => setSelected(i)}
                  />
                ))}
              </div>
            </div>
          </Reveal>

          {/* Feature card — animates on selection */}
          <div className="mt-8 min-h-[10rem]">
            <AnimatePresence mode="wait">
              <PrincipleFeatureCard key={selected} principle={principles[selected]} />
            </AnimatePresence>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            MOBILE — accordion list  (< lg)
        ══════════════════════════════════════════════════════ */}
        <div
          className="space-y-3 lg:hidden"
          role="list"
          aria-label="Learning principles"
        >
          {principles.map((p, i) => (
            <Reveal key={p.number} delay={i * 0.045}>
              <div role="listitem">
                <AccordionItem
                  principle={p}
                  isOpen={openMobile === i}
                  onToggle={() => toggleMobile(i)}
                />
              </div>
            </Reveal>
          ))}
        </div>

      </div>
    </section>
  );
}
