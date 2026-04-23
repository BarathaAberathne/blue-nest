import type { Metadata } from "next";
import Link from "next/link";
import PublicLayout from "@/components/layout/PublicLayout";
import PageWrapper from "@/components/ui/PageWrapper";

export const metadata: Metadata = { title: "Blog" };

const placeholderPosts = [
  { slug: "why-outdoor-play-matters", title: "Why Outdoor Play Matters More Than You Think", excerpt: "New research continues to affirm what Montessori educators have long known — time in nature is essential for healthy child development.", date: "12 April 2026", tag: "Forest School" },
  { slug: "settling-in-tips", title: "5 Tips to Help Your Child Settle into Nursery", excerpt: "Starting nursery is a milestone for the whole family. Our experienced practitioners share their top advice for a smooth transition.", date: "3 April 2026", tag: "Advice" },
  { slug: "montessori-at-home", title: "Montessori at Home: Where to Begin", excerpt: "You don't need expensive materials to bring Montessori principles into your home. Here are simple, practical starting points.", date: "24 March 2026", tag: "Home Learning" },
  { slug: "harrow-branch-news", title: "Spring Update from Our Harrow Branch", excerpt: "A look at what the children have been exploring this term, from gardening to practical life skills.", date: "15 March 2026", tag: "Branch News" },
];

export default function BlogPage() {
  return (
    <PublicLayout>
      <PageWrapper>
        <h1 className="section-title mb-2">Blog</h1>
        <p className="section-subtitle max-w-2xl mb-10">
          Insights, updates, and resources from the Blue Nest Montessori team.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {placeholderPosts.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="card hover:shadow-md transition-shadow group">
              <div className="aspect-video bg-brand-50 flex items-center justify-center text-4xl text-brand-200 rounded-t-2xl">
                📝
              </div>
              <div className="p-5">
                <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">{p.tag}</span>
                <h3 className="font-heading font-semibold text-gray-900 group-hover:text-brand-700 transition-colors mt-2 leading-snug">
                  {p.title}
                </h3>
                <p className="text-sm text-gray-500 mt-2 line-clamp-3">{p.excerpt}</p>
                <p className="text-xs text-gray-400 mt-3">{p.date}</p>
              </div>
            </Link>
          ))}
        </div>
      </PageWrapper>
    </PublicLayout>
  );
}
