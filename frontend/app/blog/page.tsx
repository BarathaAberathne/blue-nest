import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, MessageCircle, PoundSterling, TreePine } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import Doodle from "@/components/ui/Doodle";
import BlogClient from "@/components/blog/BlogClient";

const DESC = "Montessori parenting guides, early-years development tips and nursery news from the Blue Nest team. Best age to start nursery, settling-in advice, language development milestones, forest school and play-based learning.";

// Topic clusters — each tile points at a hub destination on the site so
// crawlers find structured internal links above the (often empty)
// client-side blog list, and parents can navigate even when the post
// they're looking for hasn't been migrated yet.
const TOPIC_CLUSTERS = [
  {
    href:  "/why-montessori",
    icon:  BookOpen,
    color: "#cf7d9c",
    bg:    "rgba(246,213,223,0.35)",
    title: "Montessori method",
    desc:  "How Montessori learning works, independence, school readiness and language development.",
  },
  {
    href:  "/forest-school",
    icon:  TreePine,
    color: "#5fc8c7",
    bg:    "rgba(127,216,210,0.18)",
    title: "Forest school",
    desc:  "Outdoor learning, nature confidence and our forest school programme in Harrow.",
  },
  {
    href:  "/admission/our-fees",
    icon:  PoundSterling,
    color: "#f0bd55",
    bg:    "rgba(247,215,116,0.22)",
    title: "Fees & funded childcare",
    desc:  "Estimate weekly fees, 15 and 30 hours funded childcare, sibling and staff discounts.",
  },
  {
    href:  "/admission/holiday-club",
    icon:  MessageCircle,
    color: "#b89bdd",
    bg:    "rgba(185,159,224,0.20)",
    title: "Holiday club",
    desc:  "School holiday childcare for ages 2-5 across Harrow, Pinner and Borehamwood.",
  },
];

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
      {/* Server-rendered intro — H1, structured topic clusters and internal
          links rendered for crawlers regardless of which posts are live. */}
      <section className="paper-bg relative px-4 pt-12 pb-8 sm:px-6 lg:px-8 lg:pt-16 lg:pb-10">
        <Doodle kind="leaf"        className="left-[2%]  top-10 h-9 w-9 opacity-45 hidden sm:block" />
        <Doodle kind="pink-flower" className="right-[3%] top-10 h-9 w-9 opacity-45 hidden lg:block" />

        <div className="container-site">
          <div className="mx-auto max-w-2xl text-center">
            <span className="section-kicker">Blue Nest blog</span>
            <h1 className="mt-3 font-heading text-[2.1rem] leading-tight text-[var(--ink)] sm:text-[2.5rem]">
              Montessori parenting, early years and nursery news
            </h1>
            <p className="body-text mt-4">
              Practical Montessori parenting guides, early years development tips, settling-in
              advice, language milestones and stories from our Harrow, Pinner and Borehamwood
              nurseries. Written by the Blue Nest team for families of children aged 3 months
              to 5 years.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TOPIC_CLUSTERS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="group flex h-full flex-col rounded-[2rem] px-6 py-6 ring-1 ring-[rgba(90,74,66,0.07)] shadow-[0_4px_16px_rgba(90,74,66,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(90,74,66,0.10)]"
                style={{ background: t.bg }}
              >
                <span className="mb-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/70 shadow-[0_2px_8px_rgba(90,74,66,0.08)]">
                  <t.icon className="h-4 w-4" style={{ color: t.color }} strokeWidth={1.8} />
                </span>
                <h2 className="font-heading text-[1.15rem] leading-snug" style={{ color: t.color }}>
                  {t.title}
                </h2>
                <p className="body-text mt-2 flex-1 text-sm">{t.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: t.color }}>
                  Explore <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <BlogClient />
    </PublicLayout>
  );
}
