import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import FamilyClient from "./FamilyClient";

export const metadata: Metadata = { title: "Admin – Family account", robots: { index: false, follow: false } };

export default async function FamilyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AdminLayout>
      <FamilyClient familyId={id} />
    </AdminLayout>
  );
}
