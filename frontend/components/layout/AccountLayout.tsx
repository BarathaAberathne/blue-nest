import Link from "next/link";

const accountNav = [
  { label: "My Account", href: "/account" },
  { label: "My Orders", href: "/account/orders" },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-site py-12">
      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-52 shrink-0">
          <nav className="space-y-1">
            {accountNav.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-brand-50 hover:text-brand-700"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
