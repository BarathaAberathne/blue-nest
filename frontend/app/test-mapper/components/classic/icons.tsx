interface IconProps {
  size?: number;
}

export function FolderIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <path d="M1 3.5a1 1 0 0 1 1-1h4l1.2 1.5H14a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3.5Z" fill="#f6d675" stroke="#a8842a" strokeWidth="0.6" />
    </svg>
  );
}

export function FolderOpenIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <path d="M1 4.5a1 1 0 0 1 1-1h3.2L6.4 5H13a1 1 0 0 1 .97 1.24l-1.2 5A1 1 0 0 1 11.8 12H2a1 1 0 0 1-1-1V4.5Z" fill="#ffe08a" stroke="#a8842a" strokeWidth="0.6" />
    </svg>
  );
}

export function DocumentIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <path d="M3 1.5h6l3.5 3.5V14a.6.6 0 0 1-.6.6H3a.6.6 0 0 1-.6-.6V2.1a.6.6 0 0 1 .6-.6Z" fill="#fdfdfd" stroke="#8a8a8a" strokeWidth="0.6" />
      <path d="M9 1.5 12.5 5H9.4a.4.4 0 0 1-.4-.4V1.5Z" fill="#d8d8d8" stroke="#8a8a8a" strokeWidth="0.5" />
      <line x1="4.2" y1="7.2" x2="10.8" y2="7.2" stroke="#9a9a9a" strokeWidth="0.6" />
      <line x1="4.2" y1="9.2" x2="10.8" y2="9.2" stroke="#9a9a9a" strokeWidth="0.6" />
      <line x1="4.2" y1="11.2" x2="8.5" y2="11.2" stroke="#9a9a9a" strokeWidth="0.6" />
    </svg>
  );
}

export function WrenchIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <path
        d="M10.6 2.1a2.9 2.9 0 0 0-3.9 3.5L2.4 9.9a1.3 1.3 0 0 0 1.8 1.8l4.3-4.3a2.9 2.9 0 0 0 3.5-3.9l-1.7 1.7-1.3-1.3 1.6-1.7Z"
        fill="#c9c9d6"
        stroke="#6b6b7d"
        strokeWidth="0.6"
      />
    </svg>
  );
}

export function GlobeIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <circle cx="8" cy="8" r="6" fill="#cfe0fb" stroke="#5a7bb0" strokeWidth="0.6" />
      <ellipse cx="8" cy="8" rx="2.4" ry="6" fill="none" stroke="#5a7bb0" strokeWidth="0.5" />
      <line x1="2" y1="8" x2="14" y2="8" stroke="#5a7bb0" strokeWidth="0.5" />
      <line x1="2.9" y1="5" x2="13.1" y2="5" stroke="#5a7bb0" strokeWidth="0.4" />
      <line x1="2.9" y1="11" x2="13.1" y2="11" stroke="#5a7bb0" strokeWidth="0.4" />
    </svg>
  );
}

export function DatabaseIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <ellipse cx="8" cy="3.2" rx="5.5" ry="1.8" fill="#bfe3c4" stroke="#5f9a68" strokeWidth="0.6" />
      <path d="M2.5 3.2v9.6c0 1 2.5 1.8 5.5 1.8s5.5-.8 5.5-1.8V3.2" fill="#d5f0d8" stroke="#5f9a68" strokeWidth="0.6" />
      <path d="M2.5 7.2c0 1 2.5 1.8 5.5 1.8s5.5-.8 5.5-1.8" fill="none" stroke="#5f9a68" strokeWidth="0.5" />
      <path d="M2.5 10.2c0 1 2.5 1.8 5.5 1.8s5.5-.8 5.5-1.8" fill="none" stroke="#5f9a68" strokeWidth="0.5" />
    </svg>
  );
}

export function GridIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <rect x="2" y="2" width="12" height="12" fill="#dbe8fb" stroke="#5a7bb0" strokeWidth="0.6" />
      <line x1="2" y1="6" x2="14" y2="6" stroke="#5a7bb0" strokeWidth="0.5" />
      <line x1="2" y1="10" x2="14" y2="10" stroke="#5a7bb0" strokeWidth="0.5" />
      <line x1="6" y1="2" x2="6" y2="14" stroke="#5a7bb0" strokeWidth="0.5" />
      <line x1="10" y1="2" x2="10" y2="14" stroke="#5a7bb0" strokeWidth="0.5" />
    </svg>
  );
}

export function GearIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <circle cx="8" cy="8" r="2.6" fill="#dcd0f0" stroke="#7a5aa8" strokeWidth="0.6" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <rect key={deg} x="7.3" y="0.8" width="1.4" height="2.6" rx="0.4" fill="#c3aee0" transform={`rotate(${deg} 8 8)`} />
      ))}
    </svg>
  );
}

export function ClipboardIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <rect x="3" y="2.2" width="10" height="12" fill="#fdfdfd" stroke="#8a8a8a" strokeWidth="0.6" rx="0.6" />
      <rect x="5.5" y="1" width="5" height="2.2" fill="#c9c9c9" stroke="#8a8a8a" strokeWidth="0.5" rx="0.4" />
      <line x1="5" y1="6" x2="11" y2="6" stroke="#9a9a9a" strokeWidth="0.6" />
      <line x1="5" y1="8.2" x2="11" y2="8.2" stroke="#9a9a9a" strokeWidth="0.6" />
      <line x1="5" y1="10.4" x2="8.6" y2="10.4" stroke="#9a9a9a" strokeWidth="0.6" />
    </svg>
  );
}

export function PersonIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <circle cx="8" cy="5" r="2.6" fill="#f5d7a8" stroke="#a8794a" strokeWidth="0.6" />
      <path d="M2.5 14c.5-3.2 3-4.6 5.5-4.6s5 1.4 5.5 4.6Z" fill="#c9d8ef" stroke="#5a7bb0" strokeWidth="0.6" />
    </svg>
  );
}

export function ChartIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <rect x="2" y="2" width="12" height="12" fill="#fdfdfd" stroke="#8a8a8a" strokeWidth="0.6" />
      <rect x="4" y="8" width="1.8" height="4" fill="#6c8ebf" />
      <rect x="7" y="5.5" width="1.8" height="6.5" fill="#82b366" />
      <rect x="10" y="7" width="1.8" height="5" fill="#d6b656" />
    </svg>
  );
}

export function PlayIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <path d="M4 2.5v11l9-5.5Z" fill="#3a9e42" stroke="#1f6e26" strokeWidth="0.6" strokeLinejoin="round" />
    </svg>
  );
}

export function RefreshIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <path
        d="M13 4.5A5.5 5.5 0 1 0 14 8"
        fill="none"
        stroke="#2a6fd6"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path d="M13 1.5v3.6h-3.6Z" fill="#2a6fd6" />
    </svg>
  );
}

export function PrintIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <rect x="3" y="5.5" width="10" height="5.5" fill="#dedede" stroke="#7a7a7a" strokeWidth="0.6" />
      <rect x="4.5" y="1.5" width="7" height="4" fill="#fdfdfd" stroke="#7a7a7a" strokeWidth="0.6" />
      <rect x="4.5" y="9.5" width="7" height="4.5" fill="#fdfdfd" stroke="#7a7a7a" strokeWidth="0.6" />
    </svg>
  );
}

export function SearchIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <circle cx="6.8" cy="6.8" r="4" fill="none" stroke="#2a6fd6" strokeWidth="1.4" />
      <line x1="9.8" y1="9.8" x2="13.5" y2="13.5" stroke="#2a6fd6" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function HelpIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <circle cx="8" cy="8" r="6.5" fill="#cfe0fb" stroke="#2a6fd6" strokeWidth="0.8" />
      <text x="8" y="11.3" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#0b3d91">
        ?
      </text>
    </svg>
  );
}

export function LinkIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <path d="M6.5 9.5 9.5 6.5" stroke="#5a5a5a" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M7.5 4.5 9 3a2.1 2.1 0 0 1 3 3L10.5 7.5" fill="none" stroke="#5a5a5a" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M8.5 11.5 7 13a2.1 2.1 0 0 1-3-3l1.5-1.5" fill="none" stroke="#5a5a5a" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function BuildingIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <rect x="3" y="2" width="10" height="12" fill="#e6e0f0" stroke="#7a5aa8" strokeWidth="0.6" />
      {[3.5, 5.5, 7.5, 9.5].map((y) => (
        <g key={y}>
          <rect x="4.2" y={y} width="1.4" height="1.4" fill="#7a5aa8" />
          <rect x="10.4" y={y} width="1.4" height="1.4" fill="#7a5aa8" />
        </g>
      ))}
    </svg>
  );
}
