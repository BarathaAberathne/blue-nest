import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import AdminOrderDetailClient from "./AdminOrderDetailClient";

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Order ${id.slice(0, 8).toUpperCase()} — Admin`, robots: { index: false, follow: false } };
}

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <AdminLayout>
      <AdminOrderDetailClient id={id} />
    </AdminLayout>
  );
}
