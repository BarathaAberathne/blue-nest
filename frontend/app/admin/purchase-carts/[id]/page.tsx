import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import AdminPurchaseCartDetailClient from "./AdminPurchaseCartDetailClient";

export const metadata: Metadata = { title: "Purchase Order — Admin", robots: { index: false, follow: false } };

interface Props { params: Promise<{ id: string }> }

export default async function AdminPurchaseCartDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <AdminLayout>
      <AdminPurchaseCartDetailClient id={id} />
    </AdminLayout>
  );
}
