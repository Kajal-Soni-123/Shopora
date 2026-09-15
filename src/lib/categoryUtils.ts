export interface CategoryNode {
  id: string;
  name: string;
  parentId?: string | null;
}

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

/**
 * Recursively resolves the full breadcrumb hierarchy path for a category.
 * Example: "Furniture > Almera" or "Bags & Packs > Earings"
 */
export function getCategoryHierarchyPath(catId: string, categories: CategoryNode[]): string {
  const cat = categories.find((c) => c.id === catId);
  if (!cat) return '';
  const parts = [cat.name];
  let curr = cat;
  const visited = new Set<string>([catId]);

  while (curr.parentId) {
    if (visited.has(curr.parentId)) break; // Guard against circular parent references
    visited.add(curr.parentId);
    const parent = categories.find((c) => c.id === curr.parentId);
    if (!parent) break;
    parts.unshift(parent.name);
    curr = parent;
  }
  return parts.join(' > ');
}

/**
 * Builds formatted and alphabetically sorted hierarchy options for select dropdowns.
 * Formats sub-categories as "Parent > Sub-Category" so parent-child relationships are completely unambiguous.
 */
export function buildCategoryHierarchyOptions(
  categories: CategoryNode[],
  defaultOptionLabel: string | null = 'None (Create as Top-Level Main Category)',
  excludeId?: string
): SelectOption[] {
  const options: SelectOption[] = [];

  if (defaultOptionLabel !== null) {
    options.push({ value: '', label: defaultOptionLabel });
  }

  const sortedCatOptions = categories
    .filter((c) => c.id !== excludeId)
    .map((c) => ({
      value: c.id,
      label: getCategoryHierarchyPath(c.id, categories),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return [...options, ...sortedCatOptions];
}
