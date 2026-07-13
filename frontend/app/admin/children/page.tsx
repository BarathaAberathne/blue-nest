import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import ChildrenClient from "./ChildrenClient";

export const metadata: Metadata = { title: "Admin – Children", robots: { index: false, follow: false } };

export default function ChildrenPage() {
  return (
    <AdminLayout>
      <ChildrenClient />
    </AdminLayout>
  );
}
