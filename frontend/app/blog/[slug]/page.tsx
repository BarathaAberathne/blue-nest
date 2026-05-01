import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import BlogPostClient from "./BlogPostClient";

interface Props {
  params: { slug: string };
}

export function generateMetadata({ params }: Props): Metadata {
  const title = params.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title: `${title} — Blue Nest Montessori Blog`,
  };
}

export default function BlogPostPage({ params }: Props) {
  return (
    <PublicLayout>
      <BlogPostClient slug={params.slug} />
    </PublicLayout>
  );
}
