"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { Heart, Search, X } from "lucide-react";
import { api } from "@/lib/api";
import type { BlogPost } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(tag: string) {
  return tag.toLowerCase().replace(/\s+/g, "-");
}

const KNOWN_COLOURS: Record<string, string> = {
  "forest-school": "#3d8a52",
  "advice":        "#cf7d9c",
  "home-learning": "#5fc8c7",
  "branch-news":   "#3aada9",
  "montessori":    "#c45820",
};

function tagColour(tag: string): string {
  return KNOWN_COLOURS[slugify(tag)] ?? "#7fd8d2";
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ── Like button ───────────────────────────────────────────────────────────────

function LikeButton() {
  const [liked, setLiked] = useState(false);
  return (
    <button
      onClick={(e) => { e.preventDefault(); setLiked((l) => !l); }}
      aria-label={liked ? "Unlike" : "Like"}
      className="flex items-center gap-1.5 transition-colors"
    >
      <Heart
        className="h-4 w-4 transition-all duration-200"
        style={{ color: liked ? "#ef8cab" : "rgba(90,74,66,0.35)" }}
        fill={liked ? "#ef8cab" : "none"}
        strokeWidth={liked ? 0 : 1.5}
      />
    </button>
  );
}

// ── Post card ─────────────────────────────────────────────────────────────────

function PostCard({ post }: { post: BlogPost }) {
  const primaryTag = (post.tags ?? [])[0];

  return (
    <Link href={`/blog/${encodeURIComponent(post.slug)}`} className="group block">
      <article className="flex min-h-[200px] overflow-hidden rounded-[1.4rem] bg-white shadow-[0_2px_12px_rgba(90,74,66,0.07)] ring-1 ring-[rgba(90,74,66,0.04)] transition-shadow duration-200 hover:shadow-[0_6px_24px_rgba(90,74,66,0.12)]">

        {/* Cover image */}
        <div className="relative w-[42%] shrink-0 bg-[rgba(127,216,210,0.10)] sm:w-[38%]">
          {post.cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.cover_image}
              alt={post.title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-5xl" aria-hidden="true">
              📝
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col px-5 py-5 sm:px-7 sm:py-6">

          {/* Author row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(127,216,210,0.22)] text-[0.65rem] font-bold text-[#3aada9]">
                BN
              </div>
              <div className="min-w-0">
                <p className="truncate text-[0.72rem] font-bold text-[var(--ink)]">
                  {post.author_name || "Blue Nest Montessori"}
                </p>
                <p className="text-[0.65rem] text-[rgba(90,74,66,0.45)]">
                  {formatDate(post.published_at)}
                </p>
              </div>
            </div>
            {primaryTag && (
              <span
                className="hidden shrink-0 rounded-full px-2.5 py-0.5 text-[0.62rem] font-bold text-white sm:inline-block"
                style={{ backgroundColor: tagColour(primaryTag) }}
              >
                {primaryTag}
              </span>
            )}
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
          <div className="mt-auto flex items-center justify-end pt-4">
            <LikeButton />
          </div>
        </div>

      </article>
    </Link>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex min-h-[200px] animate-pulse overflow-hidden rounded-[1.4rem] bg-white shadow-[0_2px_12px_rgba(90,74,66,0.07)] ring-1 ring-[rgba(90,74,66,0.04)]">
      <div className="w-[38%] shrink-0 bg-[rgba(90,74,66,0.07)]" />
      <div className="flex flex-1 flex-col gap-3 px-7 py-6">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-[rgba(90,74,66,0.07)]" />
          <div className="h-3 w-32 rounded-full bg-[rgba(90,74,66,0.07)]" />
        </div>
        <div className="h-5 w-3/4 rounded-full bg-[rgba(90,74,66,0.07)]" />
        <div className="h-3 w-full rounded-full bg-[rgba(90,74,66,0.07)]" />
        <div className="h-3 w-5/6 rounded-full bg-[rgba(90,74,66,0.07)]" />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BlogClient() {
  const [posts,       setPosts]       = useState<BlogPost[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [activeTag,   setActiveTag]   = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen,  setSearchOpen]  = useState(false);

  useEffect(() => {
    api.getBlogPosts()
      .then((data) => setPosts(Array.isArray(data) ? (data as BlogPost[]) : []))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load posts"))
      .finally(() => setLoading(false));
  }, []);

  // Build tag list dynamically from the fetched posts
  const tags = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => (p.tags ?? []).forEach((t) => set.add(t)));
    return Array.from(set);
  }, [posts]);

  const filtered = useMemo(() => {
    let result =
      activeTag === "all"
        ? posts
        : posts.filter((p) => (p.tags ?? []).some((t) => slugify(t) === activeTag));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q),
      );
    }
    return result;
  }, [posts, activeTag, searchQuery]);

  return (
    <div className="paper-bg min-h-screen px-4 pb-16 sm:px-6 lg:px-8">
      <div className="container-site">

        {/* ── Top bar ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-[rgba(90,74,66,0.08)] pb-0 pt-10">

          {/* Category tabs */}
          <div className="flex items-center gap-0 overflow-x-auto pb-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setActiveTag("all")}
              className={`relative whitespace-nowrap px-4 pb-3 pt-1 text-[0.82rem] font-bold transition-colors duration-150 ${
                activeTag === "all"
                  ? "text-[#cf7d9c]"
                  : "text-[rgba(90,74,66,0.45)] hover:text-[rgba(90,74,66,0.70)]"
              }`}
            >
              All Posts
              {activeTag === "all" && (
                <span className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-[#cf7d9c]" />
              )}
            </button>

            {tags.map((tag) => {
              const slug = slugify(tag);
              const isActive = activeTag === slug;
              return (
                <button
                  key={tag}
                  onClick={() => setActiveTag(slug)}
                  className={`relative whitespace-nowrap px-4 pb-3 pt-1 text-[0.82rem] font-bold transition-colors duration-150 ${
                    isActive
                      ? "text-[#cf7d9c]"
                      : "text-[rgba(90,74,66,0.45)] hover:text-[rgba(90,74,66,0.70)]"
                  }`}
                >
                  {tag}
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
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-24 text-center">
              <p className="font-heading text-[1.4rem] text-[var(--ink)]">Could not load posts</p>
              <p className="text-[0.82rem] text-[rgba(90,74,66,0.55)]">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-24 text-center">
              <span className="text-5xl" aria-hidden="true">📝</span>
              <p className="font-heading text-[1.6rem] text-[var(--ink)]">
                {posts.length === 0 ? "No posts yet" : "No posts found"}
              </p>
              {posts.length > 0 && (
                <button
                  onClick={() => { setActiveTag("all"); setSearchQuery(""); }}
                  className="text-sm font-bold text-[#5fc8c7] underline underline-offset-2"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            filtered.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </div>

      </div>
    </div>
  );
}
