import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Heart,
  Mail,
  Shield,
  TreePine,
  Users,
} from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import PastelButton from "@/components/ui/PastelButton";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";

export const metadata: Metadata = {
  alternates: { canonical: "/our-team" },
  title: "Our Team — Montessori Educators in Harrow, Pinner & Borehamwood",
  description:
    "Meet the Blue Nest Montessori team — Montessori-trained, EYFS-qualified, enhanced-DBS-checked and paediatric-first-aid certified educators across our Harrow, Pinner and Borehamwood nurseries. Careers and apprenticeships also welcome.",
  openGraph: {
    title: "Our Team — Blue Nest Montessori School",
    description:
      "Meet our qualified, DBS-checked educators dedicated to every child's development across Harrow, Pinner and Borehamwood.",
    url: "/our-team",
    images: [{ url: "/home/montessori-learning.jpeg", width: 1280, height: 854, alt: "Blue Nest Montessori team" }],
    type: "website",
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────

type AvatarColour = "pink" | "teal" | "lavender" | "gold" | "sage" | "peach";
type RoleCategory  = "MD" | "Manager" | "Deputy" | "Academic" | "Support" | "BA";
type SiteName      = "Harrow" | "Borehamwood" | "Pinner";

interface TeamMember {
  name:           string;
  role:           string;          // Staff - Job title from the staff sheet
  branch:         SiteName;
  category:       RoleCategory;
  initial:        string;          // first letter of first name
  colour:         AvatarColour;
  // ── Photo upload ─────────────────────────────────────────────────────────
  // 1. Place the photo file in:  frontend/public/team/
  // 2. Name it:  {firstname}-{lastname}.jpg  (lowercase, hyphens, no spaces)
  //    e.g.  dolvy-colaco.jpg  |  mahesh-devinde-ratnayake.jpg
  // 3. Set the photo field below to "/team/{filename}"  then un-comment it.
  photo?:         string;
  bio?:           string;
  qualifications: string[];
  email?:         string;
}

// ── Palette maps ──────────────────────────────────────────────────────────────

const AVATAR: Record<AvatarColour, { bg: string; border: string; text: string }> = {
  pink:     { bg: "rgba(244,170,200,0.18)", border: "#f4aac8", text: "#cf7d9c" },
  teal:     { bg: "rgba(127,216,210,0.18)", border: "#7fd8d2", text: "#3aada9" },
  lavender: { bg: "rgba(127,216,210,0.18)", border: "#7fd8d2", text: "#5fc8c7" },
  gold:     { bg: "rgba(247,215,116,0.22)", border: "#f7d774", text: "#a07a00" },
  sage:     { bg: "rgba(142,203,155,0.18)", border: "#8ecb9b", text: "#3d8a52" },
  peach:    { bg: "rgba(249,160,120,0.18)", border: "#f9a078", text: "#c45820" },
};

const BRANCH_COLOUR: Record<string, string> = {
  Harrow:      "#7fd8d2",
  Borehamwood: "#7fd8d2",
  Pinner:      "#f4aac8",
};

const CATEGORY_LABELS: Record<RoleCategory, string> = {
  MD:       "Managing Director",
  Manager:  "Management",
  Deputy:   "Deputy Management",
  Academic: "Academic Practitioners",
  Support:  "Support Staff",
  BA:       "Business & Admin",
};

const SITES: SiteName[] = ["Harrow", "Borehamwood", "Pinner"];
const ALL_CATS: RoleCategory[] = ["MD", "Manager", "Deputy", "Academic", "Support", "BA"];

// Colour cycles independently within each site+category group
const COL: AvatarColour[] = ["pink", "teal", "lavender", "gold", "sage", "peach"];
const c = (i: number): AvatarColour => COL[i % COL.length];

// ── Staff data ────────────────────────────────────────────────────────────────
// Source: staff-sheet.xlsx  |  Grouped: site → role category → alphabetical
//
// To add a profile photo:
//   1. Drop the image into  frontend/public/team/
//   2. Use the naming convention: firstname-lastname.jpg  (lowercase, hyphens)
//   3. Un-comment the  photo:  line for that person.

const ALL_STAFF: TeamMember[] = [

  // ════════════════════════════════════════════════════
  //  HARROW
  // ════════════════════════════════════════════════════

  // MD ─────────────────────────────────────────────────
  {
    name: "Mahesh Devinde Ratnayake", role: "Managing Director",
    branch: "Harrow", category: "MD", initial: "M", colour: c(0),
    photo: "/team/mahesh-devinde-ratnayake.png",
    qualifications: ["Level 5 Early Years"],
  },

  // Manager ────────────────────────────────────────────
  {
    name: "Lakna Gunawardena", role: "Branch Manager / Executive Director",
    branch: "Harrow", category: "Manager", initial: "L", colour: c(0),
    photo: "/team/lakna-gunawardena.jpg",
    qualifications: ["Level 3 Early Years"],
  },
  {
    name: "Dolvy Colaco", role: "Nursery Manager",
    branch: "Harrow", category: "Manager", initial: "D", colour: c(1),
    photo: "/team/dolvy-colaco.jpg",
    qualifications: ["Level 5 Early Years"],
  },
  {
    name: "Ioana Pintilei", role: "EYFS Coordinator",
    branch: "Harrow", category: "Manager", initial: "I", colour: c(2),
    photo: "/team/ioana-pintilei.jpg",
    qualifications: [],
  },

  // Deputy ─────────────────────────────────────────────
  {
    name: "Ami Mehta", role: "Deputy Manager",
    branch: "Harrow", category: "Deputy", initial: "A", colour: c(0),
    photo: "/team/ami-mehta.jpg",
    qualifications: [],
  },

  // Academic ───────────────────────────────────────────
  {
    name: "Davina Smith", role: "Room Leader",
    branch: "Harrow", category: "Academic", initial: "D", colour: c(0),
    photo: "/team/davina-smith.jpg",
    qualifications: [],
  },
  {
    name: "Hemalatha Srivathsan", role: "Nursery Practitioner",
    branch: "Harrow", category: "Academic", initial: "H", colour: c(1),
    photo: "/team/hemalatha-srivathsan.jpg",
    qualifications: [],
  },
  {
    name: "Jyoti Kothari", role: "Nursery Practitioner",
    branch: "Harrow", category: "Academic", initial: "J", colour: c(2),
    // photo: "/team/jyoti-kothari.jpg",
    qualifications: [],
  },
  {
    name: "Krishna Patel", role: "Room Leader",
    branch: "Harrow", category: "Academic", initial: "K", colour: c(3),
    photo: "/team/krishna-patel.jpg",
    qualifications: [],
  },
  {
    name: "Neha Shah", role: "Senior Practitioner",
    branch: "Harrow", category: "Academic", initial: "N", colour: c(4),
    photo: "/team/neha-shah.jpg",
    qualifications: ["Level 3 Early Years"],
  },
  {
    name: "Nilakshi Bandara Rathnayake Mudiyanselage", role: "Nursery Practitioner",
    branch: "Harrow", category: "Academic", initial: "N", colour: c(5),
    photo: "/team/nilakshi-bandara-rathnayake-mudiyanselage.jpg",
    qualifications: ["Level 3 Early Years"],
  },
  {
    name: "Priyanthi Mala Wijesekara", role: "Nursery Practitioner",
    branch: "Harrow", category: "Academic", initial: "P", colour: c(0),
    // photo: "/team/priyanthi-mala-wijesekara.jpg",
    qualifications: [],
  },
  {
    name: "Resmi Pathirattil Thankappan", role: "Nursery Practitioner",
    branch: "Harrow", category: "Academic", initial: "R", colour: c(1),
    // photo: "/team/resmi-pathirattil-thankappan.jpg",
    qualifications: ["Level 3 Early Years"],
  },
  {
    name: "Shelin Graham Jadav", role: "Nursery Practitioner",
    branch: "Harrow", category: "Academic", initial: "S", colour: c(2),
    photo: "/team/shelin-graham-jadav.jpg",
    qualifications: [],
  },
  {
    name: "Sophia Agard", role: "Nursery Practitioner",
    branch: "Harrow", category: "Academic", initial: "S", colour: c(3),
    photo: "/team/sophia-agard.jpg",
    qualifications: ["Level 5 Early Years"],
  },
  {
    name: "Wasana Owitigala", role: "Deputy Manager",
    branch: "Harrow", category: "Academic", initial: "W", colour: c(4),
    photo: "/team/wasana-owitigala.jpg",
    qualifications: [],
  },
  {
    name: "Xhensaura Jenny Bushi", role: "Room Leader",
    branch: "Harrow", category: "Academic", initial: "X", colour: c(5),
    photo: "/team/xhensaura-jenny-bushi.jpg",
    qualifications: ["Level 5 Early Years"],
  },

  // Support ────────────────────────────────────────────
  {
    name: "Anthula Lleshi", role: "Nursery Practitioner",
    branch: "Harrow", category: "Support", initial: "A", colour: c(0),
    photo: "/team/anthula-lleshi.jpg",
    qualifications: ["Level 3 Early Years"],
  },
  {
    name: "Dinesha Perera", role: "Room Leader",
    branch: "Harrow", category: "Support", initial: "D", colour: c(1),
    photo: "/team/dinesha-perera.jpg",
    qualifications: ["Level 3 Early Years"],
  },
  {
    name: "Ella McGrady", role: "Nursery Apprentice",
    branch: "Harrow", category: "Support", initial: "E", colour: c(2),
    photo: "/team/ella-mcgrady.jpg",
    qualifications: ["Nursery Apprenticeship"],
  },
  {
    name: "Gunawathie Mainaththuge", role: "Kitchen Assistant",
    branch: "Harrow", category: "Support", initial: "G", colour: c(3),
    photo: "/team/gunawathie-mainaththuge.jpg",
    qualifications: [],
  },
  {
    name: "Habeeba Fyzer", role: "Nursery Assistant",
    branch: "Harrow", category: "Support", initial: "H", colour: c(4),
    // photo: "/team/habeeba-fyzer.jpg",
    qualifications: [],
  },
  {
    name: "Hansanee Priyalakshika", role: "Nursery Assistant",
    branch: "Harrow", category: "Support", initial: "H", colour: c(5),
    // photo: "/team/hansanee-priyalakshika.jpg",
    qualifications: [],
  },
  {
    name: "Imali Nissanka", role: "SENCO Assistant",
    branch: "Harrow", category: "Support", initial: "I", colour: c(0),
    // photo: "/team/imali-nissanka.jpg",
    qualifications: [],
  },
  {
    name: "Kurukulasuriya Lorage Adithya Parindhini Fernando", role: "Nursery Assistant",
    branch: "Harrow", category: "Support", initial: "K", colour: c(1),
    // photo: "/team/kurukulasuriya-lorage-adithya-parindhini-fernando.jpg",
    qualifications: [],
  },
  {
    name: "Rajeswary Sivarasa", role: "Chef",
    branch: "Harrow", category: "Support", initial: "R", colour: c(2),
    photo: "/team/rajeswary-sivarasa.jpg",
    qualifications: [],
  },
  {
    name: "Ram Kumar Shrestha", role: "Maintenance",
    branch: "Harrow", category: "Support", initial: "R", colour: c(3),
    // photo: "/team/ram-kumar-shrestha.jpg",
    qualifications: [],
  },
  {
    name: "Srimaal Saman Kahawe Guruge", role: "Ground Handling",
    branch: "Harrow", category: "Support", initial: "S", colour: c(4),
    photo: "/team/srimaal-saman-kahawe-guruge.jpg",
    qualifications: [],
  },
  {
    name: "Thisaruni Widanapathirana", role: "Nursery Assistant",
    branch: "Harrow", category: "Support", initial: "T", colour: c(5),
    // photo: "/team/thisaruni-widanapathirana.jpg",
    qualifications: [],
  },

  // BA ─────────────────────────────────────────────────
  {
    name: "Baratha Abeyrathne", role: "Business Analyst",
    branch: "Harrow", category: "BA", initial: "B", colour: c(0),
    // photo: "/team/baratha-abeyrathne.jpg",
    qualifications: [],
  },
  {
    name: "Thilina Obeysinghe Arachchige", role: "Business Analyst",
    branch: "Harrow", category: "BA", initial: "T", colour: c(1),
    // photo: "/team/thilina-obeysinghe-arachchige.jpg",
    qualifications: [],
  },

  // ════════════════════════════════════════════════════
  //  BOREHAMWOOD
  // ════════════════════════════════════════════════════

  // Deputy ─────────────────────────────────────────────
  {
    name: "Zoe Wizbek", role: "Deputy Manager",
    branch: "Borehamwood", category: "Deputy", initial: "Z", colour: c(0),
    photo: "/team/zoe-wizbek.jpg",
    qualifications: ["Level 5 Early Years"],
  },

  // Academic ───────────────────────────────────────────
  {
    name: "Chathuni Iroshika Jayasekara Mudalige Don", role: "Room Leader",
    branch: "Borehamwood", category: "Academic", initial: "C", colour: c(0),
    photo: "/team/chathuni-iroshika-jayasekara-mudalige-don.jpg",
    qualifications: ["Level 3 Early Years"],
  },
  {
    name: "Hettiarachchige Don Nethmi Angela", role: "Nursery Practitioner",
    branch: "Borehamwood", category: "Academic", initial: "H", colour: c(1),
    photo: "/team/hettiarachchige-don-nethmi-angela.jpg",
    qualifications: ["Level 3 Early Years"],
  },
  {
    name: "Maham Jaffery", role: "3rd In Charge",
    branch: "Borehamwood", category: "Academic", initial: "M", colour: c(2),
    photo: "/team/maham-jaffery.jpg",
    qualifications: [],
  },
  {
    name: "Mihiri Mudiyanselage", role: "Senior Practitioner",
    branch: "Borehamwood", category: "Academic", initial: "M", colour: c(3),
    photo: "/team/mihiri-mudiyanselage.jpg",
    qualifications: ["Level 3 Early Years"],
  },
  {
    name: "Rezarta Hoti", role: "Nursery Assistant",
    branch: "Borehamwood", category: "Academic", initial: "R", colour: c(4),
    photo: "/team/rezarta-hoti.jpg",
    qualifications: ["SENCO Qualified"],
  },

  // Support ────────────────────────────────────────────
  {
    name: "Asini Ovinya Wijensundara", role: "Room Leader",
    branch: "Borehamwood", category: "Support", initial: "A", colour: c(0),
    photo: "/team/asini-ovinya-wijensundara.jpg",
    qualifications: ["Level 3 Early Years"],
  },
  {
    name: "Dilan Pradeep Kumara", role: "Nursery Chef",
    branch: "Borehamwood", category: "Support", initial: "D", colour: c(1),
    photo: "/team/dilan-pradeep-kumara.jpg",
    qualifications: [],
  },
  {
    name: "Dulanga Dilrangi Wijesekara", role: "Nursery Assistant",
    branch: "Borehamwood", category: "Support", initial: "D", colour: c(2),
    // photo: "/team/dulanga-dilrangi-wijesekara.jpg",
    qualifications: [],
  },
  {
    name: "Ishinda Dinal Abeywickrema", role: "Facilities & Compliance Officer",
    branch: "Borehamwood", category: "Support", initial: "I", colour: c(3),
    photo: "/team/ishinda-dinal-abeywickrema.jpg",
    qualifications: [],
  },
  {
    name: "Isuri Kulathunga", role: "Nursery Assistant",
    branch: "Borehamwood", category: "Support", initial: "I", colour: c(4),
    photo: "/team/isuri-kulathunga.jpg",
    qualifications: ["Level 3 Early Years"],
  },
  {
    name: "Nuwanthi Senevirathne", role: "Nursery Assistant",
    branch: "Borehamwood", category: "Support", initial: "N", colour: c(5),
    photo: "/team/nuwanthi-senevirathne.jpg",
    qualifications: ["Level 3 Early Years"],
  },
  {
    name: "Veronica Mccormack", role: "Nursery Apprentice",
    branch: "Borehamwood", category: "Support", initial: "V", colour: c(0),
    photo: "/team/veronica-mccormack.jpg",
    qualifications: ["Nursery Apprenticeship"],
  },

  // ════════════════════════════════════════════════════
  //  PINNER
  // ════════════════════════════════════════════════════

  // Manager ────────────────────────────────────────────
  {
    name: "Deepti Mishra", role: "Deputy Manager",
    branch: "Pinner", category: "Manager", initial: "D", colour: c(0),
    photo: "/team/deepti-mishra.jpg",
    qualifications: [],
  },

  // Deputy ─────────────────────────────────────────────
  {
    name: "Star Amber Mercedes Takelove", role: "Deputy Manager",
    branch: "Pinner", category: "Deputy", initial: "S", colour: c(0),
    // photo: "/team/star-amber-mercedes-takelove.jpg",
    qualifications: [],
  },

  // Academic ───────────────────────────────────────────
  {
    name: "Deepthi Yarasani", role: "Nursery Practitioner",
    branch: "Pinner", category: "Academic", initial: "D", colour: c(0),
    // photo: "/team/deepthi-yarasani.jpg",
    qualifications: [],
  },
  {
    name: "Dilanka Lakmali Bandaranayake Mudiyanselage", role: "Room Leader",
    branch: "Pinner", category: "Academic", initial: "D", colour: c(1),
    photo: "/team/dilanka-lakmali-bandaranayake-mudiyanselage.jpg",
    qualifications: [],
  },
  {
    name: "Kavindya Dassanayaka", role: "Nursery Practitioner",
    branch: "Pinner", category: "Academic", initial: "K", colour: c(2),
    photo: "/team/kavindya-dassanayaka.jpg",
    qualifications: ["Level 4 Early Years"],
  },
  {
    name: "Wathsala Herath", role: "Room Leader / Third In Charge",
    branch: "Pinner", category: "Academic", initial: "W", colour: c(3),
    photo: "/team/wathsala-herath.jpg",
    qualifications: [],
  },

  // Support ────────────────────────────────────────────
  {
    name: "Amelie Marie Hogberg", role: "Bank Staff",
    branch: "Pinner", category: "Support", initial: "A", colour: c(0),
    // photo: "/team/amelie-marie-hogberg.jpg",
    qualifications: [],
  },
  {
    name: "Poornima Ratnayake", role: "Nursery Assistant",
    branch: "Pinner", category: "Support", initial: "P", colour: c(1),
    photo: "/team/poornima-ratnayake.jpg",
    qualifications: ["Level 3 Early Years"],
  },
  {
    name: "Sandhya Mehrotra", role: "Bank Staff",
    branch: "Pinner", category: "Support", initial: "S", colour: c(2),
    photo: "/team/sandhya-mehrotra.jpg",
    qualifications: [],
  },
  {
    name: "Sanduni Mudiyanselage", role: "Bank Staff",
    branch: "Pinner", category: "Support", initial: "S", colour: c(3),
    // photo: "/team/sanduni-mudiyanselage.jpg",
    qualifications: [],
  },
];

// ── Trust strip ───────────────────────────────────────────────────────────────

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
    colour: "#5fc8c7",
    bg:     "rgba(127,216,210,0.28)",
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
            src="/home/montessori-learning.jpeg"
            alt="Blue Nest Montessori educator playing with children"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[#fff8f2]/68" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_16%_60%,rgba(246,213,223,0.50),transparent_46%),radial-gradient(ellipse_at_82%_18%,rgba(127,216,210,0.22),transparent_40%)]" />
          <div
            className="absolute inset-0 opacity-28"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(90,74,66,0.07) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
        </div>

        <Doodle kind="blue-bird" className="left-[5%]   top-8    h-9  w-9   opacity-65" />
        <Doodle kind="leaf"      className="left-[44%]  bottom-6 h-9  w-9   opacity-45 hidden lg:block" />

        <div className="relative z-10 w-full px-6 sm:px-10 lg:px-16 xl:px-20 py-16 sm:py-20 lg:py-24">
          <Reveal>
            <span className="section-kicker">Blue Nest Montessori School</span>
            <h1 className="mt-4 font-heading text-[2.5rem] leading-[1.1] text-white sm:text-[3rem] lg:text-[3.4rem] max-w-3xl">
              The people who make Blue Nest special
            </h1>
            <p className="body-text mt-5 max-w-xl !text-white/90">
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
          </Reveal>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          PER-BRANCH SECTIONS  (one pass per site — no duplication)
          Structure inside each: leadership → practitioners
      ══════════════════════════════════════════════════════ */}
      {SITES.map((site, siteIdx) => (
        <section
          key={site}
          className={`paper-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16 ${
            siteIdx > 0 ? "border-t border-[rgba(90,74,66,0.06)]" : ""
          }`}
        >
          {siteIdx === 0 && <Doodle kind="pink-flower" className="left-[2%] top-10 h-9 w-9 opacity-40" />}
          {siteIdx === 1 && <Doodle kind="leaf"        className="left-[2%] top-10 h-9 w-9 opacity-40" />}
          {siteIdx === 2 && <Doodle kind="blue-bird"   className="left-[2%] top-10 h-9 w-9 opacity-40" />}

          <div className="container-site">
            <SiteHeading site={site} />

            {ALL_CATS.map((cat) => {
              const group = ALL_STAFF.filter(m => m.branch === site && m.category === cat);
              if (!group.length) return null;
              return (
                <div key={cat} className="mt-8 first:mt-0">
                  <CategoryLabel label={CATEGORY_LABELS[cat]} />
                  <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {group.map((member, i) => (
                      <Reveal key={member.name} delay={i * 0.06} className="h-full">
                        <StaffCard member={member} />
                      </Reveal>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}


      {/* ══════════════════════════════════════════════════════
          TRUST / CREDENTIALS STRIP
      ══════════════════════════════════════════════════════ */}
      <section className="blush-bg relative px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        <Doodle kind="leaf" className="left-[2%]  bottom-6 h-8 w-8 opacity-40 hidden sm:block" />

        <div className="container-site">
          <Reveal>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {TRUST_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col items-start gap-3 rounded-[1.6rem] p-5 ring-1 ring-[rgba(90,74,66,0.06)]"
                  style={{ background: item.bg }}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70">
                    <item.icon className="h-4 w-4" style={{ color: item.colour }} strokeWidth={1.8} />
                  </span>
                  <div>
                    <p className="font-heading text-[1rem] leading-tight" style={{ color: item.colour }}>
                      {item.label}
                    </p>
                    <p className="mt-1 text-[0.75rem] leading-[1.55] text-[rgba(90,74,66,0.85)]">
                      {item.sub}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          CAREERS — safer recruitment + what we look for
      ══════════════════════════════════════════════════════ */}
      <section id="careers" className="blush-bg relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="container-site">
          <Reveal>
            <div className="mx-auto max-w-3xl">
              <span className="section-kicker">Careers at Blue Nest</span>
              <h2 className="section-title mt-4 text-[#cf7d9c]">Join our team</h2>
              <div className="body-text mt-5 space-y-5">
                <p>
                  We&rsquo;re always looking for passionate early-years practitioners who love
                  Montessori learning. Roles open up across our Harrow, Pinner and Borehamwood
                  Montessori day nurseries — from Montessori-trained room leads and apprentices
                  to qualified EYFS practitioners and bank staff.
                </p>
                <p>
                  Our safer recruitment process is thorough by design. Every team member completes
                  an enhanced DBS check before starting, two professional references are taken up,
                  and identity and right-to-work are verified. Once you&rsquo;ve joined, we invest in
                  paediatric emergency first aid, safeguarding (Level 2 minimum, Level 3 for
                  designated leads), food hygiene and ongoing Montessori CPD.
                </p>
                <p>
                  Most of all, we look for warmth. The people on this page have stayed at Blue
                  Nest because the culture is calm, child-centred and respectful. If that sounds
                  like your kind of nursery, we&rsquo;d love to hear from you.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          JOIN THE TEAM — CTA strip
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
                  <p className="mt-1.5 max-w-lg text-sm leading-[1.7] text-[rgba(90,74,66,0.85)]">
                    Send your CV and a short note about why Montessori matters to you, and let us
                    know which branch you&rsquo;re drawn to. We reply to every application.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                <PastelButton href="mailto:manager@bluenest.uk?subject=Careers%20enquiry" variant="sage">
                  <Mail className="h-4 w-4" /> Email us
                </PastelButton>
                <PastelButton href="/contact?enquiry=careers" variant="lavender">
                  Contact Us <ArrowRight className="h-4 w-4" />
                </PastelButton>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

    </PublicLayout>
  );
}

// ── Site heading (one per branch) ─────────────────────────────────────────────

function SiteHeading({ site }: { site: SiteName }) {
  const colour = BRANCH_COLOUR[site] ?? "#8ecb9b";
  return (
    <Reveal>
      <div className="mb-8 flex items-center gap-4">
        <h2
          className="font-heading text-[2rem] leading-tight sm:text-[2.4rem]"
          style={{ color: colour }}
        >
          {site}
        </h2>
        <div className="h-px flex-1 bg-[rgba(90,74,66,0.08)]" />
        <span
          className="shrink-0 rounded-full px-3 py-0.5 text-[0.62rem] font-bold text-white"
          style={{ backgroundColor: colour }}
        >
          Blue Nest Montessori
        </span>
      </div>
    </Reveal>
  );
}

// ── Category label ────────────────────────────────────────────────────────────

function CategoryLabel({ label }: { label: string }) {
  return (
    <p className="mb-3 text-[0.65rem] font-bold uppercase tracking-widest text-[rgba(90,74,66,0.85)]">
      {label}
    </p>
  );
}

// ── Staff Card (unified — all categories) ─────────────────────────────────────

function StaffCard({ member }: { member: TeamMember }) {
  const av = AVATAR[member.colour];
  const branchColour = BRANCH_COLOUR[member.branch] ?? "#8ecb9b";

  return (
    <article className="flex h-full flex-col items-center gap-3 rounded-[1.8rem] bg-white px-5 py-6 text-center shadow-[0_4px_20px_rgba(90,74,66,0.07)] ring-1 ring-[rgba(90,74,66,0.04)]">
      <Avatar initial={member.initial} colour={member.colour} size="md" photo={member.photo} />

      <div>
        <h3 className="font-heading text-[1.05rem] leading-tight text-[var(--ink)] break-words hyphens-auto">
          {member.name}
        </h3>
        <p className="mt-1 text-[0.72rem] font-semibold" style={{ color: av.text }}>
          {member.role}
        </p>
        <span
          className="mt-2 inline-block rounded-full px-2.5 py-0.5 text-[0.60rem] font-bold text-white"
          style={{ backgroundColor: branchColour }}
        >
          {member.branch}
        </span>
      </div>

      {member.qualifications.length > 0 && (
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
      )}

      {member.email && (
        <a
          href={`mailto:${member.email}`}
          className={`${member.qualifications.length > 0 ? "mt-2" : "mt-auto"} flex items-center gap-1.5 text-[0.68rem] font-bold transition hover:opacity-70`}
          style={{ color: av.text }}
        >
          <Mail className="h-3 w-3 shrink-0" />
          {member.email}
        </a>
      )}
    </article>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({
  initial,
  colour,
  size,
  photo,
}: {
  initial: string;
  colour:  AvatarColour;
  size:    "md" | "lg";
  photo?:  string;
}) {
  const av  = AVATAR[colour];
  const px  = size === "lg" ? 64 : 56;
  const dim = size === "lg" ? "h-16 w-16 text-2xl" : "h-14 w-14 text-xl";

  if (photo) {
    return (
      <div
        className={`${dim} relative shrink-0 overflow-hidden rounded-full border-2`}
        style={{ borderColor: av.border }}
      >
        <Image src={photo} alt="" fill sizes={`${px}px`} className="object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`${dim} shrink-0 rounded-full border-2 font-heading font-bold flex items-center justify-center`}
      style={{ background: av.bg, borderColor: av.border, color: av.text }}
    >
      {initial}
    </div>
  );
}
