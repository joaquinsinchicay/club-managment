"use client";

import { useRef } from "react";

import { cn } from "@/lib/utils";
import { FormSelect } from "@/components/ui/modal-form";
import { PendingFieldset, PendingStatusText } from "@/components/ui/pending-form";
import type { AvailableClub } from "@/lib/domain/access";
import { dashboard as txtDashboard } from "@/lib/texts";

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
              inline ? "sr-only" : "text-xs uppercase tracking-card-eyebrow text-muted-foreground"
            )}
          >
            {txtDashboard.club_selector.label}
          </span>
          <FormSelect
            name="club_id"
            defaultValue={activeClubId}
            onChange={() => formRef.current?.requestSubmit()}
            className={
              inline
                ? "min-h-0 border-0 bg-transparent px-0 py-0 text-card-title font-semibold tracking-tight focus:ring-0"
                : undefined
            }
          >
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </FormSelect>
        </label>
        <PendingStatusText
          idleLabel={txtDashboard.club_selector.helper}
          pendingLabel={txtDashboard.club_selector.loading}
          className={inline ? "sr-only" : "text-meta"}
        />
      </PendingFieldset>
    </form>
  );
}
