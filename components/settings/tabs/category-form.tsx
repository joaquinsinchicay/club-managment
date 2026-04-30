"use client";

import { useEffect, useState } from "react";

import { TreasuryVisibilityCheckboxGroup } from "@/components/settings/tabs/treasury-visibility-checkbox-group";
import { ModalFooter } from "@/components/ui/modal-footer";
import {
  FORM_GRID_CLASSNAME,
  FormField,
  FormFieldLabel,
  FormInput,
  FormReadonly,
  FormSelect,
} from "@/components/ui/modal-form";
import { PendingFieldset } from "@/components/ui/pending-form";
import type { TreasuryCategory } from "@/lib/domain/access";
import { texts } from "@/lib/texts";
import {
  getMovementTypeForParentCategory,
  getParentCategoryOptionsWithCurrentValue
} from "@/lib/treasury-system-categories";
import {
  getEmojiOptions,
  TREASURY_ACCOUNT_VISIBILITY_OPTIONS
} from "@/lib/treasury-system-options";

const TREASURY_CATEGORY_EMOJI_OPTIONS = texts.settings.club.treasury.emoji_options.categories;

function getMovementTypeLabel(movementType: TreasuryCategory["movementType"]) {
  return texts.settings.club.treasury.category_movement_types[movementType];
}

function getParentCategoryOptions(defaultCategory?: TreasuryCategory) {
  return getParentCategoryOptionsWithCurrentValue(defaultCategory?.parentCategory);
}

type CategoryFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  pendingLabel: string;
  defaultCategory?: TreasuryCategory;
  onCancel: () => void;
  onSuccess: () => void;
};

export function CategoryForm({
  action,
  submitLabel,
  pendingLabel,
  defaultCategory,
  onCancel,
  onSuccess
}: CategoryFormProps) {
  const isSystemCategory = defaultCategory?.isSystem ?? false;
  const [selectedVisibility, setSelectedVisibility] = useState<string[]>(
    TREASURY_ACCOUNT_VISIBILITY_OPTIONS.filter((visibility) =>
      visibility === "secretaria"
        ? (defaultCategory?.visibleForSecretaria ?? true)
        : (defaultCategory?.visibleForTesoreria ?? true)
    )
  );
  const [visibilityTouched, setVisibilityTouched] = useState(false);
  const [selectedParentCategory, setSelectedParentCategory] = useState(defaultCategory?.parentCategory ?? "");
  const [movementType, setMovementType] = useState<TreasuryCategory["movementType"]>(
    defaultCategory?.movementType ?? "egreso"
  );

  useEffect(() => {
    const nextMovementType = getMovementTypeForParentCategory(selectedParentCategory);

    if (nextMovementType) {
      setMovementType(nextMovementType);
    }
  }, [selectedParentCategory]);

  function handleVisibilityToggle(visibility: string, checked: boolean) {
    setVisibilityTouched(true);
    setSelectedVisibility((current) =>
      checked ? [...current, visibility] : current.filter((value) => value !== visibility)
    );
  }

  async function handleSubmit(formData: FormData) {
    onSuccess();
    await action(formData);
  }

  return (
    <form
      action={handleSubmit}
      onSubmit={(event) => {
        if (selectedVisibility.length === 0) {
          event.preventDefault();
          setVisibilityTouched(true);
        }
      }}
      className="flex flex-col"
    >
      <PendingFieldset className={FORM_GRID_CLASSNAME}>
        {defaultCategory ? <input type="hidden" name="category_id" value={defaultCategory.id} /> : null}
        {isSystemCategory ? (
          <>
            <input type="hidden" name="sub_category_name" value={defaultCategory?.subCategoryName ?? ""} />
            <input type="hidden" name="description" value={defaultCategory?.description ?? ""} />
            <input type="hidden" name="parent_category" value={defaultCategory?.parentCategory ?? ""} />
            <input type="hidden" name="emoji" value={defaultCategory?.emoji ?? ""} />
          </>
        ) : null}

        <FormField>
          <FormFieldLabel required>
            {texts.settings.club.treasury.parent_category_label}
          </FormFieldLabel>
          <FormSelect
            name="parent_category"
            value={selectedParentCategory}
            disabled={isSystemCategory}
            onChange={(event) => setSelectedParentCategory(event.target.value)}
          >
            <option value="" disabled>
              {texts.settings.club.treasury.parent_category_placeholder}
            </option>
            {getParentCategoryOptions(defaultCategory).map((parentCategory) => (
              <option key={`parent-category-${parentCategory}`} value={parentCategory}>
                {parentCategory}
              </option>
            ))}
          </FormSelect>
        </FormField>

        <FormField>
          <FormFieldLabel>{texts.settings.club.treasury.category_type_label}</FormFieldLabel>
          <FormReadonly>{getMovementTypeLabel(movementType)}</FormReadonly>
          <input type="hidden" name="movement_type" value={movementType} />
        </FormField>

        <FormField>
          <FormFieldLabel>{texts.settings.club.treasury.emoji_label}</FormFieldLabel>
          <FormSelect
            name="emoji"
            defaultValue={defaultCategory?.emoji ?? ""}
            disabled={isSystemCategory}
          >
            <option value="">{texts.settings.club.treasury.emoji_placeholder}</option>
            {getEmojiOptions(TREASURY_CATEGORY_EMOJI_OPTIONS, defaultCategory?.emoji).map((emoji) => (
              <option key={`category-emoji-${emoji}`} value={emoji}>
                {emoji}
              </option>
            ))}
          </FormSelect>
        </FormField>

        <FormField>
          <FormFieldLabel required>
            {texts.settings.club.treasury.sub_category_name_label}
          </FormFieldLabel>
          <FormInput
            type="text"
            name="sub_category_name"
            defaultValue={defaultCategory?.subCategoryName ?? ""}
            disabled={isSystemCategory}
          />
        </FormField>

        <FormField fullWidth>
          <FormFieldLabel>
            {texts.settings.club.treasury.category_description_label}
          </FormFieldLabel>
          <FormInput
            type="text"
            name="description"
            defaultValue={defaultCategory?.description ?? ""}
            disabled={isSystemCategory}
          />
        </FormField>

        <TreasuryVisibilityCheckboxGroup
          selected={selectedVisibility}
          onChange={handleVisibilityToggle}
          errorText={
            visibilityTouched && selectedVisibility.length === 0
              ? texts.settings.club.treasury.feedback.account_visibility_required
              : undefined
          }
        />
      </PendingFieldset>

      <ModalFooter
        onCancel={onCancel}
        cancelLabel={texts.settings.club.treasury.cancel_cta}
        submitLabel={submitLabel}
        pendingLabel={pendingLabel}
        submitDisabled={selectedVisibility.length === 0}
      />
    </form>
  );
}
