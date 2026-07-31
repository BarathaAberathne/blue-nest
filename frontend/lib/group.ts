// Shared list ordering + branch grouping helpers. Admin lists sort
// alphabetically and group by branch by default (see the "group by branch"
// convention) instead of each page re-implementing it.

// sortByName returns a new array sorted alphabetically (case-insensitive,
// locale-aware) by the string the accessor returns.
export function sortByName<T>(items: T[], name: (t: T) => string): T[] {
  return [...items].sort((a, b) =>
    name(a).localeCompare(name(b), undefined, { sensitivity: "base" }),
  );
}

export interface BranchGroup<T> {
  branch: string; // branch slug ("" → "Unassigned")
  items: T[];
}

// groupByBranch buckets items by their branch slug and returns the groups in
// alphabetical branch order, each group's items alphabetically sorted by `name`.
// `branchLabel` maps a slug to a display label for ordering (falls back to slug).
export function groupByBranch<T>(
  items: T[],
  branchOf: (t: T) => string | undefined,
  name: (t: T) => string,
  branchLabel: (slug: string) => string = (s) => s,
): BranchGroup<T>[] {
  const buckets = new Map<string, T[]>();
  for (const it of items) {
    const b = branchOf(it) || "";
    (buckets.get(b) ?? buckets.set(b, []).get(b)!).push(it);
  }
  return [...buckets.keys()]
    .sort((a, b) => {
      if (!a) return 1; // unassigned last
      if (!b) return -1;
      return branchLabel(a).localeCompare(branchLabel(b), undefined, { sensitivity: "base" });
    })
    .map((branch) => ({ branch, items: sortByName(buckets.get(branch)!, name) }));
}
