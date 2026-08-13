import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import SendOverviewClient from "./SendOverviewClient";

export const metadata: Metadata = { title: "Admin – SEND / Additional Support", robots: { index: false, follow: false } };

export default function SendPage() {
  return (
    <AdminLayout>
      <SendOverviewClient />
    </AdminLayout>
  );
}
