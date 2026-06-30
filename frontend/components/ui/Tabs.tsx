"use client";

import clsx from "clsx";

export type TabItem = {
  key: string;
  label: string;
  badge?: number;
};

interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

/**
 * Tabs — a calm, underline-style tab strip used to break long admin pages into
 * sections. Horizontally scrollable on small screens so it stays mobile-friendly.
 */
export default function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div className={clsx("flex gap-1 overflow-x-auto border-b border-slate-200", className)} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={clsx(
              "relative flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-semibold transition-colors",
              isActive
                ? "text-teal-700"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            {tab.label}
            {typeof tab.badge === "number" && (
              <span
                className={clsx(
                  "inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold",
                  isActive ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-500",
                )}
              >
                {tab.badge}
              </span>
            )}
            {isActive && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-teal-600" />
            )}
          </button>
        );
      })}
    </div>
  );
}
