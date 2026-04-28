const BG = "#5fc8c7";

export default function ZigzagBand({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: BG }}
    >
      {children}
    </div>
  );
}
