"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";
import {
  Activity,
  ArrowLeft,
  Baby,
  BarChart3,
  BookOpen,
  Building2,
  SlidersHorizontal,
  CalendarCheck,
  CalendarRange,
  ChevronsLeft,
  ClipboardList,
  CalendarDays,
  ListChecks,
  DoorOpen,
  ExternalLink,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  LayoutTemplate,
  Library,
  LogOut,
  Mail,
  NotebookPen,
  Package,
  HeartHandshake,
  PoundSterling,
  Radar,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Truck,
  CalendarClock,
  MonitorSmartphone,
  UserCheck,
  UserCircle,
  Users,
  Wallet,
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
// `roles` (optional) restricts an item to specific roles regardless of permission -
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
    // Ordered to mirror the natural setup hierarchy: organisation → branch → rooms.
    heading: "Organisation",
    items: [
      { label: "Settings", href: "/admin/organisation", icon: SlidersHorizontal, permission: "dashboard.view", roles: ["super_admin"] },
      { label: "Branches", href: "/admin/branches", icon: Building2, permission: "branches.manage" },
      { label: "Rooms",    href: "/admin/rooms",     icon: DoorOpen, permission: "children.manage" },
      { label: "Lists",    href: "/admin/lists",     icon: ListChecks, permission: "branches.manage" },
      { label: "Term dates", href: "/admin/terms",   icon: CalendarDays, permission: "branches.manage" },
      { label: "Fees",     href: "/admin/fees",      icon: PoundSterling, permission: "branches.manage" },
      { label: "Branch templates", href: "/admin/branch-templates", icon: LayoutTemplate, permission: "branches.manage" },
      { label: "Email templates", href: "/admin/email-templates", icon: Mail, permission: "branches.manage" },
    ],
  },
  {
    heading: "Nursery",
    items: [
      { label: "Children",         href: "/admin/children",   icon: Baby, permission: "children.manage" },
      { label: "Parents",          href: "/admin/parents",    icon: Users, permission: "parents.manage" },
      { label: "Onboarding",       href: "/admin/onboarding", icon: ClipboardList, permission: "children.manage" },
      { label: "SEND Support",     href: "/admin/send",       icon: HeartHandshake, permission: "send.manage" },
      { label: "Finance",          href: "/admin/finance",    icon: PoundSterling, permission: "finance.manage" },
      { label: "Child Attendance", href: "/admin/attendance", icon: CalendarCheck, permission: "attendance.manage" },
      { label: "Daily Log",        href: "/admin/daily-log",  icon: NotebookPen, permission: "daily_logs.manage" },
    ],
  },
  {
    heading: "HR",
    items: [
      { label: "Staff",              href: "/admin/staff",              icon: Users, permission: "staff.manage" },
      { label: "Rota",               href: "/admin/rota",               icon: CalendarClock, permission: "staff.manage" },
      { label: "Attendance",         href: "/admin/staff-attendance",   icon: UserCheck, permission: "staff.manage" },
      { label: "Attendance Devices", href: "/admin/attendance-devices", icon: MonitorSmartphone, permission: "staff.manage" },
      { label: "Payroll",            href: "/admin/payroll",            icon: Wallet, permission: "staff.manage" },
      { label: "Leave Requests",     href: "/admin/leave",              icon: CalendarDays, permission: "leave.approve" },
      { label: "Room Planner",       href: "/admin/room-planner",       icon: CalendarRange, permission: "children.manage" },
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

// Staff (practitioners) get a restricted portal - only their own supply requests.
const STAFF_SECTIONS: NavSection[] = [
  { heading: null, items: [
    { label: "My Profile", href: "/admin/profile", icon: UserCircle, permission: "dashboard.view" },
    { label: "My Supply Requests", href: "/admin/my-requests", icon: ClipboardList, permission: "dashboard.view" },
  ] },
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

// readableInk picks black or white text for a brand background so branded
// buttons stay legible even when an org sets a pale primary colour. Uses the
// standard perceived-luminance weighting; falls back to white for bad input.
const readableInk = (hex?: string): string => {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex ?? "").trim());
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const L = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return L > 0.62 ? "#0f172a" : "#ffffff";
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [railTip, setRailTip] = useState<{ label: string; top: number } | null>(null);
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
  const accentColor = org?.branding?.accent_color || "#43C8B8";
  // Drives the whole admin theme: --brand re-points the accent tokens + the
  // teal-utility remap in globals.css; --brand-ink keeps branded buttons legible.
  const brandStyle = {
    "--brand": brandColor,
    "--brand-ink": readableInk(brandColor),
  } as CSSProperties;
  const orgName = org?.name || "Blue Nest";
  const brandInitials = orgName.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "BN";

  const navSections: NavSection[] = isManagement
    ? NAV_SECTIONS.map((s) => ({ ...s, items: s.items.filter(canSee) })).filter((s) => s.items.length > 0)
    : STAFF_SECTIONS;

  // Exactly one item is highlighted - the active item resolved from the visible
  // sections. Highlighting by href (not a naive per-item startsWith) is what
  // stops "/admin/staff" lighting up on "/admin/staff-attendance".
  const activeHref = activeNavItem(navSections, pathname)?.href;

  // First page the user is actually allowed to open (their landing page).
  const firstAllowedHref = navSections.flatMap((s) => s.items)[0]?.href ?? "/admin/dashboard";
  // The active nav item for the current path (drives the highlight, the page
  // title and the permission gate - one boundary-aware, longest-match resolver).
  const currentItem = activeNavItem(NAV_SECTIONS, pathname);

  useEffect(() => {
    if (!ready) return;
    const nextPath = pathname || "/admin/dashboard";
    if (!ensureAuthenticated(nextPath)) return;
    if (!allowed) {
      router.push("/account");
      return;
    }
    // Confine staff to their own supply-requests area - they can't reach
    // management pages even by typing the URL.
    if (isStaff && !pathname.startsWith("/admin/my-requests") && !pathname.startsWith("/admin/profile")) {
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

  // Collapsed-rail flyout label. The native `title` tooltip has a 1-2s OS delay
  // and tiny text; this shows the item name INSTANTLY on hover/focus, in the
  // admin type scale. Rendered position:fixed so the nav's overflow scroll
  // can't clip it. One shared element serves every rail item.
  const railTipProps = (label: string) => ({
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      if (sidebarOpen) return;
      const r = e.currentTarget.getBoundingClientRect();
      setRailTip({ label, top: r.top + r.height / 2 });
    },
    onMouseLeave: () => setRailTip(null),
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      if (sidebarOpen) return;
      const r = e.currentTarget.getBoundingClientRect();
      setRailTip({ label, top: r.top + r.height / 2 });
    },
    onBlur: () => setRailTip(null),
    onClick: () => setRailTip(null),
  });

  return (
    <div className="admin-shell min-h-screen bg-[var(--adm-bg)] font-body" style={brandStyle}>
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[var(--adm-line)] bg-[var(--adm-card)] transition-[width] duration-200 ease-in-out ${
          sidebarOpen ? "w-56" : "w-[78px]"
        }`}
      >
        {/* Brand - per-tenant name, logo and accent colour */}
        <div className="flex items-center gap-3 px-4 py-5">
          {org?.branding?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.branding.logo_url} alt="" className="h-9 w-9 shrink-0 rounded-xl object-contain" />
          ) : (
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white shadow-[0_6px_14px_rgba(15,157,140,.28)]"
              style={{ background: `linear-gradient(150deg, ${brandColor}, ${accentColor})` }}
            >
              {brandInitials}
            </span>
          )}
          <div className={`min-w-0 transition-opacity duration-150 ${sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}>
            <p className="truncate text-sm font-extrabold leading-none text-[var(--adm-ink)]">{orgName}</p>
            <p className="mt-1 text-[0.65rem] text-[var(--adm-muted)]">{isStaff ? "Staff Portal" : "Admin Panel"}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-3 py-2">
          {navSections.map((section, i) => (
            <div key={section.heading ?? `section-${i}`}>
              {i > 0 && <hr className="my-2 border-[var(--adm-line)]" />}
              {section.heading && sidebarOpen && (
                <p className="px-3 pb-1 text-[0.6rem] font-semibold uppercase tracking-widest text-[var(--adm-muted)]">
                  {section.heading}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = item.href === activeHref;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      {...railTipProps(item.label)}
                      className={`flex h-[42px] items-center gap-3 rounded-xl px-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                        active
                          ? "bg-[var(--adm-accent-tint)] text-[var(--adm-accent)]"
                          : "text-[var(--adm-ink-2)] hover:bg-[var(--adm-line-2)] hover:text-[var(--adm-ink)]"
                      }`}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      <span className={`transition-opacity duration-150 ${sidebarOpen ? "opacity-100" : "opacity-0"}`}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="space-y-0.5 border-t border-[var(--adm-line)] px-3 py-3">
          <Link
            href="/"
            target="_blank"
            {...railTipProps("View Site")}
            className="flex h-[38px] items-center gap-3 rounded-xl px-3 text-xs font-semibold whitespace-nowrap text-[var(--adm-muted)] transition-colors hover:bg-[var(--adm-line-2)] hover:text-[var(--adm-ink-2)]"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            <span className={`transition-opacity duration-150 ${sidebarOpen ? "opacity-100" : "opacity-0"}`}>View Site</span>
          </Link>
          <button
            type="button"
            {...railTipProps("Sign Out")}
            onClick={handleLogout}
            className="flex h-[38px] w-full items-center gap-3 rounded-xl px-3 text-xs font-semibold whitespace-nowrap text-[var(--adm-muted)] transition-colors hover:bg-[var(--adm-line-2)] hover:text-red-500"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className={`transition-opacity duration-150 ${sidebarOpen ? "opacity-100" : "opacity-0"}`}>Sign Out</span>
          </button>
          <button
            type="button"
            {...railTipProps("Expand sidebar")}
            onClick={() => { setRailTip(null); setSidebarOpen((v) => !v); }}
            aria-expanded={sidebarOpen}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            className="mt-1 flex h-[38px] w-full items-center gap-3 rounded-xl px-3 text-xs font-semibold whitespace-nowrap text-[var(--adm-muted)] transition-colors hover:bg-[var(--adm-line-2)] hover:text-[var(--adm-ink-2)]"
          >
            <ChevronsLeft className={`h-4 w-4 shrink-0 transition-transform duration-200 ${sidebarOpen ? "" : "rotate-180"}`} />
            <span className={`transition-opacity duration-150 ${sidebarOpen ? "opacity-100" : "opacity-0"}`}>Collapse</span>
          </button>
        </div>
      </aside>

      {/* Instant flyout label for the collapsed icon rail (replaces the
          slow, tiny native title tooltip). */}
      {railTip && !sidebarOpen && (
        <div
          role="tooltip"
          className="pointer-events-none fixed left-[86px] z-[70] -translate-y-1/2 rounded-lg border border-[var(--adm-line)] bg-[var(--adm-card)] px-3 py-2 text-sm font-semibold whitespace-nowrap text-[var(--adm-ink)] shadow-[0_8px_24px_rgba(15,23,42,.16)]"
          style={{ top: railTip.top }}
        >
          {railTip.label}
        </div>
      )}

      {/* ── Main area ───────────────────────────────────────── */}
      <div className={`flex min-h-screen flex-col transition-[margin-left] duration-200 ease-in-out ${sidebarOpen ? "ml-56" : "ml-[78px]"}`}>
        {/* Topbar */}
        <header
          className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--adm-line)] px-7 py-3.5 backdrop-blur-md"
          style={{ backgroundColor: "color-mix(in srgb, var(--adm-bg) 85%, transparent)" }}
        >
          {/* THE one back control for the whole admin shell — real history
              back, with the user's landing page as the deep-link/fresh-tab
              fallback. Detail pages must NOT add their own back arrows. */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) router.back();
              else router.push(firstAllowedHref);
            }}
            aria-label="Go back"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--adm-line)] bg-[var(--adm-card)] text-[var(--adm-ink-2)] transition-colors hover:border-[var(--adm-accent-tint-2)] hover:text-[var(--adm-ink)]"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </button>
          <div className="min-w-0">
            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--adm-muted)]">
              {isStaff ? "Staff" : "Admin"}
            </p>
            <p className="truncate text-lg font-bold leading-tight text-[var(--adm-ink)]">{currentPage}</p>
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            {isManagement && <NotificationBell />}
            <Link
              href="/admin/profile"
              title="My profile"
              className="flex items-center gap-2.5 rounded-full transition-opacity hover:opacity-80"
            >
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-[var(--adm-ink-2)]">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs capitalize text-[var(--adm-muted)]">
                  {user?.role?.replace("_", " ")}
                </p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[var(--adm-line)] bg-[var(--adm-accent)] text-sm font-bold text-white">
                {initials}
              </div>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
