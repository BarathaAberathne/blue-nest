import { Suspense } from "react";
import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import GalleryPageClient from "@/components/gallery/GalleryPageClient";

const DESC = "Step inside Blue Nest Montessori — photos and videos of Montessori classrooms, forest school, outdoor play and enrichment activities at our Harrow, Pinner and Borehamwood nurseries.";

export const metadata: Metadata = {
  alternates: { canonical: "/gallery" },
  title: "Nursery Gallery — Photos & Videos | Blue Nest Montessori",
  description: DESC,
  openGraph: {
    title: "Nursery Gallery — Blue Nest Montessori",
    description: DESC,
    url: "/gallery",
    images: [{ url: "/home/branches/harrow/harrow-home-hero.jpg", width: 1920, height: 1440, alt: "Blue Nest Montessori gallery" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nursery Gallery — Blue Nest Montessori",
    description: DESC,
    images: ["/home/branches/harrow/harrow-home-hero.jpg"],
  },
};

export default function GalleryPage() {
  return (
    <PublicLayout>
      <Suspense fallback={<div className="paper-bg min-h-screen" />}>
        <GalleryPageClient />
      </Suspense>
    </PublicLayout>
  );
}
