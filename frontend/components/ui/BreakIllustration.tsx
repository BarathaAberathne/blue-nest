import Image from "next/image";

// Source cells are 768×341 — preserve aspect when scaling
const CELL_W = 768;
const CELL_H = 341;

type Align = "left" | "center" | "right";

type Props = {
  src: string;
  /** Rendered width in px (height scales from aspect ratio). Default 300. */
  width?: number;
  /** Horizontal anchor. Default "center". */
  align?: Align;
  className?: string;
};

const alignClass: Record<Align, string> = {
  left:   "left-16 lg:left-24",
  center: "left-1/2 -translate-x-1/2",
  right:  "right-16 lg:right-24",
};

/**
 * Decorative illustrated character placed at the seam between two sections.
 * Uses a zero-height wrapper so section spacing is never affected.
 * The image straddles the boundary — half in the section above, half below.
 *
 *   <SectionA />
 *   <BreakIllustration src="/site-images/breaks/break-01.png" />
 *   <SectionB />
 */
export default function BreakIllustration({
  src,
  width = 300,
  align = "center",
  className = "",
}: Props) {
  const height = Math.round(width * (CELL_H / CELL_W));

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none relative z-10 ${className}`}
      style={{ height: 0 }}
    >
      <div className={`absolute top-0 -translate-y-1/2 ${alignClass[align]}`}>
        <Image
          src={src}
          alt=""
          width={width}
          height={height}
          className="drop-shadow-md"
          draggable={false}
        />
      </div>
    </div>
  );
}
