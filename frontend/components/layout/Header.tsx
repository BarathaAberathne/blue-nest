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

const branches = [
  { label: "Harrow", href: "/branches/harrow", phone: "020 8861 5574" },
  { label: "Borehamwood", href: "/branches/borehamwood", phone: "020 8953 1718" },
  { label: "Pinner", href: "/branches/pinner", phone: "07400 430630" },
  { label: "Northwood", href: "/branches/northwood", comingSoon: true },
];

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
        <p className="text-[0.65rem] text-[rgba(90,74,66,0.62)]">{badge.line2}</p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const pathname = usePathname();
  const isAdminLike = authUser?.role === "admin" || authUser?.role === "branch_manager";
  const navLinks: NavLink[] = isAdminLike
  ? [{ label: "Admin Dashboard", href: "/admin/dashboard" }, ...slideOverLinks]
  : slideOverLinks;

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
        {/* Edge doodles — desktop only */}
        <Doodle kind="leaf" className="left-4  top-1/2 h-7 w-7 -translate-y-1/2 hidden sm:block opacity-40" />
        <Doodle kind="pink-flower" className="right-4 top-1/2 h-6 w-6 -translate-y-1/2 hidden sm:block opacity-40" />

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
                <div className="relative -my-8 h-[200px] w-[380px]">
                  <Image
                    src="/home/logo_new.png"
                    alt="Blue Nest Montessori logo"
                    fill
                    className="object-contain drop-shadow-[0_4px_10px_rgba(90,74,66,0.14)]"
                    sizes="380px"
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
                  { label: "Facebook", Icon: () => <FacebookIcon className="h-[18px] w-[18px]" /> },
                  { label: "Instagram", Icon: () => <InstagramIcon className="h-[18px] w-[18px]" /> },
                  { label: "WhatsApp", Icon: () => <MessageCircle className="h-[18px] w-[18px]" /> },
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
                <Link
                  href={authUser ? "/account" : "/login?next=/account"}
                  className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[var(--ink)] transition hover:bg-white/60 md:flex"
                >
                  <CircleUserRound className="h-4 w-4 text-[#cf7d9c]" />
                  <span className="text-xs font-semibold">{authUser ? (authUser.first_name || "My Account") : "Parents Log In"}</span>
                </Link>
                <Link
                  href={isAdminLike ? "/admin/dashboard" : "/admin/login"}
                  className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[var(--ink)] transition hover:bg-white/60 md:flex"
                >
                  <ShieldCheck className="h-4 w-4 text-[#7fd8d2]" />
                  <span className="text-xs font-semibold">{isAdminLike ? "Admin Dashboard" : "Admin Log In"}</span>
                </Link>

                {/* Cart */}
                <Link
                  href="/cart"
                  aria-label="Open cart"
                  className="relative ml-1 flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/60"
                >
                  <Handbag className="h-5 w-5 text-[#7fd8d2]" />
                  <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-white px-0.5 text-[10px] font-bold text-[#7fd8d2]">
                    {cartCount}
                  </span>
                </Link>
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
                        <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.1em] text-[#cf7d9c]">
                          {branch.label}
                        </p>
                        <p className="text-[0.82rem] font-semibold">{branch.phone}</p>
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
                  <span className="text-[0.82rem] font-semibold">manager@bluenest.uk</span>
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
                <span className="text-[0.6rem] font-extrabold leading-none tracking-[0.18em]">
                  MENU
                </span>
              </button>
            </div>
          </div>

          {/* MOBILE LAYOUT — Single row */}
          <div className="sm:hidden flex items-center justify-between py-2 px-3">
            <Link href="/" className="flex shrink-0 items-center">
              {/* Larger logo, negative margin keeps header height unchanged */}
              <div className="relative -my-[22px] h-[84px] w-[158px]">
                <Image
                  src="/home/logo_new.png"
                  alt="Blue Nest Montessori logo"
                  fill
                  className="object-contain drop-shadow-[0_4px_10px_rgba(90,74,66,0.14)]"
                  sizes="158px"
                  priority
                />
              </div>
            </Link>

            {/* Search + admin hidden on mobile — both accessible via MENU */}
            <div className="flex items-center gap-3 ml-auto">
              <Link
                href={authUser ? "/account" : "/login?next=/account"}
                aria-label="Open account"
                className="flex h-9 w-9 items-center justify-center text-[#cf7d9c] transition hover:text-[#ba6d8a]"
              >
                <CircleUserRound className="h-5 w-5" />
              </Link>
              <Link
                href="/cart"
                aria-label="Open cart"
                className="relative flex h-9 w-9 items-center justify-center text-[#7fd8d2] transition hover:text-[#6ab5ad]"
              >
                <Handbag className="h-5 w-5" />
                <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-white px-0.5 text-[10px] font-bold text-[#7fd8d2]">
                  {cartCount}
                </span>
              </Link>
              {/* Menu button */}
              <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 flex-col items-center justify-center border-2 border-[var(--ink)] bg-white text-[var(--ink)] transition hover:bg-[#f8f1ec]"
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
            className="relative flex w-[38%] shrink-0 flex-col overflow-hidden bg-gradient-to-b from-[#7fd8d2] to-[#4db8b2] px-5 py-7 text-white sm:px-7 sm:py-9"
          >
            {/* Logo */}
            <div className="relative h-[90px] w-[170px] shrink-0 sm:h-[110px] sm:w-[210px]">
              <Image
                src="/home/logo_new.png"
                alt="Blue Nest Montessori"
                fill
                className="object-contain object-left drop-shadow-[0_4px_12px_rgba(0,0,0,0.18)]"
                sizes="210px"
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
                { label: "Facebook", Icon: () => <FacebookIcon className="h-4 w-4" /> },
                { label: "Instagram", Icon: () => <InstagramIcon className="h-4 w-4" /> },
                { label: "WhatsApp", Icon: () => <MessageCircle className="h-4 w-4" /> },
              ].map(({ label, Icon }) => (
                <button
                  key={label}
                  type="button"
                  aria-label={label}
                  onClick={(e) => e.stopPropagation()}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/30"
                >
                  <Icon />
                </button>
              ))}
            </div>

            {/* Decorative doodles */}
            <Doodle kind="leaf" className="absolute bottom-16 left-2 h-8 w-8 opacity-20 pointer-events-none" />
            <Doodle kind="pink-flower" className="absolute bottom-5 right-3 h-7 w-7 opacity-20 pointer-events-none" />
          </div>

          {/* RIGHT — nav links panel */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-1 flex-col overflow-y-auto bg-white"
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

            {/* Nav links — vertically centred */}
            <nav
              className="flex flex-1 flex-col justify-center px-6 py-6 sm:px-10"
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
