// The group payload may carry its tags as `tags: {id,name}[]` or as a flat
// `tagIds: string[]` — read both so the current tags are always pre-selected.
export const getGroupTagIds = (g: {
  tags?: { id: string }[] | null;
  tagIds?: string[] | null;
}): string[] => {
  const fromObjects = (g.tags ?? []).map((tag) => tag.id).filter(Boolean);
  if (fromObjects.length) return fromObjects;
  return (g.tagIds ?? []).filter(Boolean);
};
