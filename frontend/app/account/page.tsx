import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import AccountLayout from "@/components/layout/AccountLayout";
import AccountClient from "./AccountClient";

export const metadata: Metadata = {
  title: "My Account — Blue Nest Montessori",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <PublicLayout>
      <AccountLayout>
        <AccountClient />
      </AccountLayout>
    </PublicLayout>
  );
}

