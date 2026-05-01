import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import LoginClient from "./LoginClient";

export const metadata: Metadata = { title: "Sign In" };

export default function LoginPage() {
  return (
    <PublicLayout>
      <LoginClient />
    </PublicLayout>
  );
}

