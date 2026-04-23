import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import AccountLayout from "@/components/layout/AccountLayout";
import Badge from "@/components/ui/Badge";

export const metadata: Metadata = { title: "My Orders" };

const placeholderOrders = [
  { id: "ORD-0001", date: "12 Apr 2026", total: "£24.99", status: "delivered" },
  { id: "ORD-0002", date: "3 Apr 2026", total: "£18.50", status: "processing" },
];

export default function AccountOrdersPage() {
  return (
    <PublicLayout>
      <AccountLayout>
        <h1 className="text-2xl font-heading font-bold text-gray-900 mb-6">My Orders</h1>
        <div className="space-y-3">
          {placeholderOrders.map((o) => (
            <div key={o.id} className="card p-5 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-gray-900 text-sm">{o.id}</p>
                <p className="text-xs text-gray-400">{o.date}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-800 text-sm">{o.total}</span>
                <Badge label={o.status} variant={o.status === "delivered" ? "green" : "blue"} />
              </div>
            </div>
          ))}
        </div>
      </AccountLayout>
    </PublicLayout>
  );
}
