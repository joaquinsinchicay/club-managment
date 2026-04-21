"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ModalFooter } from "@/components/ui/modal-footer";
import {
  FORM_GRID_CLASSNAME,
  FormCheckboxCard,
  FormField,
  FormFieldLabel,
  FormInput,
  FormSelect,
} from "@/components/ui/modal-form";
import { PendingFieldset } from "@/components/ui/pending-form";
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
      <PendingFieldset className={FORM_GRID_CLASSNAME}>
        {defaultActivity ? <input type="hidden" name="activity_id" value={defaultActivity.id} /> : null}

        <FormField>
          <FormFieldLabel>{texts.settings.club.treasury.emoji_label}</FormFieldLabel>
          <FormSelect name="emoji" defaultValue={defaultActivity?.emoji ?? ""}>
            <option value="">{texts.settings.club.treasury.emoji_placeholder}</option>
            {getEmojiOptions(TREASURY_ACTIVITY_EMOJI_OPTIONS, defaultActivity?.emoji).map((emoji) => (
              <option key={`activity-emoji-${emoji}`} value={emoji}>
                {emoji}
              </option>
            ))}
          </FormSelect>
        </FormField>

        <FormField>
          <FormFieldLabel required>
            {texts.settings.club.treasury.activity_name_label}
          </FormFieldLabel>
          <FormInput type="text" name="name" defaultValue={defaultActivity?.name ?? ""} />
        </FormField>

        <div className="grid gap-3 sm:col-span-2">
          {TREASURY_ACCOUNT_VISIBILITY_OPTIONS.map((visibility) => (
            <FormCheckboxCard
              key={`activity-visibility-${visibility}`}
              name="visibility"
              value={visibility}
              label={
                visibility === "secretaria"
                  ? texts.settings.club.treasury.visibility_secretaria_checkbox
                  : texts.settings.club.treasury.visibility_tesoreria_checkbox
              }
              checked={selectedVisibility.includes(visibility)}
              onChange={(checked) => handleVisibilityToggle(visibility, checked)}
            />
          ))}
        </div>
      </PendingFieldset>

      <ModalFooter
        align="end"
        onCancel={onClose}
        cancelLabel={texts.settings.club.treasury.cancel_cta}
        submitLabel={submitLabel}
        pendingLabel={pendingLabel}
      />
    </form>
  );
}
