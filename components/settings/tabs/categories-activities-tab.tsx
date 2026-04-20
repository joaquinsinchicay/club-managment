"use client";

import { ActivitiesTab } from "@/components/settings/tabs/activities-tab";
import { CategoriesTab } from "@/components/settings/tabs/categories-tab";
import { texts } from "@/lib/texts";
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
  const treasuryTexts = texts.settings.club.treasury;

  return (
    <div className="grid gap-10">
      <section className="grid gap-5">
        <header className="grid gap-1">
          <h2 className="text-lg font-semibold text-foreground">{treasuryTexts.categories_title}</h2>
          <p className="text-sm text-muted-foreground">{treasuryTexts.categories_description}</p>
        </header>
        <CategoriesTab
          categories={categories}
          createTreasuryCategoryAction={createTreasuryCategoryAction}
          updateTreasuryCategoryAction={updateTreasuryCategoryAction}
        />
      </section>

      <section className="grid gap-5">
        <header className="grid gap-1">
          <h2 className="text-lg font-semibold text-foreground">{treasuryTexts.activities_title}</h2>
          <p className="text-sm text-muted-foreground">{treasuryTexts.activities_description}</p>
        </header>
        <ActivitiesTab
          activities={activities}
          createClubActivityAction={createClubActivityAction}
          updateClubActivityAction={updateClubActivityAction}
        />
      </section>
    </div>
  );
}
