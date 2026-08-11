"use client";

import {
  CircleUserRound,
  Handbag,
  Mail,
  Menu,
  Phone,
  ShieldCheck,
  X,
} from "lucide-react";
import SiteSearch from "@/components/layout/SiteSearch";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BRANCH_FALLBACKS } from "@/lib/branch-public";
import { branchShortName } from "@/lib/branch";
import type { Branch } from "@/types";
import { usePathname } from "next/navigation";
import Doodle from "@/components/ui/Doodle";
import { getCartUpdatedEventName, loadCart } from "@/lib/store-cart";
import { getAuthUpdatedEventName, getAuthUser } from "@/lib/auth";
import type { User } from "@/types";

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

function YellIcon({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/site-images/yell.png" alt="" className={className} aria-hidden="true" />
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────

const trustBadges = [
  { line1: "#1 Montessori School (2019-2025)", line2: "in London", color: "#f0bd55", icon: "trophy" as const },
  { line1: "ISO 45001:2018", line2: "Accredited", color: "#f4aac8", icon: "shield" as const },
  { line1: "Halal Food", line2: "Protected", color: "#52b26b", icon: "halal" as const },
  { line1: "Enhanced DBS", line2: "Checked", color: "#7fd8d2", icon: "shield" as const },
  { line1: "5-Star Hygiene", line2: "Rated Kitchen", color: "#6ecfc9", icon: "shield" as const },
];

type NavLink = {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
};

const slideOverLinks: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about-us" },
  { label: "Why Montessori", href: "/why-montessori" },
  { label: "Forest School", href: "/forest-school" },
  {
    label: "Admission",
    href: "/admission",
    children: [
      { label: "Prospectus", href: "/admission/prospectus" },
      { label: "Our Fees", href: "/admission/our-fees" },
      { label: "Application Form", href: "/admission/application-form" },
    ],
  },
  { label: "Gallery", href: "/gallery" },
  { label: "Our Team", href: "/our-team" },
  { label: "Our Charities", href: "/our-charities" },
  { label: "Home Learning", href: "/home-learning" },
  { label: "Nursery Store", href: "/nursery-store" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

type NavBranch = { label: string; href: string; phone?: string; comingSoon?: boolean };

// The shared roster is the render fallback; the live list (labels, phones,
// coming-soon status, NEW branches) is fetched from the backend on mount.
const FALLBACK_NAV_BRANCHES: NavBranch[] = BRANCH_FALLBACKS.map((b) => ({
  label: b.label,
  href: `/branches/${b.slug}`,
  phone: b.phone,
  comingSoon: b.comingSoon,
}));

// ── Sub-components ────────────────────────────────────────────────────────────

function BadgeItem({ badge }: { badge: typeof trustBadges[number] }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span style={{ color: badge.color }}>
        {badge.icon === "trophy" && <TrophyIcon className="h-6 w-6" />}
        {badge.icon === "halal" && <HalalIcon className="h-6 w-6" />}
        {badge.icon === "shield" && <ShieldCheck className="h-6 w-6" />}
      </span>
      <div className="leading-tight">
        <p className="text-xs font-extrabold text-[var(--ink)]">{badge.line1}</p>
        <p className="text-[0.65rem] text-[#6e5a4e]">{badge.line2}</p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [branches, setBranches] = useState<NavBranch[]>(FALLBACK_NAV_BRANCHES);
  useEffect(() => {
    let alive = true;
    api.getBranches()
      .then((raw) => {
        if (!alive) return;
        const live = (raw as Branch[]) ?? [];
        if (!Array.isArray(live) || live.length === 0) return;
        // Keep the curated prominence order (roster first, new branches after)
        const order = (slug: string) => {
          const i = BRANCH_FALLBACKS.findIndex((f) => f.slug === slug);
          return i === -1 ? 999 : i;
        };
        setBranches([...live]
          .sort((a, b) => order(a.slug) - order(b.slug) || a.slug.localeCompare(b.slug))
          .map((b) => ({
            label: branchShortName(b),
            href: `/branches/${b.slug}`,
            phone: b.contact?.phone || undefined,
            comingSoon: b.status === "coming_soon",
          })));
      })
      .catch(() => { /* keep the fallback nav */ });
    return () => { alive = false; };
  }, []);
  const [cartCount, setCartCount] = useState(0);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const pathname = usePathname();
  const forest = pathname === "/forest-school";
  const navLinks: NavLink[] = slideOverLinks;

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  useEffect(() => {
    const updateCartCount = () => {
      const items = loadCart();
      setCartCount(items.reduce((sum, item) => sum + item.quantity, 0));
    };

    updateCartCount();

    const eventName = getCartUpdatedEventName();
    window.addEventListener(eventName, updateCartCount);
    window.addEventListener("storage", updateCartCount);

    return () => {
      window.removeEventListener(eventName, updateCartCount);
      window.removeEventListener("storage", updateCartCount);
    };
  }, []);

  useEffect(() => {
    const syncAuth = () => setAuthUser(getAuthUser());
    syncAuth();

    const eventName = getAuthUpdatedEventName();
    window.addEventListener(eventName, syncAuth);
    window.addEventListener("storage", syncAuth);
    return () => {
      window.removeEventListener(eventName, syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════════
          TRUST BAR — scrolls with page (not sticky)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden border-b border-[rgba(90,74,66,0.06)] bg-[#fdf8f5]">
        {/* Edge doodles — desktop only (matches the desktop header breakpoint) */}
        <Doodle kind="leaf" className="left-4  top-1/2 h-7 w-7 -translate-y-1/2 hidden lg:block opacity-40" />
        <Doodle kind="pink-flower" className="right-4 top-1/2 h-6 w-6 -translate-y-1/2 hidden lg:block opacity-40" />

        {/* Badge row: scrolls horizontally below 1024px (mobile + tablet) because
            the 5 badges + separators need ~900-1000px to lay out without crowding.
            At lg+ (≥1024px) we have enough width to centre them with separators. */}
        <div className="flex items-center gap-2 overflow-x-auto px-10 py-2.5 scrollbar-none lg:justify-center lg:gap-0 lg:overflow-visible lg:px-16 xl:px-24">
          {trustBadges.map((badge, i) => (
            <div key={badge.line1} className="flex shrink-0 items-center">
              <BadgeItem badge={badge} />
              {i < trustBadges.length - 1 && (
                <span
                  className="mx-4 hidden h-6 w-px flex-shrink-0 bg-[rgba(90,74,66,0.1)] lg:block"
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
      <header className={`site-header${forest ? " theme-forest" : ""} sticky top-0 z-50 overflow-visible border-b border-[var(--hdr-border)] bg-[var(--hdr-bg)] shadow-[0_2px_12px_var(--hdr-shadow)] backdrop-blur-sm`}>
        <div className="container-site">

          {/* DESKTOP LAYOUT — 2-row grid, only at ≥1024px.
              At smaller widths the content inside (380px logo + 384px search + 3
              branch phones + email + 4 social icons + login text + cart + menu)
              needs ~1100px to lay out without overflow, so we switch to the
              simpler mobile/tablet layout below 1024px. */}
          <div className="hidden lg:grid grid-cols-[auto_1fr_auto] grid-rows-2 gap-0 py-2.5">

            {/* LEFT: Logo (spans 2 rows, bleeds to fill full header height) */}
            <div className="row-span-2 flex items-center pr-2">
              <Link href="/" className="flex shrink-0 items-center">
                <div className="relative -my-8 h-[200px] w-[380px]">
                  <Image
                    src="/home/logo_new.png"
                    alt="Blue Nest Montessori logo"
                    fill
                    className="object-contain drop-shadow-[0_4px_10px_rgba(90,74,66,0.14)]"
                    sizes="380px"
                    priority
                    fetchPriority="high"                  />
                </div>
              </Link>
            </div>

            {/* ROW 1: Search + Action Icons */}
            <div className="col-span-2 flex items-center justify-between gap-4 px-4 py-2">
              {/* Search bar */}
              <SiteSearch className="hidden md:flex flex-1 max-w-sm" />

              {/* Social + Action icons */}
              <div className="flex items-center gap-0.5">
                {[
                  { label: "Facebook",  href: "https://www.facebook.com/BlueNestMontessorischool", Icon: () => <FacebookIcon className="h-[18px] w-[18px]" /> },
                  { label: "Instagram", href: "https://www.instagram.com/bluenest_montessori",     Icon: () => <InstagramIcon className="h-[18px] w-[18px]" /> },
                  { label: "Yell",      href: "https://www.yell.com/biz/blue-nest-montessori-school-harrow-341644/", Icon: () => <YellIcon className="h-[18px] w-[18px]" /> },
                ].map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[rgba(90,74,66,0.85)] transition hover:bg-white/60 hover:text-[var(--ink)]"
                  >
                    <Icon />
                  </a>
                ))}

                <span className="mx-2.5 h-5 w-px bg-[rgba(90,74,66,0.18)]" aria-hidden="true" />

                {/* Parents Login */}
                <Link
                  href={authUser ? "/account" : "/login?next=/account"}
                  className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[var(--ink)] transition hover:bg-white/60 md:flex"
                >
                  <CircleUserRound className="h-4 w-4 text-[var(--hdr-accent-2)]" />
                  <span className="text-xs font-semibold">{authUser ? (authUser.first_name || "My Account") : "Parents Log In"}</span>
                </Link>
                {/* Cart */}
                <Link
                  href="/cart"
                  aria-label={cartCount > 0 ? `Open cart, ${cartCount} item${cartCount === 1 ? "" : "s"}` : "Open cart"}
                  className="relative ml-1 flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/60"
                >
                  <Handbag className="h-5 w-5 text-[var(--hdr-accent)]" />
                  {cartCount > 0 && (
                    <span aria-hidden="true" className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-white px-0.5 text-[10px] font-bold text-[var(--hdr-accent)]">
                      {cartCount}
                    </span>
                  )}
                </Link>
              </div>
            </div>

            {/* ROW 2: Contact Details + Menu Button */}
            <div className="col-span-2 flex items-center justify-between gap-3 border-t border-[var(--hdr-border-soft)] px-4 py-1.5">
              {/* Contact details */}
              <div className="flex items-center">
                {branches.filter((b) => b.phone && !b.comingSoon).slice(0, 4).map((branch, i, shown) => (
                  <div key={branch.label} className="flex items-center">
                    <div className="flex items-center gap-1.5 px-3 text-[var(--ink)] first:pl-0">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-[var(--hdr-accent)]" />
                      <div className="leading-tight">
                        <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.1em] text-[var(--hdr-accent-2)]">
                          {branch.label}
                        </p>
                        <p className="text-[0.82rem] font-semibold">{branch.phone}</p>
                      </div>
                    </div>
                    {i < shown.length - 1 && (
                      <span className="h-5 w-px bg-[rgba(90,74,66,0.12)]" aria-hidden="true" />
                    )}
                  </div>
                ))}

                <span className="mx-3 h-5 w-px bg-[rgba(90,74,66,0.12)]" aria-hidden="true" />

                <div className="flex items-center gap-1.5 text-[var(--ink)]">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-[var(--hdr-accent)]" />
                  <span className="text-[0.82rem] font-semibold">manager@bluenest.uk</span>
                </div>
              </div>

              {/* Menu button */}
              <button
                type="button"
                className="inline-flex h-12 w-12 shrink-0 flex-col items-center justify-center border-2 border-[var(--ink)] bg-white text-[var(--ink)] transition hover:bg-[var(--hdr-hover)]"
                onClick={() => setMenuOpen(true)}
                aria-label="Open navigation menu"
              >
                <Menu className="mb-0.5 h-4 w-4" />
                <span className="text-[0.6rem] font-extrabold leading-none tracking-[0.18em]">
                  MENU
                </span>
              </button>
            </div>
          </div>

          {/* MOBILE + TABLET LAYOUT — single row, <1024px.
              Search and account text live inside the slide-over MENU instead of
              the bar itself so we never have to compete with the logo for room.
              Logo scales up on larger phones / tablets so it doesn't look lost
              at 768-1023px viewports. */}
          <div className="lg:hidden flex items-center justify-between gap-2 py-2 px-2 sm:px-4 md:px-6">
            <Link href="/" className="flex shrink-0 items-center min-w-0">
              {/* Logo scales: 178px on phone → 195px md → 240px just under desktop.
                  Negative margin grows with size so the logo bleeds evenly into
                  the bar (≈40px layout footprint) and stays vertically centred
                  at every breakpoint. */}
              <div className="relative -my-[28px] h-[96px] w-[180px] min-[390px]:-my-[33px] min-[390px]:h-[112px] min-[390px]:w-[210px] sm:-my-[38px] sm:h-[126px] sm:w-[234px] md:-my-[42px] md:h-[138px] md:w-[256px]">
                <Image
                  src="/home/logo_new.png"
                  alt="Blue Nest Montessori logo"
                  fill
                  className="object-contain object-left drop-shadow-[0_4px_10px_rgba(90,74,66,0.14)]"
                  sizes="(min-width: 768px) 256px, (min-width: 640px) 234px, (min-width: 390px) 210px, 180px"
                  priority
                  fetchPriority="high"                />
              </div>
            </Link>

            {/* Search + account text are accessible via MENU at <1024px so the
                bar stays free of overflow risk on any phone or tablet width. */}
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
              <Link
                href={authUser ? "/account" : "/login?next=/account"}
                aria-label="Open account"
                className="flex h-11 w-11 items-center justify-center text-[var(--hdr-accent-2)] transition hover:opacity-70"
              >
                <CircleUserRound className="h-6 w-6" />
              </Link>
              <Link
                href="/cart"
                aria-label={cartCount > 0 ? `Open cart, ${cartCount} item${cartCount === 1 ? "" : "s"}` : "Open cart"}
                className="relative flex h-11 w-11 items-center justify-center text-[var(--hdr-accent)] transition hover:opacity-70"
              >
                <Handbag className="h-6 w-6" />
                {cartCount > 0 && (
                  <span aria-hidden="true" className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-white px-0.5 text-[10px] font-bold text-[var(--hdr-accent)]">
                    {cartCount}
                  </span>
                )}
              </Link>
              {/* Menu button */}
              <button
                type="button"
                className="inline-flex h-12 w-12 shrink-0 flex-col items-center justify-center border-2 border-[var(--ink)] bg-white text-[var(--ink)] transition hover:bg-[var(--hdr-hover)]"
                onClick={() => setMenuOpen(true)}
                aria-label="Open navigation menu"
              >
                <Menu className="mb-0.5 h-6 w-6" />
                <span className="text-[0.6rem] font-extrabold leading-none tracking-[0.18em]">
                  MENU
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════
          FULL-SCREEN TWO-COLUMN NAV MENU
      ══════════════════════════════════════════════════════════════════════ */}
      {menuOpen && (
        <div className="fixed inset-0 z-[90] flex">

          {/* LEFT — teal brand panel (click anywhere to close) */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setMenuOpen(false)}
            onKeyDown={(e) => e.key === "Escape" && setMenuOpen(false)}
            aria-label="Close navigation menu"
            className="relative flex w-[38%] shrink-0 flex-col overflow-hidden bg-gradient-to-b from-[#7fd8d2] to-[#4db8b2] px-4 pb-7 text-white sm:px-7 sm:pb-9"
            style={{ paddingTop: "max(1.75rem, env(safe-area-inset-top))" }}
          >
            {/* Logo — icon-only mark (the full horizontal wordmark overflows
                this narrow column on small phones). Square, centred, capped. */}
            <div className="relative mx-auto aspect-square w-16 max-w-[72px] shrink-0 sm:w-20">
              <Image
                src="/home/logo-mark.webp"
                alt="Blue Nest Montessori"
                fill
                className="object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.18)]"
                sizes="80px"
              />
            </div>

            <div className="mt-5 h-px bg-white/20" />

            {/* Branches */}
            <p className="mt-5 text-[0.58rem] font-bold uppercase tracking-[0.22em] text-white/65">
              Our Branches
            </p>
            <div className="mt-3 flex flex-1 flex-col gap-2.5">
              {branches.map((branch) => (
                <Link
                  key={branch.href}
                  href={branch.href}
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
                  className="flex flex-col rounded-xl bg-white/10 px-3 py-2.5 transition hover:bg-white/22"
                >
                  <span className="text-[0.78rem] font-extrabold leading-tight">
                    {branch.label}
                    {branch.comingSoon && (
                      <span className="ml-2 text-[0.6rem] font-bold text-white/55">Soon</span>
                    )}
                  </span>
                  {branch.phone && (
                    <span className="mt-0.5 flex items-center gap-1 text-[0.65rem] text-white/65">
                      <Phone className="h-3 w-3 shrink-0" />
                      {branch.phone}
                    </span>
                  )}
                </Link>
              ))}
            </div>

            <div className="mt-5 h-px bg-white/20" />

            {/* Email */}
            <div className="mt-4 flex items-center gap-2 text-[0.7rem] text-white/75">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">manager@bluenest.uk</span>
              <span className="sm:hidden">manager@<br />bluenest.uk</span>
            </div>

            {/* Social icons */}
            <div className="mt-3 flex items-center gap-2">
              {[
                { label: "Facebook",  href: "https://www.facebook.com/BlueNestMontessorischool", Icon: () => <FacebookIcon className="h-4 w-4" /> },
                { label: "Instagram", href: "https://www.instagram.com/bluenest_montessori",     Icon: () => <InstagramIcon className="h-4 w-4" /> },
                { label: "Yell",      href: "https://www.yell.com/biz/blue-nest-montessori-school-harrow-341644/", Icon: () => <YellIcon className="h-4 w-4" /> },
              ].map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  onClick={(e) => e.stopPropagation()}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/30"
                >
                  <Icon />
                </a>
              ))}
            </div>

            {/* Decorative doodles */}
            <Doodle kind="leaf" className="absolute bottom-16 left-2 h-8 w-8 opacity-20 pointer-events-none" />
            <Doodle kind="pink-flower" className="absolute bottom-5 right-3 h-7 w-7 opacity-20 pointer-events-none" />
          </div>

          {/* RIGHT — nav links panel */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-1 flex-col overflow-hidden bg-white"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close navigation menu"
              className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-[#7fd8d2] text-white transition hover:bg-[#6ab5ad] sm:right-6 sm:top-6"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Nav links — spread evenly to fill full panel height */}
            <nav
              className="flex flex-1 flex-col justify-evenly px-6 py-8 sm:px-10"
              aria-label="Main navigation"
            >
              {navLinks.map((link) => {
                const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <div key={link.href} className="flex flex-col">
                    {link.children ? (
                      <>
                        <Link
                          href={link.href}
                          onClick={() => setMenuOpen(false)}
                          className={`block py-1.5 text-[0.8rem] font-extrabold uppercase tracking-[0.04em] transition hover:text-[#4ec0c3] sm:text-[0.85rem] ${
                            isActive ? "text-[#4ec0c3]" : "text-[var(--ink)]"
                          }`}
                        >
                          {link.label}
                        </Link>
                        <div className="mb-1 flex flex-wrap gap-x-4 gap-y-1 pl-3">
                          {link.children.map((child) => {
                            const isChildActive = pathname === child.href;
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                onClick={() => setMenuOpen(false)}
                                className={`text-[0.63rem] font-bold uppercase tracking-[0.06em] transition hover:text-[#4ec0c3] sm:text-[0.68rem] ${
                                  isChildActive ? "text-[#4ec0c3] underline underline-offset-2" : "text-[#cf7d9c]"
                                }`}
                              >
                                {child.label}
                              </Link>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <Link
                        href={link.href}
                        onClick={() => setMenuOpen(false)}
                        className={`block py-1.5 text-[0.8rem] font-extrabold uppercase tracking-[0.04em] transition hover:text-[#4ec0c3] sm:text-[0.85rem] ${
                          isActive ? "text-[#4ec0c3]" : "text-[var(--ink)]"
                        }`}
                      >
                        {link.label}
                      </Link>
                    )}
                    <div className="h-px bg-[#f9d4e4]" />
                  </div>
                );
              })}
            </nav>
          </div>

        </div>
      )}
    </>
  );
}
