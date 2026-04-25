"use client";

import {
  CircleUserRound,
  Handbag,
  Mail,
  Menu,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import Doodle from "@/components/ui/Doodle";

// ── Inline SVG icons ──────────────────────────────────────────────────────────

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function HalalIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
      <path d="M17.5 6.5l.4 1.1 1.1.4-1.1.4-.4 1.1-.4-1.1-1.1-.4 1.1-.4z" />
    </svg>
  );
}

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

const trustBadges = [
  { line1: "#1 Preschool",   line2: "in London",      color: "#f0bd55", icon: "trophy"  as const },
  { line1: "ISO 45001:2018", line2: "Accredited",     color: "#f4aac8", icon: "shield"  as const },
  { line1: "Halal Food",     line2: "Protected",      color: "#52b26b", icon: "halal"   as const },
  { line1: "Enhanced DBS",   line2: "Checked",        color: "#b99fe0", icon: "shield"  as const },
  { line1: "5-Star Hygiene", line2: "Rated Kitchen",  color: "#6ecfc9", icon: "shield"  as const },
];

const navLinks = [
  { label: "Home",          href: "/"              },
  { label: "Why Montessori",href: "/why-montessori"},
  { label: "Forest School", href: "/forest-school" },
  { label: "Admission",     href: "/admission"     },
  { label: "Gallery",       href: "/gallery"       },
  { label: "Our Team",      href: "/our-team"      },
  { label: "Our Charities", href: "/our-charities" },
  { label: "Home Learning", href: "/home-learning" },
  { label: "Nursery Store", href: "/nursery-store" },
  { label: "Blog",          href: "/blog"          },
  { label: "Contact",       href: "/contact"       },
];

const branches = [
  { label: "Harrow",      href: "/branches/harrow",      phone: "020 8861 5574"  },
  { label: "Borehamwood", href: "/branches/borehamwood", phone: "020 8953 1718"  },
  { label: "Pinner",      href: "/branches/pinner",      phone: "07400 430630"   },
  { label: "Northwood",   href: "/branches/northwood",   comingSoon: true        },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function BadgeItem({ badge }: { badge: typeof trustBadges[number] }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span style={{ color: badge.color }}>
        {badge.icon === "trophy" && <TrophyIcon className="h-6 w-6" />}
        {badge.icon === "halal"  && <HalalIcon  className="h-6 w-6" />}
        {badge.icon === "shield" && <ShieldCheck className="h-6 w-6" />}
      </span>
      <div className="leading-tight">
        <p className="text-xs font-extrabold text-[var(--ink)]">{badge.line1}</p>
        <p className="text-[0.65rem] text-[rgba(90,74,66,0.62)]">{badge.line2}</p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════════
          TRUST BAR — scrolls with page (not sticky)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden border-b border-[rgba(90,74,66,0.06)] bg-[#fdf8f5]">
        {/* Edge doodles — desktop only */}
        <Doodle kind="leaf"   className="left-4  top-1/2 h-7 w-7 -translate-y-1/2 text-[#7fd8d2] hidden sm:block" />
        <Doodle kind="flower" className="right-4 top-1/2 h-6 w-6 -translate-y-1/2 text-[#f4aac8] hidden sm:block" />
        <Doodle kind="heart"  className="right-16 bottom-0.5 h-5 w-5 text-[#ef8cab]/60 hidden lg:block" />

        {/* Scrollable badge row */}
        <div className="flex items-center gap-2 overflow-x-auto px-10 py-2.5 scrollbar-none sm:justify-center sm:gap-0 sm:overflow-visible sm:px-16 lg:px-24">
          {trustBadges.map((badge, i) => (
            <div key={badge.line1} className="flex shrink-0 items-center">
              <BadgeItem badge={badge} />
              {i < trustBadges.length - 1 && (
                <span
                  className="mx-4 hidden h-6 w-px flex-shrink-0 bg-[rgba(90,74,66,0.1)] sm:block"
                  aria-hidden="true"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          STICKY MAIN HEADER
      ══════════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 overflow-visible border-b border-[rgba(207,125,156,0.15)] bg-[#fde8f0] shadow-[0_2px_12px_rgba(207,125,156,0.1)] backdrop-blur-sm">
        <div className="container-site">
          
          {/* DESKTOP LAYOUT — 2-row grid */}
          <div className="hidden sm:grid grid-cols-[auto_1fr_auto] grid-rows-2 gap-0 py-2.5">
            
            {/* LEFT: Logo (spans 2 rows, bleeds to fill full header height) */}
            <div className="row-span-2 flex items-center pr-2">
              <Link href="/" className="flex shrink-0 items-center">
                <div className="relative -my-6 h-[168px] w-[320px]">
                  <Image
                    src="/home/logo_new.png"
                    alt="Blue Nest Montessori logo"
                    fill
                    className="object-contain drop-shadow-[0_4px_10px_rgba(90,74,66,0.14)]"
                    sizes="320px"
                    priority
                  />
                </div>
              </Link>
            </div>

            {/* ROW 1: Search + Action Icons */}
            <div className="col-span-2 flex items-center justify-between gap-4 px-4 py-2">
              {/* Search bar */}
              <div className="hidden md:flex flex-1 max-w-sm items-center overflow-hidden rounded-full bg-white shadow-[0_2px_10px_rgba(90,74,66,0.07)]">
                <input
                  type="text"
                  placeholder="Search..."
                  aria-label="Search"
                  className="h-10 flex-1 bg-transparent px-4 text-sm text-[var(--ink)] outline-none placeholder:text-[rgba(90,74,66,0.4)]"
                />
                <span className="flex h-10 w-11 items-center justify-center bg-[#7fd8d2] text-white">
                  <Search className="h-4 w-4" />
                </span>
              </div>

              {/* Social + Action icons */}
              <div className="flex items-center gap-0.5">
                {[
                  { label: "Facebook",  Icon: () => <FacebookIcon  className="h-[18px] w-[18px]" /> },
                  { label: "Instagram", Icon: () => <InstagramIcon className="h-[18px] w-[18px]" /> },
                  { label: "WhatsApp",  Icon: () => <MessageCircle className="h-[18px] w-[18px]" /> },
                ].map(({ label, Icon }) => (
                  <button
                    key={label}
                    type="button"
                    aria-label={label}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[rgba(90,74,66,0.7)] transition hover:bg-white/60 hover:text-[var(--ink)]"
                  >
                    <Icon />
                  </button>
                ))}

                <span className="mx-2.5 h-5 w-px bg-[rgba(90,74,66,0.18)]" aria-hidden="true" />

                {/* Parents Login */}
                <button
                  type="button"
                  className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[var(--ink)] transition hover:bg-white/60 md:flex"
                >
                  <CircleUserRound className="h-4 w-4 text-[#cf7d9c]" />
                  <span className="text-xs font-semibold">Parents Log In</span>
                </button>

                {/* Cart */}
                <div className="relative ml-1">
                  <button
                    type="button"
                    aria-label="Shopping bag"
                    className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/60"
                  >
                    <Handbag className="h-5 w-5 text-[#7fd8d2]" />
                  </button>
                  <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#7fd8d2]">
                    0
                  </span>
                </div>
              </div>
            </div>

            {/* ROW 2: Contact Details + Menu Button */}
            <div className="col-span-2 flex items-center justify-between gap-3 border-t border-[rgba(207,125,156,0.12)] px-4 py-1.5">
              {/* Contact details */}
              <div className="flex items-center">
                {branches.slice(0, 3).map((branch, i) => (
                  <div key={branch.label} className="flex items-center">
                    <div className="flex items-center gap-1.5 px-3 text-[var(--ink)] first:pl-0">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-[#7fd8d2]" />
                      <div className="leading-tight">
                        <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.1em] text-[#cf7d9c]">
                          {branch.label}
                        </p>
                        <p className="text-[0.72rem] font-medium">{branch.phone}</p>
                      </div>
                    </div>
                    {i < 2 && (
                      <span className="h-5 w-px bg-[rgba(90,74,66,0.12)]" aria-hidden="true" />
                    )}
                  </div>
                ))}

                <span className="mx-3 h-5 w-px bg-[rgba(90,74,66,0.12)]" aria-hidden="true" />

                <div className="flex items-center gap-1.5 text-[var(--ink)]">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-[#7fd8d2]" />
                  <span className="text-[0.72rem] font-medium">manager@bluenest.uk</span>
                </div>
              </div>

              {/* Menu button */}
              <button
                type="button"
                className="inline-flex h-12 w-12 shrink-0 flex-col items-center justify-center border-2 border-[var(--ink)] bg-white text-[var(--ink)] transition hover:bg-[#f8f1ec]"
                onClick={() => setMenuOpen(true)}
                aria-label="Open navigation menu"
              >
                <Menu className="mb-0.5 h-4 w-4" />
                <span className="text-[0.6rem] font-extrabold leading-none tracking-[0.35em] [writing-mode:vertical-rl]">
                  MENU
                </span>
              </button>
            </div>
          </div>

          {/* MOBILE LAYOUT — Single row */}
          <div className="sm:hidden flex items-center justify-between py-2 px-1">
            <Link href="/" className="flex shrink-0 items-center">
              <div className="relative -my-4 h-[100px] w-[190px]">
                <Image
                  src="/home/logo_new.png"
                  alt="Blue Nest Montessori logo"
                  fill
                  className="object-contain drop-shadow-[0_4px_10px_rgba(90,74,66,0.14)]"
                  sizes="190px"
                  priority
                />
              </div>
            </Link>

            <div className="flex items-center gap-3 ml-auto">
              {/* Search icon */}
              <button
                type="button"
                aria-label="Search"
                className="flex h-9 w-9 items-center justify-center text-[#7fd8d2] transition hover:text-[#6ab5ad]"
              >
                <Search className="h-5 w-5" />
              </button>

              {/* Menu button */}
              <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 flex-col items-center justify-center border-2 border-[var(--ink)] bg-white text-[var(--ink)] transition hover:bg-[#f8f1ec]"
                onClick={() => setMenuOpen(true)}
                aria-label="Open navigation menu"
              >
                <Menu className="mb-0.5 h-4 w-4" />
                <span className="text-[0.6rem] font-extrabold leading-none tracking-[0.35em] [writing-mode:vertical-rl]">
                  MENU
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════
          SLIDE-OVER NAV (unchanged)
      ══════════════════════════════════════════════════════════════════════ */}
      {menuOpen && (
        <div className="fixed inset-0 z-[90]">
          <button
            type="button"
            className="absolute inset-0 bg-[#7fd8d2]/78 backdrop-blur-[2px]"
            aria-label="Close navigation menu"
            onClick={() => setMenuOpen(false)}
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-[42rem] flex-col overflow-hidden rounded-l-[2rem] bg-white shadow-[-20px_0_60px_rgba(90,74,66,0.18)]">

            {/* Header row */}
            <div className="flex shrink-0 items-center justify-between px-8 py-3">
              <div className="relative h-[72px] w-[136px]">
                <Image
                  src="/home/logo_new.png"
                  alt="Blue Nest Montessori logo"
                  fill
                  className="object-contain object-left"
                  sizes="136px"
                />
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close navigation menu"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#7fd8d2] text-white transition hover:bg-[#6ab5ad]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Ambient doodles — left gutter and bottom-right corner */}
            <Doodle kind="solidstar" className="absolute left-3 top-40   h-6 w-6 text-[#f7d774] opacity-30" />
            <Doodle kind="heart"     className="absolute left-2 top-[52%] h-5 w-5 text-[#f4aac8] opacity-28" />
            <Doodle kind="leaf"      className="absolute left-3 top-[72%] h-6 w-6 text-[#7fd8d2] opacity-30" />
            <Doodle kind="flower"    className="absolute bottom-12 right-5  h-8 w-8 text-[#ef8cab] opacity-30" />
            <Doodle kind="rainbow"   className="absolute bottom-5  right-14 h-10 w-10           opacity-20 hidden sm:block" />
            <Doodle kind="cloud"     className="absolute bottom-16 right-2  h-7 w-7 text-[#85d6f1] opacity-22 hidden sm:block" />

            {/* Content — fills remaining height, items stretch evenly */}
            <div className="flex min-h-0 flex-1 flex-col px-10">
              <div className="h-px shrink-0 bg-[#f1a8ca]" />

              {/* Nav items share available height equally via flex-1 */}
              <nav className="relative z-10 mt-2 flex min-h-0 flex-1 flex-col" aria-label="Main navigation">
                {navLinks.map((link) => (
                  <div key={link.href} className="flex min-h-0 flex-1 flex-col justify-center">
                    <Link
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="block text-[0.9rem] font-extrabold uppercase tracking-[0.04em] text-[var(--ink)] transition hover:text-[#4ec0c3]"
                    >
                      {link.label}
                    </Link>
                    <div className="h-px bg-[#f1a8ca]" />
                  </div>
                ))}
              </nav>

              {/* Branches — pinned to bottom */}
              <div className="shrink-0 pb-4 pt-3">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-[#a97ecf]">Our Branches</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {branches.map((branch) => (
                    <Link
                      key={branch.href}
                      href={branch.href}
                      onClick={() => setMenuOpen(false)}
                      className="rounded-[1rem] border border-[rgba(90,74,66,0.08)] px-3 py-2 text-xs font-bold text-[var(--ink)] transition hover:border-[#7fd8d2] hover:bg-[#f8fffe]"
                    >
                      <span>{branch.label}</span>
                      {branch.comingSoon && (
                        <span className="ml-2 text-[#cf7d9c]">Soon</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
