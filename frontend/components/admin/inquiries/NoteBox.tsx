"use client";

import { NOTE_TEMPLATES } from "@/lib/enquiry";

/**
 * Note input with one-tap quick-note templates. Clicking a chip fills the box
 * (replacing an empty box, or appending on a new line if text is present) so
 * staff can log a common note in a single tap.
 */
export default function NoteBox({
  value,
  onChange,
  onSubmit,
  busy,
  submitLabel = "Add note",
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  busy?: boolean;
  submitLabel?: string;
  rows?: number;
}) {
  const insertTemplate = (t: string) => {
    onChange(value.trim() ? `${value.trim()}\n${t}` : t);
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {NOTE_TEMPLATES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => insertTemplate(t)}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-teal-50 hover:text-teal-700"
          >
            {t}
          </button>
        ))}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder="Add a note (visible to the team only)…"
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={onSubmit}
          disabled={busy || !value.trim()}
          className="btn-primary py-2 text-sm disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
