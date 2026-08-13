"use client";

// PortalShell — THE single parent-portal layout: header, compact left nav,
// child switcher and content area. Every parent page renders inside this
// shell (much simpler than the admin CMS; mobile-first because parents are
// mostly on phones). One shell — no per-page layout variants.

import Image from "next/image";
import Link from "next/link";
import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Baby, CreditCard, LayoutDashboard, LogOut, Menu, UserCircle, X } from "lucide-react";
import { api } from "@/lib/api";
import { clearAuthSession, getAccessToken, getAuthUser } from "@/lib/auth";
import type { Child } from "@/types";

type PortalContextValue = {
  children: Child[];
  loading: boolean;
  error: string | null;
};

const PortalContext = createContext<PortalContextValue>({ children: [], loading: true, error: null });
export const usePortal = () => useContext(PortalContext);

export default function PortalShell({ children: content }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [kids, setKids] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const firstName = getAuthUser()?.first_name ?? "";

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { router.replace(`/login?next=${encodeURIComponent(pathname || "/portal")}`); return; }
    api.portalGetChildren(token)
      .then((cs) => { setKids(cs ?? []); setError(null); })
      .catch((e) => setError(e instanceof Error ? e.message : "We could not load your family right now."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = () => { clearAuthSession(); router.replace("/login"); };

  const nav = [
    { label: "Dashboard", href: "/portal", icon: LayoutDashboard, exact: true },
    ...kids.map((c) => ({ label: c.first_name, href: `/portal/children/${c.id}`, icon: Baby, exact: false })),
    { label: "Payments & Orders", href: "/portal/payments", icon: CreditCard, exact: false },
    { label: "My Profile", href: "/portal/profile", icon: UserCircle, exact: false },
  ];
  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname?.startsWith(href + "/");

  const navList = (
    <nav className="space-y-1">
      {nav.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          onClick={() => setNavOpen(false)}
          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
            isActive(n.href, n.exact) ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <n.icon className="h-4 w-4 shrink-0" />
          {n.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <PortalContext.Provider value={{ children: kids, loading, error }}>
      <div className="min-h-screen bg-[#f6f8fb]">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setNavOpen(true)} aria-label="Open menu" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:hidden">
                <Menu className="h-5 w-5" />
              </button>
              <Link href="/portal" className="flex items-center gap-2.5">
                <Image src="/logo/bluenest-logo.png" alt="Blue Nest Montessori" width={92} height={50} style={{ width: 92, height: "auto" }} />
                <span className="hidden text-[0.65rem] font-bold uppercase tracking-[0.2em] text-slate-400 sm:block">Parent Portal</span>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              {firstName && <span className="hidden text-sm text-slate-500 sm:block">Hi, {firstName}</span>}
              <button type="button" onClick={signOut} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
                <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
          {/* Desktop nav */}
          <aside className="hidden w-52 shrink-0 md:block">
            <div className="sticky top-[4.2rem] rounded-2xl border border-slate-200 bg-white p-3">{navList}</div>
          </aside>

          {/* Mobile drawer */}
          {navOpen && (
            <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
              <div className="absolute inset-0 bg-slate-900/40" onClick={() => setNavOpen(false)} />
              <div className="absolute inset-y-0 left-0 w-64 bg-white p-4 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Parent Portal</span>
                  <button type="button" onClick={() => setNavOpen(false)} aria-label="Close menu" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
                </div>
                {navList}
              </div>
            </div>
          )}

          <main className="min-w-0 flex-1">{content}</main>
        </div>
      </div>
    </PortalContext.Provider>
  );
}
