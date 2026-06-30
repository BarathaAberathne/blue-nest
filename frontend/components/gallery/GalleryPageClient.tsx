"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  Play,
  Send,
  Share2,
  X,
  ZoomIn,
} from "lucide-react";
import Doodle from "@/components/ui/Doodle";
import PastelButton from "@/components/ui/PastelButton";
import { Reveal } from "@/components/ui/Motion";
import { useOrientationReflow } from "@/lib/use-orientation-reflow";
import {
  GALLERY_ITEMS,
  BRANCH_COLOURS,
  CATEGORY_LABELS,
  type ContentType,
  type BranchFilter,
  type CategoryFilter,
  type GalleryItem,
} from "@/lib/gallery-data";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LocalComment {
  id:         string;
  name:       string;
  body:       string;
  created_at: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TAB_CONFIG: { type: ContentType; label: string; activeClass: string }[] = [
  { type: "photo",  label: "Photos",  activeClass: "bg-[#f4aac8] text-white shadow-md" },
  { type: "video",  label: "Videos",  activeClass: "bg-[#5fc8c7] text-white shadow-md" },
];

const BRANCHES: { value: BranchFilter; label: string }[] = [
  { value: "all",         label: "All Branches" },
  { value: "harrow",      label: "Harrow"       },
  { value: "pinner",      label: "Pinner"       },
  { value: "borehamwood", label: "Borehamwood"  },
];

const CATEGORIES: { value: CategoryFilter; label: string }[] = [
  { value: "all",       label: "All"       },
  { value: "classroom", label: "Classroom" },
  { value: "outdoor",   label: "Outdoor"   },
  { value: "events",    label: "Events"    },
  { value: "learning",  label: "Learning"  },
];

const CARD_ROTATIONS = ["rotate-[-0.8deg]", "rotate-[0.5deg]", "rotate-[-0.3deg]"];

// ── Sub-components ────────────────────────────────────────────────────────────

function BranchPill({ branch, small }: { branch: Exclude<BranchFilter, "all">; small?: boolean }) {
  const colour = BRANCH_COLOURS[branch];
  const label  = branch.charAt(0).toUpperCase() + branch.slice(1);
  return (
    <span
      className={`inline-block rounded-full font-bold capitalize ${small ? "px-2 py-0.5 text-[0.65rem]" : "px-3 py-1 text-[0.72rem]"} text-white`}
      style={{ backgroundColor: colour }}
    >
      {label}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function GalleryPageClient() {
  const searchParams = useSearchParams();

  const [activeTab,      setActiveTab]      = useState<ContentType>("photo");
  const [activeBranch,   setActiveBranch]   = useState<BranchFilter>("all");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [previewItem,    setPreviewItem]    = useState<GalleryItem | null>(null);

  // Like state — persisted to localStorage
  const [likedItems, setLikedItems] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const s = localStorage.getItem("gallery-likes");
      return s ? new Set(JSON.parse(s) as string[]) : new Set();
    } catch { return new Set(); }
  });

  // Tracks which item's share button just showed "Copied!"
  const [sharedItemId, setSharedItemId] = useState<string | null>(null);
  const shareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Filtered data ──────────────────────────────────────────────────────────

  const filtered = useMemo(
    () => GALLERY_ITEMS.filter(
      (item) =>
        item.isPublic &&
        item.type === activeTab &&
        (activeBranch   === "all" || item.branch   === activeBranch) &&
        (activeCategory === "all" || item.category === activeCategory)
    ),
    [activeTab, activeBranch, activeCategory]
  );

  const featured   = useMemo(() => filtered.filter((i) => i.featured).slice(0, 3), [filtered]);
  const navPhotos  = useMemo(() => filtered.filter((i) => i.type === "photo"), [filtered]);
  const navIdx     = previewItem?.type === "photo"
    ? navPhotos.findIndex((i) => i.id === previewItem.id)
    : -1;

  // ── Deep-link: open item from ?item= query param ───────────────────────────

  useEffect(() => {
    const itemId = searchParams.get("item");
    if (!itemId) return;
    const item = GALLERY_ITEMS.find((i) => i.id === itemId && i.isPublic);
    if (!item) return;
    if (item.type !== "update") setActiveTab(item.type as ContentType);
    setPreviewItem(item);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Preview navigation ─────────────────────────────────────────────────────

  const closePreview = useCallback(() => setPreviewItem(null), []);

  const prevPhoto = useCallback(() => {
    setPreviewItem((cur) => {
      if (!cur || cur.type !== "photo") return cur;
      const idx = navPhotos.findIndex((i) => i.id === cur.id);
      return idx > 0 ? navPhotos[idx - 1] : cur;
    });
  }, [navPhotos]);

  const nextPhoto = useCallback(() => {
    setPreviewItem((cur) => {
      if (!cur || cur.type !== "photo") return cur;
      const idx = navPhotos.findIndex((i) => i.id === cur.id);
      return idx !== -1 && idx < navPhotos.length - 1 ? navPhotos[idx + 1] : cur;
    });
  }, [navPhotos]);

  // ── Keyboard handler ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!previewItem) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape")      closePreview();
      if (previewItem.type === "photo") {
        if (e.key === "ArrowLeft")  prevPhoto();
        if (e.key === "ArrowRight") nextPhoto();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [previewItem, closePreview, prevPhoto, nextPhoto]);

  // ── Like handler ───────────────────────────────────────────────────────────

  const handleLike = useCallback((itemId: string) => {
    setLikedItems((prev) => {
      if (prev.has(itemId)) return prev;
      const next = new Set(prev);
      next.add(itemId);
      try { localStorage.setItem("gallery-likes", JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);

  // ── Share handler ──────────────────────────────────────────────────────────

  const handleShare = useCallback(async (item: GalleryItem) => {
    const url = `${window.location.origin}/gallery?item=${item.id}`;
    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
      try { await navigator.share({ title: item.title, url }); return; } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy link:", url);
      return;
    }
    if (shareTimerRef.current) clearTimeout(shareTimerRef.current);
    setSharedItemId(item.id);
    shareTimerRef.current = setTimeout(() => setSharedItemId(null), 2500);
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const accentColour =
    activeTab === "photo"  ? "#f4aac8" :
    activeTab === "video"  ? "#5fc8c7" : "#7fd8d2";

  const clearFilters = () => { setActiveBranch("all"); setActiveCategory("all"); };
  const hasActiveFilter = activeBranch !== "all" || activeCategory !== "all";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ════════════════════════════════════════════════════
          PAGE HEADER
      ════════════════════════════════════════════════════ */}
      <div className="paper-bg px-4 pb-4 pt-10 sm:px-6 lg:px-8">
        <div className="container-site">
          <h1 className="font-heading text-[2.2rem] leading-none text-[var(--ink)]">Gallery</h1>
          <p className="mt-1.5 text-sm text-[rgba(90,74,66,0.85)]">
            Photos and videos from our nurseries
          </p>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          STICKY CHIP BAR
      ════════════════════════════════════════════════════ */}
      <div className="paper-bg sticky top-[72px] z-30 border-b border-[rgba(90,74,66,0.07)] px-4 py-3 sm:px-6 lg:px-8">
        <div className="container-site space-y-2.5">

          <div className="flex items-center gap-1.5">
            {TAB_CONFIG.map(({ type, label, activeClass }) => (
              <button
                key={type}
                onClick={() => { setActiveTab(type); clearFilters(); }}
                className={`rounded-full px-5 py-1.5 font-heading text-[1rem] transition-all duration-200 ${
                  activeTab === type
                    ? activeClass
                    : "text-[rgba(90,74,66,0.85)] hover:bg-[rgba(90,74,66,0.06)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {BRANCHES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setActiveBranch(value)}
                className={`whitespace-nowrap rounded-full border px-3.5 py-1 text-[0.75rem] font-bold transition-all duration-150 ${
                  activeBranch === value
                    ? "border-transparent text-white"
                    : "border-[rgba(90,74,66,0.14)] text-[rgba(90,74,66,0.85)] hover:border-[rgba(90,74,66,0.28)]"
                }`}
                style={activeBranch === value ? { backgroundColor: accentColour } : {}}
              >
                {label}
              </button>
            ))}

            <span className="mx-1 h-4 w-px shrink-0 bg-[rgba(90,74,66,0.15)]" aria-hidden="true" />

            {CATEGORIES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setActiveCategory(value)}
                className={`whitespace-nowrap rounded-full border px-3.5 py-1 text-[0.75rem] font-bold transition-all duration-150 ${
                  activeCategory === value
                    ? "border-transparent text-white"
                    : "border-[rgba(90,74,66,0.14)] text-[rgba(90,74,66,0.85)] hover:border-[rgba(90,74,66,0.28)]"
                }`}
                style={activeCategory === value ? { backgroundColor: accentColour } : {}}
              >
                {label}
              </button>
            ))}

            {hasActiveFilter && (
              <>
                <span className="mx-1 h-4 w-px shrink-0 bg-[rgba(90,74,66,0.15)]" aria-hidden="true" />
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 whitespace-nowrap rounded-full border border-[rgba(90,74,66,0.14)] px-3.5 py-1 text-[0.75rem] font-bold text-[rgba(90,74,66,0.85)] transition hover:border-[rgba(90,74,66,0.30)] hover:text-[var(--ink)]"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              </>
            )}

            <span className="ml-2 shrink-0 text-[0.72rem] text-[rgba(90,74,66,0.85)]">
              {filtered.length} {activeTab === "photo" ? "photo" : activeTab === "video" ? "video" : "update"}{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          FEATURED STRIP
      ════════════════════════════════════════════════════ */}
      {featured.length > 0 && (
        <section className="paper-bg px-4 pb-2 pt-8 sm:px-6 lg:px-8">
          <div className="container-site">
            <p className="mb-4 text-[0.65rem] font-extrabold uppercase tracking-[0.2em]" style={{ color: "#cf7d9c" }}>
              Featured Moments
            </p>
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {featured.map((item, i) => (
                <Reveal key={item.id} delay={i * 0.08} className="h-full">
                  <FeaturedCard
                    item={item}
                    rotation={CARD_ROTATIONS[i % CARD_ROTATIONS.length]}
                    liked={likedItems.has(item.id)}
                    shared={sharedItemId === item.id}
                    onPreview={() => setPreviewItem(item)}
                    onLike={() => handleLike(item.id)}
                    onShare={() => handleShare(item)}
                  />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════
          MAIN CONTENT GRID
      ════════════════════════════════════════════════════ */}
      <section className="paper-bg px-4 pb-12 pt-8 sm:px-6 lg:px-8 lg:pb-16">
        <div className="container-site">
          {filtered.length === 0 ? (
            <EmptyState onClear={clearFilters} />
          ) : activeTab === "photo" ? (
            <PhotoGrid
              items={filtered}
              likedItems={likedItems}
              sharedItemId={sharedItemId}
              onOpen={(item) => setPreviewItem(item)}
              onLike={handleLike}
              onShare={handleShare}
            />
          ) : activeTab === "video" ? (
            <VideoGrid
              items={filtered}
              likedItems={likedItems}
              sharedItemId={sharedItemId}
              onOpen={(item) => setPreviewItem(item)}
              onLike={handleLike}
              onShare={handleShare}
            />
          ) : (
            <UpdatesGrid items={filtered} />
          )}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          CTA
      ════════════════════════════════════════════════════ */}
      <section className="chalk-bg relative overflow-hidden px-4 py-14 sm:px-6 lg:px-8 lg:py-18">
        <Doodle kind="blue-bird"   className="right-[5%]  top-10   h-10 w-10 opacity-50 hidden sm:block" />
        <Doodle kind="leaf"        className="right-[16%] bottom-6 h-10 w-10 opacity-40 hidden lg:block" />
        <Doodle kind="pink-flower" className="left-[20%]  bottom-8 h-9  w-9  opacity-45 hidden md:block" />
        <div className="container-site">
          <Reveal>
            <div className="mx-auto max-w-xl text-center">
              <h2 className="font-heading text-[2.6rem] leading-[1.15] text-white sm:text-[2.9rem]">
                Stay Connected
              </h2>
              <p className="body-text mt-3 text-white/85">
                Get updates from our nurseries, see what your children are up to, and join our community.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <PastelButton href="/contact" variant="butter">
                  Contact Us <ArrowRight className="h-4 w-4" />
                </PastelButton>
                <PastelButton href="/contact?enquiry=arrange-a-visit" variant="blush">
                  Book a Tour <ArrowRight className="h-4 w-4" />
                </PastelButton>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          UNIFIED MEDIA PREVIEW
      ════════════════════════════════════════════════════ */}
      {previewItem && (
        <MediaPreview
          item={previewItem}
          photoItems={previewItem.type === "photo" ? navPhotos : undefined}
          photoIndex={navIdx >= 0 ? navIdx : undefined}
          liked={likedItems.has(previewItem.id)}
          shared={sharedItemId === previewItem.id}
          onClose={closePreview}
          onPrev={prevPhoto}
          onNext={nextPhoto}
          onLike={() => handleLike(previewItem.id)}
          onShare={() => handleShare(previewItem)}
        />
      )}
    </>
  );
}

// ── Featured Card ─────────────────────────────────────────────────────────────

function FeaturedCard({
  item, rotation, liked, shared, onPreview, onLike, onShare,
}: {
  item:      GalleryItem;
  rotation:  string;
  liked:     boolean;
  shared:    boolean;
  onPreview: () => void;
  onLike:    () => void;
  onShare:   () => void;
}) {
  const isVideo = item.type === "video";
  const imgSrc  = isVideo ? item.thumbnailSrc! : item.src!;

  return (
    <article
      className={`group h-full bg-white p-3 transition-all duration-300 ${rotation} hover:scale-[1.03] hover:rotate-0 rounded-[1.8rem] shadow-[0_8px_28px_rgba(90,74,66,0.10)]`}
    >
      {/* Clickable image area */}
      <div
        className="photo-tone relative aspect-[4/3] cursor-pointer overflow-hidden rounded-[1.2rem]"
        onClick={onPreview}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onPreview()}
        aria-label={`View ${item.title}`}
      >
        <Image
          src={imgSrc}
          alt={item.alt ?? item.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#5fc8c7] shadow-lg transition-transform duration-200 group-hover:scale-110">
              <Play className="ml-1 h-6 w-6 text-white" fill="white" />
            </div>
          </div>
        )}
        {item.duration && (
          <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-[0.68rem] text-white">
            {item.duration}
          </span>
        )}
      </div>

      {/* Card footer */}
      <div className="px-2 pb-2 pt-3">
        <p className="font-heading text-[1.05rem] leading-snug text-[var(--ink)]">{item.title}</p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <BranchPill branch={item.branch} small />
            <span className="text-[0.65rem] text-[rgba(90,74,66,0.85)]">{formatDate(item.date)}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={onLike}
              disabled={liked}
              aria-label={liked ? "Liked" : "Like"}
              className="flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-[rgba(239,140,171,0.10)] disabled:cursor-default"
            >
              <Heart
                className="h-3.5 w-3.5"
                style={{ color: liked ? "#ef8cab" : "rgba(90,74,66,0.38)" }}
                fill={liked ? "#ef8cab" : "none"}
                strokeWidth={liked ? 0 : 1.8}
              />
            </button>
            <button
              onClick={onShare}
              aria-label="Share"
              className="flex h-7 items-center gap-1 rounded-full px-1.5 text-[0.62rem] font-bold text-[rgba(90,74,66,0.85)] transition hover:bg-[rgba(127,216,210,0.10)] hover:text-[#3aada9]"
            >
              <Share2 className="h-3 w-3" strokeWidth={1.8} />
              {shared && <span className="text-[#3aada9]">Copied!</span>}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

// ── Photo Grid ────────────────────────────────────────────────────────────────

function PhotoGrid({
  items, likedItems, sharedItemId, onOpen, onLike, onShare,
}: {
  items:        GalleryItem[];
  likedItems:   Set<string>;
  sharedItemId: string | null;
  onOpen:       (item: GalleryItem) => void;
  onLike:       (id: string) => void;
  onShare:      (item: GalleryItem) => void;
}) {
  // Recompute the multi-column masonry + re-trigger lazy images after an
  // orientation change (WebKit/Safari doesn't re-balance columns on rotation).
  const gridRef = useRef<HTMLDivElement>(null);
  useOrientationReflow(gridRef);
  return (
    <div ref={gridRef} className="columns-2 gap-4 sm:columns-3 lg:columns-4 [column-fill:_balance]">
      {items.map((item) => {
        const isLiked  = likedItems.has(item.id);
        const isShared = sharedItemId === item.id;
        return (
          <div key={item.id} className="mb-4 break-inside-avoid">
            <div className="group rounded-[1.6rem] bg-white p-2.5 shadow-[0_4px_16px_rgba(90,74,66,0.08)] ring-1 ring-[rgba(90,74,66,0.04)]">
              {/* Clickable image */}
              <button
                className="relative w-full cursor-pointer overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5fc8c7]"
                onClick={() => onOpen(item)}
                aria-label={`View ${item.title}`}
              >
                <div className="photo-tone relative overflow-hidden rounded-[1.2rem]">
                  <Image
                    src={item.src!}
                    alt={item.alt ?? item.title}
                    width={400}
                    height={Math.round(400 * (item.aspectRatio ?? 0.75))}
                    className="block w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 flex items-center justify-center rounded-[1.2rem] bg-[rgba(90,74,66,0.18)] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <div className="flex flex-col items-center gap-1.5">
                      <ZoomIn className="h-7 w-7 text-white drop-shadow" />
                      <span className="text-[0.75rem] font-bold text-white drop-shadow">View</span>
                    </div>
                  </div>
                </div>
              </button>
              {/* Footer */}
              <div className="flex items-center justify-between px-1 pb-1 pt-2">
                <BranchPill branch={item.branch} small />
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onLike(item.id)}
                    disabled={isLiked}
                    aria-label={isLiked ? "Liked" : "Like"}
                    className="flex h-6 w-6 items-center justify-center rounded-full transition hover:bg-[rgba(239,140,171,0.10)] disabled:cursor-default"
                  >
                    <Heart
                      className="h-3 w-3"
                      style={{ color: isLiked ? "#ef8cab" : "rgba(90,74,66,0.35)" }}
                      fill={isLiked ? "#ef8cab" : "none"}
                      strokeWidth={isLiked ? 0 : 1.8}
                    />
                  </button>
                  <button
                    onClick={() => onShare(item)}
                    aria-label="Share"
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[rgba(90,74,66,0.85)] transition hover:bg-[rgba(127,216,210,0.10)] hover:text-[#3aada9]"
                  >
                    {isShared
                      ? <span className="text-[0.55rem] font-bold text-[#3aada9]">✓</span>
                      : <Share2 className="h-3 w-3" strokeWidth={1.8} />
                    }
                  </button>
                  <span className="text-[0.62rem] text-[rgba(90,74,66,0.85)]">{formatDate(item.date)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Video Grid ────────────────────────────────────────────────────────────────

function VideoGrid({
  items, likedItems, sharedItemId, onOpen, onLike, onShare,
}: {
  items:        GalleryItem[];
  likedItems:   Set<string>;
  sharedItemId: string | null;
  onOpen:       (item: GalleryItem) => void;
  onLike:       (id: string) => void;
  onShare:      (item: GalleryItem) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const isLiked  = likedItems.has(item.id);
        const isShared = sharedItemId === item.id;
        return (
          <div
            key={item.id}
            className="overflow-hidden rounded-[1.8rem] bg-white shadow-[0_4px_16px_rgba(90,74,66,0.08)] ring-1 ring-[rgba(90,74,66,0.04)]"
          >
            {/* Clickable thumbnail */}
            <button
              className="group relative w-full cursor-pointer overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5fc8c7]"
              onClick={() => onOpen(item)}
              aria-label={`Play ${item.title}`}
            >
              <div className="relative aspect-video overflow-hidden">
                <Image
                  src={item.thumbnailSrc ?? "/home/structured-routine.jpg"}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors duration-200 group-hover:bg-black/30">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#5fc8c7] shadow-[0_6px_20px_rgba(95,200,199,0.45)] transition-transform duration-200 group-hover:scale-110">
                    <Play className="ml-1 h-7 w-7 text-white" fill="white" />
                  </div>
                </div>
                {item.duration && (
                  <span className="absolute bottom-2 right-2 rounded-md bg-black/65 px-2 py-0.5 text-[0.68rem] text-white">
                    {item.duration}
                  </span>
                )}
              </div>
            </button>
            {/* Body */}
            <div className="px-5 py-4">
              <p className="font-heading text-[1.15rem] leading-snug text-[var(--ink)]">{item.title}</p>
              {item.description && (
                <p className="mt-1 line-clamp-2 text-sm leading-[1.6] text-[rgba(90,74,66,0.85)]">
                  {item.description}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BranchPill branch={item.branch} small />
                  <span className="text-[0.65rem] text-[rgba(90,74,66,0.85)]">{formatDate(item.date)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onLike(item.id)}
                    disabled={isLiked}
                    aria-label={isLiked ? "Liked" : "Like"}
                    className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.72rem] font-semibold transition hover:bg-[rgba(239,140,171,0.08)] disabled:cursor-default"
                    style={{ color: isLiked ? "#ef8cab" : "rgba(90,74,66,0.45)" }}
                  >
                    <Heart className="h-3.5 w-3.5" fill={isLiked ? "#ef8cab" : "none"} strokeWidth={isLiked ? 0 : 1.5} />
                  </button>
                  <button
                    onClick={() => onShare(item)}
                    aria-label="Share"
                    className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.72rem] font-semibold text-[rgba(90,74,66,0.85)] transition hover:bg-[rgba(127,216,210,0.08)] hover:text-[#3aada9]"
                  >
                    <Share2 className="h-3 w-3" strokeWidth={1.8} />
                    <span>{isShared ? "Copied!" : "Share"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Updates Grid ──────────────────────────────────────────────────────────────

const UPDATE_BORDER_COLOURS: Record<Exclude<BranchFilter, "all">, string> = {
  harrow:      "#E99FC1",  // rose — matches Harrow brand token
  pinner:      "#7ECFC8",  // teal — matches Pinner brand token
  borehamwood: "#BFD3A1",  // sage — matches Borehamwood brand token
};

function UpdatesGrid({ items }: { items: GalleryItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-[2rem] bg-white px-7 py-6 shadow-[0_4px_16px_rgba(90,74,66,0.08)]"
          style={{ borderLeft: `4px solid ${UPDATE_BORDER_COLOURS[item.branch]}` }}
        >
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-3 py-1 text-[0.68rem] font-bold text-white"
              style={{ backgroundColor: UPDATE_BORDER_COLOURS[item.branch] }}
            >
              {CATEGORY_LABELS[item.category]}
            </span>
            <span className="text-[0.68rem] text-[rgba(90,74,66,0.85)]">{formatDate(item.date)}</span>
          </div>
          <h3 className="mt-3 font-heading text-[1.3rem] leading-snug text-[var(--ink)]">
            {item.title}
          </h3>
          <p className="mt-2 line-clamp-3 text-sm leading-[1.7] text-[rgba(90,74,66,0.85)]">
            {item.excerpt}
          </p>
          <div className="mt-4 flex items-center justify-between">
            <BranchPill branch={item.branch} small />
            {item.href && (
              <Link
                href={item.href}
                className="flex items-center gap-1 text-sm font-bold text-[#5fc8c7] transition hover:text-[#3db0af]"
              >
                Read more <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5 py-20 text-center">
      <Doodle kind="pink-flower" className="h-16 w-16 opacity-60" />
      <h3 className="font-heading text-[1.9rem] text-[var(--ink)]">Nothing here yet</h3>
      <p className="body-text max-w-sm text-sm">
        Check back soon — we&rsquo;re always adding new moments from our nurseries.
      </p>
      <PastelButton variant="mint" onClick={onClear}>
        Clear filters
      </PastelButton>
    </div>
  );
}

// ── Media Preview (unified — photos with nav, videos with player) ─────────────

function MediaPreview({
  item, photoItems, photoIndex, liked, shared,
  onClose, onPrev, onNext, onLike, onShare,
}: {
  item:        GalleryItem;
  photoItems?: GalleryItem[];
  photoIndex?: number;
  liked:       boolean;
  shared:      boolean;
  onClose:     () => void;
  onPrev?:     () => void;
  onNext?:     () => void;
  onLike:      () => void;
  onShare:     () => void;
}) {
  const isVideo     = item.type === "video";
  const canNavigate = !isVideo && photoItems && photoItems.length > 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-[var(--ink)] shadow transition hover:bg-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Media — fixed height, does not scroll */}
        <div className="shrink-0">
          {isVideo ? (
            <div className="aspect-video bg-black">
              {item.youtubeId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${item.youtubeId}?autoplay=1&rel=0`}
                  title={item.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              ) : item.src ? (
                <video src={item.src} controls autoPlay className="h-full w-full" />
              ) : null}
            </div>
          ) : (
            <div className="photo-tone relative h-[52vh] bg-[#faf8f6]">
              <Image
                src={item.src!}
                alt={item.alt ?? item.title}
                fill
                className="object-contain"
                sizes="(max-width: 1280px) 100vw, 1280px"
              />
            </div>
          )}
        </div>

        {/* Caption + Like + Share */}
        <div className="shrink-0 flex items-center justify-between gap-3 border-t border-[rgba(90,74,66,0.08)] px-5 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <p className="truncate font-heading text-[1.05rem] text-[var(--ink)]">{item.title}</p>
            <BranchPill branch={item.branch} small />
            <span className="hidden shrink-0 text-[0.72rem] text-[rgba(90,74,66,0.85)] sm:block">
              {formatDate(item.date)}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={onLike}
              disabled={liked}
              aria-label={liked ? "Liked" : "Like"}
              className="flex items-center gap-1.5 rounded-full border border-[rgba(90,74,66,0.12)] bg-white px-3 py-1.5 text-[0.75rem] font-semibold shadow-sm transition hover:border-[#ef8cab] hover:bg-[rgba(239,140,171,0.06)] disabled:cursor-default"
              style={{ color: liked ? "#ef8cab" : "rgba(90,74,66,0.50)" }}
            >
              <Heart className="h-3.5 w-3.5" fill={liked ? "#ef8cab" : "none"} strokeWidth={liked ? 0 : 1.5} />
              <span>{liked ? "Liked" : "Like"}</span>
            </button>
            <button
              onClick={onShare}
              aria-label="Share"
              className="flex items-center gap-1.5 rounded-full border border-[rgba(90,74,66,0.12)] bg-white px-3 py-1.5 text-[0.75rem] font-semibold text-[rgba(90,74,66,0.85)] shadow-sm transition hover:border-[#7fd8d2] hover:text-[#3aada9]"
            >
              <Share2 className="h-3.5 w-3.5" strokeWidth={1.8} />
              <span>{shared ? "Copied!" : "Share"}</span>
            </button>
          </div>
        </div>

        {/* Comments — scrollable */}
        <div className="overflow-y-auto border-t border-[rgba(90,74,66,0.06)] px-6 pb-6">
          <GalleryCommentsSection itemId={item.id} />
        </div>

        {/* Prev / Next (photos only) */}
        {canNavigate && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
              aria-label="Previous"
              className="absolute left-3 top-[26vh] z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-[var(--ink)] shadow transition hover:bg-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onNext?.(); }}
              aria-label="Next"
              className="absolute right-3 top-[26vh] z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-[var(--ink)] shadow transition hover:bg-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute left-1/2 top-[calc(52vh-1.75rem)] z-10 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-[0.72rem] text-white">
              {(photoIndex ?? 0) + 1} / {photoItems!.length}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ── Gallery Comments (localStorage-backed) ────────────────────────────────────

function GalleryCommentsSection({ itemId }: { itemId: string }) {
  const storageKey = `gallery-comments:${itemId}`;

  const [comments,   setComments] = useState<LocalComment[]>([]);
  const [name,       setName]     = useState("");
  const [body,       setBody]     = useState("");
  const [submitting, setSub]      = useState(false);
  const [submitted,  setDone]     = useState(false);

  // Load comments for this item (re-runs when item changes)
  useEffect(() => {
    try {
      const s = localStorage.getItem(storageKey);
      setComments(s ? JSON.parse(s) : []);
    } catch { setComments([]); }
  }, [storageKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !body.trim()) return;
    setSub(true);
    const c: LocalComment = {
      id:         Date.now().toString(),
      name:       name.trim(),
      body:       body.trim(),
      created_at: new Date().toISOString(),
    };
    const updated = [...comments, c];
    setComments(updated);
    try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch {}
    setName(""); setBody("");
    setDone(true); setTimeout(() => setDone(false), 3000);
    setSub(false);
  };

  const AVATAR_COLS = ["#7fd8d2","#cf7d9c","#3d8a52","#c45820","#3aada9","#f4aac8"];
  const avatarBg = (n: string) => AVATAR_COLS[n.charCodeAt(0) % AVATAR_COLS.length];
  const initials  = (n: string) => n.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const fmtDate   = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <section className="mt-5">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(95,200,199,0.15)]">
          <MessageCircle className="h-4 w-4 text-[#3aada9]" strokeWidth={1.8} />
        </div>
        <h2 className="font-heading text-[1.1rem] text-[var(--ink)]">
          {comments.length === 0
            ? "Be the first to comment"
            : `${comments.length} Comment${comments.length !== 1 ? "s" : ""}`}
        </h2>
      </div>

      {comments.length > 0 && (
        <div className="mb-5 space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-bold text-white"
                style={{ backgroundColor: avatarBg(c.name) }}
              >
                {initials(c.name)}
              </div>
              <div className="flex-1 rounded-[1rem] rounded-tl-sm bg-[rgba(90,74,66,0.03)] px-4 py-3 ring-1 ring-[rgba(90,74,66,0.05)]">
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="text-[0.8rem] font-bold text-[var(--ink)]">{c.name}</span>
                  <span className="shrink-0 text-[0.65rem] text-[rgba(90,74,66,0.85)]">{fmtDate(c.created_at)}</span>
                </div>
                <p className="text-[0.82rem] leading-[1.65] text-[rgba(90,74,66,0.85)]">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-[1.2rem] bg-[rgba(90,74,66,0.025)] p-5 ring-1 ring-[rgba(90,74,66,0.06)]"
      >
        <h3 className="mb-3 font-heading text-[0.95rem] text-[var(--ink)]">Leave a comment</h3>
        {submitted && (
          <div className="mb-3 rounded-xl bg-[rgba(95,200,199,0.12)] px-4 py-2 text-[0.75rem] font-semibold text-[#3aada9]">
            Comment posted!
          </div>
        )}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
          className="mb-2.5 w-full rounded-xl border border-[rgba(90,74,66,0.12)] bg-white px-4 py-2 text-[0.85rem] text-[var(--ink)] outline-none placeholder:text-[rgba(90,74,66,0.85)] focus:border-[#7fd8d2] focus:ring-2 focus:ring-[rgba(127,216,210,0.18)]"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share your thoughts…"
          required
          rows={3}
          className="w-full resize-none rounded-xl border border-[rgba(90,74,66,0.12)] bg-white px-4 py-2 text-[0.85rem] text-[var(--ink)] outline-none placeholder:text-[rgba(90,74,66,0.85)] focus:border-[#7fd8d2] focus:ring-2 focus:ring-[rgba(127,216,210,0.18)]"
        />
        <div className="mt-2.5 flex justify-end">
          <button
            type="submit"
            disabled={submitting || !name.trim() || !body.trim()}
            className="inline-flex items-center gap-2 rounded-full bg-[#5fc8c7] px-5 py-2 text-[0.8rem] font-bold text-white shadow-[0_4px_12px_rgba(95,200,199,0.28)] transition hover:bg-[#3aada9] hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
          >
            <Send className="h-3 w-3" />
            {submitting ? "Posting…" : "Post Comment"}
          </button>
        </div>
      </form>
    </section>
  );
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day:   "numeric",
    month: "short",
    year:  "numeric",
  });
}
