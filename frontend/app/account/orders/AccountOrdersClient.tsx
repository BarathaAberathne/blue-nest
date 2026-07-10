"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Package, ShoppingBag } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { displayRef } from "@/lib/ref";
import type { Order, OrderStatus } from "@/types";

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

const STATUS_STYLE: Record<OrderStatus, { bg: string; text: string; label: string }> = {
  pending:    { bg: "rgba(90,74,66,0.08)",    text: "rgba(90,74,66,0.6)",   label: "Pending"     },
  paid:       { bg: "rgba(127,216,210,0.20)", text: "#3aada9",              label: "Paid"        },
  processing: { bg: "rgba(247,215,116,0.30)", text: "#8a6d00",              label: "Processing"  },
  shipped:    { bg: "rgba(246,213,223,0.40)", text: "#cf7d9c",              label: "Shipped"     },
  delivered:  { bg: "rgba(127,216,210,0.20)", text: "#3aada9",              label: "Delivered"   },
  cancelled:  { bg: "rgba(90,74,66,0.07)",    text: "rgba(90,74,66,0.45)", label: "Cancelled"   },
};

export default function AccountOrdersClient() {
  const { ready, token, ensureAuthenticated } = useAuthGuard();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!ensureAuthenticated("/account/orders")) { setLoading(false); return; }

    api.getMyOrders(token)
      .then((data) => {
        const list = Array.isArray(data) ? (data as Order[]) : [];
        // Newest orders first.
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setOrders(list);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load orders"))
      .finally(() => setLoading(false));
  }, [ensureAuthenticated, ready, token]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <ShoppingBag className="h-5 w-5 text-[#3aada9]" />
        <h1 className="font-heading text-[1.8rem] leading-none text-[var(--ink)]">My Orders</h1>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-[1.5rem] bg-[rgba(90,74,66,0.05)] animate-pulse"
            />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-[2rem] bg-[var(--soft-white)] shadow-[0_14px_40px_rgba(90,74,66,0.08)] ring-1 ring-[rgba(90,74,66,0.06)] px-6 py-12 text-center">
          <Package className="mx-auto mb-3 h-10 w-10 text-[rgba(90,74,66,0.85)]" />
          <p className="font-heading text-[1.4rem] text-[var(--ink)]">No orders yet</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Your orders will appear here once you&apos;ve made a purchase.
          </p>
          <Link
            href="/nursery-store"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[rgba(127,216,210,0.18)] px-5 py-2.5 text-sm font-bold text-[#3aada9] transition hover:bg-[rgba(127,216,210,0.30)]"
          >
            Browse the Store <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        orders.map((o) => {
          const style = STATUS_STYLE[o.status] ?? STATUS_STYLE.pending;
          return (
            <div
              key={o.id}
              className="rounded-[1.8rem] bg-[var(--soft-white)] shadow-[0_8px_24px_rgba(90,74,66,0.07)] ring-1 ring-[rgba(90,74,66,0.06)] px-5 py-4 flex items-center gap-4"
            >
              {/* Icon */}
              <div className="h-10 w-10 rounded-full bg-[rgba(127,216,210,0.15)] flex items-center justify-center shrink-0">
                <Package className="h-5 w-5 text-[#3aada9]" />
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs font-semibold text-[rgba(90,74,66,0.85)] truncate">
                  {displayRef(o.ref, o.id, "ORD")}
                </p>
                <p className="text-xs text-[var(--muted)] mt-0.5">{fmtDate(o.created_at)}</p>
              </div>

              {/* Amount */}
              <p className="font-heading text-[1.1rem] text-[var(--ink)] shrink-0">
                {fmt(o.total_amount)}
              </p>

              {/* Status badge */}
              <span
                className="rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-widest shrink-0"
                style={{ background: style.bg, color: style.text }}
              >
                {style.label}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
