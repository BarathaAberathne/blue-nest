"use client";

// Self-contained SVG widgets for the Command Centre HUD. No chart library — each
// piece is hand-rolled so it matches the design mock exactly and pulls in no new
// dependency. All colours reference the .cc-root CSS custom properties.

import type { BranchSlug, FinanceSlice, FunnelStage } from "./data";

const SLICE_COLORS: Record<FinanceSlice["color"], string> = {
  primary: "#0f7dff",
  accent: "#d6b36a",
  accentSoft: "#e0c48a",
  accentSofter: "#8fb4d8",
};

// Round trig-derived SVG coords to 2dp so server and client render identical
// strings (Node/browser libm can differ in the last float digits → hydration
// mismatch otherwise — see CLAUDE.md conventions).
const r2 = (n: number) => Math.round(n * 100) / 100;
const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: r2(cx + r * Math.cos(a)), y: r2(cy + r * Math.sin(a)) };
};

// ── Financial donut ───────────────────────────────────────────────────────
export function DonutChart({
  slices,
  total,
  caption,
}: {
  slices: FinanceSlice[];
  total: string;
  caption: string;
}) {
  const size = 210;
  const r = 78;
  const cx = size / 2;
  const cy = size / 2;
  const c = 2 * Math.PI * r;
  const gap = 3; // percent gap between segments
  // Cumulative start offset for each slice (rotated so blue starts upper-left),
  // computed without mutation so it stays render-pure.
  const withOffset = slices.map((s, i) => ({
    s,
    offset: -25 + slices.slice(0, i).reduce((acc, prev) => acc + prev.pct, 0),
  }));

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%" role="img" aria-label="Revenue breakdown">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(64,130,210,0.14)" strokeWidth={16} />
      {withOffset.map(({ s, offset }) => {
        const len = ((s.pct - gap) / 100) * c;
        return (
          <circle
            key={s.label}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={SLICE_COLORS[s.color]}
            strokeWidth={16}
            strokeLinecap="round"
            strokeDasharray={`${Math.max(len, 0.1)} ${c}`}
            strokeDashoffset={-((offset / 100) * c)}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ filter: "drop-shadow(0 0 4px rgba(15,125,255,0.25))" }}
          />
        );
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#f5f7fa" fontSize="22" fontWeight="700" fontFamily="var(--font-admin-heading)">
        {total}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#7f9bbd" fontSize="8.5" letterSpacing="1.5" fontFamily="var(--font-admin-heading)">
        {caption}
      </text>
    </svg>
  );
}

// ── Circular gauge (occupancy / attendance / conversion) ────────────────────
export function RingGauge({
  value,
  big,
  small,
  color = "#0f7dff",
  track = "rgba(64,130,210,0.16)",
  size = 92,
}: {
  value: number; // 0..100
  big?: string;
  small?: string;
  color?: string;
  track?: string;
  size?: number;
}) {
  const r = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;
  const sweep = 300; // leave a gap at the bottom
  const start = -150;
  const c = 2 * Math.PI * r;
  const arcLen = (sweep / 360) * c;
  const on = (value / 100) * arcLen;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={`${value}%`}>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={track}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={`${arcLen} ${c}`}
        transform={`rotate(${start} ${cx} ${cy})`}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={`${on} ${c}`}
        transform={`rotate(${start} ${cx} ${cy})`}
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      />
      {big && (
        <text x={cx} y={cy + (small ? 0 : 5)} textAnchor="middle" fill="#f5f7fa" fontSize={size > 100 ? 26 : 20} fontWeight="700" fontFamily="var(--font-admin-heading)">
          {big}
        </text>
      )}
      {small && (
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#7f9bbd" fontSize="7.5" letterSpacing="1.2" fontFamily="var(--font-admin-heading)">
          {small}
        </text>
      )}
    </svg>
  );
}

// ── Admission funnel ────────────────────────────────────────────────────────
export function Funnel({ stages }: { stages: FunnelStage[] }) {
  const w = 260;
  const rowH = 34;
  const topW = 196;
  const botW = 84;
  const h = stages.length * rowH + 8;
  const step = (topW - botW) / stages.length;
  const cx = 108; // funnel centred left, values in a right-hand column
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} role="img" aria-label="Admission funnel">
      <defs>
        <linearGradient id="cc-funnel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a4f8a" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#0f2c4d" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      {stages.map((s, i) => {
        const wTop = topW - step * i;
        const wBot = topW - step * (i + 1);
        const y = i * rowH + 4;
        const fill = s.highlight ? "rgba(214,179,106,0.22)" : "url(#cc-funnel)";
        const stroke = s.highlight ? "#d6b36a" : "rgba(90,160,235,0.5)";
        return (
          <g key={s.label}>
            <path
              d={`M${cx - wTop / 2} ${y} L${cx + wTop / 2} ${y} L${cx + wBot / 2} ${y + rowH - 3} L${cx - wBot / 2} ${y + rowH - 3} Z`}
              fill={fill}
              stroke={stroke}
              strokeWidth="1"
            />
            <text x={cx} y={y + rowH / 2 - 1} textAnchor="middle" dominantBaseline="middle" fill={s.highlight ? "#f0d9a4" : "#c8dcf2"} fontSize="9.5" letterSpacing="0.5" fontFamily="var(--font-admin-heading)">
              {s.label.toUpperCase()}
            </text>
            <text x={w - 8} y={y + rowH / 2 - 1} textAnchor="end" dominantBaseline="middle" fill={s.highlight ? "#d6b36a" : "#f5f7fa"} fontSize="13" fontWeight="700" fontFamily="var(--font-admin-heading)">
              {s.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Attendance bars ─────────────────────────────────────────────────────────
export function AttendanceBars({ days }: { days: { day: string; pct: number }[] }) {
  const w = 240;
  const h = 128;
  const pad = 20;
  const bw = 26;
  const gap = (w - pad * 2 - bw * days.length) / (days.length - 1);
  const maxH = 82;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} role="img" aria-label="Weekly attendance">
      <defs>
        <linearGradient id="cc-bar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4aa3ff" />
          <stop offset="100%" stopColor="#0f3f78" />
        </linearGradient>
      </defs>
      {days.map((d, i) => {
        const bh = ((d.pct - 82) / 18) * maxH + 22;
        const x = pad + i * (bw + gap);
        const y = h - 22 - bh;
        return (
          <g key={d.day}>
            <text x={x + bw / 2} y={y - 5} textAnchor="middle" fill="#9fc0e6" fontSize="9" fontWeight="600" fontFamily="var(--font-admin-heading)">
              {d.pct}%
            </text>
            <rect x={x} y={y} width={bw} height={bh} rx="3" fill="url(#cc-bar)" style={{ filter: "drop-shadow(0 0 6px rgba(15,125,255,0.35))" }} />
            <text x={x + bw / 2} y={h - 6} textAnchor="middle" fill="#6f8bad" fontSize="8.5" letterSpacing="1" fontFamily="var(--font-admin-heading)">
              {d.day}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Parent-sentiment spark line ─────────────────────────────────────────────
export function SentimentLine({ points }: { points: number[] }) {
  const w = 220;
  const h = 92;
  const pad = 6;
  const step = (w - pad * 2) / (points.length - 1);
  const pts = points.map((p, i) => [pad + i * step, h - pad - p * (h - pad * 2)]);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${h - pad} L${pad} ${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} role="img" aria-label="Parent sentiment trend">
      <defs>
        <linearGradient id="cc-sent" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(30,215,96,0.35)" />
          <stop offset="100%" stopColor="rgba(30,215,96,0)" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#cc-sent)" />
      <path d={line} fill="none" stroke="#1ed760" strokeWidth="1.8" style={{ filter: "drop-shadow(0 0 5px rgba(30,215,96,0.6))" }} />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill="#1ed760" />
    </svg>
  );
}

export function Stars({ n = 5, size = 13 }: { n?: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {Array.from({ length: n }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill="#d6b36a" style={{ filter: "drop-shadow(0 0 3px rgba(214,179,106,0.5))" }}>
          <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8 5 20.4l1.4-6.8L1.3 9.1l6.9-.8z" />
        </svg>
      ))}
    </span>
  );
}

// ── Radar dial (system status / system health) ──────────────────────────────
export function Radar({ size = 96, color = "#1ed760", logo }: { size?: number; color?: string; logo?: boolean }) {
  const cx = size / 2;
  const cy = size / 2;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="System radar">
      <defs>
        <radialGradient id={`cc-radar-${size}-${color.slice(1)}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`cc-sweep-${size}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="100%" stopColor={color} stopOpacity="0.6" />
        </linearGradient>
      </defs>
      {[0.95, 0.66, 0.36].map((f) => (
        <circle key={f} cx={cx} cy={cy} r={(size / 2 - 4) * f} fill="none" stroke={color} strokeOpacity="0.28" strokeWidth="1" />
      ))}
      <line x1={cx} y1="4" x2={cx} y2={size - 4} stroke={color} strokeOpacity="0.18" strokeWidth="1" />
      <line x1="4" y1={cy} x2={size - 4} y2={cy} stroke={color} strokeOpacity="0.18" strokeWidth="1" />
      <g className="cc-spin-fast" style={{ transformBox: "fill-box" }}>
        <path d={`M${cx} ${cy} L${cx} 5 A${cy - 4} ${cy - 4} 0 0 1 ${size - 6} ${cy} Z`} fill={`url(#cc-sweep-${size})`} />
      </g>
      <circle cx={cx} cy={cy} r={size / 2 - 4} fill={`url(#cc-radar-${size}-${color.slice(1)})`} />
      {logo && (
        <text x={cx} y={cy + 4} textAnchor="middle" fill={color} fontSize="13" fontWeight="700">◈</text>
      )}
    </svg>
  );
}

// ── Branch buildings ────────────────────────────────────────────────────────
// Detailed line-art of each nursery: proper facades with paned sash windows,
// pitched/hipped roofs, chimneys and doors, distinct architecture per branch.
// Drawn on a 96×72 grid (ground line at y≈64), rendered small in the branch cards.
export function Building({ slug }: { slug: BranchSlug }) {
  const stroke = "#7cb0e6";
  const line = { fill: "none", stroke, strokeWidth: 1.25, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  const wall = { fill: "rgba(31,72,120,0.32)", stroke, strokeWidth: 1.35, strokeLinejoin: "round" as const };
  const roof = { fill: "rgba(0,212,255,0.07)", stroke, strokeWidth: 1.35, strokeLinejoin: "round" as const };
  const glass = { fill: "rgba(0,212,255,0.12)", stroke, strokeWidth: 0.9 };
  const doorFill = { fill: "rgba(0,212,255,0.16)", stroke, strokeWidth: 1.2, strokeLinejoin: "round" as const };
  const knob = { fill: stroke, stroke: "none" };

  // Paned window: outer frame + interior mullions (cols × rows of panes).
  const win = (x: number, y: number, w: number, h: number, cols = 2, rows = 3) => (
    <g key={`w-${x}-${y}`}>
      <rect x={x} y={y} width={w} height={h} rx={0.6} {...glass} />
      {Array.from({ length: cols - 1 }).map((_, i) => (
        <line key={`v${i}`} x1={x + (w / cols) * (i + 1)} y1={y + 0.5} x2={x + (w / cols) * (i + 1)} y2={y + h - 0.5} {...line} strokeWidth={0.8} />
      ))}
      {Array.from({ length: rows - 1 }).map((_, i) => (
        <line key={`h${i}`} x1={x + 0.5} y1={y + (h / rows) * (i + 1)} x2={x + w - 0.5} y2={y + (h / rows) * (i + 1)} {...line} strokeWidth={0.8} />
      ))}
    </g>
  );
  const ground = <line x1="6" y1="64" x2="90" y2="64" {...line} strokeWidth={1} opacity={0.5} />;

  const buildings: Record<BranchSlug, React.ReactNode> = {
    // Harrow — symmetric Georgian villa: gabled roof, twin chimneys, sash
    // windows, central arched door with a fanlight and steps.
    harrow: (
      <>
        {ground}
        <rect x="18" y="28" width="60" height="36" {...wall} />
        <path d="M13 28 L48 10 L83 28 Z" {...roof} />
        <rect x="26" y="14" width="5" height="8" {...wall} />
        <rect x="65" y="14" width="5" height="8" {...wall} />
        {win(25, 32, 11, 12)}
        {win(42.5, 32, 11, 12)}
        {win(60, 32, 11, 12)}
        {win(25, 49, 11, 13)}
        {win(60, 49, 11, 13)}
        <path d="M42 64 V52 a6 6 0 0 1 12 0 V64" {...doorFill} />
        <path d="M42 54 a6 6 0 0 1 12 0" {...line} strokeWidth={0.8} />
        <circle cx="51.5" cy="58" r="0.9" {...knob} />
        <line x1="38" y1="64" x2="58" y2="64" {...line} />
      </>
    ),
    // Borehamwood — modern flat-roof block with ribbon glazing and a glass
    // entrance under a cantilevered canopy.
    borehamwood: (
      <>
        {ground}
        <rect x="16" y="18" width="64" height="46" {...wall} />
        <rect x="13" y="14" width="70" height="5" {...roof} />
        {win(22, 24, 52, 8, 6, 1)}
        {win(22, 36, 52, 8, 6, 1)}
        {win(22, 48, 12, 14, 2, 2)}
        {win(62, 48, 12, 14, 2, 2)}
        <rect x="39" y="48" width="18" height="16" rx="0.6" {...doorFill} />
        <line x1="48" y1="48" x2="48" y2="64" {...line} />
        <line x1="35" y1="46.5" x2="61" y2="46.5" {...line} strokeWidth={1.4} />
      </>
    ),
    // Pinner — semi-detached pair of pitched-roof houses, each with a bay,
    // upstairs sash windows and a front door; one shared chimney.
    pinner: (
      <>
        {ground}
        <rect x="10" y="30" width="37" height="34" {...wall} />
        <path d="M6 30 L28.5 14 L51 30 Z" {...roof} />
        <rect x="43" y="18" width="5" height="9" {...wall} />
        {win(16, 34, 11, 11)}
        <rect x="14" y="50" width="15" height="14" rx="0.6" {...doorFill} />
        {win(33, 50, 11, 12, 2, 2)}
        <line x1="14" y1="57" x2="29" y2="57" {...line} strokeWidth={0.8} />
        <circle cx="26.5" cy="57.5" r="0.9" {...knob} />

        <rect x="49" y="30" width="37" height="34" {...wall} />
        <path d="M45 30 L67.5 14 L90 30 Z" {...roof} />
        {win(69, 34, 11, 11)}
        <rect x="67" y="50" width="15" height="14" rx="0.6" {...doorFill} />
        {win(52, 50, 11, 12, 2, 2)}
        <line x1="67" y1="57" x2="82" y2="57" {...line} strokeWidth={0.8} />
        <circle cx="69.5" cy="57.5" r="0.9" {...knob} />
      </>
    ),
    // Northwood — hipped-roof house with a protruding ground-floor bay window,
    // a central arched entrance under a canopy, and a rooftop chimney.
    northwood: (
      <>
        {ground}
        <rect x="16" y="30" width="64" height="34" {...wall} />
        <path d="M12 30 L30 14 L66 14 L84 30 Z" {...roof} />
        <line x1="30" y1="14" x2="66" y2="14" {...line} strokeWidth={0.9} opacity={0.6} />
        <rect x="55" y="16" width="5" height="8" {...wall} />
        {win(23, 34, 11, 11)}
        {win(62, 34, 11, 11)}
        {/* protruding bay window */}
        <path d="M17 64 V50 L23 45 L35 45 L41 50 V64" {...doorFill} />
        <line x1="23" y1="45" x2="23" y2="64" {...line} strokeWidth={0.8} />
        <line x1="35" y1="45" x2="35" y2="64" {...line} strokeWidth={0.8} />
        <line x1="17" y1="55" x2="41" y2="55" {...line} strokeWidth={0.8} />
        {/* arched entrance */}
        <path d="M50 64 V53 a5.5 5.5 0 0 1 11 0 V64" {...doorFill} />
        <path d="M50 55 a5.5 5.5 0 0 1 11 0" {...line} strokeWidth={0.8} />
        <line x1="47" y1="47.5" x2="64" y2="47.5" {...line} strokeWidth={1.2} />
        <circle cx="58.5" cy="59" r="0.9" {...knob} />
      </>
    ),
    // Pinner Green — Victorian terrace of three gabled cottages with shared
    // party walls, chimneys between them, and paired window-over-door fronts.
    "pinner-green": (
      <>
        {ground}
        <rect x="9" y="32" width="26" height="32" {...wall} />
        <rect x="35" y="32" width="26" height="32" {...wall} />
        <rect x="61" y="32" width="26" height="32" {...wall} />
        <path d="M6 32 L22 20 L38 32 Z" {...roof} />
        <path d="M32 32 L48 20 L64 32 Z" {...roof} />
        <path d="M58 32 L74 20 L90 32 Z" {...roof} />
        <rect x="33" y="24" width="4" height="8" {...wall} />
        <rect x="59" y="24" width="4" height="8" {...wall} />
        {win(15, 36, 13, 10, 2, 2)}
        {win(41, 36, 13, 10, 2, 2)}
        {win(67, 36, 13, 10, 2, 2)}
        <rect x="17" y="50" width="9" height="14" rx="0.6" {...doorFill} />
        <rect x="43" y="50" width="9" height="14" rx="0.6" {...doorFill} />
        <rect x="69" y="50" width="9" height="14" rx="0.6" {...doorFill} />
        <circle cx="24" cy="57" r="0.8" {...knob} />
        <circle cx="50" cy="57" r="0.8" {...knob} />
        <circle cx="76" cy="57" r="0.8" {...knob} />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 96 72" width="92" height="68" aria-hidden style={{ filter: "drop-shadow(0 0 4px rgba(0,212,255,0.3))" }}>
      {buildings[slug]}
    </svg>
  );
}

// ── Centrepiece: concentric rotating rings + orbit dots (logo overlaid in JSX) ─
export function CentrepieceRings({ size = 300 }: { size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2;
  const dots = (r: number, count: number, color = "#00d4ff", rad = 1.6) =>
    Array.from({ length: count }).map((_, i) => {
      const { x, y } = polar(cx, cy, r, (360 / count) * i);
      return <circle key={`${r}-${i}`} cx={x} cy={y} r={rad} fill={color} opacity={0.75} />;
    });
  // Tick marks around a ring (fine HUD graduations).
  const ticks = (r: number, count: number, len: number) =>
    Array.from({ length: count }).map((_, i) => {
      const a = (360 / count) * i;
      const p1 = polar(cx, cy, r, a);
      const p2 = polar(cx, cy, r - len, a);
      return <line key={`t-${r}-${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="rgba(0,212,255,0.3)" strokeWidth="1" />;
    });
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden style={{ position: "absolute", inset: 0 }}>
      <defs>
        <radialGradient id="cc-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(0,212,255,0.24)" />
          <stop offset="55%" stopColor="rgba(0,212,255,0.05)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <linearGradient id="cc-cp-sweep" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(0,212,255,0)" />
          <stop offset="100%" stopColor="rgba(0,212,255,0.35)" />
        </linearGradient>
      </defs>

      <circle cx={cx} cy={cy} r={R - 6} fill="url(#cc-core)" />

      {/* Rotating radar sweep wedge */}
      <g className="cc-spin-slow" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
        <path d={`M${cx} ${cy} L${cx} ${cy - (R - 10)} A${R - 10} ${R - 10} 0 0 1 ${cx + (R - 10) * 0.82} ${cy - (R - 10) * 0.57} Z`} fill="url(#cc-cp-sweep)" opacity={0.5} />
      </g>

      {/* Concentric rings */}
      <circle cx={cx} cy={cy} r={R - 8} fill="none" stroke="rgba(0,212,255,0.28)" strokeWidth="1" strokeDasharray="2 6" className="cc-spin-slow" />
      <circle cx={cx} cy={cy} r={R - 24} fill="none" stroke="rgba(0,212,255,0.12)" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={R - 40} fill="none" stroke="rgba(214,179,106,0.3)" strokeWidth="1" strokeDasharray="1 10" className="cc-spin-rev" />
      <circle cx={cx} cy={cy} r={R - 66} fill="none" stroke="rgba(0,212,255,0.16)" strokeWidth="1" />

      {/* Graduation ticks on the outer ring */}
      <g className="cc-spin-rev">{ticks(R - 8, 48, 4)}</g>

      {/* Orbiting nodes at several radii/speeds */}
      <g className="cc-spin-slow">{dots(R - 16, 3, "#00d4ff", 2)}</g>
      <g className="cc-spin-rev">{dots(R - 40, 6, "#00d4ff", 1.6)}</g>
      <g className="cc-spin-fast">{dots(R - 66, 4, "#d6b36a", 1.5)}</g>
    </svg>
  );
}
