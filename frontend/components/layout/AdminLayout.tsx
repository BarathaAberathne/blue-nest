"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminNav = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Products", href: "/admin/products" },
  { label: "Blog", href: "/admin/blog" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-gray-900 text-gray-300 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-800">
          <p className="font-heading font-bold text-white text-sm">🌿 Blue Nest</p>
          <p className="text-xs text-gray-500 mt-0.5">Admin Panel</p>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-3">
          {adminNav.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith(l.href)
                  ? "bg-brand-700 text-white"
                  : "hover:bg-gray-800 text-gray-300"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-gray-800">
          <Link href="/" className="text-xs text-gray-500 hover:text-gray-300">
            ← View Site
          </Link>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-auto">
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
