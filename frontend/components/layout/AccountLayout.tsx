"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, User } from "lucide-react";

const accountNav = [
  { label: "My Account", href: "/account",        icon: User        },
  { label: "My Orders",  href: "/account/orders", icon: ShoppingBag },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="container-site py-12">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-52 shrink-0">
          <nav className="space-y-1">
            {accountNav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-[rgba(127,216,210,0.18)] text-[#3aada9]"
                      : "text-[var(--ink)] hover:bg-[rgba(90,74,66,0.05)] hover:text-[var(--ink)]"
                  }`}
                >
                  <Icon
                    className="h-4 w-4 shrink-0"
                    style={{ color: active ? "#3aada9" : "rgba(90,74,66,0.45)" }}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
