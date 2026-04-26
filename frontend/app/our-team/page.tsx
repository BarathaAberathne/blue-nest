import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowRight,
  BookOpen,
  Check,
  GraduationCap,
  Heart,
  Mail,
  Shield,
  TreePine,
  Users,
} from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import SectionDivider from "@/components/ui/SectionDivider";
import PastelButton from "@/components/ui/PastelButton";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";

export const metadata: Metadata = {
  title: "Our Team — Blue Nest Montessori School",
  description:
    "Meet the qualified, passionate educators behind Blue Nest Montessori — DBS-checked, first-aid certified, and dedicated to every child.",
};

// ── Types ─────────────────────────────────────────────────────────────────────

type AvatarColour = "pink" | "teal" | "lavender" | "gold" | "sage" | "peach";

interface TeamMember {
  name:           string;
  role:           string;
  branch:         string;
  initial:        string;
  colour:         AvatarColour;
  bio?:           string;
  qualifications: string[];
  email?:         string;
}

// ── Palette maps ──────────────────────────────────────────────────────────────

const AVATAR: Record<AvatarColour, { bg: string; border: string; text: string }> = {
  pink:     { bg: "rgba(244,170,200,0.18)", border: "#f4aac8", text: "#cf7d9c"  },
  teal:     { bg: "rgba(127,216,210,0.18)", border: "#7fd8d2", text: "#3aada9"  },
  lavender: { bg: "rgba(185,159,224,0.18)", border: "#b99fe0", text: "#9a7ec8"  },
  gold:     { bg: "rgba(247,215,116,0.22)", border: "#f7d774", text: "#a07a00"  },
  sage:     { bg: "rgba(142,203,155,0.18)", border: "#8ecb9b", text: "#3d8a52"  },
  peach:    { bg: "rgba(249,160,120,0.18)", border: "#f9a078", text: "#c45820"  },
};

const BRANCH_COLOUR: Record<string, string> = {
  Harrow:         "#7fd8d2",
  Borehamwood:    "#b99fe0",
  Pinner:         "#f4aac8",
  "All Branches": "#8ecb9b",
};

// ── Data ──────────────────────────────────────────────────────────────────────

const LEADERSHIP: TeamMember[] = [
  {
    name:     "Sarah Mitchell",
    role:     "Nursery Manager",
    branch:   "Harrow",
    initial:  "S",
    colour:   "pink",
    bio:      "With over 15 years in early years, Sarah holds a Level 5 Early Childhood Studies degree and leads our Harrow setting with warmth and rigour. She is the driving force behind Blue Nest's Montessori culture.",
    qualifications: ["Level 5 Early Childhood Studies", "AMI Montessori Trained", "Paediatric First Aid", "DBS Enhanced"],
    email:    "sarah@bluenest.uk",
  },
  {
    name:     "James Okafor",
    role:     "Deputy Manager & Lead Practitioner",
    branch:   "Borehamwood",
    initial:  "J",
    colour:   "lavender",
    bio:      "James has a background in developmental psychology and has been with Blue Nest since 2018. He leads Borehamwood and oversees practitioner development across all branches.",
    qualifications: ["Level 4 Childcare & Education", "EYFS Specialist", "Paediatric First Aid", "DBS Enhanced"],
    email:    "james@bluenest.uk",
  },
  {
    name:     "Priya Sharma",
    role:     "Forest School Leader",
    branch:   "Pinner",
    initial:  "P",
    colour:   "sage",
    bio:      "A Level 3 Forest School practitioner and Montessori-trained educator, Priya designs and leads our outdoor learning programme, connecting children with nature across all three settings.",
    qualifications: ["Level 3 Forest School Leader", "Montessori Trained", "Outdoor First Aid", "DBS Enhanced"],
    email:    "priya@bluenest.uk",
  },
  {
    name:     "Emily Chen",
    role:     "SENCO & Inclusion Lead",
    branch:   "All Branches",
    initial:  "E",
    colour:   "teal",
    bio:      "Emily holds a postgraduate qualification in Special Educational Needs and ensures every child's individual journey is fully supported. She works across all our settings to champion inclusion.",
    qualifications: ["PG Certificate SEN", "NNEB Qualified", "Makaton Certified", "DBS Enhanced"],
    email:    "emily@bluenest.uk",
  },
];

const PRACTITIONERS: TeamMember[] = [
  {
    name:           "Anika Patel",
    role:           "Room Leader",
    branch:         "Harrow",
    initial:        "A",
    colour:         "teal",
    qualifications: ["Level 3 Early Years", "First Aid", "DBS Enhanced"],
  },
  {
    name:           "Marcus Williams",
    role:           "Early Years Practitioner",
    branch:         "Harrow",
    initial:        "M",
    colour:         "gold",
    qualifications: ["Level 3 Early Years", "First Aid", "DBS Enhanced"],
  },
  {
    name:           "Fatima Hassan",
    role:           "Room Leader",
    branch:         "Borehamwood",
    initial:        "F",
    colour:         "lavender",
    qualifications: ["Level 3 Early Years", "Montessori Trained", "DBS Enhanced"],
  },
  {
    name:           "Daniel Osei",
    role:           "Outdoor Learning Assistant",
    branch:         "Borehamwood",
    initial:        "D",
    colour:         "sage",
    qualifications: ["Level 3 Early Years", "First Aid", "DBS Enhanced"],
  },
  {
    name:           "Sophie Taylor",
    role:           "Early Years Practitioner",
    branch:         "Pinner",
    initial:        "S",
    colour:         "pink",
    qualifications: ["Level 3 Early Years", "First Aid", "DBS Enhanced"],
  },
  {
    name:           "Amara Johnson",
    role:           "Early Years Practitioner",
    branch:         "Pinner",
    initial:        "A",
    colour:         "peach",
    qualifications: ["Level 3 Early Years", "First Aid", "DBS Enhanced"],
  },
  {
    name:           "Rachel Green",
    role:           "Operations Manager",
    branch:         "All Branches",
    initial:        "R",
    colour:         "gold",
    qualifications: ["Business Administration L4", "DBS Enhanced"],
  },
  {
    name:           "Theo Nakamura",
    role:           "Nutrition & Meals Lead",
    branch:         "All Branches",
    initial:        "T",
    colour:         "sage",
    qualifications: ["Level 2 Food Safety", "Allergy Awareness", "DBS Enhanced"],
  },
];

const TRUST_ITEMS = [
  {
    icon:   Shield,
    colour: "#cf7d9c",
    bg:     "rgba(246,213,223,0.45)",
    label:  "DBS Enhanced",
    sub:    "Every team member holds a current enhanced DBS certificate.",
  },
  {
    icon:   Heart,
    colour: "#5fc8c7",
    bg:     "rgba(127,216,210,0.22)",
    label:  "Paediatric First Aid",
    sub:    "All practitioners are qualified in paediatric emergency first aid.",
  },
  {
    icon:   BookOpen,
    colour: "#9a7ec8",
    bg:     "rgba(191,166,232,0.28)",
    label:  "Montessori Trained",
    sub:    "Core team holds AMI / AMS Montessori certification.",
  },
  {
    icon:   GraduationCap,
    colour: "#a07a00",
    bg:     "rgba(247,215,116,0.28)",
    label:  "Level 3+ Qualified",
    sub:    "Every practitioner meets EYFS staffing requirements.",
  },
  {
    icon:   Users,
    colour: "#3d8a52",
    bg:     "rgba(142,203,155,0.25)",
    label:  "Low Staff Ratios",
    sub:    "We exceed statutory child-to-staff ratios in every room.",
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OurTeamPage() {
  return (
    <PublicLayout>

      {/* ══════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative flex min-h-[60vh] items-center">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Image
            src="/home/structured-routine.jpg"
            alt="Blue Nest Montessori educators working with children"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[#fff8f2]/68" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_16%_60%,rgba(246,213,223,0.50),transparent_46%),radial-gradient(ellipse_at_82%_18%,rgba(191,166,232,0.22),transparent_40%)]" />
          <div
            className="absolute inset-0 opacity-28"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(90,74,66,0.07) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
        </div>

        <Doodle kind="bird"      className="left-[5%]   top-8    h-9  w-9  text-[#7fd8d2]  opacity-65" />
        <Doodle kind="heart"     className="right-[6%]  top-10   h-9  w-9  text-[#f4aac8]  opacity-55 hidden sm:block" />
        <Doodle kind="solidstar" className="right-[5%]  bottom-8 h-8  w-8  text-[#f7d774]  opacity-55 hidden sm:block" />
        <Doodle kind="leaf"      className="left-[44%]  bottom-6 h-9  w-9  text-[#8ecb9b]  opacity-45 hidden lg:block" />

        <div className="container-site relative z-10 py-16 sm:py-20 lg:py-24">
          <Reveal>
            <div className="max-w-xl">
              <span className="section-kicker">Blue Nest Montessori School</span>
              <h1 className="mt-4 font-heading text-[2.5rem] leading-[1.1] text-white sm:text-[3rem] lg:text-[3.4rem]">
                The people who make Blue Nest special
              </h1>
              <p className="body-text mt-5 max-w-lg !text-white/90">
                Our team of qualified, passionate educators is the heart of Blue Nest. Every member is
                DBS-checked, first-aid certified, and deeply committed to Montessori principles.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <PastelButton href="/contact" variant="blush">
                  Get in touch <ArrowRight className="h-4 w-4" />
                </PastelButton>
                <PastelButton href="/admission" variant="mint">
                  Book a visit <ArrowRight className="h-4 w-4" />
                </PastelButton>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <SectionDivider from="transparent" to="#f9f4ee" variant="wave" />

      {/* ══════════════════════════════════════════════════════
          LEADERSHIP TEAM
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="flower"    className="left-[2%]   top-10   h-9  w-9  text-[#f4aac8]  opacity-40" />
        <Doodle kind="solidstar" className="right-[4%]  top-8    h-8  w-8  text-[#f7d774]  opacity-45 hidden sm:block" />
        <Doodle kind="cloud"     className="right-[20%] bottom-6 h-10 w-10 text-[#aee6dd]  opacity-35 hidden lg:block" />

        <div className="container-site">
          <Reveal>
            <span className="section-kicker">The leadership team</span>
            <h2 className="section-title mt-4 text-[#cf7d9c]">Guiding Every Setting</h2>
            <p className="section-subtitle max-w-2xl">
              Experienced practitioners and managers who set the standard for warmth,
              rigour, and child-led education at every branch.
            </p>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {LEADERSHIP.map((member, i) => (
              <Reveal key={member.name} delay={i * 0.08} className="h-full">
                <LeaderCard member={member} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider from="#f9f4ee" to="rgba(246,213,223,0.26)" variant="scallop" />

      {/* ══════════════════════════════════════════════════════
          TRUST / CREDENTIALS STRIP
      ══════════════════════════════════════════════════════ */}
      <section className="blush-bg relative px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        <Doodle kind="heart"  className="right-[4%] top-6    h-8 w-8 text-[#f4aac8] opacity-40" />
        <Doodle kind="leaf"   className="left-[2%]  bottom-6 h-8 w-8 text-[#8ecb9b] opacity-40 hidden sm:block" />

        <div className="container-site">
          <Reveal>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {TRUST_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col items-start gap-3 rounded-[1.6rem] p-5 ring-1 ring-[rgba(90,74,66,0.06)]"
                  style={{ background: item.bg }}
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70"
                  >
                    <item.icon className="h-4 w-4" style={{ color: item.colour }} strokeWidth={1.8} />
                  </span>
                  <div>
                    <p className="font-heading text-[1rem] leading-tight" style={{ color: item.colour }}>
                      {item.label}
                    </p>
                    <p className="mt-1 text-[0.75rem] leading-[1.55] text-[rgba(90,74,66,0.68)]">
                      {item.sub}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <SectionDivider from="rgba(246,213,223,0.26)" to="#f9f4ee" variant="scallop" flip />

      {/* ══════════════════════════════════════════════════════
          PRACTITIONERS & SUPPORT
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="leaf"      className="left-[2%]   top-10   h-10 w-10 text-[#8ecb9b]  opacity-45" />
        <Doodle kind="rainbow"   className="right-[5%]  top-8    h-10 w-10                  opacity-40 hidden lg:block" />
        <Doodle kind="solidstar" className="left-[48%]  bottom-8 h-7  w-7  text-[#f7d774]  opacity-40 hidden md:block" />

        <div className="container-site">
          <Reveal>
            <span className="section-kicker">Our practitioners & support staff</span>
            <h2 className="section-title mt-4 text-[#5fc8c7]">Every Day, in Every Room</h2>
            <p className="section-subtitle max-w-2xl">
              Our practitioners bring their full selves to every session — building relationships,
              observing progress, and creating moments of genuine discovery.
            </p>
          </Reveal>

          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {PRACTITIONERS.map((member, i) => (
              <Reveal key={member.name} delay={i * 0.05} className="h-full">
                <PractitionerCard member={member} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          JOIN THE TEAM — editorial strip
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative px-4 pb-16 sm:px-6 lg:px-8">
        <div className="container-site">
          <Reveal>
            <div className="flex flex-col items-start gap-6 rounded-[2.5rem] bg-white px-8 py-10 shadow-[0_10px_40px_rgba(90,74,66,0.08)] sm:flex-row sm:items-center sm:justify-between lg:px-12 lg:py-12">
              <div className="flex items-start gap-5">
                <span
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "rgba(142,203,155,0.22)" }}
                >
                  <TreePine className="h-6 w-6" style={{ color: "#3d8a52" }} strokeWidth={1.8} />
                </span>
                <div>
                  <p className="font-heading text-[1.5rem] leading-tight text-[var(--ink)]">
                    Interested in joining our team?
                  </p>
                  <p className="mt-1.5 max-w-lg text-sm leading-[1.7] text-[rgba(90,74,66,0.65)]">
                    We&rsquo;re always looking for passionate early-years practitioners who share our
                    love of Montessori education. Get in touch to find out about current openings.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                <PastelButton href="mailto:manager@bluenest.uk" variant="sage">
                  <Mail className="h-4 w-4" /> Email us
                </PastelButton>
                <PastelButton href="/contact" variant="lavender">
                  Contact Us <ArrowRight className="h-4 w-4" />
                </PastelButton>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <SectionDivider from="#f9f4ee" to="#7fd8d2" variant="wave" />

      {/* ══════════════════════════════════════════════════════
          CTA
      ══════════════════════════════════════════════════════ */}
      <section className="chalk-bg relative overflow-hidden px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <Doodle kind="solidstar" className="left-[6%]   top-10   h-9  w-9  text-[#f7d774]/70" />
        <Doodle kind="bird"      className="right-[5%]  top-10   h-10 w-10 text-white/50 hidden sm:block" />
        <Doodle kind="heart"     className="right-[18%] bottom-6 h-8  w-8  text-[#f4aac8]/55 hidden lg:block" />
        <Doodle kind="cloud"     className="left-[20%]  bottom-6 h-10 w-10 text-white/40  hidden md:block" />

        <div className="container-site">
          <Reveal>
            <div className="mx-auto max-w-xl text-center">
              <h2 className="font-heading text-[2.6rem] leading-[1.15] text-white sm:text-[2.9rem]">
                Come and meet us
              </h2>
              <p className="body-text mt-3 text-white/85">
                The best way to understand Blue Nest is to visit. Come and see our team in action
                and discover our Montessori environments for yourself.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <PastelButton href="/admission" variant="butter">
                  Book a Visit <ArrowRight className="h-4 w-4" />
                </PastelButton>
                <PastelButton href="/contact" variant="blush">
                  Contact Us <ArrowRight className="h-4 w-4" />
                </PastelButton>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <SectionDivider from="#7fd8d2" to="#fdf6f0" variant="torn" />

    </PublicLayout>
  );
}

// ── Leader Card (with bio + qualifications + email) ───────────────────────────

function LeaderCard({ member }: { member: TeamMember }) {
  const av = AVATAR[member.colour];
  const branchColour = BRANCH_COLOUR[member.branch] ?? "#8ecb9b";

  return (
    <article className="flex h-full flex-col gap-5 rounded-[2rem] bg-white p-6 shadow-[0_6px_24px_rgba(90,74,66,0.08)] ring-1 ring-[rgba(90,74,66,0.04)]">
      {/* Avatar + name block */}
      <div className="flex items-center gap-4">
        <Avatar initial={member.initial} colour={member.colour} size="lg" />
        <div className="min-w-0">
          <h3 className="font-heading text-[1.2rem] leading-tight text-[var(--ink)]">{member.name}</h3>
          <p className="mt-0.5 text-[0.75rem] font-bold leading-tight" style={{ color: av.text }}>
            {member.role}
          </p>
          <span
            className="mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[0.62rem] font-bold text-white"
            style={{ backgroundColor: branchColour }}
          >
            {member.branch}
          </span>
        </div>
      </div>

      {/* Bio */}
      {member.bio && (
        <p className="text-[0.8rem] leading-[1.75] text-[rgba(90,74,66,0.65)]">{member.bio}</p>
      )}

      {/* Qualifications */}
      <ul className="mt-auto space-y-1.5 border-t border-[rgba(90,74,66,0.06)] pt-4">
        {member.qualifications.map((q) => (
          <li key={q} className="flex items-center gap-2 text-[0.72rem] text-[rgba(90,74,66,0.70)]">
            <Check className="h-3.5 w-3.5 shrink-0" style={{ color: av.text }} strokeWidth={2.5} />
            {q}
          </li>
        ))}
      </ul>

      {/* Email */}
      {member.email && (
        <a
          href={`mailto:${member.email}`}
          className="flex items-center gap-1.5 text-[0.72rem] font-bold transition hover:opacity-70"
          style={{ color: av.text }}
        >
          <Mail className="h-3.5 w-3.5 shrink-0" />
          {member.email}
        </a>
      )}
    </article>
  );
}

// ── Practitioner Card (compact) ───────────────────────────────────────────────

function PractitionerCard({ member }: { member: TeamMember }) {
  const av = AVATAR[member.colour];
  const branchColour = BRANCH_COLOUR[member.branch] ?? "#8ecb9b";

  return (
    <article className="flex h-full flex-col items-center gap-3 rounded-[1.8rem] bg-white px-5 py-6 text-center shadow-[0_4px_16px_rgba(90,74,66,0.07)] ring-1 ring-[rgba(90,74,66,0.04)]">
      <Avatar initial={member.initial} colour={member.colour} size="md" />

      <div>
        <h3 className="font-heading text-[1.05rem] leading-tight text-[var(--ink)]">{member.name}</h3>
        <p className="mt-0.5 text-[0.72rem] font-semibold text-[rgba(90,74,66,0.60)]">{member.role}</p>
        <span
          className="mt-2 inline-block rounded-full px-2.5 py-0.5 text-[0.60rem] font-bold text-white"
          style={{ backgroundColor: branchColour }}
        >
          {member.branch}
        </span>
      </div>

      {/* Qualification pills */}
      <div className="mt-auto flex flex-wrap justify-center gap-1.5 pt-1">
        {member.qualifications.map((q) => (
          <span
            key={q}
            className="rounded-full px-2.5 py-0.5 text-[0.60rem] font-bold"
            style={{ background: av.bg, color: av.text }}
          >
            {q}
          </span>
        ))}
      </div>
    </article>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({
  initial,
  colour,
  size,
}: {
  initial: string;
  colour: AvatarColour;
  size:    "md" | "lg";
}) {
  const av  = AVATAR[colour];
  const dim  = size === "lg" ? "h-16 w-16 text-2xl" : "h-14 w-14 text-xl";
  return (
    <div
      className={`${dim} shrink-0 rounded-full border-2 font-heading font-bold flex items-center justify-center`}
      style={{ background: av.bg, borderColor: av.border, color: av.text }}
    >
      {initial}
    </div>
  );
}
