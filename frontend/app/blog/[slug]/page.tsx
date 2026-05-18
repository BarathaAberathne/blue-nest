import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import BlogPostClient from "./BlogPostClient";

interface Props {
  params: Promise<{ slug: string }>;
}

// Single fetch shape — the metadata + JSON-LD both need the same fields,
// so we hit the API once per request (Next caches via `revalidate`).
interface BlogPost {
  title?:        string;
  excerpt?:      string;
  cover_image?:  string;
  author?:       string;
  published_at?: string;
  updated_at?:   string;
}

async function fetchPost(slug: string): Promise<BlogPost | null> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
    const res = await fetch(`${apiBase}/api/v1/blog/posts/${encodeURIComponent(slug)}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return await res.json() as BlogPost;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const fallbackTitle = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const post = await fetchPost(slug);
  if (!post) {
    return {
      title: `${fallbackTitle} — Blue Nest Montessori Blog`,
      alternates: { canonical: `/blog/${slug}` },
    };
  }
  const title = post.title ?? fallbackTitle;
  const desc  = post.excerpt ?? `Read ${title} on the Blue Nest Montessori blog.`;
  const image = post.cover_image ?? "/home/branches/harrow/harrow-home-hero.jpg";
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
      publishedTime: post.published_at,
      modifiedTime:  post.updated_at,
      authors:       post.author ? [post.author] : undefined,
    },
    twitter: { card: "summary_large_image", title, description: desc, images: [image] },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await fetchPost(slug);

  // Article JSON-LD lets the post appear as a rich result with its
  // headline, image, author and dates. Falls back gracefully when the
  // backend hasn't returned a published date.
  const articleJsonLd = post ? {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title ?? slug,
    description: post.excerpt,
    image: post.cover_image
      ? [post.cover_image.startsWith("http") ? post.cover_image : `https://bluenest.uk${post.cover_image}`]
      : ["https://bluenest.uk/home/branches/harrow/harrow-home-hero.jpg"],
    datePublished: post.published_at,
    dateModified:  post.updated_at ?? post.published_at,
    author: {
      "@type": "Person",
      name: post.author ?? "Blue Nest Montessori",
    },
    publisher: {
      "@type": "Organization",
      name: "Blue Nest Montessori School",
      logo: {
        "@type": "ImageObject",
        url: "https://bluenest.uk/home/logo_new.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://bluenest.uk/blog/${slug}`,
    },
  } : null;

  // Breadcrumb trail: Home › Blog › <post title>
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://bluenest.uk/" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://bluenest.uk/blog" },
      { "@type": "ListItem", position: 3, name: post?.title ?? slug, item: `https://bluenest.uk/blog/${slug}` },
    ],
  };

  return (
    <PublicLayout>
      {articleJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <BlogPostClient slug={slug} />
    </PublicLayout>
  );
}
