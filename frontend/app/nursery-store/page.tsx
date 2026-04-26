import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import StoreClient from "@/components/store/StoreClient";

export const metadata: Metadata = {
  title: "Nursery Store — Blue Nest Montessori School",
  description:
    "Montessori-inspired materials, home learning resources, and Blue Nest merchandise — handpicked by our educators.",
};

export default function NurseryStorePage() {
  return (
    <PublicLayout>
      <StoreClient />
    </PublicLayout>
  );
}
