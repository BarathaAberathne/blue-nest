// Human-readable identifiers shown on cards, tables and detail headers.
//
// Records created since the reference feature carry a sequential ref
// (SR-2026-000045 / PO-2026-000123 / ORD-2026-000042). For anything created
// before that (and not yet backfilled), we derive a stable short code from the
// Mongo ObjectID so every row/card still has a unique, human-readable id that
// matches between the board and the table.

export type RefPrefix = "SR" | "PO" | "ORD";

/** Prefer the stored ref; otherwise derive `PREFIX-XXXXXX` from the id. */
export function displayRef(ref: string | undefined | null, id: string, prefix: RefPrefix): string {
  const trimmed = (ref ?? "").trim();
  if (trimmed) return trimmed;
  const tail = (id || "").replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  return tail ? `${prefix}-${tail}` : prefix;
}
