import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import GalleryPageClient from "@/components/gallery/GalleryPageClient";

export const metadata: Metadata = {
  title: "Gallery — Blue Nest Montessori School",
  description:
    "Explore photos, videos, and updates from our nurseries in Harrow, Pinner, and Borehamwood.",
};

export default function GalleryPage() {
  return (
    <PublicLayout>
      <GalleryPageClient />
    </PublicLayout>
  );
}
