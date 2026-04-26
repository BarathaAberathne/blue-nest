const ZIGZAG = (() => {
  const W = 1440, step = 30, half = step / 2;
  let d = "M0,60";
  for (let x = 0; x < W; x += step) d += ` L${x + half},0 L${x + step},60`;
  return d + ` L${W},70 L0,70 Z`;
})();

const TEAL  = "#5fc8c7";
const CREAM = "#f9f4ee";
const BG    = "#DFF5F3";

const ZigzagEdge = ({ flip }: { flip?: boolean }) => (
  <div
    aria-hidden="true"
    className="pointer-events-none w-full overflow-hidden leading-none"
    style={{ background: CREAM, marginBottom: flip ? undefined : "-1px", marginTop: flip ? "-1px" : undefined }}
  >
    <svg
      viewBox="0 0 1440 70"
      preserveAspectRatio="none"
      className="block h-[10px] w-full sm:h-[12px] lg:h-[14px]"
      style={flip ? { transform: "scaleY(-1)" } : undefined}
    >
      <path d={ZIGZAG} fill={TEAL} />
    </svg>
  </div>
);

export default function ZigzagBand({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <>
      <ZigzagEdge />
      <div
        className={`relative overflow-hidden ${className}`}
        style={{ background: BG }}
      >
        {children}
      </div>
      <ZigzagEdge flip />
    </>
  );
}
