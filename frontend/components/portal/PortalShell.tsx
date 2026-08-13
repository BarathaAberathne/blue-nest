"use client";

// PortalShell — THE single parent-portal layout, styled in the SAME visual
// language as the admin CMS: it reuses the `.admin-shell` design tokens
// (--adm-* palette, card/nav styling) so parents get a familiar, consistent
// product. Fixed left navbar + top bar with the clickable profile avatar
// (→ /portal/profile), mobile drawer for phones. One shell, every parent page.

import Image from "next/image";
import Link from "next/link";
import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Baby, CreditCard, LayoutDashboard, LogOut, Menu, UserCircle, X } from "lucide-react";
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
  const user = getAuthUser();
  const initials = `${user?.first_name?.[0] ?? ""}${user?.last_name?.[0] ?? ""}`.toUpperCase() || "P";

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

  const mainNav = [
    { label: "Dashboard", href: "/portal", icon: LayoutDashboard, exact: true },
    { label: "Payments & Orders", href: "/portal/payments", icon: CreditCard, exact: false },
    { label: "My Profile", href: "/portal/profile", icon: UserCircle, exact: false },
  ];
  const childNav = kids.map((c) => ({ label: c.first_name, href: `/portal/children/${c.id}`, icon: Baby, exact: false }));
  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname?.startsWith(href + "/");

  const currentPage =
    [...mainNav, ...childNav]
      .filter((n) => isActive(n.href, n.exact))
      .sort((a, b) => b.href.length - a.href.length)[0]?.label ?? "Parent Portal";

  const item = (n: { label: string; href: string; icon: typeof LayoutDashboard; exact: boolean }) => (
    <Link
      key={n.href}
      href={n.href}
      onClick={() => setNavOpen(false)}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
        isActive(n.href, n.exact)
          ? "bg-[var(--adm-accent-tint)] text-[var(--adm-accent)]"
          : "text-[var(--adm-ink-2)] hover:bg-[var(--adm-card-2)] hover:text-[var(--adm-ink)]"
      }`}
    >
      <n.icon className="h-[18px] w-[18px] shrink-0" />
      <span>{n.label}</span>
    </Link>
  );

  const navContent = (
    <>
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5">
        <Image src="/logo/bluenest-logo.png" alt="Blue Nest Montessori" width={44} height={24} style={{ width: 44, height: "auto" }} />
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold leading-none text-[var(--adm-ink)]">Blue Nest Montessori</p>
          <p className="mt-1 text-[0.65rem] text-[var(--adm-muted)]">Parent Portal</p>
        </div>
      </div>

      <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-2">
        <div className="space-y-0.5">{item(mainNav[0])}</div>
        {childNav.length > 0 && (
          <div>
            <hr className="my-2 border-[var(--adm-line)]" />
            <p className="px-3 pb-1 text-[0.6rem] font-semibold uppercase tracking-widest text-[var(--adm-muted)]">My children</p>
            <div className="space-y-0.5">{childNav.map(item)}</div>
          </div>
        )}
        <div>
          <hr className="my-2 border-[var(--adm-line)]" />
          <div className="space-y-0.5">{mainNav.slice(1).map(item)}</div>
        </div>
      </nav>

      <div className="border-t border-[var(--adm-line)] p-3">
        <button
          type="button"
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--adm-ink-2)] transition-colors hover:bg-[var(--adm-card-2)] hover:text-[var(--adm-ink)]"
        >
          <LogOut className="h-[18px] w-[18px]" /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <PortalContext.Provider value={{ children: kids, loading, error }}>
      <div className="admin-shell min-h-screen bg-[var(--adm-bg)] font-body">
        {/* ── Sidebar (desktop) ─────────────────────────────── */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-[var(--adm-line)] bg-[var(--adm-card)] md:flex">
          {navContent}
        </aside>

        {/* ── Mobile drawer ─────────────────────────────────── */}
        {navOpen && (
          <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-slate-900/40" onClick={() => setNavOpen(false)} />
            <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-[var(--adm-card)] shadow-xl">
              <button type="button" onClick={() => setNavOpen(false)} aria-label="Close menu" className="absolute right-3 top-4 rounded-lg p-1 text-[var(--adm-muted)] hover:bg-[var(--adm-card-2)]">
                <X className="h-5 w-5" />
              </button>
              {navContent}
            </div>
          </div>
        )}

        {/* ── Main column ───────────────────────────────────── */}
        <div className="flex min-h-screen flex-col md:pl-56">
          <header
            className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--adm-line)] px-4 py-3.5 backdrop-blur-md sm:px-7"
            style={{ backgroundColor: "color-mix(in srgb, var(--adm-bg) 85%, transparent)" }}
          >
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              aria-label="Open menu"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--adm-line)] bg-[var(--adm-card)] text-[var(--adm-ink-2)] md:hidden"
            >
              <Menu className="h-[18px] w-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Go back"
              className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--adm-line)] bg-[var(--adm-card)] text-[var(--adm-ink-2)] transition-colors hover:border-[var(--adm-accent-tint-2)] hover:text-[var(--adm-ink)] md:flex"
            >
              <ArrowLeft className="h-[18px] w-[18px]" />
            </button>
            <div className="min-w-0">
              <p className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--adm-muted)]">Parent</p>
              <p className="truncate text-lg font-bold leading-tight text-[var(--adm-ink)]">{currentPage}</p>
            </div>
            <div className="ml-auto flex items-center gap-2.5">
              <Link
                href="/portal/profile"
                title="My profile"
                className="flex items-center gap-2.5 rounded-full transition-opacity hover:opacity-80"
              >
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold text-[var(--adm-ink-2)]">{user?.first_name} {user?.last_name}</p>
                  <p className="text-xs text-[var(--adm-muted)]">Parent</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[var(--adm-line)] bg-[var(--adm-accent)] text-sm font-bold text-white">
                  {initials}
                </div>
              </Link>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-8">{content}</main>
        </div>
      </div>
    </PortalContext.Provider>
  );
}
