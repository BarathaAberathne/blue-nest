import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import BranchProfileClient from "./BranchProfileClient";

export const metadata: Metadata = { title: "Admin – Branch", robots: { index: false, follow: false } };

export default async function BranchProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <AdminLayout>
      <BranchProfileClient slug={slug} />
    </AdminLayout>
  );
}
