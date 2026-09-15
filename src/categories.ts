export const CATEGORIES = [
  { id: "data", label: "Data" },
  { id: "code", label: "Code" },
  { id: "design", label: "Design" },
  { id: "writing", label: "Writing" },
  { id: "video", label: "Video" },
  { id: "music", label: "Music" },
  { id: "business", label: "Business" },
  { id: "education", label: "Education" },
  { id: "other", label: "Other" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

const IDS = new Set<string>(CATEGORIES.map((c) => c.id));

export function parseCategory(value: string): CategoryId {
  const id = value.trim().toLowerCase();
  return IDS.has(id) ? (id as CategoryId) : "other";
}

export function categoryLabel(id: string) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? "Other";
}

export function groupByCategory<T extends { category: string }>(items: T[]) {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = IDS.has(item.category) ? item.category : "other";
    const list = buckets.get(key) ?? [];
    list.push(item);
    buckets.set(key, list);
  }
  return CATEGORIES.map((c) => ({ ...c, items: buckets.get(c.id) ?? [] })).filter((g) => g.items.length > 0);
}
