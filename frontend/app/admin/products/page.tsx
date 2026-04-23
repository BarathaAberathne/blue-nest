import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";

export const metadata: Metadata = { title: "Admin – Products" };

const placeholderProducts = [
  { name: "Montessori Sensory Kit", price: "£24.99", stock: 12, active: true },
  { name: "Nature Explorer Pack", price: "£18.50", stock: 8, active: true },
  { name: "Wooden Counting Beads", price: "£12.99", stock: 0, active: false },
];

export default function AdminProductsPage() {
  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-heading font-bold text-gray-900">Products</h1>
        <button className="btn-primary text-sm py-2">+ Add Product</button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              {["Name", "Price", "Stock", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {placeholderProducts.map((p) => (
              <tr key={p.name} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                <td className="px-4 py-3 text-gray-700">{p.price}</td>
                <td className="px-4 py-3 text-gray-700">{p.stock}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.active ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-500"}`}>
                    {p.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button className="text-brand-600 hover:underline text-xs">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
