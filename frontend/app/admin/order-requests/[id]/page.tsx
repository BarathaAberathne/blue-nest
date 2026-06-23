import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import AdminOrderRequestDetailClient from "./AdminOrderRequestDetailClient";

export const metadata: Metadata = { title: "Supply Request — Admin", robots: { index: false, follow: false } };

interface Props { params: Promise<{ id: string }> }

export default async function AdminOrderRequestDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <AdminLayout>
      <AdminOrderRequestDetailClient id={id} />
    </AdminLayout>
  );
}
