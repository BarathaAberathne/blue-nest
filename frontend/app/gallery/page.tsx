import { Suspense } from "react";
import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import GalleryPageClient from "@/components/gallery/GalleryPageClient";

const DESC = "Explore photos, videos, and updates from Blue Nest Montessori — Harrow, Pinner, and Borehamwood.";

export const metadata: Metadata = {
  alternates: { canonical: "/gallery" },
  title: "Gallery — Blue Nest Montessori School",
  description: DESC,
  openGraph: {
    title: "Gallery — Blue Nest Montessori School",
    description: DESC,
    url: "/gallery",
    images: [{ url: "/home/montessori-learning.jpeg", width: 1280, height: 854, alt: "Blue Nest Montessori gallery" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gallery — Blue Nest Montessori School",
    description: DESC,
    images: ["/home/montessori-learning.jpeg"],
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
