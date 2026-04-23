"use client";

import {
  CircleUserRound,
  Camera,
  CircleDashed,
  Handbag,
  Mail,
  Menu,
  MessageCircle,
  Mountain,
  Phone,
  Search,
  Smartphone,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Why Montessori", href: "/why-montessori" },
  { label: "Forest School", href: "/forest-school" },
  { label: "Admission", href: "/admission" },
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

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      {/* ── Sticky shell — overflow visible so logo bleeds into hero ── */}
      <header className="sticky top-0 z-50 overflow-visible border-b border-white/60 bg-[rgba(255,253,249,0.95)] backdrop-blur">

        {/* ── Blush top strip (compact) ───────────────────────────── */}
        <div className="bg-[#f6dce5]">
          <div className="container-site flex items-center justify-between gap-3 py-1.5">

            {/* Search — narrow & short */}
            <div className="hidden flex-1 items-center justify-center md:flex">
              <div className="flex w-full max-w-[220px] items-center overflow-hidden rounded-full bg-white/85 shadow-[0_4px_12px_rgba(90,74,66,0.06)]">
                <input
                  type="text"
                  placeholder="Search..."
                  aria-label="Search"
                  className="h-8 flex-1 bg-transparent px-4 text-sm text-[var(--ink)] outline-none placeholder:text-[rgba(90,74,66,0.45)]"
                />
                <span className="flex h-8 w-9 items-center justify-center bg-[#7fd8d2] text-white">
                  <Search className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>

            {/* Icons + login + cart */}
            <div className="ml-auto flex items-center gap-3 text-[var(--ink)]">
              <CircleDashed className="h-4 w-4" />
              <Camera className="h-4 w-4" />
              <MessageCircle className="h-4 w-4" />
              <Mountain className="h-4 w-4" />
              <div className="hidden items-center gap-1.5 md:flex">
                <CircleUserRound className="h-4 w-4 text-[#7fd8d2]" />
                <span className="text-xs font-medium">Parents Log In</span>
              </div>
              <div className="relative">
                <Handbag className="h-4 w-4 text-[#7fd8d2]" />
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#7fd8d2]">
                  0
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Logo + contacts row ─────────────────────────────────── */}
        <div className="container-site relative py-1">
          <div className="flex items-center justify-between gap-3">

            {/* Logo — large, bleeds below header into hero */}
            <Link href="/" className="relative flex shrink-0 items-center">
              <div className="relative -mb-14 -mt-3 h-36 w-36 sm:-mb-16 sm:h-44 sm:w-44">
                <Image
                  src="/home/logo.png"
                  alt="Blue Nest Montessori logo"
                  fill
                  className="object-contain drop-shadow-[0_8px_16px_rgba(90,74,66,0.18)]"
                  sizes="176px"
                  priority
                />
              </div>
            </Link>

            {/* Branch contacts + MENU */}
            <div className="flex flex-1 items-center justify-end gap-3 overflow-x-auto pb-1">
              {branches.slice(0, 3).map((branch) => (
                <div key={branch.label} className="flex min-w-fit items-center gap-1.5 text-[var(--ink)]">
                  <Phone className="h-5 w-5 shrink-0 text-[#7fd8d2]" />
                  <div className="leading-tight">
                    <p className="text-xs font-extrabold underline underline-offset-2">{branch.label}</p>
                    <p className="text-sm">{branch.phone}</p>
                  </div>
                </div>
              ))}
              <div className="hidden min-w-fit items-center gap-1.5 text-[var(--ink)] lg:flex">
                <Smartphone className="h-5 w-5 shrink-0 text-[#7fd8d2]" />
                <span className="text-sm">07400 430630</span>
              </div>
              <div className="hidden min-w-fit items-center gap-1.5 text-[var(--ink)] lg:flex">
                <Mail className="h-5 w-5 shrink-0 text-[#7fd8d2]" />
                <span className="text-sm">manager@bluenest.uk</span>
              </div>

              {/* MENU button — proportional to reduced row */}
              <button
                type="button"
                className="ml-1 inline-flex h-14 w-14 shrink-0 flex-col items-center justify-center border-2 border-[var(--ink)] bg-white text-[var(--ink)] transition hover:bg-[#f8f1ec]"
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

      {/* ── Slide-over nav ─────────────────────────────────────────── */}
      {menuOpen && (
        <div className="fixed inset-0 z-[90]">
          <button
            type="button"
            className="absolute inset-0 bg-[#7fd8d2]/78 backdrop-blur-[2px]"
            aria-label="Close navigation menu"
            onClick={() => setMenuOpen(false)}
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-[42rem] flex-col overflow-y-auto rounded-l-[2rem] bg-white shadow-[-20px_0_60px_rgba(90,74,66,0.18)]">
            <div className="flex items-start justify-between px-10 pb-4 pt-8">
              <div className="mx-auto flex flex-col items-center text-center">
                <div className="relative h-48 w-48">
                  <Image src="/home/logo.png" alt="Blue Nest Montessori logo" fill className="object-contain" sizes="192px" />
                </div>
                <div className="-mt-3">
                  <p className="font-heading text-[3.4rem] leading-none text-[#4ec0c3]">Blue Nest</p>
                  <p className="text-[1.1rem] font-bold uppercase tracking-[0.14em] text-[#7f604d]">
                    Montessori School
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close navigation menu"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7fd8d2] text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="px-12">
              <div className="my-4 h-px bg-[#f1a8ca]" />
              <div className="absolute left-[-8rem] top-[26rem] hidden lg:block">
                <div className="relative h-72 w-72 overflow-hidden rounded-full border-[6px] border-white shadow-[0_18px_45px_rgba(90,74,66,0.2)]">
                  <Image
                    src="/home/classroom-collage.png"
                    alt="Children at Blue Nest Montessori"
                    fill
                    className="object-cover"
                    sizes="288px"
                  />
                </div>
              </div>

              <nav className="relative z-10 mt-6 space-y-1 pb-10">
                {navLinks.map((link) => (
                  <div key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="block py-5 text-[1.05rem] font-extrabold uppercase tracking-[0.01em] text-[var(--ink)] transition hover:text-[#4ec0c3]"
                    >
                      {link.label}
                    </Link>
                    <div className="h-px bg-[#f1a8ca]" />
                  </div>
                ))}
              </nav>

              <div className="pb-10">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#a97ecf]">Our Branches</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {branches.map((branch) => (
                    <Link
                      key={branch.href}
                      href={branch.href}
                      onClick={() => setMenuOpen(false)}
                      className="rounded-[1.2rem] border border-[rgba(90,74,66,0.08)] px-4 py-3 text-sm font-bold text-[var(--ink)] transition hover:border-[#7fd8d2] hover:bg-[#f8fffe]"
                    >
                      <span>{branch.label}</span>
                      {branch.comingSoon && <span className="ml-2 text-[#cf7d9c]">Soon</span>}
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
