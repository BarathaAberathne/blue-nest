"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft, Calendar, Clock, User,
  Heart, Share2, X, MessageCircle, Send, ChevronLeft,
} from "lucide-react";
import { marked } from "marked";
import { api } from "@/lib/api";
import type { BlogPost, Comment } from "@/types";

marked.use({ breaks: true, gfm: true });

// ── Helpers ───────────────────────────────────────────────────────────────────
const KNOWN_COLOURS: Record<string, string> = {
  "forest-school": "#3d8a52",
  "advice":        "#cf7d9c",
  "home-learning": "#5fc8c7",
  "branch-news":   "#3aada9",
  "montessori":    "#c45820",
};

function slugify(s: string) { return s.toLowerCase().replace(/\s+/g, "-"); }
function tagColour(tag: string) { return KNOWN_COLOURS[slugify(tag)] ?? "#7fd8d2"; }

function formatDate(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
function formatCommentDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function readingTime(html: string) {
  const words = html.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// ── Reading progress bar ──────────────────────────────────────────────────────
function ReadingProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      setPct(total > 0 ? (el.scrollTop / total) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-[rgba(90,74,66,0.06)]">
      <div
        className="h-full bg-[#7fd8d2] transition-[width] duration-75"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Floating like / share sidebar (desktop only) ──────────────────────────────
function FloatingActions({
  likes, liked, shared, onLike, onShare,
}: {
  likes: number; liked: boolean; shared: boolean;
  onLike: () => void; onShare: () => void;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed left-6 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-4 xl:flex transition-all duration-300 ${visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"}`}
    >
      <button
        onClick={onLike}
        disabled={liked}
        aria-label={liked ? "Liked" : "Like"}
        className="group flex flex-col items-center gap-1"
      >
        <span className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all duration-200 ${liked ? "border-[#ef8cab] bg-[rgba(239,140,171,0.12)]" : "border-[rgba(90,74,66,0.15)] bg-white hover:border-[#ef8cab] hover:bg-[rgba(239,140,171,0.08)]"}`}>
          <Heart
            className="h-5 w-5 transition-all duration-200"
            style={{ color: liked ? "#ef8cab" : "rgba(90,74,66,0.40)" }}
            fill={liked ? "#ef8cab" : "none"}
            strokeWidth={liked ? 0 : 1.5}
          />
        </span>
        {likes > 0 && (
          <span className="text-[0.65rem] font-bold text-[rgba(90,74,66,0.45)]">{likes}</span>
        )}
      </button>

      <button
        onClick={onShare}
        aria-label="Share"
        className="group flex flex-col items-center gap-1"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[rgba(90,74,66,0.15)] bg-white transition-all duration-200 hover:border-[#7fd8d2] hover:bg-[rgba(127,216,210,0.08)]">
          <Share2
            className="h-4.5 w-4.5 text-[rgba(90,74,66,0.40)] transition group-hover:text-[#3aada9]"
            style={{ width: 18, height: 18 }}
            strokeWidth={1.8}
          />
        </span>
        {shared && (
          <span className="text-[0.65rem] font-bold text-[#3aada9]">Copied!</span>
        )}
      </button>
    </div>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// ── Comments ──────────────────────────────────────────────────────────────────
function CommentsSection({ slug }: { slug: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [name,     setName]     = useState("");
  const [body,     setBody]     = useState("");
  const [submitting, setSub]    = useState(false);
  const [submitErr,  setErr]    = useState<string | null>(null);
  const [submitted,  setDone]   = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    api.getComments(slug)
      .then((d) => setComments(Array.isArray(d) ? (d as Comment[]) : []))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !body.trim()) return;
    setSub(true); setErr(null);
    try {
      const c = await api.addComment(slug, { name: name.trim(), body: body.trim() }) as Comment;
      setComments((p) => [...p, c]);
      setName(""); setBody("");
      setDone(true); setTimeout(() => setDone(false), 3500);
    } catch (err) {
      setErr(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setSub(false);
    }
  };

  const avatarColours = [
    "#7fd8d2","#cf7d9c","#3d8a52","#c45820","#3aada9","#f4aac8",
  ];
  const avatarBg = (name: string) =>
    avatarColours[name.charCodeAt(0) % avatarColours.length];

  return (
    <section className="mt-14">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-7">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(95,200,199,0.15)]">
          <MessageCircle className="h-4.5 w-4.5 text-[#3aada9]" style={{ width: 18, height: 18 }} strokeWidth={1.8} />
        </div>
        <h2 className="font-heading text-[1.25rem] text-[var(--ink)]">
          {loading ? "Comments" : comments.length === 0 ? "Be the first to comment" : `${comments.length} Comment${comments.length !== 1 ? "s" : ""}`}
        </h2>
      </div>

      {/* Comment list */}
      {!loading && comments.length > 0 && (
        <div className="mb-8 space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3.5">
              {/* Avatar */}
              <div
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[0.68rem] font-bold text-white"
                style={{ backgroundColor: avatarBg(c.name) }}
              >
                {initials(c.name)}
              </div>
              {/* Bubble */}
              <div className="flex-1 rounded-[1.1rem] rounded-tl-sm bg-white px-4 py-3.5 shadow-[0_2px_10px_rgba(90,74,66,0.06)] ring-1 ring-[rgba(90,74,66,0.04)]">
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <span className="text-[0.82rem] font-bold text-[var(--ink)]">{c.name}</span>
                  <span className="shrink-0 text-[0.68rem] text-[rgba(90,74,66,0.38)]">{formatCommentDate(c.created_at)}</span>
                </div>
                <p className="text-[0.84rem] leading-[1.7] text-[rgba(90,74,66,0.72)]">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comment form */}
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="rounded-[1.4rem] bg-white p-6 shadow-[0_4px_24px_rgba(90,74,66,0.08)] ring-1 ring-[rgba(90,74,66,0.04)]"
      >
        <h3 className="mb-4 font-heading text-[1rem] text-[var(--ink)]">Leave a comment</h3>

        {submitErr && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-[0.78rem] text-red-600">
            <X className="h-3.5 w-3.5 shrink-0" /> {submitErr}
          </div>
        )}
        {submitted && (
          <div className="mb-3 rounded-xl bg-[rgba(95,200,199,0.12)] px-4 py-2.5 text-[0.78rem] font-semibold text-[#3aada9]">
            Your comment has been posted!
          </div>
        )}

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
          className="mb-3 w-full rounded-xl border border-[rgba(90,74,66,0.12)] bg-[var(--paper)] px-4 py-2.5 text-[0.88rem] text-[var(--ink)] outline-none transition placeholder:text-[rgba(90,74,66,0.35)] focus:border-[#7fd8d2] focus:ring-2 focus:ring-[rgba(127,216,210,0.18)]"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share your thoughts…"
          required
          rows={3}
          className="w-full resize-none rounded-xl border border-[rgba(90,74,66,0.12)] bg-[var(--paper)] px-4 py-2.5 text-[0.88rem] text-[var(--ink)] outline-none transition placeholder:text-[rgba(90,74,66,0.35)] focus:border-[#7fd8d2] focus:ring-2 focus:ring-[rgba(127,216,210,0.18)]"
        />
        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={submitting || !name.trim() || !body.trim()}
            className="inline-flex items-center gap-2 rounded-full bg-[#5fc8c7] px-6 py-2.5 text-[0.82rem] font-bold text-white shadow-[0_4px_12px_rgba(95,200,199,0.30)] transition hover:bg-[#3aada9] hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
          >
            <Send className="h-3.5 w-3.5" />
            {submitting ? "Posting…" : "Post Comment"}
          </button>
        </div>
      </form>
    </section>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function BlogPostClient({ slug }: { slug: string }) {
  const [post,    setPost]    = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [likes,   setLikes]   = useState(0);
  const [liked,   setLiked]   = useState(false);
  const [shared,  setShared]  = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    api.getBlogPost(slug)
      .then((data) => {
        const p = data as BlogPost;
        setPost(p);
        setLikes(p.like_count ?? 0);
        setLiked(typeof window !== "undefined" && localStorage.getItem(`liked:${p.slug}`) === "1");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Post not found"))
      .finally(() => setLoading(false));
  }, [slug]);

  const htmlBody = useMemo(() => {
    if (!post?.body) return "";
    return String(marked.parse(post.body));
  }, [post]);

  const readTime = useMemo(() => readingTime(htmlBody), [htmlBody]);

  const handleLike = useCallback(async () => {
    if (liked || !post) return;
    setLiked(true); setLikes((n) => n + 1);
    localStorage.setItem(`liked:${post.slug}`, "1");
    try {
      const res = await api.likePost(post.slug);
      setLikes((res as { like_count: number }).like_count);
    } catch { /* keep optimistic */ }
  }, [liked, post]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
      try { await navigator.share({ title: post?.title, url }); return; } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      setShared(true); setTimeout(() => setShared(false), 2500);
    } catch { window.prompt("Copy this link:", url); }
  }, [post]);

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="paper-bg min-h-screen">
        <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-[rgba(90,74,66,0.06)]">
          <div className="h-full w-1/3 animate-pulse bg-[#7fd8d2]" />
        </div>
        <div className="mx-auto max-w-[720px] px-5 py-14 sm:px-8 animate-pulse space-y-6">
          <div className="h-3 w-20 rounded-full bg-[rgba(90,74,66,0.08)]" />
          <div className="h-10 w-3/4 rounded-xl bg-[rgba(90,74,66,0.08)]" />
          <div className="h-10 w-1/2 rounded-xl bg-[rgba(90,74,66,0.08)]" />
          <div className="flex gap-3">
            <div className="h-9 w-9 rounded-full bg-[rgba(90,74,66,0.08)]" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 w-32 rounded-full bg-[rgba(90,74,66,0.08)]" />
              <div className="h-2.5 w-24 rounded-full bg-[rgba(90,74,66,0.08)]" />
            </div>
          </div>
          <div className="aspect-video rounded-[1.4rem] bg-[rgba(90,74,66,0.08)]" />
          <div className="space-y-3 pt-4">
            {[100, 92, 96, 88, 100, 75].map((w, i) => (
              <div key={i} className="h-3 rounded-full bg-[rgba(90,74,66,0.07)]" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────────
  if (error || !post) {
    return (
      <div className="paper-bg min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="font-heading text-[2rem] text-[var(--ink)]">Post not found</p>
          <p className="mt-2 text-[0.85rem] text-[rgba(90,74,66,0.55)]">{error}</p>
          <Link href="/blog" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#5fc8c7] underline underline-offset-2">
            <ArrowLeft className="h-4 w-4" /> Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  const tags    = post.tags ?? [];
  const gallery = post.gallery_images ?? [];

  return (
    <>
      <ReadingProgress />

      {lightbox && <Lightbox src={lightbox} alt={post.title} onClose={() => setLightbox(null)} />}

      <FloatingActions
        likes={likes} liked={liked} shared={shared}
        onLike={handleLike} onShare={handleShare}
      />

      <div className="paper-bg min-h-screen pb-24">

        {/* ── Top nav ───────────────────────────────────────────────────────── */}
        <div className="mx-auto max-w-[720px] px-5 pt-10 sm:px-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.78rem] font-semibold text-[rgba(90,74,66,0.50)] transition hover:bg-[rgba(90,74,66,0.05)] hover:text-[var(--ink)]"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            All Posts
          </Link>
        </div>

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <header className="mx-auto max-w-[720px] px-5 pt-6 sm:px-8">

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-3 py-1 text-[0.68rem] font-bold uppercase tracking-wide text-white"
                  style={{ backgroundColor: tagColour(tag) }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="font-heading text-[2.2rem] leading-[1.18] text-[var(--ink)] sm:text-[2.8rem]">
            {post.title}
          </h1>

          {/* Author row */}
          <div className="mt-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(127,216,210,0.28)] text-[0.72rem] font-bold text-[#3aada9]">
                {post.author_name ? initials(post.author_name) : "BN"}
              </div>
              <div>
                <p className="text-[0.85rem] font-semibold text-[var(--ink)]">
                  {post.author_name || "Blue Nest Montessori"}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[0.72rem] text-[rgba(90,74,66,0.48)]">
                  {post.published_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" strokeWidth={1.8} />
                      {formatDate(post.published_at)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" strokeWidth={1.8} />
                    {readTime}
                  </span>
                </div>
              </div>
            </div>

            {/* Like + Share — inline (visible on all sizes, floating sidebar on xl) */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleLike}
                disabled={liked}
                aria-label={liked ? "Liked" : "Like this post"}
                className="flex items-center gap-1.5 rounded-full border border-[rgba(90,74,66,0.12)] bg-white px-3.5 py-2 text-[0.75rem] font-semibold shadow-sm transition hover:border-[#ef8cab] hover:bg-[rgba(239,140,171,0.06)] disabled:cursor-default"
                style={{ color: liked ? "#ef8cab" : "rgba(90,74,66,0.50)" }}
              >
                <Heart
                  className="h-3.5 w-3.5"
                  fill={liked ? "#ef8cab" : "none"}
                  strokeWidth={liked ? 0 : 1.5}
                />
                <span>{liked ? (likes > 0 ? likes : "Liked") : (likes > 0 ? likes : "Like")}</span>
              </button>

              <button
                onClick={handleShare}
                aria-label="Share"
                className="flex items-center gap-1.5 rounded-full border border-[rgba(90,74,66,0.12)] bg-white px-3.5 py-2 text-[0.75rem] font-semibold text-[rgba(90,74,66,0.50)] shadow-sm transition hover:border-[#7fd8d2] hover:text-[#3aada9]"
              >
                <Share2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                {shared ? "Copied!" : "Share"}
              </button>
            </div>
          </div>
        </header>

        {/* ── Cover image ───────────────────────────────────────────────────── */}
        {post.cover_image && (
          <div className="mx-auto mt-8 max-w-[720px] px-5 sm:px-8">
            <div className="overflow-hidden rounded-[1.6rem] shadow-[0_8px_32px_rgba(90,74,66,0.13)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.cover_image}
                alt={post.title}
                className="aspect-video w-full object-cover"
              />
            </div>
          </div>
        )}

        {/* ── Article body ──────────────────────────────────────────────────── */}
        <article className="mx-auto max-w-[680px] px-5 sm:px-8">

          {/* Lead / excerpt */}
          {post.excerpt && (
            <p className="mt-8 border-l-[3px] border-[#7fd8d2] pl-5 text-[1.05rem] font-medium leading-[1.75] text-[rgba(90,74,66,0.75)] italic">
              {post.excerpt}
            </p>
          )}

          {/* Divider */}
          <div className="my-8 flex items-center gap-3">
            <div className="flex-1 h-px bg-[rgba(90,74,66,0.08)]" />
            <div className="flex gap-1">
              {["#7fd8d2","#f4aac8","#f7d774"].map((c) => (
                <div key={c} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="flex-1 h-px bg-[rgba(90,74,66,0.08)]" />
          </div>

          {/* Markdown body */}
          <div
            className="blog-prose"
            dangerouslySetInnerHTML={{ __html: htmlBody }}
          />

          {/* Gallery */}
          {gallery.length > 0 && (
            <div className="mt-12">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex-1 h-px bg-[rgba(90,74,66,0.08)]" />
                <span className="text-[0.72rem] font-bold uppercase tracking-widest text-[rgba(90,74,66,0.40)]">Gallery</span>
                <div className="flex-1 h-px bg-[rgba(90,74,66,0.08)]" />
              </div>
              <div className={`grid gap-3 ${gallery.length === 1 ? "grid-cols-1" : gallery.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
                {gallery.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setLightbox(src)}
                    className={`group relative overflow-hidden rounded-[1rem] bg-[rgba(127,216,210,0.10)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7fd8d2] ${gallery.length >= 3 && i === 0 ? "col-span-2 aspect-video sm:col-span-1 sm:aspect-square" : "aspect-square"}`}
                    aria-label={`View image ${i + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`Gallery ${i + 1}`}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 rounded-[1rem] bg-black/0 transition-colors duration-200 group-hover:bg-black/12" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <CommentsSection slug={post.slug} />

        </article>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <div className="mx-auto mt-14 max-w-[680px] border-t border-[rgba(90,74,66,0.08)] px-5 pt-8 sm:px-8">
          <div className="flex items-center justify-between">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 rounded-full bg-[#f4aac8] px-6 py-2.5 font-heading text-[0.95rem] leading-none tracking-[0.04em] text-white shadow-[0_4px_14px_rgba(244,170,200,0.30)] transition hover:-translate-y-0.5 hover:bg-[#e8719a]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Blog
            </Link>
            <div className="flex items-center gap-1.5 text-[0.72rem] text-[rgba(90,74,66,0.40)]">
              <Clock className="h-3 w-3" strokeWidth={1.8} />
              {readTime}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
