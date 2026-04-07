"use client";

import { useRef } from "react";

import { PendingFieldset, PendingStatusText } from "@/components/ui/pending-form";
import type { AvailableClub } from "@/lib/domain/access";
import { texts } from "@/lib/texts";

type ActiveClubSelectorProps = {
  clubs: AvailableClub[];
  activeClubId: string;
  setActiveClubAction: (formData: FormData) => Promise<void>;
};

export function ActiveClubSelector({
  clubs,
  activeClubId,
  setActiveClubAction
}: ActiveClubSelectorProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={setActiveClubAction} className="grid gap-2">
      <PendingFieldset className="grid gap-2">
        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.dashboard.club_selector.label}</span>
          <select
            name="club_id"
            defaultValue={activeClubId}
            onChange={() => formRef.current?.requestSubmit()}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          >
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
        </label>
        <PendingStatusText
          idleLabel={texts.dashboard.club_selector.helper}
          pendingLabel={texts.dashboard.club_selector.loading}
        />
      </PendingFieldset>
    </form>
  );
}
