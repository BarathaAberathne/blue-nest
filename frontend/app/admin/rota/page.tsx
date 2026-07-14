import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import RotaClient from "./RotaClient";

export const metadata: Metadata = { title: "Staff Rota – Admin", robots: { index: false, follow: false } };

export default function RotaPage() {
  return (
    <AdminLayout>
      <RotaClient />
    </AdminLayout>
  );
}
