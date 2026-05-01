import type { Metadata } from "next";
import AdminLoginClient from "./AdminLoginClient";

export const metadata: Metadata = { title: "Admin Login" };

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <AdminLoginClient />
    </div>
  );
}
