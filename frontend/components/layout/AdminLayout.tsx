"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Activity,
  BookOpen,
  ClipboardList,
  ExternalLink,
  Inbox,
  LayoutDashboard,
  Library,
  LogOut,
  Package,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Users,
} from "lucide-react";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { clearAuthSession } from "@/lib/auth";
import NotificationBell from "@/components/admin/NotificationBell";

// Sidebar is grouped into labelled sections so related tools sit together. The
// SUPPLIES group makes the procurement flow self-evident:
// Requests (staff demand) → Purchase Orders (supplier carts) → Catalogue.
type NavItem = { label: string; href: string; icon: typeof LayoutDashboard };
type NavSection = { heading: string | null; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    heading: null,
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Inquiries", href: "/admin/inquiries", icon: Inbox },
    ],
  },
  {
    heading: "Store",
    items: [
      { label: "Orders",     href: "/admin/orders",     icon: ShoppingCart },
      { label: "Products",   href: "/admin/products",   icon: Package },
      { label: "Categories", href: "/admin/categories", icon: Tag },
    ],
  },
  {
    heading: "Supplies",
    items: [
      { label: "Requests",        href: "/admin/order-requests", icon: ClipboardList },
      { label: "Purchase Orders", href: "/admin/purchase-carts", icon: ShoppingBag },
      { label: "Catalogue",       href: "/admin/catalogue",      icon: Library },
    ],
  },
  {
    heading: "Content",
    items: [{ label: "Blog", href: "/admin/blog", icon: BookOpen }],
  },
  {
    heading: "System",
    items: [
      { label: "Activity", href: "/admin/activity", icon: Activity },
      { label: "Users",    href: "/admin/users",    icon: Users },
    ],
  },
];

// Staff (practitioners) get a restricted portal — only their own supply requests.
const STAFF_SECTIONS: NavSection[] = [
  { heading: null, items: [{ label: "My Supply Requests", href: "/admin/my-requests", icon: ClipboardList }] },
];

const allItems = (sections: NavSection[]) => sections.flatMap((s) => s.items);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, isAuthenticated, user, hasAnyRole, ensureAuthenticated } = useAuthGuard("/admin/login");
  const isManagement = hasAnyRole(["super_admin", "admin", "branch_manager"]);
  const isStaff = user?.role === "staff";
  const allowed = isManagement || isStaff;

  // Management sees the full back-office (Users is super-admin only); staff get a
  // restricted portal with only their own supply requests.
  const navSections: NavSection[] = isManagement
    ? user?.role === "super_admin"
      ? NAV_SECTIONS
      : NAV_SECTIONS.map((s) => ({
          ...s,
          items: s.items.filter((item) => item.href !== "/admin/users"),
        })).filter((s) => s.items.length > 0)
    : STAFF_SECTIONS;

  useEffect(() => {
    if (!ready) return;
    const nextPath = pathname || "/admin/dashboard";
    if (!ensureAuthenticated(nextPath)) return;
    if (!allowed) {
      router.push("/account");
      return;
    }
    // Confine staff to their own supply-requests area — they can't reach
    // management pages even by typing the URL.
    if (isStaff && !pathname.startsWith("/admin/my-requests")) {
      router.push("/admin/my-requests");
    }
  }, [ensureAuthenticated, allowed, isStaff, pathname, ready, router]);

  if (!ready || !isAuthenticated || !allowed) return null;

  const currentPage =
    [...allItems(NAV_SECTIONS), ...allItems(STAFF_SECTIONS)].find((n) =>
      pathname.startsWith(n.href),
    )?.label ?? "Admin";

  const initials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() ||
      user.email[0].toUpperCase()
    : "A";

  const handleLogout = () => {
    clearAuthSession();
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="w-60 shrink-0 bg-slate-900 flex flex-col">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white text-xs font-bold shrink-0">
              BN
            </span>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm leading-none truncate">Blue Nest</p>
              <p className="text-[0.65rem] text-slate-500 mt-0.5">{isStaff ? "Staff Portal" : "Admin Panel"}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
          {navSections.map((section, i) => (
            <div key={section.heading ?? `section-${i}`} className="space-y-0.5">
              {section.heading && (
                <p className="px-3 pb-1 text-[0.6rem] font-semibold uppercase tracking-widest text-slate-500">
                  {section.heading}
                </p>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-teal-600 text-white"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t border-slate-800 space-y-0.5">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View Site
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-auto">
        {/* Topbar */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">
              {isStaff ? "Staff" : "Admin"}
            </p>
            <p className="text-lg font-bold text-slate-900 leading-tight">{currentPage}</p>
          </div>
          <div className="flex items-center gap-3">
            {isManagement && <NotificationBell />}
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-700">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-slate-400 capitalize">
                {user?.role?.replace("_", " ")}
              </p>
            </div>
            <div className="h-9 w-9 rounded-full bg-teal-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {initials}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
