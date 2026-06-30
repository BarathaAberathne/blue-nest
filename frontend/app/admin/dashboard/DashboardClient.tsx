"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, BookOpen, ClipboardList, Inbox, Package, PoundSterling, ShoppingCart,
} from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import StatCard from "@/components/admin/ui/StatCard";
import StageBadge from "@/components/admin/ui/StageBadge";
import { ORDER_STATUS_META } from "@/lib/admin-status";
import type { AccentName } from "@/lib/admin-theme";
import type { BlogPost, Enquiry, Order, OrderRequest, Product } from "@/types";

function fmt(pence: number) { return `£${(pence / 100).toFixed(2)}`; }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

export default function DashboardClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [inquiries, setInquiries] = useState<Enquiry[]>([]);
  const [orderRequests, setOrderRequests] = useState<OrderRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated"); setLoading(false); return; }
    Promise.allSettled([
      api.adminGetOrders(token), api.adminGetProducts(token), api.adminGetBlogPosts(token),
      api.adminGetEnquiries(token), api.adminGetOrderRequests(token),
    ]).then(([ordersRes, productsRes, postsRes, inquiriesRes, orderReqRes]) => {
      if (ordersRes.status === "fulfilled") setOrders((ordersRes.value as Order[]) ?? []);
      if (productsRes.status === "fulfilled") setProducts((productsRes.value as Product[]) ?? []);
      if (postsRes.status === "fulfilled") setPosts((postsRes.value as BlogPost[]) ?? []);
      if (inquiriesRes.status === "fulfilled") setInquiries((inquiriesRes.value as Enquiry[]) ?? []);
      if (orderReqRes.status === "fulfilled") setOrderRequests((orderReqRes.value as OrderRequest[]) ?? []);
      setLoading(false);
    });
  }, []);

  const newInquiries = inquiries.filter((e) => e.status === "new");
  const pendingRequests = orderRequests.filter((r) => r.status === "pending");
  const paidOrders = orders.filter((o) => o.status === "paid" || o.status === "delivered" || o.status === "shipped");
  const revenue = paidOrders.reduce((sum, o) => sum + (o.total_amount ?? 0), 0);
  const activeProducts = products.filter((p) => p.is_active);
  const publishedPosts = posts.filter((p) => p.published);
  const recentOrders = [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
  const lowStockProducts = products.filter((p) => p.stock_qty < (p.reorder_point ?? 100));

  const kpis: { label: string; value: string; sub?: string; icon: React.ElementType; accent: AccentName; href: string; progress?: number }[] = [
    { label: "New Inquiries", value: String(newInquiries.length), sub: `${inquiries.length} total received`, icon: Inbox, accent: "blue", href: "/admin/inquiries" },
    { label: "Pending Requests", value: String(pendingRequests.length), sub: `${orderRequests.length} supply requests total`, icon: ClipboardList, accent: "rose", href: "/admin/order-requests" },
    { label: "Total Orders", value: String(orders.length), sub: `${paidOrders.length} paid / fulfilled`, icon: ShoppingCart, accent: "teal", href: "/admin/orders", progress: pct(paidOrders.length, orders.length) },
    { label: "Revenue", value: fmt(revenue), sub: "from paid & fulfilled orders", icon: PoundSterling, accent: "violet", href: "/admin/orders" },
    { label: "Active Products", value: String(activeProducts.length), sub: `${products.length} total in catalogue`, icon: Package, accent: "amber", href: "/admin/products", progress: pct(activeProducts.length, products.length) },
    { label: "Blog Posts", value: String(publishedPosts.length), sub: `${posts.length} total (incl. drafts)`, icon: BookOpen, accent: "sky", href: "/admin/blog" },
  ];

  return (
    <div className="space-y-8">
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />)
          : kpis.map((k) => <StatCard key={k.label} {...k} />)}
      </div>

      {/* Low-stock alerts */}
      {!loading && lowStockProducts.length > 0 && (
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
      )}

      {/* Recent Orders */}
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

      {/* Quick actions */}
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
    </div>
  );
}
