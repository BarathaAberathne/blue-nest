"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  Play,
} from "lucide-react";
import Doodle from "@/components/ui/Doodle";
import PastelButton from "@/components/ui/PastelButton";
import { Reveal } from "@/components/ui/Motion";
import {
  GALLERY_ITEMS,
  BRANCH_COLOURS,
  CATEGORY_LABELS,
  type ContentType,
  type BranchFilter,
  type CategoryFilter,
  type GalleryItem,
} from "@/lib/gallery-data";

// ── Constants ─────────────────────────────────────────────────────────────────

const TAB_CONFIG: { type: ContentType; label: string; activeClass: string }[] = [
  { type: "photo",  label: "Photos",  activeClass: "bg-[#f4aac8] text-white shadow-md" },
  { type: "video",  label: "Videos",  activeClass: "bg-[#5fc8c7] text-white shadow-md" },
  { type: "update", label: "Updates", activeClass: "bg-[#7fd8d2] text-white shadow-md" },
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
  const [activeTab,      setActiveTab]      = useState<ContentType>("photo");
  const [activeBranch,   setActiveBranch]   = useState<BranchFilter>("all");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [lightboxIndex,  setLightboxIndex]  = useState<number | null>(null);
  const [videoItem,      setVideoItem]      = useState<GalleryItem | null>(null);

  // ── Filtered data ──────────────────────────────────────────────────────────

  const filtered = GALLERY_ITEMS.filter(
    (item) =>
      item.isPublic &&
      item.type === activeTab &&
      (activeBranch   === "all" || item.branch   === activeBranch)   &&
      (activeCategory === "all" || item.category === activeCategory)
  );

  const featured      = filtered.filter((i) => i.featured).slice(0, 3);
  const filteredPhotos = filtered.filter((i) => i.type === "photo");

  // ── Lightbox navigation ───────────────────────────────────────────────────

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const prevPhoto     = useCallback(() =>
    setLightboxIndex((i) => (i !== null ? (i - 1 + filteredPhotos.length) % filteredPhotos.length : null)),
    [filteredPhotos.length]
  );
  const nextPhoto = useCallback(() =>
    setLightboxIndex((i) => (i !== null ? (i + 1) % filteredPhotos.length : null)),
    [filteredPhotos.length]
  );

  useEffect(() => {
    if (lightboxIndex === null && videoItem === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { closeLightbox(); setVideoItem(null); }
      if (lightboxIndex !== null) {
        if (e.key === "ArrowLeft")  prevPhoto();
        if (e.key === "ArrowRight") nextPhoto();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIndex, videoItem, closeLightbox, prevPhoto, nextPhoto]);

  // ── Tab-aware accent colour ───────────────────────────────────────────────

  const accentColour =
    activeTab === "photo"  ? "#f4aac8" :
    activeTab === "video"  ? "#5fc8c7" :
    "#7fd8d2";

  const clearFilters = () => { setActiveBranch("all"); setActiveCategory("all"); };

  const hasActiveFilter = activeBranch !== "all" || activeCategory !== "all";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ════════════════════════════════════════════════════
          PAGE HEADER — compact, no background image
      ════════════════════════════════════════════════════ */}
      <div className="paper-bg px-4 pb-4 pt-10 sm:px-6 lg:px-8">
        <div className="container-site">
          <h1 className="font-heading text-[2.2rem] leading-none text-[var(--ink)]">Gallery</h1>
          <p className="mt-1.5 text-sm text-[rgba(90,74,66,0.52)]">
            Photos, videos and updates from our nurseries
          </p>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          STICKY CHIP BAR — content type + branch + category
      ════════════════════════════════════════════════════ */}
      <div className="paper-bg sticky top-[72px] z-30 border-b border-[rgba(90,74,66,0.07)] px-4 py-3 sm:px-6 lg:px-8">
        <div className="container-site space-y-2.5">

          {/* Row 1: content-type tabs (always visible, not scrollable) */}
          <div className="flex items-center gap-1.5">
            {TAB_CONFIG.map(({ type, label, activeClass }) => (
              <button
                key={type}
                onClick={() => { setActiveTab(type); clearFilters(); }}
                className={`rounded-full px-5 py-1.5 font-heading text-[1rem] transition-all duration-200 ${
                  activeTab === type
                    ? activeClass
                    : "text-[rgba(90,74,66,0.55)] hover:bg-[rgba(90,74,66,0.06)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Row 2: branch + category chips — single scrollable strip */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {BRANCHES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setActiveBranch(value)}
                className={`whitespace-nowrap rounded-full border px-3.5 py-1 text-[0.75rem] font-bold transition-all duration-150 ${
                  activeBranch === value
                    ? "border-transparent text-white"
                    : "border-[rgba(90,74,66,0.14)] text-[rgba(90,74,66,0.58)] hover:border-[rgba(90,74,66,0.28)]"
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
                    : "border-[rgba(90,74,66,0.14)] text-[rgba(90,74,66,0.58)] hover:border-[rgba(90,74,66,0.28)]"
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
                  className="flex items-center gap-1 whitespace-nowrap rounded-full border border-[rgba(90,74,66,0.14)] px-3.5 py-1 text-[0.75rem] font-bold text-[rgba(90,74,66,0.50)] transition hover:border-[rgba(90,74,66,0.30)] hover:text-[var(--ink)]"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              </>
            )}

            <span className="ml-2 shrink-0 text-[0.72rem] text-[rgba(90,74,66,0.38)]">
              {filtered.length} {activeTab === "photo" ? "photo" : activeTab === "video" ? "video" : "update"}{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          FEATURED STRIP (only when there are featured items)
      ════════════════════════════════════════════════════ */}
      {featured.length > 0 && (
        <>
          <section className="paper-bg px-4 pb-2 pt-8 sm:px-6 lg:px-8">
            <div className="container-site">
              <p
                className="mb-4 text-[0.65rem] font-extrabold uppercase tracking-[0.2em]"
                style={{ color: "#cf7d9c" }}
              >
                Featured Moments
              </p>

              <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
                {featured.map((item, i) => (
                  <Reveal key={item.id} delay={i * 0.08} className="h-full">
                    <FeaturedCard
                      item={item}
                      rotation={CARD_ROTATIONS[i % CARD_ROTATIONS.length]}
                      onPhotoClick={() => {
                        if (item.type === "photo") {
                          const idx = filteredPhotos.findIndex((p) => p.id === item.id);
                          if (idx !== -1) { setActiveTab("photo"); setLightboxIndex(idx); }
                        }
                        if (item.type === "video") setVideoItem(item);
                      }}
                    />
                  </Reveal>
                ))}
              </div>
            </div>
          </section>

        </>
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
              onOpen={(idx) => setLightboxIndex(idx)}
            />
          ) : activeTab === "video" ? (
            <VideoGrid items={filtered} onOpen={setVideoItem} />
          ) : (
            <UpdatesGrid items={filtered} />
          )}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          CTA
      ════════════════════════════════════════════════════ */}

      <section className="chalk-bg relative overflow-hidden px-4 py-14 sm:px-6 lg:px-8 lg:py-18">
        <Doodle kind="solidstar" className="left-[6%]   top-10   h-9  w-9  text-[#f7d774]/70" />
        <Doodle kind="bird"      className="right-[5%]  top-10   h-10 w-10 text-white/50 hidden sm:block" />
        <Doodle kind="leaf"      className="right-[16%] bottom-6 h-10 w-10 text-white/40 hidden lg:block" />
        <Doodle kind="flower"    className="left-[20%]  bottom-8 h-9  w-9  text-[#f4aac8]/55 hidden md:block" />

        <div className="container-site">
          <Reveal>
            <div className="mx-auto max-w-xl text-center">
              <h2 className="font-heading text-[2.6rem] leading-[1.15] text-white sm:text-[2.9rem]">
                Stay Connected
              </h2>
              <p className="body-text mt-3 text-white/85">
                Get updates from our nurseries, see what your children are up to, and
                join our community.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <PastelButton href="/contact" variant="butter">
                  Contact Us <ArrowRight className="h-4 w-4" />
                </PastelButton>
                <PastelButton href="/admission" variant="blush">
                  Book a Tour <ArrowRight className="h-4 w-4" />
                </PastelButton>
              </div>
            </div>
          </Reveal>
        </div>
      </section>


      {/* ════════════════════════════════════════════════════
          LIGHTBOX MODAL
      ════════════════════════════════════════════════════ */}
      {lightboxIndex !== null && filteredPhotos[lightboxIndex] && (
        <Lightbox
          items={filteredPhotos}
          index={lightboxIndex}
          onClose={closeLightbox}
          onPrev={prevPhoto}
          onNext={nextPhoto}
        />
      )}

      {/* ════════════════════════════════════════════════════
          VIDEO MODAL
      ════════════════════════════════════════════════════ */}
      {videoItem && (
        <VideoModal item={videoItem} onClose={() => setVideoItem(null)} />
      )}
    </>
  );
}

// ── Featured Card ─────────────────────────────────────────────────────────────

function FeaturedCard({
  item,
  rotation,
  onPhotoClick,
}: {
  item: GalleryItem;
  rotation: string;
  onPhotoClick: () => void;
}) {
  const isVideo  = item.type === "video";
  const imgSrc   = isVideo ? item.thumbnailSrc! : item.src!;
  const imgAlt   = item.alt ?? item.title;

  return (
    <article
      className={`group h-full cursor-pointer bg-white p-3 transition-all duration-300 ${rotation} hover:scale-[1.03] hover:rotate-0 rounded-[1.8rem] shadow-[0_8px_28px_rgba(90,74,66,0.10)]`}
      onClick={onPhotoClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onPhotoClick()}
      aria-label={`View ${item.title}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.2rem]">
        <Image
          src={imgSrc}
          alt={imgAlt}
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
      <div className="px-2 pb-1 pt-3">
        <p className="font-heading text-[1.05rem] leading-snug text-[var(--ink)]">{item.title}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <BranchPill branch={item.branch} small />
          <span className="text-[0.65rem] text-[rgba(90,74,66,0.45)]">{formatDate(item.date)}</span>
        </div>
      </div>
    </article>
  );
}

// ── Photo Grid ────────────────────────────────────────────────────────────────

function PhotoGrid({ items, onOpen }: { items: GalleryItem[]; onOpen: (i: number) => void }) {
  return (
    <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 [column-fill:_balance]">
      {items.map((item, i) => (
        <div
          key={item.id}
          className="mb-4 break-inside-avoid"
        >
          <button
            className="group relative w-full cursor-pointer overflow-hidden rounded-[1.6rem] bg-white p-2.5 shadow-[0_4px_16px_rgba(90,74,66,0.08)] transition-transform duration-300 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5fc8c7]"
            onClick={() => onOpen(i)}
            aria-label={`View ${item.title}`}
          >
            <div className="relative overflow-hidden rounded-[1.2rem]">
              <Image
                src={item.src!}
                alt={item.alt ?? item.title}
                width={400}
                height={Math.round(400 * (item.aspectRatio ?? 0.75))}
                className="block w-full object-cover"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                loading="lazy"
              />
              {/* hover overlay */}
              <div className="absolute inset-0 flex items-center justify-center rounded-[1.2rem] bg-[rgba(90,74,66,0.18)] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <div className="flex flex-col items-center gap-1.5">
                  <ZoomIn className="h-7 w-7 text-white drop-shadow" />
                  <span className="text-[0.75rem] font-bold text-white drop-shadow">View</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between px-1 pb-1 pt-2">
              <BranchPill branch={item.branch} small />
              <span className="text-[0.65rem] text-[rgba(90,74,66,0.45)]">{formatDate(item.date)}</span>
            </div>
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Video Grid ────────────────────────────────────────────────────────────────

function VideoGrid({ items, onOpen }: { items: GalleryItem[]; onOpen: (item: GalleryItem) => void }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <button
          key={item.id}
          className="group cursor-pointer overflow-hidden rounded-[1.8rem] bg-white text-left shadow-[0_4px_16px_rgba(90,74,66,0.08)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_28px_rgba(90,74,66,0.14)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5fc8c7]"
          onClick={() => onOpen(item)}
          aria-label={`Play ${item.title}`}
        >
          {/* Thumbnail */}
          <div className="relative aspect-video overflow-hidden">
            <Image
              src={item.thumbnailSrc ?? "/home/structured-routine.jpg"}
              alt={item.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              loading="lazy"
            />
            {/* overlay */}
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
          {/* Body */}
          <div className="px-5 py-4">
            <p className="font-heading text-[1.15rem] leading-snug text-[var(--ink)]">{item.title}</p>
            {item.description && (
              <p className="mt-1 line-clamp-2 text-sm leading-[1.6] text-[rgba(90,74,66,0.65)]">
                {item.description}
              </p>
            )}
            <div className="mt-3 flex items-center gap-2">
              <BranchPill branch={item.branch} small />
              <span className="text-[0.65rem] text-[rgba(90,74,66,0.45)]">{formatDate(item.date)}</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Updates Grid ──────────────────────────────────────────────────────────────

const UPDATE_BORDER_COLOURS: Record<Exclude<BranchFilter, "all">, string> = {
  harrow:      "#f4aac8",
  pinner:      "#7fd8d2",
  borehamwood: "#7fd8d2",
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
            <span className="text-[0.68rem] text-[rgba(90,74,66,0.45)]">{formatDate(item.date)}</span>
          </div>
          <h3 className="mt-3 font-heading text-[1.3rem] leading-snug text-[var(--ink)]">
            {item.title}
          </h3>
          <p className="mt-2 line-clamp-3 text-sm leading-[1.7] text-[rgba(90,74,66,0.68)]">
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
      <Doodle kind="flower" className="h-16 w-16 text-[#f4aac8] opacity-60" />
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

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({
  items,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  items:   GalleryItem[];
  index:   number;
  onClose: () => void;
  onPrev:  () => void;
  onNext:  () => void;
}) {
  const item       = items[index];
  const multiPhoto = items.length > 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
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

        {/* Image */}
        <div className="relative min-h-0 flex-1">
          <Image
            src={item.src!}
            alt={item.alt ?? item.title}
            fill
            className="object-contain"
            sizes="(max-width: 1280px) 100vw, 1280px"
          />
        </div>

        {/* Caption */}
        <div className="flex items-center justify-between border-t border-[rgba(90,74,66,0.08)] px-6 py-3">
          <div className="flex items-center gap-2.5">
            <p className="font-heading text-[1.05rem] text-[var(--ink)]">{item.title}</p>
            <BranchPill branch={item.branch} small />
          </div>
          <span className="text-[0.72rem] text-[rgba(90,74,66,0.45)]">{formatDate(item.date)}</span>
        </div>

        {/* Prev / Next */}
        {multiPhoto && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onPrev(); }}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-[var(--ink)] shadow transition hover:bg-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onNext(); }}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-[var(--ink)] shadow transition hover:bg-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Counter */}
        {multiPhoto && (
          <span className="absolute bottom-14 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-[0.72rem] text-white">
            {index + 1} / {items.length}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Video Modal ───────────────────────────────────────────────────────────────

function VideoModal({ item, onClose }: { item: GalleryItem; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
    >
      <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close video"
          className="absolute -right-2 -top-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/35"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="aspect-video overflow-hidden rounded-2xl bg-black">
          {item.youtubeId && (
            <iframe
              src={`https://www.youtube.com/embed/${item.youtubeId}?autoplay=1&rel=0`}
              title={item.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          )}
        </div>

        <p className="mt-3 text-center font-heading text-[1.1rem] text-white/90">{item.title}</p>
      </div>
    </div>
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
