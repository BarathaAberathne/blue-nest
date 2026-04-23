import type { Metadata } from "next";
import Link from "next/link";
import AdminLayout from "@/components/layout/AdminLayout";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";

interface Props { params: { id: string } }

export function generateMetadata({ params }: Props): Metadata {
  return { title: `Order ${params.id}` };
}

export default function AdminOrderDetailPage({ params }: Props) {
  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/orders" className="text-sm text-gray-500 hover:text-gray-700">← Orders</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-heading font-bold text-gray-900">{params.id}</h1>
        <Badge label="paid" variant="green" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <h2 className="font-semibold text-gray-900 mb-4">Order Items</h2>
            <p className="text-sm text-gray-500">Order items loaded from <code>/api/v1/admin/orders/{"{id}"}</code>.</p>
          </Card>
        </div>
        <div className="space-y-5">
          <Card>
            <h2 className="font-semibold text-gray-900 mb-3">Update Status</h2>
            <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              {["pending","paid","processing","shipped","delivered","cancelled"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button className="btn-primary w-full mt-3 text-sm py-2">Update</button>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
