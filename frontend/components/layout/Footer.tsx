import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import Doodle from "@/components/ui/Doodle";

// ── Inline social SVGs (mirrors Header.tsx) ───────────────────────────────────

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────

const badges = [
  {
    src:   "/site-images/ofsted-good.png",
    alt:   "Ofsted Good Provider",
    label: "Ofsted Good",
  },
  {
    src:   "/site-images/ocn-early-years.png",
    alt:   "OCN Early Years Professional Development Award",
    label: "OCN Early Years",
  },
  {
    src:   "/site-images/green-tree-school.png",
    alt:   "Green Tree School – Woodland Trust Platinum Award",
    label: "Green Tree School",
  },
  {
    src:   "/site-images/food-hygiene-5.png",
    alt:   "Food Hygiene Rating 5 – Very Good",
    label: "Food Hygiene 5",
  },
];

const branches = [
  { label: "Harrow",                    href: "/branches/harrow"      },
  { label: "Borehamwood",               href: "/branches/borehamwood" },
  { label: "Pinner",                    href: "/branches/pinner"      },
  { label: "Northwood — Coming Soon",   href: "/branches/northwood"   },
];

const quickLinks = [
  { label: "Admission",      href: "/admission"      },
  { label: "Why Montessori", href: "/why-montessori" },
  { label: "Forest School",  href: "/forest-school"  },
  { label: "Nursery Store",  href: "/nursery-store"  },
  { label: "Blog",           href: "/blog"           },
  { label: "Our Charities",  href: "/our-charities"  },
];

const socialLinks = [
  { label: "Facebook",  href: "#", Icon: () => <FacebookIcon  className="h-4 w-4" /> },
  { label: "Instagram", href: "#", Icon: () => <InstagramIcon className="h-4 w-4" /> },
  { label: "WhatsApp",  href: "#", Icon: () => <MessageCircle className="h-4 w-4" /> },
];

// ── Column label style ────────────────────────────────────────────────────────

function ColLabel({ children, color, top }: { children: React.ReactNode; color: string; top?: boolean }) {
  return (
    <p
      className={`${top ? "" : "mt-7 "}mb-4 text-[0.65rem] font-extrabold uppercase tracking-[0.22em]`}
      style={{ color }}
    >
      {children}
    </p>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#fdf6f0] px-4 pb-0 pt-12 sm:px-6 lg:px-8">

      {/* Ambient doodles */}
      <Doodle kind="solidstar" className="left-[1%]   top-8    h-8  w-8  text-[#f7d774] opacity-45" />
      <Doodle kind="leaf"      className="right-[3%]  top-10   h-9  w-9  text-[#7fd8d2] opacity-40 hidden sm:block" />
      <Doodle kind="flower"    className="left-[49%]  top-5    h-7  w-7  text-[#f4aac8] opacity-40 hidden md:block" />
      <Doodle kind="heart"     className="right-[17%] bottom-20 h-6 w-6  text-[#ef8cab] opacity-35 hidden lg:block" />
      <Doodle kind="cloud"     className="left-[15%]  bottom-16 h-8 w-8  text-[#85d6f1] opacity-30 hidden lg:block" />

      <div className="container-site">

        {/* ── Main 4-col grid ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr] lg:gap-12">

          {/* Col 1 — Logo + tagline + social */}
          <div className="flex flex-col gap-4">
            <Link href="/" aria-label="Blue Nest Montessori — home">
              <div className="relative h-[88px] w-[176px]">
                <Image
                  src="/home/logo_new.png"
                  alt="Blue Nest Montessori School"
                  fill
                  className="object-contain"
                  sizes="176px"
                />
              </div>
            </Link>

            <p className="max-w-[210px] text-[0.88rem] leading-[1.8] text-[rgba(90,74,66,0.68)]">
              Nurturing curious minds through child-led Montessori education across North West London and Hertfordshire.
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-2">
              {socialLinks.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[rgba(90,74,66,0.55)] shadow-[0_2px_8px_rgba(90,74,66,0.08)] transition hover:text-[#5fc8c7]"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Col 2 — Accreditation badges */}
          <div>
            <ColLabel color="#cf7d9c" top>Accreditations</ColLabel>
            <div className="grid grid-cols-2 gap-3">
              {badges.map((badge) => (
                <div
                  key={badge.label}
                  className="flex h-[82px] items-center justify-center rounded-[1.2rem] bg-white p-3 shadow-[0_3px_12px_rgba(90,74,66,0.07)]"
                  title={badge.alt}
                >
                  <Image
                    src={badge.src}
                    alt={badge.alt}
                    width={70}
                    height={62}
                    className="object-contain"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Col 3 — Contact + Branches */}
          <div>
            <ColLabel color="#5fc8c7" top>Contact Us</ColLabel>
            <ul className="space-y-3 text-[0.88rem]">
              <li className="flex items-start gap-2.5">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[#7fd8d2]" aria-hidden="true" />
                <div className="space-y-1 text-[rgba(90,74,66,0.78)]">
                  <a href="tel:02088615574" className="block font-medium transition hover:text-[#5fc8c7]">020 8861 5574</a>
                  <a href="tel:07400430630" className="block font-medium transition hover:text-[#5fc8c7]">07400 430630</a>
                </div>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-[#7fd8d2]" aria-hidden="true" />
                <a
                  href="mailto:manager@bluenest.uk"
                  className="text-[0.88rem] font-medium text-[rgba(90,74,66,0.78)] transition hover:text-[#5fc8c7]"
                >
                  manager@bluenest.uk
                </a>
              </li>
            </ul>

            <ColLabel color="#a48cdc">Our Branches</ColLabel>
            <ul className="space-y-1.5 text-[0.88rem]">
              {branches.map((b) => (
                <li key={b.href}>
                  <Link href={b.href} className="font-semibold text-[rgba(90,74,66,0.72)] transition hover:text-[#5fc8c7]">
                    {b.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4 — Head office + Quick links */}
          <div>
            <ColLabel color="#f0bd55" top>Head Office</ColLabel>
            <address className="not-italic">
              <div className="flex items-start gap-2.5 text-[0.88rem] text-[rgba(90,74,66,0.78)]">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#7fd8d2]" aria-hidden="true" />
                <div className="leading-[1.8]">
                  <p className="font-semibold">Blue Nest Montessori School</p>
                  <p>29 Churchfield Close</p>
                  <p>Harrow, HA2 6BD</p>
                </div>
              </div>
            </address>

            <ColLabel color="#ef8cab">Quick Links</ColLabel>
            <ul className="space-y-1.5 text-[0.88rem]">
              {quickLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="font-semibold text-[rgba(90,74,66,0.72)] transition hover:text-[#ef8cab]">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* ── Legal strip ─────────────────────────────────────────── */}
        <div className="mt-12 border-t border-[rgba(90,74,66,0.08)] pb-8 pt-6 text-center">
          <p className="mx-auto max-w-3xl text-[0.68rem] leading-[1.95] text-[rgba(90,74,66,0.42)]">
            BUZY BEES CHILDCARE LIMITED (trading as Blue Nest Montessori School), registered as a
            limited company in England and Wales under company number: 07908763.{" "}
            Registered Company Address: 38 Victor Road, Harrow, HA2 6PZ.
          </p>
          <p className="mt-1.5 text-[0.65rem] text-[rgba(90,74,66,0.35)]">
            The content on this website is owned by us and our licensors. Do not copy any content (including images) without our consent.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[0.68rem] text-[rgba(90,74,66,0.42)]">
            <Link href="/terms"         className="transition hover:text-[var(--ink)]">Terms of Use</Link>
            <span aria-hidden="true" className="text-[rgba(90,74,66,0.2)]">·</span>
            <Link href="/privacy"       className="transition hover:text-[var(--ink)]">Privacy &amp; Cookie Policy</Link>
            <span aria-hidden="true" className="text-[rgba(90,74,66,0.2)]">·</span>
            <Link href="/trading-terms" className="transition hover:text-[var(--ink)]">Trading Terms</Link>
            <span aria-hidden="true" className="text-[rgba(90,74,66,0.2)]">·</span>
            <span>Powered by Yell Business &copy; 2023</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
