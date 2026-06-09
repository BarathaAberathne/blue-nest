import { Trees, MapPin, ArrowUpRight } from "lucide-react";

const QUICK_LINKS = [
  { label: "About the Park", href: "#about" },
  { label: "Park Life", href: "#features" },
  { label: "Events", href: "#events" },
  { label: "Gallery", href: "#gallery" },
  { label: "Plan Your Visit", href: "#info" },
  { label: "Get Involved", href: "#volunteer" },
];

export default function SiteFooter() {
  return (
    <footer className="bg-[#1d3a26] text-[#dde6d4]">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <Trees className="h-6 w-6 text-[#a9c79a]" strokeWidth={1.6} />
              <span className="font-heading text-xl text-white">Headstone Green Park</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#b9c8ad]">
              A community green space in the heart of Harrow where nature, wellbeing and
              local people come together.
            </p>
            <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-[#b9c8ad]">
              <MapPin className="h-4 w-4" /> Harrow, London
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9bb88c]">
              Explore
            </h3>
            <ul className="mt-4 space-y-2.5">
              {QUICK_LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="text-sm text-[#cdd9c2] transition-colors hover:text-white">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Part of Blue Nest */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9bb88c]">
              Community Project
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-[#b9c8ad]">
              Cared for as part of the charity work of Blue Nest Montessori School.
            </p>
            <a
              href="https://bluenest.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/25 px-4 py-2 text-xs font-semibold tracking-wide text-white transition-colors hover:bg-white hover:text-[#1d3a26]"
            >
              Visit Blue Nest Montessori <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-[#9bb88c] sm:flex-row">
          <p>© {new Date().getFullYear()} Headstone Green Park, Harrow, London.</p>
          <p>Cared for by the community 🌳</p>
        </div>
      </div>
    </footer>
  );
}
