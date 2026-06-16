"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Inbox,
  Package,
  PoundSterling,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import Badge from "@/components/ui/Badge";
import type { BlogPost, Enquiry, Order, OrderStatus, Product } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_VARIANT: Record<OrderStatus, "green" | "blue" | "amber" | "gray"> = {
  paid:        "green",
  delivered:   "green",
  processing:  "blue",
  shipped:     "amber",
  pending:     "gray",
  cancelled:   "gray",
};

// ── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  bg,
  href,
  loading,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  href: string;
  loading: boolean;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl bg-white border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-4">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ background: bg }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </span>
        <TrendingUp className="h-4 w-4 text-slate-300" />
      </div>
      {loading ? (
        <>
          <div className="h-8 w-20 rounded bg-slate-100 animate-pulse mb-1" />
          <div className="h-3.5 w-28 rounded bg-slate-100 animate-pulse" />
        </>
      ) : (
        <>
          <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
          <p className="text-xs text-slate-500 mt-1.5">{sub}</p>
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400 mt-3">
            {label}
          </p>
        </>
      )}
    </Link>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DashboardClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [inquiries, setInquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    Promise.allSettled([
      api.adminGetOrders(token),
      api.adminGetProducts(token),
      api.adminGetBlogPosts(token),
      api.adminGetEnquiries(token),
    ]).then(([ordersRes, productsRes, postsRes, inquiriesRes]) => {
      if (ordersRes.status === "fulfilled")
        setOrders((ordersRes.value as Order[]) ?? []);
      if (productsRes.status === "fulfilled")
        setProducts((productsRes.value as Product[]) ?? []);
      if (postsRes.status === "fulfilled")
        setPosts((postsRes.value as BlogPost[]) ?? []);
      if (inquiriesRes.status === "fulfilled")
        setInquiries((inquiriesRes.value as Enquiry[]) ?? []);
      setLoading(false);
    });
  }, []);

  const newInquiries = inquiries.filter((e) => e.status === "new");

  const paidOrders = orders.filter(
    (o) => o.status === "paid" || o.status === "delivered" || o.status === "shipped",
  );
  const revenue = paidOrders.reduce((sum, o) => sum + (o.total_amount ?? 0), 0);
  const activeProducts = products.filter((p) => p.is_active);
  const publishedPosts = posts.filter((p) => p.published);
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const lowStockProducts = products.filter(
    (p) => p.stock_qty < (p.reorder_point ?? 100),
  );

  const kpis = [
    {
      label: "New Inquiries",
      value: String(newInquiries.length),
      sub: `${inquiries.length} total received`,
      icon: Inbox,
      color: "#2563eb",
      bg: "rgba(37,99,235,0.10)",
      href: "/admin/inquiries",
    },
    {
      label: "Total Orders",
      value: String(orders.length),
      sub: `${paidOrders.length} paid / fulfilled`,
      icon: ShoppingCart,
      color: "#0f766e",
      bg: "rgba(15,118,110,0.10)",
      href: "/admin/orders",
    },
    {
      label: "Revenue",
      value: fmt(revenue),
      sub: "from paid & fulfilled orders",
      icon: PoundSterling,
      color: "#7c3aed",
      bg: "rgba(124,58,237,0.10)",
      href: "/admin/orders",
    },
    {
      label: "Active Products",
      value: String(activeProducts.length),
      sub: `${products.length} total in catalogue`,
      icon: Package,
      color: "#d97706",
      bg: "rgba(217,119,6,0.10)",
      href: "/admin/products",
    },
    {
      label: "Blog Posts",
      value: String(publishedPosts.length),
      sub: `${posts.length} total (incl. drafts)`,
      icon: BookOpen,
      color: "#0369a1",
      bg: "rgba(3,105,161,0.10)",
      href: "/admin/blog",
    },
  ];

  return (
    <div className="space-y-8">
      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} loading={loading} />
        ))}
      </div>

      {/* Low-stock alerts */}
      {!loading && lowStockProducts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-red-100">
            <p className="font-semibold text-red-700 text-sm">
              Low Stock Alerts ({lowStockProducts.length})
            </p>
            <Link
              href="/admin/products"
              className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
            >
              Manage <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-red-100">
            {lowStockProducts.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500 shrink-0" />
                  <span className="text-sm font-medium text-red-800">{p.name}</span>
                </div>
                <div className="text-xs text-red-600 font-medium">
                  {p.stock_qty} left &mdash; reorder at {p.reorder_point ?? 100}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <p className="font-semibold text-slate-800 text-sm">Recent Orders</p>
          <Link
            href="/admin/orders"
            className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {loading ? (
          <div className="divide-y divide-slate-50">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="h-3.5 w-24 bg-slate-100 rounded animate-pulse" />
                <div className="h-3.5 w-32 bg-slate-100 rounded animate-pulse flex-1" />
                <div className="h-3.5 w-16 bg-slate-100 rounded animate-pulse" />
                <div className="h-5 w-16 bg-slate-100 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <p className="px-6 py-8 text-sm text-slate-400 text-center">
            No orders yet. Orders will appear here once placed.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                {["Order ID", "Date", "Items", "Total", "Status", ""].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-[0.65rem] font-bold uppercase tracking-widest text-slate-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentOrders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3.5 font-mono text-xs font-medium text-slate-700">
                    {o.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-6 py-3.5 text-slate-500 text-xs">
                    {fmtDate(o.created_at)}
                  </td>
                  <td className="px-6 py-3.5 text-slate-500 text-xs">
                    {o.items?.length ?? 0} item{(o.items?.length ?? 0) !== 1 ? "s" : ""}
                  </td>
                  <td className="px-6 py-3.5 font-semibold text-slate-800">
                    {fmt(o.total_amount)}
                  </td>
                  <td className="px-6 py-3.5">
                    <Badge
                      label={o.status}
                      variant={STATUS_VARIANT[o.status] ?? "gray"}
                    />
                  </td>
                  <td className="px-6 py-3.5">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="text-xs font-medium text-teal-600 hover:text-teal-700"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Manage Products",   href: "/admin/products"   },
          { label: "Manage Categories", href: "/admin/categories" },
          { label: "Write Blog Post",   href: "/admin/blog"       },
          { label: "Manage Users",      href: "/admin/users"      },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex items-center justify-between gap-2 rounded-xl bg-white border border-slate-100 shadow-sm px-4 py-3.5 text-sm font-medium text-slate-700 hover:shadow-md hover:text-teal-700 transition-all"
          >
            {a.label}
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
          </Link>
        ))}
      </div>
    </div>
  );
}
