import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import PayrollClient from "./PayrollClient";

export const metadata: Metadata = { title: "Admin – Payroll | Blue Nest Montessori", robots: { index: false, follow: false } };

export default function AdminPayrollPage() {
  return (
    <AdminLayout>
      <PayrollClient />
    </AdminLayout>
  );
}
