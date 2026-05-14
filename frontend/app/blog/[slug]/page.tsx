import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import BlogPostClient from "./BlogPostClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const fallbackTitle = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
    const res  = await fetch(`${apiBase}/api/v1/blog/posts/${encodeURIComponent(slug)}`, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error("not found");
    const post = await res.json() as { title?: string; excerpt?: string; cover_image?: string };
    const title = post.title ?? fallbackTitle;
    const desc  = post.excerpt ?? `Read ${title} on the Blue Nest Montessori blog.`;
    const image = post.cover_image ?? "/home/montessori-learning.jpeg";
    const url   = `/blog/${slug}`;
    return {
      title,
      description: desc,
      alternates: { canonical: url },
      openGraph: {
        title,
        description: desc,
        url,
        images: [{ url: image, alt: title }],
        type: "article",
      },
      twitter: { card: "summary_large_image", title, description: desc, images: [image] },
    };
  } catch {
    return {
      title: `${fallbackTitle} — Blue Nest Montessori Blog`,
      alternates: { canonical: `/blog/${slug}` },
    };
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  return (
    <PublicLayout>
      <BlogPostClient slug={slug} />
    </PublicLayout>
  );
}
