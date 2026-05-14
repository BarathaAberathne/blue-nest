import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import StoreClient from "@/components/store/StoreClient";

export const metadata: Metadata = {
  alternates: { canonical: "/nursery-store" },
  title: "Nursery Store — Blue Nest Montessori School",
  description:
    "Montessori-inspired materials, home learning resources, and Blue Nest merchandise — handpicked by our educators.",
  openGraph: {
    title: "Nursery Store — Blue Nest Montessori School",
    description:
      "Montessori-inspired materials and home learning resources — handpicked by our educators.",
    url: "/nursery-store",
    images: [{ url: "/home/montessori-learning.jpeg", width: 1280, height: 854, alt: "Blue Nest Montessori nursery store" }],
    type: "website",
  },
};

export default function NurseryStorePage() {
  return (
    <PublicLayout>
      <StoreClient />
    </PublicLayout>
  );
}
