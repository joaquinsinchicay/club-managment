"use client";

import { ActivitiesTab } from "@/components/settings/tabs/activities-tab";
import { CategoriesTab } from "@/components/settings/tabs/categories-tab";
import type { ClubActivity, TreasuryCategory } from "@/lib/domain/access";

type CategoriesActivitiesTabProps = {
  categories: TreasuryCategory[];
  activities: ClubActivity[];
  createTreasuryCategoryAction: (formData: FormData) => Promise<void>;
  updateTreasuryCategoryAction: (formData: FormData) => Promise<void>;
  createClubActivityAction: (formData: FormData) => Promise<void>;
  updateClubActivityAction: (formData: FormData) => Promise<void>;
};

export function CategoriesActivitiesTab({
  categories,
  activities,
  createTreasuryCategoryAction,
  updateTreasuryCategoryAction,
  createClubActivityAction,
  updateClubActivityAction
}: CategoriesActivitiesTabProps) {
  return (
    <div className="grid gap-10">
      <CategoriesTab
        categories={categories}
        createTreasuryCategoryAction={createTreasuryCategoryAction}
        updateTreasuryCategoryAction={updateTreasuryCategoryAction}
      />
      <ActivitiesTab
        activities={activities}
        createClubActivityAction={createClubActivityAction}
        updateClubActivityAction={updateClubActivityAction}
      />
    </div>
  );
}
