import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import RegisterClient from "./RegisterClient";

export const metadata: Metadata = { title: "Create Account" };

export default function RegisterPage() {
  return (
    <PublicLayout>
      <RegisterClient />
    </PublicLayout>
  );
}

