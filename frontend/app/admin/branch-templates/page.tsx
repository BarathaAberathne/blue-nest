import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import BranchTemplatesClient from "./BranchTemplatesClient";

export const metadata: Metadata = { title: "Admin – Branch templates", robots: { index: false, follow: false } };

export default function BranchTemplatesPage() {
  return (
    <AdminLayout>
      <BranchTemplatesClient />
    </AdminLayout>
  );
}
