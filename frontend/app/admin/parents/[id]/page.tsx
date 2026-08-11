import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import ParentDetailClient from "./ParentDetailClient";

export const metadata: Metadata = { title: "Admin – Parent", robots: { index: false, follow: false } };

export default async function ParentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AdminLayout>
      <ParentDetailClient id={id} />
    </AdminLayout>
  );
}
