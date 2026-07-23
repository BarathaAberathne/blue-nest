"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, Baby, BookOpen, CalendarCheck, Check, ChevronDown, ClipboardList, Eye, EyeOff, Gauge,
  GripVertical, Inbox, LayoutGrid, Maximize2, Minimize2, Package, Plus, PoundSterling, RotateCcw,
  Settings2, ShieldAlert, ShoppingCart, Trash2, Truck, Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken, getAuthUser } from "@/lib/auth";
import { usePermissions } from "@/lib/usePermissions";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import StatCard from "@/components/admin/ui/StatCard";
import StageBadge from "@/components/admin/ui/StageBadge";
import { ORDER_STATUS_META } from "@/lib/admin-status";
import { displayRef } from "@/lib/ref";
import { DASHBOARD_WIDGET_KEYS, DASHBOARD_WIDGET_TITLES } from "@/lib/dashboard-widgets";
import type { AccentName } from "@/lib/admin-theme";
import type { AttendanceStats, BlogPost, ChildStats, DailyStats, DashboardLayout, DashboardWidget, Enquiry, Order, OrderRequest, Permission, ProcurementAnalytics, Product, StaffStats, UserRole } from "@/types";

const fmtBranch = (b: string) => (b ? b.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "");

function fmt(pence: number) { return `£${(pence / 100).toFixed(2)}`; }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

// The customizable widgets, in default order. Saved layouts re-order / hide / size them.
const WIDGET_TITLES = DASHBOARD_WIDGET_TITLES;
const DEFAULT_ORDER = DASHBOARD_WIDGET_KEYS;
const DEFAULT_LAYOUT_NAME = "My Dashboard"; // must match models.DefaultLayoutName

export default function DashboardClient() {
  const { has, ready: permsReady } = usePermissions();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [inquiries, setInquiries] = useState<Enquiry[]>([]);
  const [orderRequests, setOrderRequests] = useState<OrderRequest[]>([]);
  const [analytics, setAnalytics] = useState<ProcurementAnalytics | null>(null);
  // Nursery operations — the core of the business (reuses the same stats
  // endpoints as the Command Centre; each gated by the caller's permission).
  const [childStats, setChildStats] = useState<ChildStats | null>(null);
  const [staffStats, setStaffStats] = useState<StaffStats | null>(null);
  const [attStats, setAttStats] = useState<AttendanceStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Customization state.
  const [layout, setLayout] = useState<DashboardWidget[]>([]);
  const [editing, setEditing] = useState(false);
  const [dragKey, setDragKey] = useState<string | null>(null);

  // Named layouts (B3.3): a user keeps several saved arrangements and switches
  // the active one (e.g. "Morning Briefing", "Finance End-of-Month").
  const [layouts, setLayouts] = useState<DashboardLayout[]>([]);
  const [activeName, setActiveName] = useState<string>(DEFAULT_LAYOUT_NAME);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [newName, setNewName] = useState("");

  // Live KPI stats (children/staff/attendance/daily) — split out from the
  // rest of the batch below so it can also be re-run silently on a timer
  // (background kiosk clock-ins etc. shouldn't require an F5 to show up)
  // without refreshing the heavier CRUD lists (orders/products/blog/...).
  // requestIdRef guards a stale in-flight response from overwriting a newer one.
  const liveStatsRequestIdRef = useRef(0);
  const refreshLiveStats = async () => {
    const token = getAccessToken();
    if (!token) return;
    const myId = ++liveStatsRequestIdRef.current;
    // Branch managers see their own branch — pass it to the branch-filterable
    // stats endpoints (the org-wide roles pass nothing and get the whole org).
    const u = getAuthUser();
    const bm = u?.role === "branch_manager" && (u?.branch_slugs?.length ?? 0) > 0;
    const branchParam = bm ? { branch: u!.branch_slugs![0] } : undefined;

    const jobs: Promise<void>[] = [];
    if (has("children.manage")) jobs.push(api.adminGetChildStats(token).then((v) => setChildStats((v as ChildStats) ?? null)).catch(() => { /* best-effort per source */ }));
    if (has("attendance.manage")) jobs.push(api.adminGetAttendanceToday(token, branchParam).then((v) => setAttStats((v as AttendanceStats) ?? null)).catch(() => { /* best-effort per source */ }));
    if (has("staff.manage")) jobs.push(api.adminGetStaffStats(token, branchParam).then((v) => setStaffStats((v as StaffStats) ?? null)).catch(() => { /* best-effort per source */ }));
    if (has("daily_logs.manage")) jobs.push(api.adminGetDailyStats(token).then((v) => setDailyStats((v as DailyStats) ?? null)).catch(() => { /* best-effort per source */ }));
    await Promise.allSettled(jobs);
    if (liveStatsRequestIdRef.current !== myId) return; // superseded — nothing further to do
  };
  // Background auto-refresh for just the live KPIs — no loading flash, and the
  // heavier CRUD lists below stay fetch-once (they aren't live-monitoring data).
  useAutoRefresh(refreshLiveStats, 30_000);

  // Fetch only the data sources the caller is permitted to read (so specialist
  // roles get their scoped KPIs instead of a wall of 403s). Waits for the
  // permission set to resolve so we request exactly the right subset.
  useEffect(() => {
    if (!permsReady) return;
    const token = getAccessToken();
    if (!token) { setError("Not authenticated"); setLoading(false); return; }

    const jobs: Promise<void>[] = [];
    const run = <T,>(p: Promise<T>, set: (v: T) => void) => {
      jobs.push(p.then((v) => set(v)).catch(() => { /* best-effort per source */ }));
    };

    jobs.push(
      api.listDashboardLayouts(token).then((v) => {
        const list = v?.layouts ?? [];
        setLayouts(list);
        const active = list.find((l) => l.active) ?? list[0];
        if (active) {
          setLayout((active.widgets as DashboardWidget[]) ?? []);
          setActiveName(active.name ?? DEFAULT_LAYOUT_NAME);
        }
      }).catch(() => { /* best-effort — falls back to defaults */ }),
    );

    // Nursery operations (the primary business).
    jobs.push(refreshLiveStats());

    if (has("store.manage")) {
      run(api.adminGetOrders(token), (v) => setOrders((v as Order[]) ?? []));
      run(api.adminGetProducts(token), (v) => setProducts((v as Product[]) ?? []));
    }
    if (has("blog.manage")) run(api.adminGetBlogPosts(token), (v) => setPosts((v as BlogPost[]) ?? []));
    if (has("enquiries.manage")) run(api.adminGetEnquiries(token), (v) => setInquiries((v as Enquiry[]) ?? []));
    if (has("procurement.manage")) run(api.adminGetOrderRequests(token), (v) => setOrderRequests((v as OrderRequest[]) ?? []));
    if (has("finance.view")) run(api.adminGetProcurementAnalytics(token), (v) => setAnalytics((v as ProcurementAnalytics) ?? null));

    Promise.allSettled(jobs).then(() => setLoading(false));
  }, [permsReady, has]);

  // Merge the saved layout with the default widget set: saved widgets keep their
  // order/hidden/size; any new widget not yet in the layout is appended visible.
  const widgets = useMemo<DashboardWidget[]>(() => {
    const known = new Set(DEFAULT_ORDER);
    const fromSaved = layout.filter((w) => known.has(w.key));
    const savedKeys = new Set(fromSaved.map((w) => w.key));
    const appended = DEFAULT_ORDER.filter((k) => !savedKeys.has(k)).map((k) => ({ key: k, hidden: false, size: "normal" as const }));
    return [...fromSaved, ...appended];
  }, [layout]);

  const persist = (next: DashboardWidget[]) => {
    setLayout(next);
    // Reflect the change in the active layout locally so the switcher stays in sync.
    setLayouts((ls) => {
      const exists = ls.some((l) => l.name === activeName);
      if (exists) return ls.map((l) => (l.name === activeName ? { ...l, widgets: next } : l));
      return [{ name: activeName, active: true, widgets: next }, ...ls];
    });
    const token = getAccessToken();
    if (token) void api.saveDashboardLayout(token, next, activeName).catch(() => { /* best-effort */ });
  };

  // Switch to a different saved layout (activates it server-side + applies its widgets).
  const switchTo = (name: string) => {
    setSwitcherOpen(false);
    if (name === activeName) return;
    const target = layouts.find((l) => l.name === name);
    setActiveName(name);
    if (target) setLayout((target.widgets as DashboardWidget[]) ?? []);
    setLayouts((ls) => ls.map((l) => ({ ...l, active: l.name === name })));
    const token = getAccessToken();
    if (token) void api.activateDashboardLayout(token, name).catch(() => { /* best-effort */ });
  };

  // Save the current arrangement under a new name and switch to it.
  const saveAsNew = async () => {
    const name = newName.trim();
    if (!name) return;
    const token = getAccessToken();
    if (!token) return;
    setNewName("");
    setActiveName(name);
    setSwitcherOpen(false);
    await api.saveDashboardLayout(token, widgets, name).catch(() => { /* best-effort */ });
    const v = await api.listDashboardLayouts(token).catch(() => null);
    if (v) setLayouts(v.layouts ?? []);
  };

  const deleteLayout = async (name: string) => {
    const token = getAccessToken();
    if (!token || !window.confirm(`Delete the “${name}” layout?`)) return;
    await api.deleteDashboardLayout(token, name).catch(() => { /* best-effort */ });
    const v = await api.listDashboardLayouts(token).catch(() => null);
    const list = v?.layouts ?? [];
    setLayouts(list);
    const active = list.find((l) => l.active) ?? list[0];
    if (active) { setLayout((active.widgets as DashboardWidget[]) ?? []); setActiveName(active.name ?? DEFAULT_LAYOUT_NAME); }
    else { setLayout([]); setActiveName(DEFAULT_LAYOUT_NAME); }
  };

  const toggleHidden = (key: string) => persist(widgets.map((w) => (w.key === key ? { ...w, hidden: !w.hidden } : w)));
  const toggleSize = (key: string) => persist(widgets.map((w) => (w.key === key ? { ...w, size: w.size === "wide" ? "normal" : "wide" } : w)));
  const resetLayout = () => persist(DEFAULT_ORDER.map((k) => ({ key: k, hidden: false, size: "normal" as const })));

  const onDrop = (targetKey: string) => {
    if (!dragKey || dragKey === targetKey) return;
    const order = widgets.map((w) => w.key);
    const from = order.indexOf(dragKey);
    const to = order.indexOf(targetKey);
    if (from < 0 || to < 0) return;
    const reordered = [...widgets];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    persist(reordered);
    setDragKey(null);
  };

  // Role/branch-aware: branch managers see their branch(es) only and a focused
  // widget set; super_admin/admin see everything.
  const user = getAuthUser();
  const role: UserRole = user?.role ?? "admin";
  const branchSlugs = user?.branch_slugs ?? [];
  const branchManager = role === "branch_manager" && branchSlugs.length > 0;
  const inBranch = (slug?: string) => !branchManager || (!!slug && branchSlugs.includes(slug));

  const scopedInquiries = branchManager ? inquiries.filter((e) => inBranch(e.branch)) : inquiries;
  const scopedRequests = branchManager ? orderRequests.filter((r) => inBranch(r.branch_slug)) : orderRequests;

  // Children/occupancy: branch managers derive from the per-branch breakdown
  // (childStats itself is org-wide); org-wide roles use the whole-org totals.
  const childBranches = branchManager ? (childStats?.branches ?? []).filter((b) => inBranch(b.branch)) : null;
  const childrenActive = childBranches ? childBranches.reduce((s, b) => s + b.children, 0) : (childStats?.active ?? 0);
  const childCapacity = childBranches ? childBranches.reduce((s, b) => s + b.capacity, 0) : (childStats?.capacity ?? 0);
  const occupancy = childBranches ? pct(childrenActive, childCapacity) : (childStats?.occupancy_rate ?? 0);

  const newInquiries = scopedInquiries.filter((e) => e.status === "new");
  const pendingRequests = scopedRequests.filter((r) => r.status === "pending");
  const paidOrders = orders.filter((o) => o.status === "paid" || o.status === "delivered" || o.status === "shipped");
  const revenue = paidOrders.reduce((sum, o) => sum + (o.total_amount ?? 0), 0);
  const activeProducts = products.filter((p) => p.is_active);
  const publishedPosts = posts.filter((p) => p.published);
  const recentOrders = [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
  const lowStockProducts = products.filter((p) => p.stock_qty < (p.reorder_point ?? 100));

  // Pending requests: prefer the branch-scoped list (procurement.manage); fall
  // back to the analytics roll-up (finance.view) for roles without list access.
  const hasRequestList = orderRequests.length > 0 || has("procurement.manage");
  const pendingRequestsValue = hasRequestList ? pendingRequests.length : (analytics?.pending_requests ?? 0);
  const requestsSub = hasRequestList
    ? `${scopedRequests.length} supply requests total`
    : `${analytics?.total_requests ?? 0} supply requests total`;

  // Each KPI declares the permission that gates BOTH its data source and its
  // visibility, so specialist roles only see the cards they can populate.
  const kpis: { label: string; value: string; sub?: string; icon: React.ElementType; accent: AccentName; href: string; progress?: number; permission: Permission }[] = [
    // Nursery operations first — the core of the business.
    { label: "Children", value: String(childrenActive), sub: `${childStats?.waitlist ?? 0} on waitlist`, icon: Baby, accent: "teal", href: "/admin/children", permission: "children.manage" },
    { label: "Occupancy", value: `${occupancy}%`, sub: `${childrenActive} of ${childCapacity} places`, icon: Gauge, accent: "blue", href: "/admin/children", progress: occupancy, permission: "children.manage" },
    { label: "Today's Attendance", value: `${attStats?.attendance_rate ?? 0}%`, sub: `${attStats?.present ?? 0}/${attStats?.expected ?? 0} children in`, icon: CalendarCheck, accent: "green", href: "/admin/attendance", progress: attStats?.attendance_rate, permission: "attendance.manage" },
    { label: "Staff Present", value: String(staffStats?.present ?? 0), sub: `of ${staffStats?.total ?? 0}${(staffStats?.on_leave ?? 0) > 0 ? ` · ${staffStats?.on_leave} on leave` : ""}`, icon: Users, accent: "indigo", href: "/admin/staff-attendance", progress: pct(staffStats?.present ?? 0, staffStats?.total ?? 0), permission: "staff.manage" },
    { label: "Safeguarding", value: String(dailyStats?.safeguarding_open ?? 0), sub: (dailyStats?.safeguarding_open ?? 0) === 0 ? "no open concerns" : "open concerns", icon: ShieldAlert, accent: (dailyStats?.safeguarding_open ?? 0) > 0 ? "rose" : "slate", href: "/admin/daily-log", permission: "daily_logs.manage" },
    { label: "New Enquiries", value: String(newInquiries.length), sub: `${scopedInquiries.length} total received`, icon: Inbox, accent: "blue", href: "/admin/inquiries", permission: "enquiries.manage" },
    { label: "Pending Requests", value: String(pendingRequestsValue), sub: requestsSub, icon: ClipboardList, accent: "rose", href: "/admin/order-requests", permission: "procurement.view" },
    { label: "Procurement Spend", value: fmt(analytics?.total_spend ?? 0), sub: `${analytics?.total_orders ?? 0} purchase orders`, icon: PoundSterling, accent: "teal", href: "/admin/procurement/analytics", permission: "finance.view" },
    { label: "Overdue Orders", value: String(analytics?.overdue_orders ?? 0), sub: "awaiting delivery past due", icon: Truck, accent: "orange", href: "/admin/purchase-carts", permission: "finance.view" },
    { label: "Total Orders", value: String(orders.length), sub: `${paidOrders.length} paid / fulfilled`, icon: ShoppingCart, accent: "teal", href: "/admin/orders", progress: pct(paidOrders.length, orders.length), permission: "store.manage" },
    { label: "Revenue", value: fmt(revenue), sub: "from paid & fulfilled orders", icon: PoundSterling, accent: "violet", href: "/admin/orders", permission: "store.manage" },
    { label: "Active Products", value: String(activeProducts.length), sub: `${products.length} total in catalogue`, icon: Package, accent: "amber", href: "/admin/products", progress: pct(activeProducts.length, products.length), permission: "store.manage" },
    { label: "Blog Posts", value: String(publishedPosts.length), sub: `${posts.length} total (incl. drafts)`, icon: BookOpen, accent: "sky", href: "/admin/blog", permission: "blog.manage" },
  ];
  const visibleKpis = kpis.filter((k) => has(k.permission));

  // ── Widget bodies ──────────────────────────────────────────────────────────
  const renderWidget = (key: string, size: DashboardWidget["size"]) => {
    switch (key) {
      case "kpis":
        return (
          <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${size === "wide" ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />)
              : visibleKpis.length === 0
                ? <p className="text-sm text-slate-400">No metrics available for your role.</p>
                : visibleKpis.map(({ permission: _p, ...k }) => <StatCard key={k.label} {...k} />)}
          </div>
        );
      case "lowstock":
        if (loading || lowStockProducts.length === 0) return null;
        return (
          <div className="overflow-hidden rounded-2xl border border-red-200 bg-red-50">
            <div className="flex items-center justify-between border-b border-red-100 px-6 py-4">
              <p className="text-sm font-semibold text-red-700">Low Stock Alerts ({lowStockProducts.length})</p>
              <Link href="/admin/products" className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700">Manage <ArrowRight className="h-3 w-3" /></Link>
            </div>
            <div className="divide-y divide-red-100">
              {lowStockProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-2"><span className="inline-block h-2 w-2 shrink-0 rounded-full bg-red-500" /><span className="text-sm font-medium text-red-800">{p.name}</span></div>
                  <div className="text-xs font-medium text-red-600">{p.stock_qty} left &mdash; reorder at {p.reorder_point ?? 100}</div>
                </div>
              ))}
            </div>
          </div>
        );
      case "recent-orders":
        if (!has("store.manage")) return null;
        return (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <p className="text-sm font-semibold text-slate-800">Recent Orders</p>
              <Link href="/admin/orders" className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700">View all <ArrowRight className="h-3 w-3" /></Link>
            </div>
            {loading ? (
              <div className="divide-y divide-slate-50">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4"><div className="h-3.5 w-24 animate-pulse rounded bg-slate-100" /><div className="h-3.5 w-32 flex-1 animate-pulse rounded bg-slate-100" /><div className="h-3.5 w-16 animate-pulse rounded bg-slate-100" /><div className="h-5 w-16 animate-pulse rounded-full bg-slate-100" /></div>
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-slate-400">No orders yet. Orders will appear here once placed.</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50">{["Ref", "Date", "Items", "Total", "Status", ""].map((h) => <th key={h} className="px-6 py-3 text-left text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {recentOrders.map((o) => (
                    <tr key={o.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-3.5 font-mono text-xs font-medium text-slate-700">{displayRef(o.ref, o.id, "ORD")}</td>
                      <td className="px-6 py-3.5 text-xs text-slate-500">{fmtDate(o.created_at)}</td>
                      <td className="px-6 py-3.5 text-xs text-slate-500">{o.items?.length ?? 0} item{(o.items?.length ?? 0) !== 1 ? "s" : ""}</td>
                      <td className="px-6 py-3.5 font-semibold text-slate-800">{fmt(o.total_amount)}</td>
                      <td className="px-6 py-3.5"><StageBadge label={ORDER_STATUS_META[o.status]?.label ?? o.status} accent={ORDER_STATUS_META[o.status]?.accent ?? "slate"} /></td>
                      <td className="px-6 py-3.5"><Link href={`/admin/orders/${o.id}`} className="text-xs font-medium text-teal-600 hover:text-teal-700">View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      case "quick-actions": {
        // Only surface actions the user can actually perform.
        const actions = ([
          { label: "Manage Products", href: "/admin/products", permission: "store.manage" as Permission },
          { label: "Manage Categories", href: "/admin/categories", permission: "store.manage" as Permission },
          { label: "Supply Requests", href: "/admin/order-requests", permission: "procurement.view" as Permission },
          { label: "Suppliers", href: "/admin/procurement/suppliers", permission: "suppliers.manage" as Permission },
          { label: "Review Enquiries", href: "/admin/inquiries", permission: "enquiries.manage" as Permission },
          { label: "Write Blog Post", href: "/admin/blog", permission: "blog.manage" as Permission },
          { label: "Manage Users", href: "/admin/users", permission: "users.manage" as Permission },
        ]).filter((a) => has(a.permission)).slice(0, 4);
        if (actions.length === 0) return null;
        return (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {actions.map((a) => (
              <Link key={a.href} href={a.href} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white px-4 py-3.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:text-teal-700 hover:shadow-md">
                {a.label}<ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
              </Link>
            ))}
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Customize toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {branchManager ? (
          <p className="text-sm text-slate-500">Showing data for your branch{branchSlugs.length > 1 ? "es" : ""}: <span className="font-medium text-slate-700">{branchSlugs.map(fmtBranch).join(", ")}</span></p>
        ) : <span />}
        <div className="flex items-center gap-2">
          {/* Named-layout switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setSwitcherOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <LayoutGrid className="h-3.5 w-3.5 text-slate-400" />
              <span className="max-w-[10rem] truncate">{activeName}</span>
              <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition ${switcherOpen ? "rotate-180" : ""}`} />
            </button>
            {switcherOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSwitcherOpen(false)} />
                <div className="absolute right-0 z-20 mt-1 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                  <p className="px-2.5 py-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">My layouts</p>
                  {(layouts.length ? layouts : [{ name: activeName, active: true, widgets: [] }]).map((l) => {
                    const name = l.name ?? DEFAULT_LAYOUT_NAME;
                    const isActive = name === activeName;
                    return (
                      <div key={name} className={`group flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm ${isActive ? "bg-teal-50 text-teal-700" : "text-slate-700 hover:bg-slate-50"}`}>
                        <button type="button" onClick={() => switchTo(name)} className="flex flex-1 items-center gap-2 text-left">
                          <Check className={`h-3.5 w-3.5 ${isActive ? "text-teal-600" : "text-transparent"}`} />
                          <span className="truncate">{name}</span>
                        </button>
                        {layouts.length > 1 && (
                          <button type="button" onClick={() => deleteLayout(name)} title="Delete layout" className="rounded p-1 text-slate-300 opacity-0 hover:bg-slate-100 hover:text-red-500 group-hover:opacity-100">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <div className="mt-1 flex items-center gap-1 border-t border-slate-100 px-1 pt-2">
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") void saveAsNew(); }}
                      placeholder="Save current as…"
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                    />
                    <button type="button" onClick={() => void saveAsNew()} disabled={!newName.trim()} title="Save as new layout" className="rounded-lg bg-teal-600 p-1.5 text-white hover:bg-teal-700 disabled:opacity-40">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          {editing && (
            <button type="button" onClick={resetLayout} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
              <RotateCcw className="h-3.5 w-3.5" /> Reset layout
            </button>
          )}
          <button type="button" onClick={() => setEditing((v) => !v)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${editing ? "bg-teal-600 text-white hover:bg-teal-700" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            <Settings2 className="h-3.5 w-3.5" /> {editing ? "Done" : "Customize"}
          </button>
        </div>
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      {/* Widgets — reorderable / hideable when editing */}
      {widgets.map((w) => {
        const body = renderWidget(w.key, w.size);
        if (w.hidden && !editing) return null;
        if (!body && !editing) return null;
        return (
          <div
            key={w.key}
            draggable={editing}
            onDragStart={() => setDragKey(w.key)}
            onDragOver={(e) => editing && e.preventDefault()}
            onDrop={() => onDrop(w.key)}
            className={editing ? `rounded-2xl border-2 border-dashed p-3 transition-colors ${dragKey === w.key ? "border-teal-400 bg-teal-50/40" : "border-slate-200"}` : ""}
          >
            {editing && (
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <GripVertical className="h-4 w-4 cursor-grab text-slate-400" />
                  {WIDGET_TITLES[w.key] ?? w.key}
                  {w.hidden && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.65rem] font-medium text-slate-400">hidden</span>}
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => toggleSize(w.key)} title="Toggle width" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                    {w.size === "wide" ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                  </button>
                  <button type="button" onClick={() => toggleHidden(w.key)} title={w.hidden ? "Show" : "Hide"} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                    {w.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            )}
            <div className={editing && w.hidden ? "opacity-40" : ""}>
              {body ?? (editing ? <p className="px-2 py-4 text-center text-xs text-slate-400">Nothing to show right now.</p> : null)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
