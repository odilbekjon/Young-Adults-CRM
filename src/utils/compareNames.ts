// A->Z order for names shown to people (groups, ...): case-insensitive, accents
// ignored, and numbers compared as numbers ("Group 2" before "Group 10"). The
// browser's own locale decides how Latin and Cyrillic letters sort, so Uzbek
// (Latin or Cyrillic) and Russian names each come out in their alphabet's order.
// Surrounding spaces do not count.
export const compareNames = (a?: string | null, b?: string | null): number =>
  (a ?? "").trim().localeCompare((b ?? "").trim(), undefined, { numeric: true, sensitivity: "base" });

// A sorted copy of `items`, A->Z by their name (the list itself is left alone).
export const sortByName = <T extends { name?: string | null }>(items: readonly T[]): T[] =>
  [...items].sort((a, b) => compareNames(a.name, b.name));
