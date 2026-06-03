"use client";

import Image from "next/image";
import { useState } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";

type GalleryImage = {
  src: string;
  alt: string;
  rotate?: number;
  caption?: string;
};

type Props = {
  images: GalleryImage[];
  columns?: 2 | 3;
};

export function LightboxGallery({ images, columns = 3 }: Props) {
  const [active, setActive] = useState<GalleryImage | null>(null);

  return (
    <>
      <div
        className={clsx(
          "grid gap-6",
          columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3",
        )}
      >
        {images.map((img) => (
          <button
            key={img.src}
            type="button"
            onClick={() => setActive(img)}
            className="cursor-zoom-in text-left transition-transform duration-200 hover:-translate-y-1"
            aria-label={`View: ${img.alt}`}
          >
            {/* Scrapbook-style card */}
            <div
              className="rounded-[1.4rem] bg-white px-2.5 pb-6 pt-2.5 shadow-[3px_5px_16px_rgba(90,74,66,0.11)]"
              style={{ transform: `rotate(${img.rotate ?? 0}deg)` }}
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-[1rem]">
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 90vw, (max-width: 1280px) 45vw, 30vw"
                  loading="lazy"
                />
              </div>
              {img.caption && (
                <p className="mt-2 text-center font-body text-sm text-[rgba(90,74,66,0.85)]">
                  {img.caption}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox overlay */}
      {active && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setActive(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white transition hover:bg-white/30"
            onClick={() => setActive(null)}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-[1.5rem] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[4/3] w-full">
              <Image
                src={active.src}
                alt={active.alt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 900px"
                priority
                fetchPriority="high"              />
            </div>
            {active.caption && (
              <p className="bg-black/50 px-4 py-2 text-center text-sm text-white">
                {active.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
