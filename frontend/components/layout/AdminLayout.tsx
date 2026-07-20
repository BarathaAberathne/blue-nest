"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Activity,
  Baby,
  BarChart3,
  BookOpen,
  Building2,
  SlidersHorizontal,
  CalendarCheck,
  ClipboardList,
  DoorOpen,
  ExternalLink,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  Library,
  LogOut,
  NotebookPen,
  Package,
  Radar,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Truck,
  CalendarClock,
  MonitorSmartphone,
  UserCheck,
  Users,
} from "lucide-react";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { clearAuthSession, isManagementRole } from "@/lib/auth";
import { usePermissions, clearPermissionsCache } from "@/lib/usePermissions";
import NotificationBell from "@/components/admin/NotificationBell";
import type { Permission, UserRole } from "@/types";

// Sidebar is grouped into labelled sections so related tools sit together. The
// PROCUREMENT group makes the purchasing flow self-evident as one connected
// process: Overview → Supply Requests → Purchase Orders → Suppliers → Catalogue
// → Analytics. Each item declares the permission needed to see it, so specialist
// roles (finance / admissions / procurement) get a tailored sidebar.
// `roles` (optional) restricts an item to specific roles regardless of permission —
// used for the Command Centre, which is director + super_admin only.
type NavItem = { label: string; href: string; icon: typeof LayoutDashboard; exact?: boolean; permission: Permission; roles?: UserRole[]; feature?: string };
type NavSection = { heading: string | null; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    heading: null,
    items: [
      { label: "Command Centre", href: "/admin/command-center", icon: Radar, permission: "dashboard.view", roles: ["super_admin", "director"], feature: "command_centre" },
      { label: "Main Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
      { label: "Enquiries", href: "/admin/inquiries", icon: Inbox, permission: "enquiries.manage" },
    ],
  },
  {
    heading: "Organisation",
    items: [
      { label: "Branches", href: "/admin/branches", icon: Building2, permission: "branches.manage" },
      { label: "Settings", href: "/admin/organisation", icon: SlidersHorizontal, permission: "dashboard.view", roles: ["super_admin"] },
    ],
  },
  {
    heading: "Nursery",
    items: [
      { label: "Children",         href: "/admin/children",   icon: Baby, permission: "children.manage" },
      { label: "Child Attendance", href: "/admin/attendance", icon: CalendarCheck, permission: "attendance.manage" },
      { label: "Daily Log",        href: "/admin/daily-log",  icon: NotebookPen, permission: "daily_logs.manage" },
      { label: "Rooms",            href: "/admin/rooms",      icon: DoorOpen, permission: "children.manage" },
    ],
  },
  {
    heading: "HR",
    items: [
      { label: "Staff",              href: "/admin/staff",              icon: Users, permission: "staff.manage" },
      { label: "Rota",               href: "/admin/rota",               icon: CalendarClock, permission: "staff.manage" },
      { label: "Attendance",         href: "/admin/staff-attendance",   icon: UserCheck, permission: "staff.manage" },
      { label: "Attendance Devices", href: "/admin/attendance-devices", icon: MonitorSmartphone, permission: "staff.manage" },
    ],
  },
  {
    heading: "Store",
    items: [
      { label: "Orders",     href: "/admin/orders",     icon: ShoppingCart, permission: "store.manage", feature: "online_store" },
      { label: "Products",   href: "/admin/products",   icon: Package, permission: "store.manage", feature: "online_store" },
      { label: "Categories", href: "/admin/categories", icon: Tag, permission: "store.manage", feature: "online_store" },
    ],
  },
  {
    heading: "Procurement",
    items: [
      { label: "Overview",        href: "/admin/procurement",            icon: LayoutGrid, exact: true, permission: "procurement.view", feature: "procurement" },
      { label: "Supply Requests", href: "/admin/order-requests",         icon: ClipboardList, permission: "procurement.view", feature: "procurement" },
      { label: "Purchase Orders", href: "/admin/purchase-carts",         icon: ShoppingBag, permission: "procurement.view", feature: "procurement" },
      { label: "Suppliers",       href: "/admin/procurement/suppliers",  icon: Truck, permission: "suppliers.manage", feature: "procurement" },
      { label: "Catalogue",       href: "/admin/catalogue",              icon: Library, permission: "procurement.manage", feature: "procurement" },
      { label: "Analytics",       href: "/admin/procurement/analytics",  icon: BarChart3, permission: "finance.view", feature: "procurement" },
    ],
  },
  {
    heading: "Content",
    items: [{ label: "Blog", href: "/admin/blog", icon: BookOpen, permission: "blog.manage" }],
  },
  {
    heading: "System",
    items: [
      { label: "Activity", href: "/admin/activity", icon: Activity, permission: "audit.view" },
      { label: "Users",    href: "/admin/users",    icon: Users, permission: "users.manage" },
    ],
  },
];

// Staff (practitioners) get a restricted portal — only their own supply requests.
const STAFF_SECTIONS: NavSection[] = [
  { heading: null, items: [{ label: "My Supply Requests", href: "/admin/my-requests", icon: ClipboardList, permission: "dashboard.view" }] },
];

const allItems = (sections: NavSection[]) => sections.flatMap((s) => s.items);

// matchesNav reports whether a nav item is active for the current path. Prefix
// matches respect path-segment boundaries so a href like "/admin/staff" matches
// "/admin/staff" and "/admin/staff/123" but NOT "/admin/staff-attendance" (a
// different section). `exact` items must match the whole path.
const matchesNav = (pathname: string, item: NavItem): boolean =>
  item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + "/");

// activeNavItem is the single nav item highlighted for a path: the longest href
// that matches (so a nested route resolves to its deepest section). One source
// of truth for the sidebar highlight, the page title and the permission gate.
const activeNavItem = (sections: NavSection[], pathname: string): NavItem | undefined =>
  allItems(sections)
    .filter((n) => matchesNav(pathname, n))
    .sort((a, b) => b.href.length - a.href.length)[0];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, isAuthenticated, user, ensureAuthenticated } = useAuthGuard("/admin/login");
  const { has, ready: permsReady, org, hasFeature } = usePermissions();
  const isStaff = user?.role === "staff";
  // Every non-customer, non-staff role reaches the management shell; the
  // per-section permission checks below then scope what each one actually sees.
  const isManagement = isManagementRole(user?.role);
  const allowed = isManagement || isStaff;

  // Each item is shown only if the user holds its permission. Until /auth/me
  // resolves we fall back to a role-based view so the nav doesn't flash empty:
  // general managers see everything (Users is super-admin only); specialists wait
  // for the real permission set. A section with no visible items is dropped.
  const canSee = (item: NavItem): boolean => {
    // Role-restricted items (Command Centre) show only for their listed roles.
    if (item.roles && !(user && item.roles.includes(user.role as UserRole))) return false;
    // Feature-gated items are hidden when the org's plan doesn't enable them.
    if (item.feature && !hasFeature(item.feature)) return false;
    if (permsReady) return has(item.permission);
    if (user?.role === "super_admin") return true;
    if (user?.role === "admin" || user?.role === "branch_manager" || user?.role === "director") return item.permission !== "users.manage";
    return item.permission === "dashboard.view";
  };

  // Per-tenant branding (falls back to the Blue Nest teal until /auth/me loads).
  const brandColor = org?.branding?.primary_color || "#0d9488";
  const orgName = org?.name || "Blue Nest";
  const brandInitials = orgName.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "BN";

  const navSections: NavSection[] = isManagement
    ? NAV_SECTIONS.map((s) => ({ ...s, items: s.items.filter(canSee) })).filter((s) => s.items.length > 0)
    : STAFF_SECTIONS;

  // Exactly one item is highlighted — the active item resolved from the visible
  // sections. Highlighting by href (not a naive per-item startsWith) is what
  // stops "/admin/staff" lighting up on "/admin/staff-attendance".
  const activeHref = activeNavItem(navSections, pathname)?.href;

  // First page the user is actually allowed to open (their landing page).
  const firstAllowedHref = navSections.flatMap((s) => s.items)[0]?.href ?? "/admin/dashboard";
  // The active nav item for the current path (drives the highlight, the page
  // title and the permission gate — one boundary-aware, longest-match resolver).
  const currentItem = activeNavItem(NAV_SECTIONS, pathname);

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
      return;
    }
    // Specialist roles: once permissions resolve, bounce off any page they lack
    // the permission for (e.g. an admissions user typing /admin/products).
    if (isManagement && permsReady && currentItem && !has(currentItem.permission)) {
      router.push(firstAllowedHref);
    }
  }, [ensureAuthenticated, allowed, isStaff, isManagement, permsReady, currentItem, firstAllowedHref, has, pathname, ready, router]);

  if (!ready || !isAuthenticated || !allowed) return null;

  const currentPage = activeNavItem([...NAV_SECTIONS, ...STAFF_SECTIONS], pathname)?.label ?? "Admin";

  const initials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() ||
      user.email[0].toUpperCase()
    : "A";

  const handleLogout = () => {
    clearAuthSession();
    clearPermissionsCache();
    router.push("/admin/login");
  };

  return (
    <div className="admin-shell min-h-screen flex bg-slate-50 font-body">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="w-60 shrink-0 bg-slate-900 flex flex-col">
        {/* Brand — per-tenant name, logo and accent colour */}
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            {org?.branding?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.branding.logo_url} alt="" className="h-8 w-8 shrink-0 rounded-lg object-contain" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white text-xs font-bold shrink-0" style={{ backgroundColor: brandColor }}>
                {brandInitials}
              </span>
            )}
            <div className="min-w-0">
              <p className="font-bold text-white text-sm leading-none truncate">{orgName}</p>
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
                const active = item.href === activeHref;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={active ? { backgroundColor: brandColor } : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active ? "text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
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
