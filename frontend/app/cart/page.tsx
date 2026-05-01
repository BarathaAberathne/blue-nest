import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import CartClient from "./CartClient";

export const metadata: Metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <PublicLayout>
      <CartClient />
    </PublicLayout>
  );
}

