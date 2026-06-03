import Image from "next/image";
import { clsx } from "clsx";

type Props = {
  src: string;
  alt: string;
  rotate?: number;
  caption?: string;
  sizes?: string;
  className?: string;
  aspectRatio?: string;
};

export default function StickerCard({
  src,
  alt,
  rotate = 0,
  caption,
  sizes = "300px",
  className,
  aspectRatio = "4/5",
}: Props) {
  // Fallback hook so the box keeps its height on Safari < 15 (no aspect-ratio
  // support); pairs with the @supports rule in globals.css. Inline style still
  // drives modern browsers.
  const arFallback =
    aspectRatio === "4/3" ? "ar-fallback-4-3" :
    aspectRatio === "4/5" ? "ar-fallback-4-5" : "";
  return (
    <div
      className={clsx(
        "rounded-[1.4rem] bg-white px-2.5 pb-6 pt-2.5 shadow-[3px_5px_16px_rgba(90,74,66,0.11)]",
        className,
      )}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <div className={clsx("relative overflow-hidden rounded-[1rem]", arFallback)} style={{ aspectRatio }}>
        <Image src={src} alt={alt} fill className="object-cover" sizes={sizes} />
      </div>
      {caption && (
        <p className="mt-2 text-center font-display text-sm text-[var(--ink)]">{caption}</p>
      )}
    </div>
  );
}
