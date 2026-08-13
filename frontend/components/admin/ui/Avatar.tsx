/**
 * Avatar — profile-photo thumbnail with an initials fallback. One shared
 * component for every place a child or staff member appears (lists, detail
 * headers, registers, kiosk, portal) so photos show up consistently.
 */

const SIZES = {
  xs: "h-6 w-6 text-[0.55rem]",
  sm: "h-8 w-8 text-[0.65rem]",
  md: "h-10 w-10 text-xs",
  lg: "h-16 w-16 text-lg",
  xl: "h-24 w-24 text-2xl",
} as const;

// Deterministic soft background per name so initials avatars are easier to
// tell apart in long lists (stable across renders — no randomness).
const TONES = [
  "bg-teal-100 text-teal-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-emerald-100 text-emerald-700",
];

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase() || "?";
}

export default function Avatar({
  name,
  src,
  size = "md",
  className = "",
}: {
  name: string;
  src?: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const tone = TONES[Math.abs([...name].reduce((h, c) => h * 31 + c.charCodeAt(0), 7)) % TONES.length];
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={`${SIZES[size]} shrink-0 rounded-full border border-slate-200 object-cover ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${SIZES[size]} ${tone} flex shrink-0 items-center justify-center rounded-full font-bold uppercase ${className}`}
    >
      {initialsOf(name)}
    </span>
  );
}
