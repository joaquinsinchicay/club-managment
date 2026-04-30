"use client";

import { useMemo, useState } from "react";

import { ActivityForm } from "@/components/settings/tabs/activity-form";
import { CategoryForm } from "@/components/settings/tabs/category-form";
import { Button } from "@/components/ui/button";
import { ChipButton } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import type { ClubActivity, TreasuryCategory, TreasuryCategoryMovementType } from "@/lib/domain/access";
import { texts } from "@/lib/texts";
import {
  groupCategoriesByParentAndType,
  type TreasuryCategoryGroup
} from "@/lib/treasury-category-groups";
import { cn } from "@/lib/utils";

type CategoryFilter = "all" | "ingreso" | "egreso";

type CategoriesActivitiesTabProps = {
  categories: TreasuryCategory[];
  activities: ClubActivity[];
  createTreasuryCategoryAction: (formData: FormData) => Promise<void>;
  updateTreasuryCategoryAction: (formData: FormData) => Promise<void>;
  createClubActivityAction: (formData: FormData) => Promise<void>;
  updateClubActivityAction: (formData: FormData) => Promise<void>;
};

const treasuryTexts = texts.settings.club.treasury;

const FILTER_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: treasuryTexts.filter_all_label },
  { value: "ingreso", label: treasuryTexts.filter_ingresos_label },
  { value: "egreso", label: treasuryTexts.filter_egresos_label }
];

function getMovementTypeBadge(movementType: TreasuryCategoryMovementType) {
  const label = treasuryTexts.category_movement_types[movementType].toUpperCase();

  if (movementType === "ingreso") {
    return <Badge label={label} tone="success" />;
  }

  if (movementType === "egreso") {
    return <Badge label={label} tone="danger" />;
  }

  return <Badge label={label} tone="neutral" />;
}

function formatSubcategoriesCount(count: number) {
  if (count === 1) {
    return treasuryTexts.subcategories_count_singular;
  }

  return treasuryTexts.subcategories_count_plural.replace("{count}", String(count));
}

function EditPencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
      />
    </svg>
  );
}

function ChevronIcon({ isExpanded }: { isExpanded: boolean }) {
  return (
    <svg
      className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-90")}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

export function CategoriesActivitiesTab({
  categories,
  activities,
  createTreasuryCategoryAction,
  updateTreasuryCategoryAction,
  createClubActivityAction,
  updateClubActivityAction
}: CategoriesActivitiesTabProps) {
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TreasuryCategory | null>(null);
  const [isCreatingActivity, setIsCreatingActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ClubActivity | null>(null);

  const groups = useMemo(() => groupCategoriesByParentAndType(categories), [categories]);

  const filteredGroups = useMemo(() => {
    if (filter === "all") {
      return groups;
    }

    return groups.filter((group) => group.movementType === filter);
  }, [filter, groups]);

  function toggleGroup(key: string) {
    setExpandedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <div className="grid gap-10">
      <section aria-labelledby="categories-heading" className="grid gap-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="grid gap-1">
            <h2 id="categories-heading" className="text-lg font-semibold text-foreground">
              {treasuryTexts.section_combined_title}
            </h2>
            <p className="text-sm text-muted-foreground">{treasuryTexts.taxonomy_eyebrow}</p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setIsCreatingCategory(true);
              setEditingCategory(null);
            }}
            className="w-full gap-2 sm:w-auto"
          >
            <PlusIcon className="h-4 w-4" />
            {treasuryTexts.create_category_short_cta}
          </Button>
        </header>

        <div
          role="tablist"
          aria-label={treasuryTexts.filter_all_label}
          className="flex flex-wrap gap-2 overflow-x-auto"
        >
          {FILTER_OPTIONS.map((option) => (
            <ChipButton
              key={`category-filter-${option.value}`}
              role="tab"
              active={filter === option.value}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </ChipButton>
          ))}
        </div>

        {filteredGroups.length === 0 ? (
          <EmptyState
            title={groups.length === 0 ? treasuryTexts.empty_categories : treasuryTexts.empty_groups_filter}
          />
        ) : (
          <div className="grid gap-2">
            {filteredGroups.map((group) => (
              <CategoryGroupRow
                key={group.key}
                group={group}
                isExpanded={expandedKeys.has(group.key)}
                onToggle={() => toggleGroup(group.key)}
                onEditSubcategory={(category) => {
                  setEditingCategory(category);
                  setIsCreatingCategory(false);
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="activities-heading" className="grid gap-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="grid gap-1">
            <h2 id="activities-heading" className="text-lg font-semibold text-foreground">
              {treasuryTexts.activities_title}
            </h2>
            <p className="text-sm text-muted-foreground">{treasuryTexts.activities_description}</p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setIsCreatingActivity(true);
              setEditingActivity(null);
            }}
            className="w-full gap-2 sm:w-auto"
          >
            <PlusIcon className="h-4 w-4" />
            {treasuryTexts.create_activity_short_cta}
          </Button>
        </header>

        {activities.length === 0 ? (
          <EmptyState title={treasuryTexts.empty_activities} />
        ) : (
          <div className="flex flex-wrap gap-2">
            {activities.map((activity) => (
              <button
                key={activity.id}
                type="button"
                aria-label={treasuryTexts.edit_activity_cta}
                onClick={() => {
                  setEditingActivity(activity);
                  setIsCreatingActivity(false);
                }}
                className="group relative inline-flex min-h-8 items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 pr-8 text-sm font-semibold text-foreground transition hover:bg-secondary-readonly focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/10"
              >
                {activity.emoji ? <span aria-hidden="true">{activity.emoji}</span> : null}
                <span>{activity.name}</span>
                <span
                  aria-hidden="true"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  <EditPencilIcon className="h-3.5 w-3.5" />
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={isCreatingCategory}
        title={treasuryTexts.create_category_cta}
        onClose={() => setIsCreatingCategory(false)}
        size="md"
      >
        <CategoryForm
          action={createTreasuryCategoryAction}
          submitLabel={treasuryTexts.save_category_cta}
          pendingLabel={treasuryTexts.save_category_loading}
          onCancel={() => setIsCreatingCategory(false)}
          onSuccess={() => setIsCreatingCategory(false)}
        />
      </Modal>

      <Modal
        open={editingCategory !== null}
        title={treasuryTexts.edit_category_cta}
        onClose={() => setEditingCategory(null)}
        size="md"
      >
        {editingCategory ? (
          <CategoryForm
            key={editingCategory.id}
            action={updateTreasuryCategoryAction}
            submitLabel={treasuryTexts.update_category_cta}
            pendingLabel={treasuryTexts.update_category_loading}
            defaultCategory={editingCategory}
            onCancel={() => setEditingCategory(null)}
            onSuccess={() => setEditingCategory(null)}
          />
        ) : null}
      </Modal>

      <Modal
        open={isCreatingActivity}
        title={treasuryTexts.create_activity_cta}
        onClose={() => setIsCreatingActivity(false)}
        size="md"
      >
        <ActivityForm
          action={createClubActivityAction}
          submitLabel={treasuryTexts.save_activity_cta}
          pendingLabel={treasuryTexts.save_activity_loading}
          onCancel={() => setIsCreatingActivity(false)}
          onSuccess={() => setIsCreatingActivity(false)}
        />
      </Modal>

      <Modal
        open={editingActivity !== null}
        title={treasuryTexts.edit_activity_cta}
        onClose={() => setEditingActivity(null)}
        size="md"
      >
        {editingActivity ? (
          <ActivityForm
            key={editingActivity.id}
            action={updateClubActivityAction}
            submitLabel={treasuryTexts.update_activity_cta}
            pendingLabel={treasuryTexts.update_activity_loading}
            defaultActivity={editingActivity}
            onCancel={() => setEditingActivity(null)}
            onSuccess={() => setEditingActivity(null)}
          />
        ) : null}
      </Modal>
    </div>
  );
}

type CategoryGroupRowProps = {
  group: TreasuryCategoryGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onEditSubcategory: (category: TreasuryCategory) => void;
};

function CategoryGroupRow({ group, isExpanded, onToggle, onEditSubcategory }: CategoryGroupRowProps) {
  return (
    <div className="rounded-shell border border-border/70 bg-gradient-surface-92">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex w-full items-center gap-3 rounded-shell px-4 py-3 text-left transition hover:bg-secondary-readonly focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <ChevronIcon isExpanded={isExpanded} />
        <span className="min-w-0 flex-1 truncate text-base font-semibold text-foreground">
          {group.parentCategory}
        </span>
        <span className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
          {getMovementTypeBadge(group.movementType)}
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {formatSubcategoriesCount(group.subcategories.length)}
          </span>
        </span>
      </button>

      {isExpanded ? (
        <ul className="divide-y divide-border/60 border-t border-border/60">
          {group.subcategories.map((category) => (
            <li key={category.id}>
              <button
                type="button"
                onClick={() => onEditSubcategory(category)}
                aria-label={treasuryTexts.edit_category_cta}
                className="group flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-secondary-readonly focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {category.emoji ? (
                  <span aria-hidden="true" className="text-base">
                    {category.emoji}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {category.subCategoryName}
                </span>
                <EditPencilIcon className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
