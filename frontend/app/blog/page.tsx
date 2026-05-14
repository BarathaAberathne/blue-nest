import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import BlogClient from "@/components/blog/BlogClient";

const DESC = "Insights, updates, and parenting resources from the Blue Nest Montessori team.";

export const metadata: Metadata = {
  alternates: { canonical: "/blog" },
  title: "Blog — Blue Nest Montessori School",
  description: DESC,
  openGraph: {
    title: "Blog — Blue Nest Montessori School",
    description: DESC,
    url: "/blog",
    images: [{ url: "/home/montessori-learning.jpeg", width: 1280, height: 854, alt: "Blue Nest Montessori blog" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog — Blue Nest Montessori School",
    description: DESC,
    images: ["/home/montessori-learning.jpeg"],
  },
};

export default function BlogPage() {
  return (
    <PublicLayout>
      <BlogClient />
    </PublicLayout>
  );
}
