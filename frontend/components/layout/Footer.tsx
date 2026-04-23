import Link from "next/link";
import PastelButton from "@/components/ui/PastelButton";

export default function Footer() {
  return (
    <footer className="mt-16 overflow-hidden bg-[rgba(255,253,249,0.7)]">
      <div className="soft-divider h-3 w-full opacity-70" />
      <div className="container-site py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-heading text-[2.1rem] leading-none text-[#4ec0c3]">Blue Nest Montessori</p>
            <p className="mt-3 text-sm leading-7 text-[rgba(90,74,66,0.78)]">
              Nurturing curious minds through child-led Montessori education across North West London and Hertfordshire.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-[#a97ecf]">Our Branches</h3>
            <ul className="space-y-2 text-sm">
              {[
                { label: "Harrow", href: "/branches/harrow" },
                { label: "Borehamwood", href: "/branches/borehamwood" },
                { label: "Pinner", href: "/branches/pinner" },
                { label: "Northwood — Coming Soon", href: "/branches/northwood" },
              ].map((b) => (
                <li key={b.href}>
                  <Link href={b.href} className="font-bold text-[var(--ink)] transition hover:text-[#4ec0c3]">
                    {b.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-[#ef8cab]">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              {[
                { label: "Admission", href: "/admission" },
                { label: "Why Montessori", href: "/why-montessori" },
                { label: "Forest School", href: "/forest-school" },
                { label: "Nursery Store", href: "/nursery-store" },
                { label: "Blog", href: "/blog" },
                { label: "Our Charities", href: "/our-charities" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="font-bold text-[var(--ink)] transition hover:text-[#ef8cab]">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-[#58c5c7]">Contact</h3>
            <ul className="space-y-2 text-sm text-[rgba(90,74,66,0.78)]">
              <li>info@bluenestmontessori.co.uk</li>
              <li>+44 20 0000 0000</li>
              <li className="pt-2">
                <PastelButton href="/contact" variant="mint" className="px-5 py-2 text-[1.1rem]">
                  Get in Touch
                </PastelButton>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-[rgba(90,74,66,0.08)] pt-6 text-xs text-[rgba(90,74,66,0.6)] sm:flex-row">
          <p>© {new Date().getFullYear()} Blue Nest Montessori School. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-[var(--ink)]">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[var(--ink)]">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
