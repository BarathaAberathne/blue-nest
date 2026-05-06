import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import AdminOrderDetailClient from "./AdminOrderDetailClient";

interface Props { params: { id: string } }

export function generateMetadata({ params }: Props): Metadata {
  return { title: `Order ${params.id.slice(0, 8).toUpperCase()} — Admin` };
}

export default function AdminOrderDetailPage({ params }: Props) {
  return (
    <AdminLayout>
      <AdminOrderDetailClient id={params.id} />
    </AdminLayout>
  );
}
