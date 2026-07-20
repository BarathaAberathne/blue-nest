import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import OrganisationClient from "./OrganisationClient";

export const metadata: Metadata = { title: "Admin – Organisation", robots: { index: false, follow: false } };

export default function OrganisationPage() {
  return (
    <AdminLayout>
      <OrganisationClient />
    </AdminLayout>
  );
}
