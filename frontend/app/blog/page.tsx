import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import BlogClient from "@/components/blog/BlogClient";

const DESC = "Montessori parenting guides, early-years development tips and nursery news from the Blue Nest team. Best age to start nursery, settling-in advice, language development milestones, forest school and play-based learning.";

export const metadata: Metadata = {
  alternates: { canonical: "/blog" },
  title: "Montessori Parenting Blog — Early Years Tips & Guides",
  description: DESC,
  openGraph: {
    title: "Montessori Parenting Blog — Blue Nest Montessori",
    description: DESC,
    url: "/blog",
    images: [{ url: "/home/branches/harrow/harrow-home-hero.jpg", width: 1920, height: 1440, alt: "Blue Nest Montessori parenting blog" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Montessori Parenting Blog — Blue Nest Montessori",
    description: DESC,
    images: ["/home/branches/harrow/harrow-home-hero.jpg"],
  },
};

export default function BlogPage() {
  return (
    <PublicLayout>
      <BlogClient />
    </PublicLayout>
  );
}
