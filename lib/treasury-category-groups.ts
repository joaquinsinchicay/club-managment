import type { TreasuryCategory, TreasuryCategoryMovementType } from "@/lib/domain/access";
import { sortTreasuryCategories } from "@/lib/treasury-system-categories";

export type TreasuryCategoryGroup = {
  key: string;
  parentCategory: string;
  movementType: TreasuryCategoryMovementType;
  subcategories: TreasuryCategory[];
};

export function buildGroupKey(parentCategory: string, movementType: TreasuryCategoryMovementType) {
  return `${parentCategory}::${movementType}`;
}

export function groupCategoriesByParentAndType(categories: TreasuryCategory[]): TreasuryCategoryGroup[] {
  const visible = categories.filter((category) => !category.isLegacy);
  const sorted = sortTreasuryCategories(visible);

  const groupMap = new Map<string, TreasuryCategoryGroup>();

  for (const category of sorted) {
    const key = buildGroupKey(category.parentCategory, category.movementType);
    const existing = groupMap.get(key);

    if (existing) {
      existing.subcategories.push(category);
    } else {
      groupMap.set(key, {
        key,
        parentCategory: category.parentCategory,
        movementType: category.movementType,
        subcategories: [category]
      });
    }
  }

  return Array.from(groupMap.values());
}
