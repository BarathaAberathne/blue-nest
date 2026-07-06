"use client";

/** Segmented Board / Table (etc.) view switch shared across admin list pages. */
export default function ViewToggle<K extends string>({
  options,
  active,
  onChange,
}: {
  options: { key: K; label: string; icon: React.ElementType }[];
  active: K;
  onChange: (k: K) => void;
}) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${active === o.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          <o.icon className="h-4 w-4" /> {o.label}
        </button>
      ))}
    </div>
  );
}
