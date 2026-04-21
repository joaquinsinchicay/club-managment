"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { buttonClass } from "@/components/ui/button";
import {
  CONTROL_CLASSNAME,
  FIELD_LABEL_CLASSNAME,
  FORM_GRID_CLASSNAME,
  FORM_GRID_PADDING_CLASSNAME,
  FormField,
  MODAL_FOOTER_CLASSNAME,
  REQUIRED_SUFFIX
} from "@/components/ui/modal-form";
import { PendingFieldset, PendingSubmitButton } from "@/components/ui/pending-form";
import type { ClubActivity } from "@/lib/domain/access";
import { texts } from "@/lib/texts";
import { cn } from "@/lib/utils";

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
  onClose: () => void;
  onSuccess: () => void;
};

export function ActivityForm({
  action,
  submitLabel,
  pendingLabel,
  defaultActivity,
  onClose,
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
    <form action={action} className="flex flex-col">
      <PendingFieldset className={cn(FORM_GRID_CLASSNAME, FORM_GRID_PADDING_CLASSNAME)}>
        {defaultActivity ? <input type="hidden" name="activity_id" value={defaultActivity.id} /> : null}

        <FormField fullWidth>
          <span className={FIELD_LABEL_CLASSNAME}>
            {texts.settings.club.treasury.activity_name_label}
            {REQUIRED_SUFFIX}
          </span>
          <input
            type="text"
            name="name"
            defaultValue={defaultActivity?.name ?? ""}
            className={CONTROL_CLASSNAME}
          />
        </FormField>

        <FormField>
          <span className={FIELD_LABEL_CLASSNAME}>{texts.settings.club.treasury.emoji_label}</span>
          <select
            name="emoji"
            defaultValue={defaultActivity?.emoji ?? ""}
            className={CONTROL_CLASSNAME}
          >
            <option value="">{texts.settings.club.treasury.emoji_placeholder}</option>
            {getEmojiOptions(TREASURY_ACTIVITY_EMOJI_OPTIONS, defaultActivity?.emoji).map((emoji) => (
              <option key={`activity-emoji-${emoji}`} value={emoji}>
                {emoji}
              </option>
            ))}
          </select>
        </FormField>

        <fieldset className="grid gap-3 sm:col-span-2">
          <legend className={FIELD_LABEL_CLASSNAME}>
            {texts.settings.club.treasury.account_visibility_label}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {TREASURY_ACCOUNT_VISIBILITY_OPTIONS.map((visibility) => (
              <label
                key={`activity-visibility-${visibility}`}
                className="flex min-h-11 items-center gap-3 rounded-card border border-border bg-card px-4 py-3 text-sm text-foreground"
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
      </PendingFieldset>

      <div className={MODAL_FOOTER_CLASSNAME}>
        <button
          type="button"
          onClick={onClose}
          className={buttonClass({ variant: "secondary", size: "sm" })}
        >
          {texts.settings.club.treasury.cancel_cta}
        </button>
        <PendingSubmitButton
          idleLabel={submitLabel}
          pendingLabel={pendingLabel}
          className={buttonClass({ variant: "primary", size: "sm" })}
        />
      </div>
    </form>
  );
}
