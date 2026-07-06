import { SECTION_LABEL } from "@/lib/admin-theme";

/** Small uppercase section label with an optional right-aligned action slot. */
export default function SectionHeading({
  children,
  action,
  className = "",
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-3 flex items-center justify-between gap-3 ${className}`}>
      <h2 className={SECTION_LABEL}>{children}</h2>
      {action}
    </div>
  );
}
