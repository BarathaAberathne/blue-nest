import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import Card from "@/components/ui/Card";

export const metadata: Metadata = { title: "Admin Dashboard" };

const stats = [
  { label: "Total Orders", value: "—", icon: "📦" },
  { label: "Revenue (Month)", value: "—", icon: "💷" },
  { label: "Active Products", value: "—", icon: "🛍️" },
  { label: "Blog Posts", value: "—", icon: "📝" },
];

export default function AdminDashboardPage() {
  return (
    <AdminLayout>
      <h1 className="text-2xl font-heading font-bold text-gray-900 mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {stats.map((s) => (
          <Card key={s.label} className="flex items-center gap-4">
            <span className="text-3xl">{s.icon}</span>
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <p className="text-sm text-gray-500">Dashboard analytics connect to the API once data is available.</p>
      </Card>
    </AdminLayout>
  );
}
