"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Unified procurement area — the same tab bar sits atop every procurement page
// so Supply Requests, Purchase Orders, Suppliers, Catalogue and Analytics feel
// like one connected module rather than separate pages.
const TABS = [
  { label: "Overview", href: "/admin/procurement", exact: true },
  { label: "Supply Requests", href: "/admin/order-requests" },
  { label: "Purchase Orders", href: "/admin/purchase-carts" },
  { label: "Suppliers", href: "/admin/procurement/suppliers" },
  { label: "Catalogue", href: "/admin/catalogue" },
  { label: "Analytics", href: "/admin/procurement/analytics" },
];

export default function ProcurementTabs() {
  const pathname = usePathname() || "";
  return (
    <div className="mb-5 flex flex-wrap gap-1 border-b border-slate-200">
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${active ? "border-teal-600 text-teal-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
