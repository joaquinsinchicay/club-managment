"use client";

import { useState } from "react";

import { TreasuryVisibilityCheckboxGroup } from "@/components/settings/tabs/treasury-visibility-checkbox-group";
import { ModalFooter } from "@/components/ui/modal-footer";
import {
  FORM_GRID_CLASSNAME,
  FormField,
  FormFieldLabel,
  FormInput,
  FormSelect,
} from "@/components/ui/modal-form";
import { PendingFieldset } from "@/components/ui/pending-form";
import type { ClubActivity } from "@/lib/domain/access";
import { texts } from "@/lib/texts";
import {
  getEmojiOptions,
  TREASURY_ACCOUNT_VISIBILITY_OPTIONS
} from "@/lib/treasury-system-options";

const TREASURY_ACTIVITY_EMOJI_OPTIONS = texts.settings.club.treasury.emoji_options.activities;

type ActivityFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  pendingLabel: string;
  defaultActivity?: ClubActivity;
  onCancel: () => void;
  onSuccess: () => void;
};

export function ActivityForm({
  action,
  submitLabel,
  pendingLabel,
  defaultActivity,
  onCancel,
  onSuccess
}: ActivityFormProps) {
  const [selectedVisibility, setSelectedVisibility] = useState<string[]>(
    TREASURY_ACCOUNT_VISIBILITY_OPTIONS.filter((v) =>
      v === "secretaria"
        ? (defaultActivity?.visibleForSecretaria ?? true)
        : (defaultActivity?.visibleForTesoreria ?? false)
    )
  );

  function handleVisibilityToggle(visibility: string, checked: boolean) {
    setSelectedVisibility((current) =>
      checked ? [...current, visibility] : current.filter((v) => v !== visibility)
    );
  }

  async function handleSubmit(formData: FormData) {
    onSuccess();
    await action(formData);
  }

  return (
    <form action={handleSubmit} className="flex flex-col">
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

        <TreasuryVisibilityCheckboxGroup
          selected={selectedVisibility}
          onChange={handleVisibilityToggle}
        />
      </PendingFieldset>

      <ModalFooter
        onCancel={onCancel}
        cancelLabel={texts.settings.club.treasury.cancel_cta}
        submitLabel={submitLabel}
        pendingLabel={pendingLabel}
      />
    </form>
  );
}
