import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import PublicLayout from "@/components/layout/PublicLayout";
import Doodle from "@/components/ui/Doodle";
import GalleryPageClient from "@/components/gallery/GalleryPageClient";

const DESC = "Step inside Blue Nest Montessori — photos and videos of Montessori classrooms, forest school, outdoor play and enrichment activities at our Harrow, Pinner and Borehamwood nurseries.";

export const metadata: Metadata = {
  alternates: { canonical: "/gallery" },
  title: "Nursery Gallery — Photos & Videos",
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
      {/* Server-rendered intro — gives crawlers a real H1, structured copy
          and named categories before the client gallery hydrates. */}
      <section className="paper-bg relative px-4 pt-10 pb-6 sm:px-6 lg:px-8 lg:pt-14 lg:pb-8">
        <Doodle kind="leaf"        className="left-[2%]  top-8 h-9 w-9 opacity-45 hidden sm:block" />
        <Doodle kind="pink-flower" className="right-[3%] top-8 h-9 w-9 opacity-45 hidden lg:block" />

        <div className="container-site">
          <div className="mx-auto max-w-2xl text-center">
            <span className="section-kicker">A peek inside</span>
            <h1 className="mt-3 font-heading text-[2.1rem] leading-tight text-[var(--ink)] sm:text-[2.5rem]">
              Blue Nest Montessori Gallery
            </h1>
            <p className="body-text mt-4">
              Photos and short videos from across our{" "}
              <Link href="/branches/harrow" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">Harrow</Link>
              ,{" "}
              <Link href="/branches/pinner" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">Pinner</Link>{" "}
              and{" "}
              <Link href="/branches/borehamwood" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">Borehamwood</Link>{" "}
              Montessori day nurseries. Filter by branch and category to see prepared
              classrooms, outdoor garden play, weekly enrichment and our{" "}
              <Link href="/forest-school" className="underline decoration-[var(--rose)]/60 underline-offset-4 hover:text-[var(--ink)]">forest school programme</Link>
              .
            </p>
          </div>
        </div>
      </section>

      <Suspense fallback={<div className="paper-bg min-h-screen" />}>
        <GalleryPageClient />
      </Suspense>
    </PublicLayout>
  );
}
