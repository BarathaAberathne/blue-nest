import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import AccountLayout from "@/components/layout/AccountLayout";
import AccountOrdersClient from "./AccountOrdersClient";

export const metadata: Metadata = { title: "My Orders" };

export default function AccountOrdersPage() {
  return (
    <PublicLayout>
      <AccountLayout>
        <AccountOrdersClient />
      </AccountLayout>
    </PublicLayout>
  );
}

