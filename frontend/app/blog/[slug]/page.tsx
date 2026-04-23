import type { Metadata } from "next";
import Link from "next/link";
import PublicLayout from "@/components/layout/PublicLayout";
import PageWrapper from "@/components/ui/PageWrapper";

interface Props {
  params: { slug: string };
}

export function generateMetadata({ params }: Props): Metadata {
  return { title: params.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) };
}

export default function BlogPostPage({ params }: Props) {
  return (
    <PublicLayout>
      <PageWrapper>
        <div className="max-w-2xl mx-auto">
          <Link href="/blog" className="text-sm text-brand-600 hover:underline mb-6 inline-block">
            ← Back to Blog
          </Link>

          {/* Placeholder post */}
          <div className="aspect-video bg-brand-50 flex items-center justify-center text-6xl text-brand-200 rounded-2xl mb-8">
            📝
          </div>

          <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">Article</span>
          <h1 className="section-title mt-3 mb-4">
            {params.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </h1>
          <p className="text-sm text-gray-400 mb-8">Published by Blue Nest Team</p>

          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 leading-relaxed">
              This is a placeholder article for <strong>{params.slug}</strong>. Blog post content will be loaded
              from the API at <code>/api/v1/blog/posts/{"{slug}"}</code> once the CMS integration is complete.
            </p>
            <p className="text-gray-600 leading-relaxed mt-4">
              The Blue Nest Montessori blog will feature expert advice from our practitioners, updates from each
              branch, Forest School stories, home learning guides, and more.
            </p>
          </div>
        </div>
      </PageWrapper>
    </PublicLayout>
  );
}
