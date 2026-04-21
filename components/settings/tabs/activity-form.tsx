"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { PendingFieldset, PendingSubmitButton } from "@/components/ui/pending-form";
import type { ClubActivity } from "@/lib/domain/access";
import { texts } from "@/lib/texts";

const TREASURY_ACCOUNT_VISIBILITY_OPTIONS = ["secretaria", "tesoreria"] as const;
const TREASURY_ACTIVITY_EMOJI_OPTIONS = texts.settings.club.treasury.emoji_options.activities;

function getEmojiOptions(options: string[], currentEmoji?: string | null) {
  if (currentEmoji && !options.includes(currentEmoji)) {
    return [currentEmoji, ...options];
  }
  return options;
}

type ActivityFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  pendingLabel: string;
  defaultActivity?: ClubActivity;
  onSuccess: () => void;
};

export function ActivityForm({
  action,
  submitLabel,
  pendingLabel,
  defaultActivity,
  onSuccess
}: ActivityFormProps) {
  const [selectedVisibility, setSelectedVisibility] = useState<string[]>(
    TREASURY_ACCOUNT_VISIBILITY_OPTIONS.filter((v) =>
      v === "secretaria"
        ? (defaultActivity?.visibleForSecretaria ?? true)
        : (defaultActivity?.visibleForTesoreria ?? false)
    )
  );
  const searchParams = useSearchParams();
  const feedbackCode = searchParams.get("feedback");

  useEffect(() => {
    if (feedbackCode === "activity_created" || feedbackCode === "activity_updated") {
      onSuccess();
    }
  }, [feedbackCode, onSuccess]);

  function handleVisibilityToggle(visibility: string, checked: boolean) {
    setSelectedVisibility((current) =>
      checked ? [...current, visibility] : current.filter((v) => v !== visibility)
    );
  }

  return (
    <form action={action} className="grid gap-4">
      <PendingFieldset className="grid gap-4">
        {defaultActivity ? <input type="hidden" name="activity_id" value={defaultActivity.id} /> : null}

        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.settings.club.treasury.activity_name_label}</span>
          <input
            type="text"
            name="name"
            defaultValue={defaultActivity?.name ?? ""}
            className="min-h-11 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground"
          />
        </label>

        <fieldset className="grid gap-3">
          <legend className="text-sm font-medium text-foreground">
            {texts.settings.club.treasury.account_visibility_label}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {TREASURY_ACCOUNT_VISIBILITY_OPTIONS.map((visibility) => (
              <label
                key={`activity-visibility-${visibility}`}
                className="flex min-h-11 items-center gap-3 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground"
              >
                <input
                  type="checkbox"
                  name="visibility"
                  value={visibility}
                  checked={selectedVisibility.includes(visibility)}
                  onChange={(e) => handleVisibilityToggle(visibility, e.target.checked)}
                  className="size-4 rounded border-border"
                />
                <span className="font-medium">
                  {texts.settings.club.treasury.account_visibility_options[visibility]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.settings.club.treasury.emoji_label}</span>
          <select
            name="emoji"
            defaultValue={defaultActivity?.emoji ?? ""}
            className="min-h-11 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground"
          >
            <option value="">{texts.settings.club.treasury.emoji_placeholder}</option>
            {getEmojiOptions(TREASURY_ACTIVITY_EMOJI_OPTIONS, defaultActivity?.emoji).map((emoji) => (
              <option key={`activity-emoji-${emoji}`} value={emoji}>
                {emoji}
              </option>
            ))}
          </select>
        </label>

        <PendingSubmitButton
          idleLabel={submitLabel}
          pendingLabel={pendingLabel}
          className="min-h-11 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95 sm:justify-self-end"
        />
      </PendingFieldset>
    </form>
  );
}
