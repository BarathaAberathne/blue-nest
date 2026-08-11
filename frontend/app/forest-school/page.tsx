import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Sprout,
  Check,
  ShieldCheck,
  Award,
  UtensilsCrossed,
  GraduationCap,
  TreePine,
  ChefHat,
  Palette,
  Flower2,
  Bug,
  Footprints,
  Flame,
  Droplets,
  Tent,
  Sparkles,
} from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";

export const metadata: Metadata = {
  alternates: { canonical: "/forest-school" },
  // Lead the title with "Forest School Harrow" — Yell shows we sit at
  // position 7 for that exact term with 5.4% CTR, so reinforcing it in
  // the meta should push us into top-3 territory.
  title: "Forest School Nursery Harrow — Outdoor Montessori at Blue Nest",
  description:
    "Woodland Forest School at Blue Nest Montessori — an outdoor nursery in Harrow, Pinner, Borehamwood and Aldershot for ages 2 to 5. Qualified Forest School leaders, nature-based EYFS learning, mud kitchen, gardening, den building and child-led outdoor play.",
  openGraph: {
    title: "Forest School Nursery Harrow — Blue Nest Montessori",
    description:
      "Outdoor Montessori nursery & woodland learning in Harrow, Pinner, Borehamwood and Aldershot. Nature-based EYFS, qualified Forest School leaders, mud kitchen, gardening, den building.",
    url: "/forest-school",
    images: [{ url: "/home/forest-school.jpg", width: 1280, height: 854, alt: "Blue Nest Forest School — children learning outdoors" }],
    type: "website",
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home",          item: "https://bluenest.uk/" },
    { "@type": "ListItem", position: 2, name: "Forest School", item: "https://bluenest.uk/forest-school" },
  ],
};

// Single source of truth for the FAQ — drives BOTH the visible accordion and
// the FAQPage JSON-LD so the rich-result text always matches what users read.
const faqs: { q: string; a: string }[] = [
  {
    q: "What is Forest School?",
    a: "Forest School is a long-term, child-led approach to outdoor learning where children explore a natural woodland environment alongside qualified Forest School leaders. Sessions focus on free play, hands-on nature activities and managed risk-taking, building confidence, resilience and a lasting connection with the natural world.",
  },
  {
    q: "Is Forest School safe?",
    a: "Yes. We follow the official Forest School Association principles with a risk-benefit assessment before every session. Our leaders hold Level 3 Forest School qualifications and outdoor first-aid training, and all staff are enhanced-DBS checked. Children learn to handle real tools and manage their own risks within a carefully supervised, secure outdoor space.",
  },
  {
    q: "What age groups attend Forest School?",
    a: "Our Forest School programme runs for children aged 2 to 5 across the Blue Nest Montessori nurseries in Harrow, Pinner, Borehamwood and Aldershot. Sessions are weekly and woven into our EYFS-aligned curriculum so every age group takes part at a developmentally appropriate level.",
  },
  {
    q: "Do children attend in all weather?",
    a: "Yes — Forest School runs all year round, in sunshine, rain, wind and frost. There is no bad weather, only unsuitable clothing, so children come dressed for the conditions. We only pause for genuine safety hazards such as high winds, storms or lightning.",
  },
  {
    q: "How does Forest School support the EYFS?",
    a: "Outdoor learning naturally covers every area of the Early Years Foundation Stage. Building dens develops physical skills and mathematics, mud-kitchen play sparks communication and imaginative play, and nature exploration builds understanding of the world. Our leaders observe each child's interests and plan child-led activities that move them forward against the EYFS framework.",
  },
  {
    q: "What are the benefits of outdoor learning?",
    a: "Nature-based early years education builds confidence, independence and emotional regulation. Children develop gross and fine motor skills, problem-solving and teamwork, and a genuine love of nature. Regular time outdoors also supports concentration, wellbeing and physical health far beyond what an indoor classroom alone can offer.",
  },
  {
    q: "What activities do children do outdoors?",
    a: "A typical week includes mud-kitchen cooking, nature crafts, gardening, bug hunts, woodland walks, campfire storytelling, water play, den building and sensory exploration. Every activity is open-ended and child-led, tied back to the EYFS and our four guiding elements of Sun, Water, Plant and Society.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

// ── Soft woodland palette ─────────────────────────────────────────────────────
const C = {
  tint:      "#F4FAF3", // page background — forest tint
  moss:      "#DDEED9", // soft section background
  sage:      "#A8CFA2", // sage green
  sageDeep:  "#5E8C58", // derived: legible sage for icons/lines on white
  water:     "#89D8D3",
  sun:       "#F6D88D",
  plant:     "#B7D98C",
  society:   "#E7B7C8",
  earth:     "#5C4A42", // primary text
  earthSoft: "#7C6A60", // muted body text
  card:      "#FCFEFB",
  white:     "#FFFFFF",
};

// Deeper, legible tones of each element accent for glyphs/text on light cards.
const accentInk = {
  sun:     "#D9A12C",
  water:   "#3FAFA8",
  plant:   "#76A94E",
  society: "#C97FA0",
};

// ── Logo-derived element icons ────────────────────────────────────────────────

function SunIcon({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3.5" fill="currentColor" />
    </svg>
  );
}
function WaterIcon({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none" aria-hidden="true">
      <line x1="3" y1="7"  x2="21" y2="7"  stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="3" y1="11" x2="21" y2="11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="3" y1="15" x2="21" y2="15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="3" y1="19" x2="21" y2="19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
function PlantIcon({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor" aria-hidden="true">
      <path d="M11.5 20 C11.5 20 3 16 4.5 7.5 C4.5 7.5 9 5.5 11.5 13" />
      <path d="M12.5 15 C12.5 15 20 11 18.5 3.5 C18.5 3.5 14 3 12.5 11" />
    </svg>
  );
}
function SocietyIcon({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor" aria-hidden="true">
      <circle cx="8.5"  cy="8.5"  r="3" />
      <circle cx="15.5" cy="8.5"  r="3" />
      <circle cx="8.5"  cy="15.5" r="3" />
      <circle cx="15.5" cy="15.5" r="3" />
    </svg>
  );
}

// ── Hand-drawn nature doodles (inline SVG) ────────────────────────────────────

function Mushroom({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 40 44" className={className} style={style} fill="none" aria-hidden="true">
      <path d="M4 18c0-8 7.2-14 16-14s16 6 16 14c0 2.2-1.8 3.5-4 3.5H8c-2.2 0-4-1.3-4-3.5Z" fill="#E7B7C8" />
      <circle cx="13" cy="12" r="2.4" fill="#fff" opacity="0.85" />
      <circle cx="24" cy="9.5" r="1.7" fill="#fff" opacity="0.85" />
      <circle cx="28" cy="15" r="2" fill="#fff" opacity="0.85" />
      <path d="M14 21.5h12c0 9-1.5 18-6 18s-6-9-6-18Z" fill="#F2E9DD" />
    </svg>
  );
}

function GrassRow({ color, className, style }: { color: string; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 220 36" className={className} style={style} preserveAspectRatio="none" fill="none" aria-hidden="true">
      <g stroke={color} strokeWidth="3" strokeLinecap="round">
        <path d="M8 36C8 24 4 16 10 8" /><path d="M16 36C16 22 22 16 24 6" />
        <path d="M30 36C30 26 26 18 34 10" /><path d="M44 36C44 22 50 16 52 8" />
        <path d="M60 36C60 24 56 16 64 9" /><path d="M74 36C74 22 80 16 82 7" />
        <path d="M92 36C92 26 88 18 96 10" /><path d="M108 36C108 22 114 16 116 8" />
        <path d="M124 36C124 24 120 16 128 9" /><path d="M140 36C140 22 146 16 148 7" />
        <path d="M158 36C158 26 154 18 162 10" /><path d="M174 36C174 22 180 16 182 8" />
        <path d="M192 36C192 24 188 16 196 9" /><path d="M208 36C208 22 214 16 216 7" />
      </g>
    </svg>
  );
}

// ── Organic layered-hill section divider ──────────────────────────────────────
// `top` is the colour of the section above; `bottom` is the section below.
// The curve lets the lower section rise softly into the one above, with a
// faint mid layer for paper-cut depth and room for scattered doodles.

function Curve({
  top,
  bottom,
  mid,
  doodles,
}: {
  top: string;
  bottom: string;
  mid?: string;
  doodles?: ReactNode;
}) {
  return (
    <div className="relative" style={{ background: top, lineHeight: 0 }} aria-hidden="true">
      {doodles}
      <svg viewBox="0 0 1440 120" className="block h-[70px] w-full sm:h-[100px]" preserveAspectRatio="none">
        <path
          d="M0,64 C240,18 420,108 720,72 C1020,36 1230,108 1440,56 L1440,120 L0,120 Z"
          fill={mid ?? bottom}
          opacity={mid ? 0.55 : 1}
        />
        <path
          d="M0,88 C260,52 460,118 720,90 C1010,58 1240,118 1440,82 L1440,120 L0,120 Z"
          fill={bottom}
        />
      </svg>
    </div>
  );
}

// ── Themed pill button — site button shape/typography, woodland colour ────────

function ForestBtn({
  href,
  children,
  variant = "solid",
}: {
  href: string;
  children: ReactNode;
  variant?: "solid" | "outline" | "cream";
}) {
  const styles: Record<string, CSSProperties> = {
    solid:   { background: C.earth, color: C.tint },
    outline: { border: `2px solid ${C.sageDeep}`, color: C.earth, background: "transparent" },
    cream:   { background: C.card, color: C.earth },
  };
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
      style={styles[variant]}
    >
      {children}
    </Link>
  );
}

// ── Element philosophy-card illustrations (watercolour via layered CSS/SVG) ────

function ElementArt({ kind }: { kind: "sun" | "water" | "plant" | "society" }) {
  if (kind === "sun") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="f-sun absolute -right-6 -top-6 h-32 w-32 rounded-full blur-[2px]"
          style={{ background: `radial-gradient(circle, ${C.sun} 0%, ${C.sun}66 45%, transparent 70%)` }}
        />
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="f-pollen absolute h-1.5 w-1.5 rounded-full"
            style={{
              background: C.sun,
              right: `${18 + i * 14}px`,
              top: `${70 + (i % 2) * 22}px`,
              animationDelay: `${i * 1.6}s`,
            }}
          />
        ))}
      </div>
    );
  }
  if (kind === "water") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <svg viewBox="0 0 200 120" className="absolute -right-2 -top-2 h-28 w-40" fill="none" aria-hidden="true">
          <path d="M0 30 C40 12 70 48 110 30 C150 12 180 44 200 28" stroke={C.water} strokeWidth="4" strokeLinecap="round" opacity="0.7" />
          <path d="M0 52 C40 34 70 70 110 52 C150 34 180 66 200 50" stroke={C.water} strokeWidth="4" strokeLinecap="round" opacity="0.45" />
          <path d="M0 74 C40 56 70 92 110 74 C150 56 180 88 200 72" stroke={C.water} strokeWidth="4" strokeLinecap="round" opacity="0.25" />
        </svg>
      </div>
    );
  }
  if (kind === "plant") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <svg viewBox="0 0 120 120" className="f-sway absolute right-4 top-3 h-24 w-24" fill="none" aria-hidden="true">
          <path d="M60 110 C60 80 60 50 60 30" stroke={C.plant} strokeWidth="3" strokeLinecap="round" />
          <path d="M60 78 C44 72 34 58 36 42 C52 44 60 60 60 78 Z" fill={C.plant} opacity="0.8" />
          <path d="M60 62 C76 56 86 42 84 26 C68 28 60 44 60 62 Z" fill={C.plant} opacity="0.6" />
          <path d="M60 44 C50 40 44 30 46 20 C56 22 60 32 60 44 Z" fill={C.plant} opacity="0.9" />
        </svg>
      </div>
    );
  }
  // society — connected community dots + dotted path
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg viewBox="0 0 140 120" className="absolute right-3 top-4 h-24 w-28" fill="none" aria-hidden="true">
        <path d="M18 70 C50 30 90 30 122 70" stroke={C.society} strokeWidth="2.5" strokeDasharray="2 8" strokeLinecap="round" opacity="0.7" />
        <circle cx="18" cy="70" r="9" fill={C.society} opacity="0.85" />
        <circle cx="70" cy="34" r="11" fill={C.society} opacity="0.7" />
        <circle cx="122" cy="70" r="9" fill={C.society} opacity="0.85" />
      </svg>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ForestSchoolPage() {
  const elements = [
    {
      kind: "sun" as const,
      Icon: SunIcon,
      label: "Sun",
      title: "Confidence & Curiosity",
      body: "Like the sun, children radiate natural energy and wonder. We channel that spark into joyful discovery, warmth and self-belief that lights up everything they do.",
      accent: C.sun,
      ink: accentInk.sun,
    },
    {
      kind: "water" as const,
      Icon: WaterIcon,
      label: "Water",
      title: "Calm & Adaptability",
      body: "Water finds its own path. We help children stay calm, adapt and flow around challenges — nurturing emotional growth, patience and quiet resilience.",
      accent: C.water,
      ink: accentInk.water,
    },
    {
      kind: "plant" as const,
      Icon: PlantIcon,
      label: "Plant",
      title: "Growth & Nurturing",
      body: "Every child grows at their own pace. We tend each learner individually, putting down strong roots that support a lifetime of flourishing and development.",
      accent: C.plant,
      ink: accentInk.plant,
    },
    {
      kind: "society" as const,
      Icon: SocietyIcon,
      label: "Society",
      title: "Belonging & Kindness",
      body: "We are stronger together. Forest School builds empathy, cooperation and a deep sense of community — so every child feels they truly belong.",
      accent: C.society,
      ink: accentInk.society,
    },
  ];

  const activities = [
    { Icon: ChefHat,   title: "Mud Kitchen Play",      desc: "Mixing, pouring and ‘cooking’ with mud, water and natural loose parts to spark imaginative, sensory-rich play." },
    { Icon: Palette,   title: "Nature Crafts",          desc: "Leaf printing, stick weaving and seasonal art that turn woodland treasures into creative, hands-on learning." },
    { Icon: Flower2,   title: "Gardening",              desc: "Planting, watering and harvesting in our beds, teaching patience, responsibility and where food really comes from." },
    { Icon: Bug,       title: "Bug Exploration",        desc: "Minibeast hunts and bug hotels that grow curiosity, careful observation and respect for living things." },
    { Icon: Footprints, title: "Nature Walks",          desc: "Slow, child-led woodland walks for seasonal discovery, gross-motor confidence and a love of the outdoors." },
    { Icon: Flame,     title: "Campfire Storytelling",  desc: "Gathering at the fire circle for songs and stories that build language, listening and a warm sense of belonging." },
    { Icon: Droplets,  title: "Water Play",             desc: "Streams, channels and pouring stations that explore flow, cause-and-effect and early science through play." },
    { Icon: Tent,      title: "Den Building",           desc: "Designing and building shelters together — real teamwork, problem-solving, mathematics and resilience outdoors." },
    { Icon: Sparkles,  title: "Sensory Exploration",    desc: "Textures, scents and sounds of the woodland that ground children, calm the senses and deepen mindful awareness." },
  ];

  const trust = [
    { Icon: Award,           label: "Ofsted Good" },
    { Icon: ShieldCheck,     label: "Enhanced DBS Checked" },
    { Icon: UtensilsCrossed, label: "5-Star Food Hygiene" },
    { Icon: TreePine,        label: "Forest School Values" },
    { Icon: GraduationCap,   label: "Qualified Practitioners" },
  ];

  return (
    <PublicLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* ══════════════════════════════════════════════════════════
          HERO — split layout with woodland atmosphere
      ══════════════════════════════════════════════════════════ */}
      <section className="relative flex flex-col overflow-hidden lg:flex-row" style={{ background: C.tint }}>

        {/* Ambient sunlight + mist + drifting leaves over the whole hero */}
        <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden="true">
          <div
            className="f-sun absolute -left-16 -top-20 h-72 w-72 rounded-full blur-2xl sm:h-96 sm:w-96"
            style={{ background: `radial-gradient(circle, ${C.sun}55 0%, ${C.sun}22 40%, transparent 70%)` }}
          />
          <div
            className="f-mist absolute inset-x-0 bottom-0 h-24 blur-xl"
            style={{ background: `linear-gradient(to top, ${C.moss}cc, transparent)` }}
          />
          {[
            { left: "12%", delay: "0s",  dur: "17s" },
            { left: "34%", delay: "5s",  dur: "20s" },
            { left: "58%", delay: "9s",  dur: "15s" },
            { left: "78%", delay: "3s",  dur: "19s" },
            { left: "90%", delay: "12s", dur: "22s" },
          ].map((l, i) => (
            <div
              key={i}
              className="f-leaf absolute top-0 hidden h-6 w-6 sm:block"
              style={{ left: l.left, animationDelay: l.delay, animationDuration: l.dur }}
            >
              <Doodle kind="leaf" className="h-full w-full" />
            </div>
          ))}
        </div>

        {/* ── Left: text panel ── */}
        <div className="relative z-[2] flex w-full items-center lg:w-1/2">
          <div className="w-full px-6 py-10 sm:px-10 lg:px-14 lg:py-14 xl:px-20">
            <Reveal eager className="flex flex-col gap-4">
              <nav aria-label="Breadcrumb">
                <ol className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em]">
                  <li><Link href="/" style={{ color: C.sageDeep }} className="hover:underline">Home</Link></li>
                  <li aria-hidden="true" style={{ color: `${C.sageDeep}66` }}>/</li>
                  <li aria-current="page" style={{ color: C.sageDeep }}>Forest School</li>
                </ol>
              </nav>

              <h1 className="font-heading text-[2.4rem] leading-[1.08] sm:text-[3rem] lg:text-[3.4rem]" style={{ color: C.earth }}>
                Forest School<br />in Harrow &amp; London
              </h1>

              <p className="flex items-center gap-1.5 text-base font-semibold tracking-wide" style={{ color: C.sageDeep }}>
                Learn. Explore. Grow. Together.
                <Sprout className="h-4 w-4 shrink-0" />
              </p>

              <p className="max-w-md text-[0.95rem] leading-[1.75]" style={{ color: C.earthSoft }}>
                Blue Nest is an <strong style={{ color: C.earth }}>outdoor Montessori nursery</strong> in
                Harrow, Pinner, Borehamwood and Aldershot. Through woodland learning and child-led
                outdoor play, children connect with nature, build confidence and develop
                essential life skills for the early years and beyond.
              </p>

              <div className="flex flex-wrap gap-3 pt-1">
                <ForestBtn href="/contact?enquiry=book-a-visit">Book a Visit</ForestBtn>
                <ForestBtn href="/admission" variant="outline">Explore Our Nurseries</ForestBtn>
              </div>

              {/* 4 element pillars */}
              <div className="mt-2 grid grid-cols-4 gap-3 border-t pt-4" style={{ borderColor: `${C.sageDeep}22` }}>
                {elements.map(({ Icon, label, ink }) => (
                  <div key={label} className="flex flex-col items-center gap-1.5">
                    <Icon className="h-6 w-6" style={{ color: ink }} />
                    <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em]" style={{ color: C.earth }}>{label}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>

        {/* ── Right: nature photo + soft floating card ── */}
        <div className="relative z-[2] hidden w-1/2 overflow-hidden lg:block">
          <Image
            src="/home/outdoor-childrens-play-area2.jpg"
            alt="Children learning outdoors at Blue Nest Forest School in Harrow"
            fill
            priority
            fetchPriority="high"
            className="object-cover object-center"
            quality={55}
            sizes="50vw"
          />
          <div
            className="absolute bottom-8 right-8 max-w-[230px] rounded-[1.6rem] p-5 backdrop-blur-sm"
            style={{ background: `${C.card}f2`, boxShadow: `0 18px 48px ${C.earth}26`, border: `1px solid ${C.sage}66` }}
          >
            <div className="mb-2 flex items-center gap-2">
              <Sprout className="h-4 w-4 shrink-0" style={{ color: accentInk.plant }} />
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.15em]" style={{ color: C.sageDeep }}>
                Blue Nest Forest School
              </p>
            </div>
            <p className="mb-1 font-heading text-[1.05rem] leading-snug" style={{ color: C.earth }}>Nurtured by Nature</p>
            <p className="mb-2 font-heading text-[0.85rem] leading-snug" style={{ color: C.sageDeep }}>Inspired by Values</p>
            <p className="text-[0.72rem] leading-relaxed" style={{ color: C.earthSoft }}>
              Four principles of growth, wellbeing and community.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          TRUST STRIP — E-E-A-T signals, high on the page
      ══════════════════════════════════════════════════════════ */}
      <section style={{ background: C.moss }} className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-3 sm:gap-x-5">
          {trust.map(({ Icon, label }, i) => (
            <div key={label} className="flex items-center">
              <div className="flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-2 shadow-[0_2px_10px_rgba(92,74,66,0.06)]">
                <Icon className="h-4 w-4 shrink-0" style={{ color: C.sageDeep }} />
                <span className="text-[0.72rem] font-semibold tracking-wide sm:text-[0.78rem]" style={{ color: C.earth }}>{label}</span>
              </div>
              {i < trust.length - 1 && <span className="mx-1 hidden h-4 w-px bg-[rgba(92,74,66,0.12)] lg:block" aria-hidden="true" />}
            </div>
          ))}
        </div>
      </section>

      <Curve top={C.moss} bottom={C.tint} mid={C.sage} doodles={
        <Doodle kind="blue-bird" animated="float" className="left-[12%] top-2 h-8 w-8 opacity-70" />
      } />

      {/* ══════════════════════════════════════════════════════════
          WHY FOREST SCHOOL — soft woodland (recoloured from dark green)
      ══════════════════════════════════════════════════════════ */}
      <section style={{ background: C.tint }} className="relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
            <Reveal>
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.22em]" style={{ color: C.sageDeep }}>
                The Case for Outdoor Learning
              </span>
              <h2 className="mt-4 font-heading text-[2rem] leading-[1.15] sm:text-[2.5rem]" style={{ color: C.earth }}>
                Why a Forest School Nursery?
              </h2>
              <p className="mt-4 text-[0.92rem] leading-[1.75]" style={{ color: C.earthSoft }}>
                Forest School is a child-led approach to <strong style={{ color: C.earth }}>nature-based early
                years education</strong>, rooted in progressive learning theory from Froebel to Montessori.
                It gives children the time, space and freedom to explore, take managed risks and build
                genuine self-belief — the heart of woodland learning at Blue Nest. Discover how it
                complements our{" "}
                <Link href="/why-montessori" className="font-semibold underline decoration-2 underline-offset-2" style={{ color: C.sageDeep }}>
                  Montessori approach
                </Link>.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Confidence & independence through self-directed learning",
                  "Creativity & problem solving in real-world settings",
                  "Physical wellbeing through active outdoor play",
                  "Social development and cooperative teamwork",
                  "A deep, lasting connection with the natural world",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: `${C.sage}55` }}>
                      <Check className="h-3 w-3" style={{ color: C.sageDeep }} />
                    </span>
                    <span className="text-[0.9rem] leading-relaxed" style={{ color: C.earthSoft }}>{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="relative mx-auto w-full max-w-[420px]">
                <Doodle kind="pink-flower" animated="subtle" className="-left-4 -top-4 z-10 h-12 w-12" />
                <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem]" style={{ boxShadow: `0 24px 64px ${C.earth}22`, border: `4px solid ${C.white}` }}>
                  <Image
                    src="/home/forest-school-2.jpg"
                    alt="Children exploring woodland learning at Blue Nest outdoor nursery"
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 1024px) 80vw, 420px"
                  />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <Curve top={C.tint} bottom={C.moss} mid={C.sage} doodles={
        <>
          <Doodle kind="pink-bird" animated="float" className="right-[14%] top-1 h-8 w-8 opacity-70" />
          <Mushroom className="absolute left-[8%] bottom-1 h-7 w-7 sm:h-9 sm:w-9" />
        </>
      } />

      {/* ══════════════════════════════════════════════════════════
          FOUR ELEMENTS — premium illustrated philosophy cards
      ══════════════════════════════════════════════════════════ */}
      <section style={{ background: C.moss }} className="relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="mb-10 text-center">
              <div className="mx-auto mb-4 h-16 w-16 overflow-hidden rounded-2xl shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/site-images/forest-school-logo.jpg" alt="Blue Nest Forest School" className="h-full w-full object-cover" />
              </div>
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.22em]" style={{ color: C.sageDeep }}>Our Philosophy</span>
              <h2 className="mt-4 font-heading text-[1.85rem] sm:text-[2.3rem]" style={{ color: C.earth }}>The Four Elements of Growth</h2>
              <p className="mx-auto mt-3 max-w-xl text-[0.9rem] leading-relaxed" style={{ color: C.earthSoft }}>
                Every part of our woodland nursery is guided by four natural principles — Sun, Water,
                Plant and Society — drawn from the symbols at the heart of our identity.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {elements.map(({ kind, Icon, label, title, body, accent, ink }, i) => (
              <Reveal key={label} delay={i * 0.08}>
                <div
                  className="f-card group relative flex h-full flex-col overflow-hidden rounded-[1.8rem] bg-white p-6"
                  style={{ boxShadow: `0 6px 24px ${C.earth}0f`, border: `1px solid ${accent}55` }}
                >
                  {/* watercolour wash + element illustration */}
                  <div className="absolute inset-0" style={{ background: `radial-gradient(120% 80% at 100% 0%, ${accent}26 0%, transparent 55%)` }} aria-hidden="true" />
                  <ElementArt kind={kind} />

                  <div className="relative z-[1]">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: `${accent}3d` }}>
                      <Icon className="h-7 w-7" style={{ color: ink }} />
                    </div>
                    <p className="mb-0.5 text-[0.6rem] font-bold uppercase tracking-[0.2em]" style={{ color: ink }}>{label}</p>
                    <h3 className="mb-2 feature-card-title" style={{ color: C.earth }}>{title}</h3>
                    <p className="text-base leading-relaxed" style={{ color: C.earthSoft }}>{body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Curve top={C.moss} bottom={C.tint} mid={C.sage} doodles={
        <Doodle kind="blue-flower" animated="subtle" className="right-[10%] top-1 h-10 w-10 opacity-80" />
      } />

      {/* ══════════════════════════════════════════════════════════
          ACTIVITIES — what children do outdoors
      ══════════════════════════════════════════════════════════ */}
      <section style={{ background: C.tint }} className="relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="mb-10 text-center">
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.22em]" style={{ color: C.sageDeep }}>A Day in the Woodland</span>
              <h2 className="mt-4 font-heading text-[1.85rem] sm:text-[2.3rem]" style={{ color: C.earth }}>Forest School Activities</h2>
              <p className="mx-auto mt-3 max-w-2xl text-[0.9rem] leading-relaxed" style={{ color: C.earthSoft }}>
                Hands-on, child-led activities that bring <strong style={{ color: C.earth }}>EYFS outdoor learning</strong> to
                life — from mud kitchens to den building, every session is open-ended and tied to our four elements.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {activities.map(({ Icon, title, desc }, i) => (
              <Reveal key={title} delay={(i % 3) * 0.07}>
                <div
                  className="f-card flex h-full items-start gap-4 rounded-[1.4rem] bg-white p-5"
                  style={{ border: `1px solid ${C.sage}44`, boxShadow: `0 4px 18px ${C.earth}0c` }}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${C.sage}33` }}>
                    <Icon className="h-6 w-6" style={{ color: C.sageDeep }} />
                  </div>
                  <div>
                    <h3 className="mb-1 feature-card-title" style={{ color: C.earth }}>{title}</h3>
                    <p className="text-base leading-relaxed" style={{ color: C.earthSoft }}>{desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Curve top={C.tint} bottom={C.moss} mid={C.sage} />

      {/* ══════════════════════════════════════════════════════════
          SCRAPBOOK GALLERY — forest journal
      ══════════════════════════════════════════════════════════ */}
      <section style={{ background: C.moss }} className="relative overflow-hidden px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="mb-10 text-center">
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.22em]" style={{ color: C.sageDeep }}>From Our Woodland Journal</span>
              <h2 className="mt-4 font-heading text-[1.85rem] sm:text-[2.3rem]" style={{ color: C.earth }}>Moments in Nature</h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-4">
            {[
              { src: "/home/outdoor-play-for-children.jpg",      cap: "Building confidence outdoors", rot: "-3deg" },
              { src: "/home/children-outdoor-play.jpg",          cap: "Learning through nature",      rot: "2.5deg" },
              { src: "/home/outdoor-learning-and-play-area.jpg",  cap: "Tiny explorers at work",       rot: "-2deg" },
              { src: "/home/outdoor-play-for-children-new.jpg",   cap: "Moments of curiosity",         rot: "3deg" },
            ].map(({ src, cap, rot }, i) => (
              <Reveal key={src} delay={i * 0.08}>
                <figure
                  className="group relative mx-auto w-full max-w-[260px] rounded-[0.4rem] bg-white p-3 pb-1 transition-transform duration-300 hover:rotate-0 hover:scale-[1.03]"
                  style={{ transform: `rotate(${rot})`, boxShadow: `0 12px 30px ${C.earth}22` }}
                >
                  {/* washi tape */}
                  <span
                    className="absolute left-1/2 top-1 z-10 h-5 w-16 -translate-x-1/2 -rotate-2 rounded-[2px]"
                    style={{ background: `${C.sun}cc`, boxShadow: `0 1px 3px ${C.earth}1a` }}
                    aria-hidden="true"
                  />
                  <div className="relative aspect-square overflow-hidden rounded-[0.25rem]">
                    <Image src={src} alt={cap} fill className="object-cover object-center" sizes="(max-width: 640px) 50vw, 25vw" />
                  </div>
                  <figcaption className="px-1 py-2 text-center font-heading text-[0.95rem]" style={{ color: C.earth }}>
                    {cap}
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <p className="mt-9 text-center text-[0.9rem]" style={{ color: C.earthSoft }}>
              See more from our nurseries in the{" "}
              <Link href="/gallery" className="font-semibold underline decoration-2 underline-offset-2" style={{ color: C.sageDeep }}>photo gallery</Link>.
            </p>
          </Reveal>
        </div>
      </section>

      <Curve top={C.moss} bottom={C.tint} mid={C.sage} doodles={
        <Doodle kind="leaf" animated="float" className="left-[16%] top-1 h-8 w-8 opacity-70" />
      } />

      {/* ══════════════════════════════════════════════════════════
          FAQ — accessible accordion (native <details>)
      ══════════════════════════════════════════════════════════ */}
      <section style={{ background: C.tint }} className="relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <div className="mb-9 text-center">
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.22em]" style={{ color: C.sageDeep }}>Good to Know</span>
              <h2 className="mt-4 font-heading text-[1.85rem] sm:text-[2.3rem]" style={{ color: C.earth }}>Forest School Questions</h2>
            </div>
          </Reveal>

          <div className="space-y-3">
            {faqs.map(({ q, a }, i) => (
              <Reveal key={q} delay={i * 0.04}>
                <details className="f-faq rounded-[1.1rem] bg-white px-5 py-1" style={{ border: `1px solid ${C.sage}55`, boxShadow: `0 3px 14px ${C.earth}0a` }}>
                  <summary className="flex items-center justify-between gap-4 py-4">
                    <span className="font-heading text-[1.02rem] leading-snug" style={{ color: C.earth }}>{q}</span>
                    <svg className="f-faq-chevron h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ color: C.sageDeep }}>
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </summary>
                  <div className="f-faq-body">
                    <div>
                      <p className="pb-4 pr-8 text-[0.88rem] leading-[1.7]" style={{ color: C.earthSoft }}>{a}</p>
                    </div>
                  </div>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Curve top={C.tint} bottom={C.sage} mid={C.moss} doodles={
        <GrassRow color={C.sageDeep} className="absolute bottom-0 left-0 h-7 w-full opacity-50" />
      } />

      {/* ══════════════════════════════════════════════════════════
          CTA — soft sage anchor (recoloured from dark green)
      ══════════════════════════════════════════════════════════ */}
      <section style={{ background: `linear-gradient(160deg, ${C.sage} 0%, ${C.moss} 100%)` }} className="relative overflow-hidden px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <Doodle kind="blue-bird" animated="float" className="right-[8%] top-8 hidden h-10 w-10 opacity-60 sm:block" />
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <div className="mx-auto mb-5 h-14 w-14 overflow-hidden rounded-2xl shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/site-images/forest-school-logo.jpg" alt="" aria-hidden="true" className="h-full w-full object-cover" />
            </div>
            <h2 className="font-heading text-[2rem] leading-[1.15] sm:text-[2.6rem]" style={{ color: C.earth }}>
              Come and Experience Forest School
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[0.95rem] leading-[1.75]" style={{ color: C.earth }}>
              Book a visit to one of our <strong>outdoor nurseries in Harrow</strong>, Pinner, Borehamwood or Aldershot
              and see how woodland learning helps children flourish. Places are limited, so book early.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <ForestBtn href="/contact?enquiry=book-a-visit">Book a Visit <ArrowRight className="h-4 w-4" /></ForestBtn>
              <ForestBtn href="/admission" variant="cream">View Admissions</ForestBtn>
            </div>

            {/* Branch quick-links */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-[0.8rem]" style={{ color: C.earth }}>
              <span className="font-semibold uppercase tracking-[0.14em] opacity-70">Our nurseries:</span>
              {[
                { name: "Harrow",       href: "/branches/harrow" },
                { name: "Pinner",       href: "/branches/pinner" },
                { name: "Borehamwood",  href: "/branches/borehamwood" },
              ].map((b, i) => (
                <span key={b.href} className="flex items-center gap-2">
                  {i > 0 && <span aria-hidden="true" className="opacity-40">·</span>}
                  <Link href={b.href} className="font-semibold underline decoration-2 underline-offset-2 hover:opacity-80">{b.name}</Link>
                </span>
              ))}
              <span aria-hidden="true" className="opacity-40">·</span>
              <Link href="/contact" className="font-semibold underline decoration-2 underline-offset-2 hover:opacity-80">Contact us</Link>
            </div>
          </Reveal>
        </div>
      </section>
    </PublicLayout>
  );
}
