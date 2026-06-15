/**
 * Inline SVG illustrations for the six treasures. No external images or canvas
 * — pure, scalable React components that stay crisp at any touch-target size.
 * Brand palette: Primary #4A90E2 · Nest #2F5D9F · Sage #A9C5B0 · Green #6F8E6C
 * · Sand #DCCDBA · Brown #8B6B4A.
 */
import type { SVGProps } from "react";
import type { ItemId } from "./types";

type IconProps = SVGProps<SVGSVGElement>;

function Acorn(props: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M20 30c0-2 5-4 12-4s12 2 12 4c0 14-6 24-12 24s-12-10-12-24Z" fill="#B5793F" />
      <path d="M24 34c2 10 5 16 8 16" stroke="#8B6B4A" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <path d="M16 26c0-4 7-7 16-7s16 3 16 7-7 6-16 6-16-2-16-6Z" fill="#8B6B4A" />
      <path d="M32 12v8" stroke="#6F5436" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Pinecone(props: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M32 8c-6 0-11 6-11 16 0 12 5 26 11 32 6-6 11-20 11-32 0-10-5-16-11-16Z" fill="#8B6B4A" />
      <g fill="#A9824E">
        <path d="M32 14c-4 0-7 4-7 4s3 4 7 4 7-4 7-4-3-4-7-4Z" />
        <path d="M32 26c-5 0-9 4-9 4s4 5 9 5 9-5 9-5-4-4-9-4Z" />
        <path d="M32 39c-4 0-8 4-8 4s4 5 8 5 8-5 8-5-4-4-8-4Z" />
      </g>
      <path d="M32 22v26" stroke="#6F5436" strokeWidth="1.5" opacity="0.4" />
    </svg>
  );
}

function Feather(props: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M48 12C28 16 16 34 14 50l6 4c20-6 32-24 36-42-3-1-5-1-8 0Z" fill="#6FA3DC" />
      <path d="M44 18C30 24 20 38 16 52" stroke="#2F5D9F" strokeWidth="2.5" strokeLinecap="round" />
      <g stroke="#2F5D9F" strokeWidth="1.8" strokeLinecap="round">
        <path d="M36 22l10-6M30 32l10-6M24 42l10-6" />
      </g>
      <path d="M16 52l-5 8" stroke="#8B6B4A" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Ladybird(props: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <ellipse cx="32" cy="36" rx="20" ry="18" fill="#D9544D" />
      <path d="M32 18v36" stroke="#2A2320" strokeWidth="2.5" />
      <circle cx="32" cy="18" r="9" fill="#2A2320" />
      <g fill="#2A2320">
        <circle cx="22" cy="32" r="3" />
        <circle cx="42" cy="32" r="3" />
        <circle cx="24" cy="44" r="3" />
        <circle cx="40" cy="44" r="3" />
      </g>
      <circle cx="28" cy="16" r="1.6" fill="#fff" />
      <circle cx="36" cy="16" r="1.6" fill="#fff" />
    </svg>
  );
}

function Bird(props: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M14 40c-6-2-10 0-10 0s4 4 9 5 7-2 7-2-2-2-6-3Z" fill="#2F5D9F" />
      <ellipse cx="34" cy="38" rx="20" ry="18" fill="#4A90E2" />
      <ellipse cx="38" cy="44" rx="13" ry="12" fill="#FBF7F0" />
      <path d="M26 32c8-3 16 0 19 6 2 5-1 11-7 12-8 2-15-3-17-9-1-4 1-7 5-9Z" fill="#2F5D9F" />
      <circle cx="42" cy="24" r="13" fill="#4A90E2" />
      <circle cx="36" cy="29" r="3" fill="#F2B8C6" opacity="0.85" />
      <circle cx="46" cy="22" r="4" fill="#FBF7F0" />
      <circle cx="47" cy="22" r="2.2" fill="#2A2320" />
      <path d="M54 24l8 2-7 4-1-6Z" fill="#F0A93D" />
    </svg>
  );
}

function OakLeaf(props: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M32 6c3 6 9 7 13 5-2 5 0 8 4 9-4 3-4 7-1 10-5 0-8 3-8 8-3-3-7-3-10 0-0-5-3-8-8-8 3-3 3-7-1-10 4-1 6-4 4-9 4 2 10 1 13-5Z"
        transform="translate(0 4)"
        fill="#6F8E6C"
      />
      <path d="M32 12v40" stroke="#52704F" strokeWidth="2.5" strokeLinecap="round" />
      <g stroke="#52704F" strokeWidth="1.6" strokeLinecap="round">
        <path d="M32 26l9-6M32 36l-9-6M32 44l8-5" />
      </g>
    </svg>
  );
}

const ICONS: Record<ItemId, (p: IconProps) => React.ReactElement> = {
  acorn: Acorn,
  pinecone: Pinecone,
  feather: Feather,
  ladybird: Ladybird,
  bird: Bird,
  leaf: OakLeaf,
};

/** Render a treasure icon by id. */
export function TreasureIcon({ id, ...props }: IconProps & { id: ItemId }) {
  const Cmp = ICONS[id];
  return <Cmp aria-hidden {...props} />;
}
