import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import PageWrapper from "@/components/ui/PageWrapper";

export const metadata: Metadata = { title: "Gallery" };

const placeholderImages = Array.from({ length: 12 }, (_, i) => i + 1);

export default function GalleryPage() {
  return (
    <PublicLayout>
      <PageWrapper>
        <h1 className="section-title mb-4">Gallery</h1>
        <p className="section-subtitle max-w-2xl mb-10">
          A glimpse into life at Blue Nest Montessori — from creative play to Forest School adventures.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {placeholderImages.map((n) => (
            <div key={n} className="aspect-square rounded-xl bg-brand-50 flex items-center justify-center text-brand-200 text-3xl">
              🌿
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-gray-400 mt-8">Gallery content managed via CMS — coming soon.</p>
      </PageWrapper>
    </PublicLayout>
  );
}
