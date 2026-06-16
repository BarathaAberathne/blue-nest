"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  BookOpen,
  ExternalLink,
  Inbox,
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingCart,
  Tag,
  Users,
} from "lucide-react";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { clearAuthSession } from "@/lib/auth";

const NAV_ITEMS = [
  { label: "Dashboard",  href: "/admin/dashboard",  icon: LayoutDashboard },
  { label: "Inquiries",  href: "/admin/inquiries",   icon: Inbox           },
  { label: "Orders",     href: "/admin/orders",      icon: ShoppingCart    },
  { label: "Products",   href: "/admin/products",    icon: Package         },
  { label: "Categories", href: "/admin/categories",  icon: Tag             },
  { label: "Blog",       href: "/admin/blog",        icon: BookOpen        },
  { label: "Users",      href: "/admin/users",       icon: Users           },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, isAuthenticated, user, hasAnyRole, ensureAuthenticated } = useAuthGuard();
  const isAdminLike = hasAnyRole(["admin", "branch_manager"]);
  const navItems =
    user?.role === "admin"
      ? NAV_ITEMS
      : NAV_ITEMS.filter((item) => item.href !== "/admin/users");

  useEffect(() => {
    if (!ready) return;
    const nextPath = pathname || "/admin/dashboard";
    if (!ensureAuthenticated(nextPath)) return;
    if (!isAdminLike) router.push("/account");
  }, [ensureAuthenticated, isAdminLike, pathname, ready, router]);

  if (!ready || !isAuthenticated || !isAdminLike) return null;

  const currentPage =
    NAV_ITEMS.find((n) => pathname.startsWith(n.href))?.label ?? "Admin";

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
              <p className="text-[0.65rem] text-slate-500 mt-0.5">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {navItems.map((item) => {
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
              Admin
            </p>
            <p className="text-lg font-bold text-slate-900 leading-tight">{currentPage}</p>
          </div>
          <div className="flex items-center gap-3">
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
