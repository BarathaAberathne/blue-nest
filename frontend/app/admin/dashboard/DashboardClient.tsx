"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, BookOpen, ClipboardList, Eye, EyeOff, GripVertical, Inbox, Maximize2,
  Minimize2, Package, PoundSterling, RotateCcw, Settings2, ShoppingCart,
} from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken, getAuthUser } from "@/lib/auth";
import StatCard from "@/components/admin/ui/StatCard";
import StageBadge from "@/components/admin/ui/StageBadge";
import { ORDER_STATUS_META } from "@/lib/admin-status";
import type { AccentName } from "@/lib/admin-theme";
import type { BlogPost, DashboardWidget, Enquiry, Order, OrderRequest, Product, UserRole } from "@/types";

const fmtBranch = (b: string) => (b ? b.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "");

function fmt(pence: number) { return `£${(pence / 100).toFixed(2)}`; }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

// The customizable widgets, in default order. Saved layouts re-order / hide / size them.
const WIDGET_TITLES: Record<string, string> = {
  kpis: "Key metrics",
  lowstock: "Low-stock alerts",
  "recent-orders": "Recent orders",
  "quick-actions": "Quick actions",
};
const DEFAULT_ORDER = ["kpis", "lowstock", "recent-orders", "quick-actions"];

export default function DashboardClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [inquiries, setInquiries] = useState<Enquiry[]>([]);
  const [orderRequests, setOrderRequests] = useState<OrderRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Customization state.
  const [layout, setLayout] = useState<DashboardWidget[]>([]);
  const [editing, setEditing] = useState(false);
  const [dragKey, setDragKey] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated"); setLoading(false); return; }
    Promise.allSettled([
      api.adminGetOrders(token), api.adminGetProducts(token), api.adminGetBlogPosts(token),
      api.adminGetEnquiries(token), api.adminGetOrderRequests(token), api.getDashboardLayout(token),
    ]).then(([ordersRes, productsRes, postsRes, inquiriesRes, orderReqRes, layoutRes]) => {
      if (ordersRes.status === "fulfilled") setOrders((ordersRes.value as Order[]) ?? []);
      if (productsRes.status === "fulfilled") setProducts((productsRes.value as Product[]) ?? []);
      if (postsRes.status === "fulfilled") setPosts((postsRes.value as BlogPost[]) ?? []);
      if (inquiriesRes.status === "fulfilled") setInquiries((inquiriesRes.value as Enquiry[]) ?? []);
      if (orderReqRes.status === "fulfilled") setOrderRequests((orderReqRes.value as OrderRequest[]) ?? []);
      if (layoutRes.status === "fulfilled") setLayout((layoutRes.value?.widgets as DashboardWidget[]) ?? []);
      setLoading(false);
    });
  }, []);

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
    const token = getAccessToken();
    if (token) void api.saveDashboardLayout(token, next).catch(() => { /* best-effort */ });
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

  const newInquiries = scopedInquiries.filter((e) => e.status === "new");
  const pendingRequests = scopedRequests.filter((r) => r.status === "pending");
  const paidOrders = orders.filter((o) => o.status === "paid" || o.status === "delivered" || o.status === "shipped");
  const revenue = paidOrders.reduce((sum, o) => sum + (o.total_amount ?? 0), 0);
  const activeProducts = products.filter((p) => p.is_active);
  const publishedPosts = posts.filter((p) => p.published);
  const recentOrders = [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
  const lowStockProducts = products.filter((p) => p.stock_qty < (p.reorder_point ?? 100));

  const ALL: UserRole[] = ["super_admin", "admin", "branch_manager"];
  const FULL: UserRole[] = ["super_admin", "admin"];
  const kpis: { label: string; value: string; sub?: string; icon: React.ElementType; accent: AccentName; href: string; progress?: number; roles: UserRole[] }[] = [
    { label: "New Inquiries", value: String(newInquiries.length), sub: `${scopedInquiries.length} total received`, icon: Inbox, accent: "blue", href: "/admin/inquiries", roles: ALL },
    { label: "Pending Requests", value: String(pendingRequests.length), sub: `${scopedRequests.length} supply requests total`, icon: ClipboardList, accent: "rose", href: "/admin/order-requests", roles: ALL },
    { label: "Total Orders", value: String(orders.length), sub: `${paidOrders.length} paid / fulfilled`, icon: ShoppingCart, accent: "teal", href: "/admin/orders", progress: pct(paidOrders.length, orders.length), roles: ALL },
    { label: "Revenue", value: fmt(revenue), sub: "from paid & fulfilled orders", icon: PoundSterling, accent: "violet", href: "/admin/orders", roles: FULL },
    { label: "Active Products", value: String(activeProducts.length), sub: `${products.length} total in catalogue`, icon: Package, accent: "amber", href: "/admin/products", progress: pct(activeProducts.length, products.length), roles: FULL },
    { label: "Blog Posts", value: String(publishedPosts.length), sub: `${posts.length} total (incl. drafts)`, icon: BookOpen, accent: "sky", href: "/admin/blog", roles: FULL },
  ];
  const visibleKpis = kpis.filter((k) => k.roles.includes(role));

  // ── Widget bodies ──────────────────────────────────────────────────────────
  const renderWidget = (key: string, size: DashboardWidget["size"]) => {
    switch (key) {
      case "kpis":
        return (
          <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${size === "wide" ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />)
              : visibleKpis.map(({ roles: _roles, ...k }) => <StatCard key={k.label} {...k} />)}
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
                <thead><tr className="bg-slate-50">{["Order ID", "Date", "Items", "Total", "Status", ""].map((h) => <th key={h} className="px-6 py-3 text-left text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {recentOrders.map((o) => (
                    <tr key={o.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-3.5 font-mono text-xs font-medium text-slate-700">{o.id.slice(0, 8).toUpperCase()}</td>
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
      case "quick-actions":
        return (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Manage Products", href: "/admin/products" },
              { label: "Manage Categories", href: "/admin/categories" },
              { label: "Write Blog Post", href: "/admin/blog" },
              { label: "Manage Users", href: "/admin/users" },
            ].map((a) => (
              <Link key={a.href} href={a.href} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white px-4 py-3.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:text-teal-700 hover:shadow-md">
                {a.label}<ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
              </Link>
            ))}
          </div>
        );
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
