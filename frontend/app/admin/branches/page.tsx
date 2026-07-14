import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import BranchesClient from "./BranchesClient";

export const metadata: Metadata = { title: "Admin – Branches", robots: { index: false, follow: false } };

export default function BranchesPage() {
  return (
    <AdminLayout>
      <BranchesClient />
    </AdminLayout>
  );
}
