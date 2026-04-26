"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useMemo } from "react";
import { Heart, MessageCircle, Eye, Search, X } from "lucide-react";

// ── Data ──────────────────────────────────────────────────────────────────────

type TagSlug = "all" | "forest-school" | "advice" | "home-learning" | "branch-news" | "montessori";

interface BlogPost {
  slug:        string;
  title:       string;
  excerpt:     string;
  date:        string;
  readTime:    string;
  views:       number;
  comments:    number;
  tag:         string;
  tagSlug:     TagSlug;
  tagColour:   string;
  cover:       string;
  coverAlt:    string;
}

const TAG_COLOUR: Record<TagSlug, string> = {
  "all":           "#5a4a42",
  "forest-school": "#3d8a52",
  "advice":        "#cf7d9c",
  "home-learning": "#9a7ec8",
  "branch-news":   "#3aada9",
  "montessori":    "#c45820",
};

const POSTS: BlogPost[] = [
  {
    slug:      "nursery-preparing-primary-school",
    title:     "Nursery School: Preparing Your Child for Primary School",
    excerpt:   "Starting primary school is a significant milestone for both children and parents. A high-quality nursery school plays a vital role in ensuring children are ready — socially, emotionally, and academically — for this next chapter.",
    date:      "24 Apr 2026",
    readTime:  "2 min read",
    views:     0,
    comments:  0,
    tag:       "Advice",
    tagSlug:   "advice",
    tagColour: TAG_COLOUR["advice"],
    cover:     "/home/structured-routine.jpg",
    coverAlt:  "Teacher guiding a child through an activity at Blue Nest",
  },
  {
    slug:      "encourage-curiosity-young-children",
    title:     "Simple Ways to Encourage Curiosity in Young Children",
    excerpt:   "Curiosity is at the heart of how young children learn. From asking endless questions to exploring their surroundings, children are naturally driven to discover. Here's how to nurture that spark at home and in the nursery.",
    date:      "22 Apr 2026",
    readTime:  "3 min read",
    views:     14,
    comments:  2,
    tag:       "Home Learning",
    tagSlug:   "home-learning",
    tagColour: TAG_COLOUR["home-learning"],
    cover:     "/home/DSC_0177.jpg",
    coverAlt:  "Child and educator exploring learning materials together",
  },
  {
    slug:      "montessori-daycare-vs-traditional",
    title:     "Montessori Daycare vs. Traditional Daycare: What's the Difference?",
    excerpt:   "Many parents find themselves weighing up Montessori against traditional childcare. We break down the key differences — from learning environment to daily structure — so you can make the most informed choice for your family.",
    date:      "24 Mar 2026",
    readTime:  "4 min read",
    views:     38,
    comments:  5,
    tag:       "Montessori",
    tagSlug:   "montessori",
    tagColour: TAG_COLOUR["montessori"],
    cover:     "/home/DSC_0151.jpg",
    coverAlt:  "Children working independently with Montessori materials",
  },
  {
    slug:      "why-outdoor-play-matters",
    title:     "Why Outdoor Play Matters More Than You Think",
    excerpt:   "New research continues to affirm what Montessori educators have long known — time in nature is essential for healthy child development. Our Forest School programme puts this into practice every single week.",
    date:      "15 Mar 2026",
    readTime:  "3 min read",
    views:     52,
    comments:  7,
    tag:       "Forest School",
    tagSlug:   "forest-school",
    tagColour: TAG_COLOUR["forest-school"],
    cover:     "/home/outdoor-learning-and-play-area.jpg",
    coverAlt:  "Children exploring the outdoor learning area at Blue Nest",
  },
  {
    slug:      "settling-in-tips",
    title:     "5 Tips to Help Your Child Settle into Nursery",
    excerpt:   "Starting nursery is a milestone for the whole family. Our experienced practitioners share their top advice for a smooth transition — from the first visit to the first full week.",
    date:      "3 Mar 2026",
    readTime:  "3 min read",
    views:     91,
    comments:  11,
    tag:       "Advice",
    tagSlug:   "advice",
    tagColour: TAG_COLOUR["advice"],
    cover:     "/home/outdoor-childrens-play-area2.jpg",
    coverAlt:  "Children playing happily at Blue Nest Pinner",
  },
  {
    slug:      "montessori-at-home",
    title:     "Montessori at Home: Where to Begin",
    excerpt:   "You don't need expensive materials to bring Montessori principles into your home. Here are simple, practical starting points that any family can use to support child-led learning.",
    date:      "20 Feb 2026",
    readTime:  "4 min read",
    views:     124,
    comments:  9,
    tag:       "Home Learning",
    tagSlug:   "home-learning",
    tagColour: TAG_COLOUR["home-learning"],
    cover:     "/home/outdoor-play-for-children-new.jpg",
    coverAlt:  "Children engaged in outdoor discovery at Blue Nest",
  },
];

const TAGS: { value: TagSlug; label: string }[] = [
  { value: "all",           label: "All Posts"     },
  { value: "advice",        label: "Advice"        },
  { value: "montessori",    label: "Montessori"    },
  { value: "home-learning", label: "Home Learning" },
  { value: "forest-school", label: "Forest School" },
  { value: "branch-news",   label: "Branch News"   },
];

// ── Like button ───────────────────────────────────────────────────────────────

function LikeButton({ initial }: { initial: number }) {
  const [liked,   setLiked]   = useState(false);
  const [count,   setCount]   = useState(initial);

  const toggle = () => {
    setLiked((l) => {
      setCount((c) => l ? c - 1 : c + 1);
      return !l;
    });
  };

  return (
    <button
      onClick={(e) => { e.preventDefault(); toggle(); }}
      aria-label={liked ? "Unlike" : "Like"}
      className="flex items-center gap-1.5 transition-colors"
    >
      <Heart
        className="h-4 w-4 transition-all duration-200"
        style={{ color: liked ? "#ef8cab" : "rgba(90,74,66,0.35)" }}
        fill={liked ? "#ef8cab" : "none"}
        strokeWidth={liked ? 0 : 1.5}
      />
      {count > 0 && (
        <span className="text-[0.72rem]" style={{ color: liked ? "#ef8cab" : "rgba(90,74,66,0.38)" }}>
          {count}
        </span>
      )}
    </button>
  );
}

// ── Post card ─────────────────────────────────────────────────────────────────

function PostCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <article className="flex min-h-[200px] overflow-hidden rounded-[1.4rem] bg-white shadow-[0_2px_12px_rgba(90,74,66,0.07)] ring-1 ring-[rgba(90,74,66,0.04)] transition-shadow duration-200 hover:shadow-[0_6px_24px_rgba(90,74,66,0.12)]">

        {/* Cover image — left column */}
        <div className="relative w-[42%] shrink-0 sm:w-[38%]">
          <Image
            src={post.cover}
            alt={post.coverAlt}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 42vw, 38vw"
            loading="lazy"
          />
        </div>

        {/* Content — right column */}
        <div className="flex flex-1 flex-col px-5 py-5 sm:px-7 sm:py-6">

          {/* Author row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Avatar */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(127,216,210,0.22)] text-[0.65rem] font-bold text-[#3aada9]">
                BN
              </div>
              <div className="min-w-0">
                <p className="truncate text-[0.72rem] font-bold text-[var(--ink)]">
                  Blue Nest Montessori School
                </p>
                <p className="text-[0.65rem] text-[rgba(90,74,66,0.45)]">
                  {post.date} &nbsp;·&nbsp; {post.readTime}
                </p>
              </div>
            </div>
            {/* Tag pill */}
            <span
              className="hidden shrink-0 rounded-full px-2.5 py-0.5 text-[0.62rem] font-bold text-white sm:inline-block"
              style={{ backgroundColor: post.tagColour }}
            >
              {post.tag}
            </span>
          </div>

          {/* Title */}
          <h2 className="mt-3 font-heading text-[1.2rem] leading-tight text-[var(--ink)] transition-colors duration-150 group-hover:text-[#5fc8c7] sm:text-[1.35rem]">
            {post.title}
          </h2>

          {/* Excerpt */}
          <p className="mt-2 line-clamp-2 text-[0.8rem] leading-[1.65] text-[rgba(90,74,66,0.60)] sm:line-clamp-3">
            {post.excerpt}
          </p>

          {/* Footer */}
          <div className="mt-auto flex items-center justify-between pt-4">
            <div className="flex items-center gap-3 text-[0.68rem] text-[rgba(90,74,66,0.38)]">
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                {post.views} view{post.views !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                {post.comments} comment{post.comments !== 1 ? "s" : ""}
              </span>
            </div>
            <LikeButton initial={0} />
          </div>
        </div>

      </article>
    </Link>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BlogClient() {
  const [activeTag,     setActiveTag]     = useState<TagSlug>("all");
  const [searchQuery,   setSearchQuery]   = useState("");
  const [searchOpen,    setSearchOpen]    = useState(false);

  const filtered = useMemo(() => {
    let posts = activeTag === "all" ? POSTS : POSTS.filter((p) => p.tagSlug === activeTag);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      posts = posts.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q)
      );
    }
    return posts;
  }, [activeTag, searchQuery]);

  return (
    <div className="paper-bg min-h-screen px-4 pb-16 sm:px-6 lg:px-8">
      <div className="container-site">

        {/* ── Top bar ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-[rgba(90,74,66,0.08)] pb-0 pt-10">

          {/* Category tabs */}
          <div className="flex items-center gap-0 overflow-x-auto pb-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TAGS.map(({ value, label }) => {
              const isActive = activeTag === value;
              return (
                <button
                  key={value}
                  onClick={() => setActiveTag(value)}
                  className={`relative whitespace-nowrap px-4 pb-3 pt-1 text-[0.82rem] font-bold transition-colors duration-150 ${
                    isActive
                      ? "text-[#cf7d9c]"
                      : "text-[rgba(90,74,66,0.45)] hover:text-[rgba(90,74,66,0.70)]"
                  }`}
                >
                  {label}
                  {/* Active underline */}
                  {isActive && (
                    <span className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-[#cf7d9c]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="ml-4 flex shrink-0 items-center">
            {searchOpen ? (
              <div className="flex items-center gap-2 rounded-full border border-[rgba(90,74,66,0.18)] bg-white px-3 py-1.5 shadow-sm">
                <Search className="h-3.5 w-3.5 shrink-0 text-[rgba(90,74,66,0.40)]" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search posts…"
                  className="w-40 bg-transparent text-[0.78rem] text-[var(--ink)] outline-none placeholder:text-[rgba(90,74,66,0.35)] sm:w-52"
                />
                <button
                  onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                  className="text-[rgba(90,74,66,0.35)] transition hover:text-[var(--ink)]"
                  aria-label="Close search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                aria-label="Search posts"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[rgba(90,74,66,0.45)] transition hover:bg-[rgba(90,74,66,0.06)] hover:text-[var(--ink)]"
              >
                <Search className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── Post list ────────────────────────────────────────── */}
        <div className="mt-6 space-y-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-24 text-center">
              <span className="text-5xl" aria-hidden="true">📝</span>
              <p className="font-heading text-[1.6rem] text-[var(--ink)]">No posts found</p>
              <button
                onClick={() => { setActiveTag("all"); setSearchQuery(""); }}
                className="text-sm font-bold text-[#5fc8c7] underline underline-offset-2"
              >
                Clear filters
              </button>
            </div>
          ) : (
            filtered.map((post) => <PostCard key={post.slug} post={post} />)
          )}
        </div>

      </div>
    </div>
  );
}
