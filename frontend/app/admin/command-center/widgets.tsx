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

// ── Branch building line-art (distinct per branch) ──────────────────────────
export function Building({ slug }: { slug: BranchSlug }) {
  const stroke = "#5f96d6";
  const common = { fill: "none", stroke, strokeWidth: 1.4, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  const bg = { fill: "rgba(31,72,120,0.28)", stroke, strokeWidth: 1.2 };
  const buildings: Record<BranchSlug, React.ReactNode> = {
    harrow: (
      <>
        <rect x="10" y="26" width="24" height="30" {...bg} />
        <rect x="34" y="18" width="22" height="38" {...bg} />
        <rect x="56" y="30" width="20" height="26" {...bg} />
        <path d="M8 26 L22 14 L36 26" {...common} />
        <path d="M33 18 L45 8 L57 18" {...common} />
        <rect x="15" y="34" width="6" height="6" {...common} />
        <rect x="23" y="34" width="6" height="6" {...common} />
        <rect x="40" y="26" width="6" height="6" {...common} />
        <rect x="40" y="38" width="6" height="10" {...common} />
        <rect x="62" y="38" width="7" height="8" {...common} />
      </>
    ),
    borehamwood: (
      <>
        <rect x="16" y="20" width="40" height="36" {...bg} />
        <path d="M14 20 L36 8 L58 20" {...common} />
        <rect x="30" y="40" width="12" height="16" {...common} />
        <rect x="22" y="28" width="7" height="7" {...common} />
        <rect x="43" y="28" width="7" height="7" {...common} />
        <line x1="16" y1="34" x2="56" y2="34" {...common} />
      </>
    ),
    pinner: (
      <>
        <rect x="12" y="24" width="26" height="32" {...bg} />
        <rect x="42" y="16" width="26" height="40" {...bg} />
        <path d="M10 24 L25 12 L40 24" {...common} />
        <path d="M40 16 L55 6 L70 16" {...common} />
        <rect x="18" y="32" width="6" height="6" {...common} />
        <rect x="27" y="32" width="6" height="6" {...common} />
        <rect x="48" y="24" width="6" height="6" {...common} />
        <rect x="57" y="24" width="6" height="6" {...common} />
        <rect x="51" y="40" width="8" height="16" {...common} />
      </>
    ),
    northwood: (
      <>
        <rect x="20" y="26" width="34" height="30" {...bg} />
        <path d="M18 26 L37 12 L56 26" {...common} />
        <circle cx="37" cy="20" r="3" {...common} />
        <rect x="32" y="40" width="10" height="16" {...common} />
        <rect x="25" y="32" width="6" height="6" {...common} />
        <rect x="43" y="32" width="6" height="6" {...common} />
      </>
    ),
    "pinner-green": (
      <>
        <rect x="14" y="22" width="22" height="34" {...bg} />
        <rect x="36" y="30" width="18" height="26" {...bg} />
        <rect x="54" y="24" width="18" height="32" {...bg} />
        <path d="M12 22 L25 12 L38 22" {...common} />
        <path d="M52 24 L63 15 L74 24" {...common} />
        <rect x="20" y="30" width="5" height="5" {...common} />
        <rect x="28" y="30" width="5" height="5" {...common} />
        <rect x="40" y="38" width="5" height="5" {...common} />
        <rect x="60" y="32" width="5" height="5" {...common} />
        <rect x="20" y="44" width="6" height="12" {...common} />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 84 64" width="84" height="64" aria-hidden style={{ filter: "drop-shadow(0 0 4px rgba(15,125,255,0.25))" }}>
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
