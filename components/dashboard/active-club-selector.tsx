"use client";

import { useRef } from "react";

import { cn } from "@/lib/utils";
import { PendingFieldset, PendingStatusText } from "@/components/ui/pending-form";
import type { AvailableClub } from "@/lib/domain/access";
import { texts } from "@/lib/texts";

type ActiveClubSelectorProps = {
  clubs: AvailableClub[];
  activeClubId: string;
  setActiveClubAction: (formData: FormData) => Promise<void>;
  inline?: boolean;
};

export function ActiveClubSelector({
  clubs,
  activeClubId,
  setActiveClubAction,
  inline = false
}: ActiveClubSelectorProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={setActiveClubAction} className={cn("grid gap-2", inline && "gap-1")}>
      <PendingFieldset className={cn("grid gap-2", inline && "gap-1")}>
        <label className={cn("grid gap-2 text-sm text-foreground", inline && "gap-0")}>
          <span
            className={cn(
              "font-medium",
              inline ? "sr-only" : "text-xs uppercase tracking-[0.18em] text-muted-foreground"
            )}
          >
            {texts.dashboard.club_selector.label}
          </span>
          <select
            name="club_id"
            defaultValue={activeClubId}
            onChange={() => formRef.current?.requestSubmit()}
            className={cn(
              "min-h-11 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground",
              inline &&
                "min-h-0 border-0 bg-transparent px-0 py-0 text-[15px] font-semibold tracking-tight text-foreground focus:outline-none focus:ring-0"
            )}
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
          className={inline ? "sr-only" : "text-meta"}
        />
      </PendingFieldset>
    </form>
  );
}
