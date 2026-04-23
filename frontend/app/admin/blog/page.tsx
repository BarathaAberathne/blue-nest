import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";

export const metadata: Metadata = { title: "Admin – Blog" };

const placeholderPosts = [
  { title: "Why Outdoor Play Matters More Than You Think", status: "published", date: "12 Apr 2026" },
  { title: "5 Tips to Help Your Child Settle into Nursery", status: "published", date: "3 Apr 2026" },
  { title: "Upcoming Forest School Season", status: "draft", date: "—" },
];

export default function AdminBlogPage() {
  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-heading font-bold text-gray-900">Blog Posts</h1>
        <button className="btn-primary text-sm py-2">+ New Post</button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              {["Title", "Status", "Published", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {placeholderPosts.map((p) => (
              <tr key={p.title} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{p.title}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.status === "published" ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-500"}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{p.date}</td>
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
