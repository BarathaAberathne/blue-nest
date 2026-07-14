"use client";

// Blue Nest "Icon Pack v1.0" — HUD line-icons rebuilt as inline SVG to match the
// supplied reference sheet (thin neon strokes on a 24-grid, primary blue #00D4FF
// with a champagne-gold #FFC857 accent). Each icon carries a soft self-glow and
// takes a lucide-compatible ({size,color,style}) API so it drops into the HUD.

import type { CSSProperties, ReactNode } from "react";

export const ICON_BLUE = "#00d4ff";
export const ICON_GOLD = "#ffc857";

export type IconProps = {
  size?: number;
  color?: string;
  style?: CSSProperties;
  strokeWidth?: number;
  className?: string;
  glow?: boolean;
};

function Svg({
  size = 16,
  color = ICON_BLUE,
  style,
  strokeWidth = 1.7,
  className,
  glow = true,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ filter: glow ? `drop-shadow(0 0 2px ${color})` : undefined, ...style }}
    >
      {children}
    </svg>
  );
}

/* ── GENERAL ─────────────────────────────────────────────────────────────── */
export const Dashboard = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.3" />
    <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.3" />
    <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.3" />
    <rect x="13" y="13" width="7.5" height="7.5" rx="1.3" />
  </Svg>
);
export const Branches = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20V10l8-6 8 6v10" />
    <line x1="2.5" y1="20.2" x2="21.5" y2="20.2" />
    <path d="M12 4V1.6l3 1-3 1" />
    <rect x="10" y="14" width="4" height="6.2" />
    <rect x="6" y="11.5" width="2.4" height="2.4" />
    <rect x="15.6" y="11.5" width="2.4" height="2.4" />
  </Svg>
);
export const Children = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="2.2" />
    <path d="M4.6 20v-2a3.4 3.4 0 0 1 6.8 0v2" />
    <circle cx="16" cy="8" r="2.2" />
    <path d="M12.6 20v-2a3.4 3.4 0 0 1 6.8 0v2" />
  </Svg>
);
export const Staff = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8.5" cy="7.5" r="2.4" />
    <path d="M4.4 20v-2.6a4.1 4.1 0 0 1 8.2 0V20" />
    <circle cx="15.8" cy="8" r="2.1" />
    <path d="M13.2 12.2A3.8 3.8 0 0 1 19.6 15v3" />
  </Svg>
);
export const Enquiries = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v7a1.5 1.5 0 0 1-1.5 1.5H12l-4 3.4V15H5.5A1.5 1.5 0 0 1 4 13.5z" />
    <line x1="7.5" y1="9.5" x2="16.5" y2="9.5" />
    <line x1="7.5" y1="12.5" x2="13.5" y2="12.5" />
  </Svg>
);
export const Admissions = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="4" width="14" height="17" rx="1.6" />
    <rect x="9" y="2.6" width="6" height="3" rx="1" />
    <circle cx="12" cy="11" r="2.2" />
    <path d="M8.6 17.5v-1a3.4 3.4 0 0 1 6.8 0v1" />
  </Svg>
);
export const Finance = (p: IconProps) => (
  <Svg {...p} color={p.color ?? ICON_GOLD}>
    <circle cx="12" cy="12" r="9" />
    <text
      x="12"
      y="16.4"
      fontSize="11"
      textAnchor="middle"
      fill={p.color ?? ICON_GOLD}
      stroke="none"
      fontFamily="Georgia, serif"
      fontWeight={700}
    >
      £
    </text>
  </Svg>
);
export const Attendance = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="5" width="16" height="15" rx="1.6" />
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="8" y1="3" x2="8" y2="6" />
    <line x1="16" y1="3" x2="16" y2="6" />
    <path d="M9 14.6l2 2 4-4" />
  </Svg>
);
export const Reports = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.5 3h7l4 4v13.5H6.5z" />
    <path d="M13.5 3v4h4" />
    <line x1="9.5" y1="17" x2="9.5" y2="13" />
    <line x1="12" y1="17" x2="12" y2="10.5" />
    <line x1="14.5" y1="17" x2="14.5" y2="14.5" />
  </Svg>
);
export const Calendar = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="5" width="16" height="15" rx="1.6" />
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="8" y1="3" x2="8" y2="6" />
    <line x1="16" y1="3" x2="16" y2="6" />
    <circle cx="8.5" cy="13" r="0.9" />
    <circle cx="12" cy="13" r="0.9" />
    <circle cx="15.5" cy="13" r="0.9" />
    <circle cx="8.5" cy="16.5" r="0.9" />
    <circle cx="12" cy="16.5" r="0.9" />
  </Svg>
);

/* ── CHILD & EDUCATION ───────────────────────────────────────────────────── */
export const Curriculum = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 6C10 4.5 6.5 4.5 4 5.2v13.3c2.5-.7 6-.7 8 .5" />
    <path d="M12 6c2-1.5 5.5-1.5 8-.8v13.3c-2.5-.7-6-.7-8 .5" />
    <line x1="12" y1="6" x2="12" y2="19" />
  </Svg>
);
export const Events = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 19.5 11 9l4 4z" />
    <path d="M13 8q3-1 4-3" />
    <path d="M15.5 11q3 0 4.5-2" />
    <circle cx="17.5" cy="6.5" r="0.9" />
    <circle cx="20" cy="10.5" r="0.9" />
    <circle cx="14.5" cy="4.5" r="0.9" />
    <circle cx="19" cy="15" r="0.9" />
  </Svg>
);

/* ── OPERATIONS ──────────────────────────────────────────────────────────── */
export const Communication = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="6" width="17" height="12" rx="1.6" />
    <path d="M4 7.2 12 13l8-5.8" />
  </Svg>
);
export const Bell = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 16v-3a6 6 0 0 1 12 0v3l1.6 2H4.4z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </Svg>
);
export const Documents = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5V18A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18z" />
  </Svg>
);
export const Settings = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.6v2.4M12 19v2.4M2.6 12H5M19 12h2.4M5 5l1.7 1.7M17.3 17.3 19 19M19 5l-1.7 1.7M6.7 17.3 5 19" />
  </Svg>
);

/* ── ANALYTICS ───────────────────────────────────────────────────────────── */
export const Star = (p: IconProps & { fill?: string }) => (
  <Svg {...p}>
    <path
      d="M12 3l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 18l-5.6 3.1 1.3-6.2L3 10.5l6.3-.7z"
      fill={p.fill ?? "none"}
    />
  </Svg>
);
export const People = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="7.5" r="2.3" />
    <path d="M8 19v-2.2a4 4 0 0 1 8 0V19" />
    <circle cx="5.5" cy="9.5" r="1.8" />
    <path d="M2.5 18v-1.6a3 3 0 0 1 3.6-2.9" />
    <circle cx="18.5" cy="9.5" r="1.8" />
    <path d="M21.5 18v-1.6a3 3 0 0 0-3.6-2.9" />
  </Svg>
);

/* ── UI & SYSTEM ─────────────────────────────────────────────────────────── */
export const Home = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 11 12 4l8 7" />
    <path d="M5.5 9.8V20h13V9.8" />
    <rect x="10" y="14" width="4" height="6" />
  </Svg>
);
export const Search = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="10.5" cy="10.5" r="6" />
    <line x1="15" y1="15" x2="20" y2="20" />
  </Svg>
);
export const Menu = (p: IconProps) => (
  <Svg {...p}>
    <line x1="4" y1="7" x2="20" y2="7" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="17" x2="20" y2="17" />
  </Svg>
);
export const ChevronRight = (p: IconProps) => (
  <Svg {...p} glow={p.glow ?? false}>
    <path d="M9 5l7 7-7 7" />
  </Svg>
);
export const Send = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 3 3 11l7 2 2 7z" />
    <line x1="10" y1="13" x2="21" y2="3" />
  </Svg>
);
export const Plus = (p: IconProps) => (
  <Svg {...p}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </Svg>
);
export const Check = (p: IconProps) => (
  <Svg {...p} glow={p.glow ?? false}>
    <path d="M5 12.5l4 4L19 6.5" />
  </Svg>
);
export const Mic = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9.5" y="3" width="5" height="10" rx="2.5" />
    <path d="M6 11a6 6 0 0 0 12 0" />
    <line x1="12" y1="17" x2="12" y2="20.5" />
    <line x1="8.5" y1="20.7" x2="15.5" y2="20.7" />
  </Svg>
);

/* ── ADDITIONAL & BRAND ──────────────────────────────────────────────────── */
export const Pulse = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 12h4l2-5 3 10 2-5h5" />
  </Svg>
);
export const Security = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l7 2.5v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9v-6z" />
    <rect x="10" y="11" width="4" height="4" rx="0.6" />
    <path d="M10.7 11V9.8a1.3 1.3 0 0 1 2.6 0V11" />
  </Svg>
);
export const Database = (p: IconProps) => (
  <Svg {...p}>
    <ellipse cx="12" cy="6" rx="7" ry="2.6" />
    <path d="M5 6v12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6" />
    <path d="M5 12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6" />
  </Svg>
);
export const Backup = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 12A7.5 7.5 0 0 1 17.5 6.8" />
    <path d="M18 3.4V7h-3.6" />
    <path d="M19.5 12A7.5 7.5 0 0 1 6.5 17.2" />
    <path d="M6 20.6V17h3.6" />
  </Svg>
);
export const Integration = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 4.5h2.4a1.6 1.6 0 0 1 3.2 0H17v2.9a1.6 1.6 0 0 0 0 3.2V13h-2.4a1.6 1.6 0 0 1-3.2 0H9v-2.4a1.6 1.6 0 0 0 0-3.2z" />
  </Svg>
);
export const AiBadge = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <text
      x="12"
      y="15.5"
      fontSize="8.5"
      letterSpacing="0.5"
      textAnchor="middle"
      fill={p.color ?? ICON_BLUE}
      stroke="none"
      fontFamily="var(--font-admin-heading), sans-serif"
      fontWeight={700}
    >
      AI
    </text>
    <line x1="12" y1="1.5" x2="12" y2="3.5" />
    <line x1="12" y1="20.5" x2="12" y2="22.5" />
  </Svg>
);
