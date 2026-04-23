import type { Metadata } from "next";
import Link from "next/link";
import AdminLayout from "@/components/layout/AdminLayout";
import Badge from "@/components/ui/Badge";

export const metadata: Metadata = { title: "Admin – Orders" };

const placeholderOrders = [
  { id: "ORD-0001", customer: "Jane Smith", total: "£24.99", status: "paid", date: "12 Apr 2026" },
  { id: "ORD-0002", customer: "Tom Okafor", total: "£18.50", status: "processing", date: "11 Apr 2026" },
  { id: "ORD-0003", customer: "Priya Nair", total: "£42.00", status: "shipped", date: "10 Apr 2026" },
];

const statusVariant: Record<string, "green" | "blue" | "amber" | "gray"> = {
  paid: "green",
  processing: "blue",
  shipped: "amber",
  delivered: "green",
  cancelled: "gray",
};

export default function AdminOrdersPage() {
  return (
    <AdminLayout>
      <h1 className="text-2xl font-heading font-bold text-gray-900 mb-8">Orders</h1>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              {["Order ID", "Customer", "Date", "Total", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {placeholderOrders.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{o.id}</td>
                <td className="px-4 py-3 text-gray-700">{o.customer}</td>
                <td className="px-4 py-3 text-gray-500">{o.date}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">{o.total}</td>
                <td className="px-4 py-3">
                  <Badge label={o.status} variant={statusVariant[o.status] ?? "gray"} />
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${o.id}`} className="text-brand-600 hover:underline text-xs">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
