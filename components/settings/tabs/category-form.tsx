"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ModalFooter } from "@/components/ui/modal-footer";
import {
  FORM_GRID_CLASSNAME,
  FormCheckboxCard,
  FormError,
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

const TREASURY_ACCOUNT_VISIBILITY_OPTIONS = ["secretaria", "tesoreria"] as const;
const TREASURY_CATEGORY_EMOJI_OPTIONS = texts.settings.club.treasury.emoji_options.categories;

function getEmojiOptions(options: string[], currentEmoji?: string | null) {
  if (currentEmoji && !options.includes(currentEmoji)) {
    return [currentEmoji, ...options];
  }

  return options;
}

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
  onClose: () => void;
  onSuccess: () => void;
};

export function CategoryForm({
  action,
  submitLabel,
  pendingLabel,
  defaultCategory,
  onClose,
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
  const searchParams = useSearchParams();
  const feedbackCode = searchParams.get("feedback");

  useEffect(() => {
    if (feedbackCode === "category_created" || feedbackCode === "category_updated") {
      onSuccess();
    }
  }, [feedbackCode, onSuccess]);

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

  return (
    <form
      action={action}
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

        <div className="grid gap-3 sm:col-span-2">
          {TREASURY_ACCOUNT_VISIBILITY_OPTIONS.map((visibility) => (
            <FormCheckboxCard
              key={`category-visibility-${visibility}`}
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
          {visibilityTouched && selectedVisibility.length === 0 ? (
            <FormError>{texts.settings.club.treasury.feedback.account_visibility_required}</FormError>
          ) : null}
        </div>
      </PendingFieldset>

      <ModalFooter
        onCancel={onClose}
        cancelLabel={texts.settings.club.treasury.cancel_cta}
        submitLabel={submitLabel}
        pendingLabel={pendingLabel}
        submitDisabled={selectedVisibility.length === 0}
      />
    </form>
  );
}
