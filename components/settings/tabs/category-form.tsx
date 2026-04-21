"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { buttonClass } from "@/components/ui/button";
import {
  CONTROL_CLASSNAME,
  CONTROL_DISABLED_CLASSNAME,
  FIELD_LABEL_CLASSNAME,
  FORM_GRID_CLASSNAME,
  FORM_GRID_PADDING_CLASSNAME,
  FormField,
  MODAL_FOOTER_CLASSNAME,
  REQUIRED_SUFFIX
} from "@/components/ui/modal-form";
import { PendingFieldset, PendingSubmitButton } from "@/components/ui/pending-form";
import type { TreasuryCategory } from "@/lib/domain/access";
import { texts } from "@/lib/texts";
import {
  getMovementTypeForParentCategory,
  getParentCategoryOptionsWithCurrentValue
} from "@/lib/treasury-system-categories";
import { cn } from "@/lib/utils";

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
      <PendingFieldset className={cn(FORM_GRID_CLASSNAME, FORM_GRID_PADDING_CLASSNAME)}>
        {defaultCategory ? <input type="hidden" name="category_id" value={defaultCategory.id} /> : null}
        {isSystemCategory ? (
          <>
            <input type="hidden" name="sub_category_name" value={defaultCategory?.subCategoryName ?? ""} />
            <input type="hidden" name="description" value={defaultCategory?.description ?? ""} />
            <input type="hidden" name="parent_category" value={defaultCategory?.parentCategory ?? ""} />
            <input type="hidden" name="emoji" value={defaultCategory?.emoji ?? ""} />
          </>
        ) : null}

        <FormField fullWidth>
          <span className={FIELD_LABEL_CLASSNAME}>
            {texts.settings.club.treasury.sub_category_name_label}
            {REQUIRED_SUFFIX}
          </span>
          <input
            type="text"
            name="sub_category_name"
            defaultValue={defaultCategory?.subCategoryName ?? ""}
            disabled={isSystemCategory}
            className={cn(CONTROL_CLASSNAME, CONTROL_DISABLED_CLASSNAME)}
          />
        </FormField>

        <FormField>
          <span className={FIELD_LABEL_CLASSNAME}>{texts.settings.club.treasury.emoji_label}</span>
          <select
            name="emoji"
            defaultValue={defaultCategory?.emoji ?? ""}
            disabled={isSystemCategory}
            className={cn(CONTROL_CLASSNAME, CONTROL_DISABLED_CLASSNAME)}
          >
            <option value="">{texts.settings.club.treasury.emoji_placeholder}</option>
            {getEmojiOptions(TREASURY_CATEGORY_EMOJI_OPTIONS, defaultCategory?.emoji).map((emoji) => (
              <option key={`category-emoji-${emoji}`} value={emoji}>
                {emoji}
              </option>
            ))}
          </select>
        </FormField>

        <FormField>
          <span className={FIELD_LABEL_CLASSNAME}>{texts.settings.club.treasury.category_type_label}</span>
          <input
            type="text"
            value={getMovementTypeLabel(movementType)}
            readOnly
            className={cn(CONTROL_CLASSNAME, "text-muted-foreground")}
          />
          <input type="hidden" name="movement_type" value={movementType} />
        </FormField>

        <FormField fullWidth>
          <span className={FIELD_LABEL_CLASSNAME}>
            {texts.settings.club.treasury.category_description_label}
          </span>
          <input
            type="text"
            name="description"
            defaultValue={defaultCategory?.description ?? ""}
            disabled={isSystemCategory}
            className={cn(CONTROL_CLASSNAME, CONTROL_DISABLED_CLASSNAME)}
          />
        </FormField>

        <FormField fullWidth>
          <span className={FIELD_LABEL_CLASSNAME}>
            {texts.settings.club.treasury.parent_category_label}
            {REQUIRED_SUFFIX}
          </span>
          <select
            name="parent_category"
            value={selectedParentCategory}
            disabled={isSystemCategory}
            onChange={(event) => setSelectedParentCategory(event.target.value)}
            className={cn(CONTROL_CLASSNAME, CONTROL_DISABLED_CLASSNAME)}
          >
            <option value="" disabled>
              {texts.settings.club.treasury.parent_category_placeholder}
            </option>
            {getParentCategoryOptions(defaultCategory).map((parentCategory) => (
              <option key={`parent-category-${parentCategory}`} value={parentCategory}>
                {parentCategory}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid gap-3 sm:col-span-2">
          {TREASURY_ACCOUNT_VISIBILITY_OPTIONS.map((visibility) => (
            <label
              key={`category-visibility-${visibility}`}
              className="flex min-h-11 items-center gap-3 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground"
            >
              <input
                type="checkbox"
                name="visibility"
                value={visibility}
                checked={selectedVisibility.includes(visibility)}
                onChange={(event) => handleVisibilityToggle(visibility, event.target.checked)}
                className="size-4 rounded border-border"
              />
              <span className="font-medium">
                {visibility === "secretaria"
                  ? texts.settings.club.treasury.visibility_secretaria_checkbox
                  : texts.settings.club.treasury.visibility_tesoreria_checkbox}
              </span>
            </label>
          ))}
          {visibilityTouched && selectedVisibility.length === 0 ? (
            <p aria-live="assertive" className="text-sm text-destructive">
              {texts.settings.club.treasury.feedback.account_visibility_required}
            </p>
          ) : null}
        </div>
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
          disabled={selectedVisibility.length === 0}
          className={buttonClass({ variant: "primary", size: "sm" })}
        />
      </div>
    </form>
  );
}
