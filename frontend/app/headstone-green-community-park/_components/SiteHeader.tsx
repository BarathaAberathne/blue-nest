"use client";

import { useState } from "react";
import Image from "next/image";
import { Menu, X, ArrowUpRight } from "lucide-react";

const NAV = [
  { label: "About", href: "#about" },
  { label: "Park Life", href: "#features" },
  { label: "Events", href: "#events" },
  { label: "Gallery", href: "#gallery" },
  { label: "Visit", href: "#info" },
];

const BLUENEST_URL = "https://bluenest.uk";

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#dfe3d4] bg-[#f6f5ee]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-8">
        <a href="#home" className="flex items-center" aria-label="Headstone Green Park — home">
          <Image
            src="/site-images/charity/headstone-green-logo.png"
            alt="Headstone Green Park"
            width={180}
            height={120}
            priority
            className="h-12 w-auto object-contain"
          />
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-9 md:flex">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-sm tracking-wide text-[#3a4733] transition-colors hover:text-[#2f5d3a]"
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          {/* Small link back to the Blue Nest Montessori site */}
          <a
            href={BLUENEST_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1.5 rounded-full border border-[#2f5d3a]/30 px-4 py-1.5 text-xs font-semibold tracking-wide text-[#2f5d3a] transition-colors hover:bg-[#2f5d3a] hover:text-white sm:inline-flex"
          >
            Blue Nest Montessori <ArrowUpRight className="h-3.5 w-3.5" />
          </a>

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#2f5d3a] transition-colors hover:bg-[#2f5d3a]/10 md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-[#dfe3d4] bg-[#f6f5ee] md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-5 py-2 sm:px-8">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="border-b border-[#e4e7da] py-3 text-sm tracking-wide text-[#3a4733] last:border-0"
              >
                {n.label}
              </a>
            ))}
            <a
              href={BLUENEST_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-[#2f5d3a]/30 px-4 py-2 text-xs font-semibold tracking-wide text-[#2f5d3a]"
            >
              Blue Nest Montessori <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
