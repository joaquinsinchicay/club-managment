"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Modal } from "@/components/ui/modal";
import { PendingFieldset, PendingSubmitButton } from "@/components/ui/pending-form";
import { SettingsTabShell } from "@/components/settings/settings-tab-shell";
import type { TreasuryCategory } from "@/lib/domain/access";
import { texts } from "@/lib/texts";
import { isSystemTreasuryCategoryName } from "@/lib/treasury-system-categories";

const TREASURY_ACCOUNT_VISIBILITY_OPTIONS = ["secretaria", "tesoreria"] as const;
const TREASURY_CATEGORY_EMOJI_OPTIONS = texts.settings.club.treasury.emoji_options.categories;

function getEmojiOptions(options: string[], currentEmoji?: string | null) {
  if (currentEmoji && !options.includes(currentEmoji)) {
    return [currentEmoji, ...options];
  }
  return options;
}

function getRoleVisibilityLabel(visibleForSecretaria: boolean, visibleForTesoreria: boolean) {
  const labels = [];
  if (visibleForSecretaria) {
    labels.push(texts.settings.club.treasury.account_visibility_options.secretaria);
  }
  if (visibleForTesoreria) {
    labels.push(texts.settings.club.treasury.account_visibility_options.tesoreria);
  }
  return labels.join(" + ") || texts.settings.club.treasury.visibility_hidden;
}

type CategoryFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  pendingLabel: string;
  defaultCategory?: TreasuryCategory;
  onSuccess: () => void;
};

function CategoryForm({
  action,
  submitLabel,
  pendingLabel,
  defaultCategory,
  onSuccess
}: CategoryFormProps) {
  const isSystemCategory = defaultCategory ? isSystemTreasuryCategoryName(defaultCategory.name) : false;
  const [selectedVisibility, setSelectedVisibility] = useState<string[]>(
    TREASURY_ACCOUNT_VISIBILITY_OPTIONS.filter((v) =>
      v === "secretaria" ? (defaultCategory?.visibleForSecretaria ?? true) : (defaultCategory?.visibleForTesoreria ?? false)
    )
  );
  const [visibilityTouched, setVisibilityTouched] = useState(false);
  const searchParams = useSearchParams();
  const feedbackCode = searchParams.get("feedback");

  useEffect(() => {
    if (feedbackCode === "category_created" || feedbackCode === "category_updated") {
      onSuccess();
    }
  }, [feedbackCode, onSuccess]);

  function handleVisibilityToggle(visibility: string, checked: boolean) {
    setVisibilityTouched(true);
    setSelectedVisibility((current) =>
      checked ? [...current, visibility] : current.filter((v) => v !== visibility)
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
      className="grid gap-4"
    >
      <PendingFieldset className="grid gap-4">
        {defaultCategory ? <input type="hidden" name="category_id" value={defaultCategory.id} /> : null}

        {isSystemCategory ? (
          <>
            <input type="hidden" name="name" value={defaultCategory?.name ?? ""} />
            <input type="hidden" name="emoji" value={defaultCategory?.emoji ?? ""} />
          </>
        ) : (
          <>
            <label className="grid gap-2 text-sm text-foreground">
              <span className="font-medium">{texts.settings.club.treasury.category_name_label}</span>
              <input
                type="text"
                name="name"
                defaultValue={defaultCategory?.name ?? ""}
                className="min-h-11 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground"
              />
            </label>

            <label className="grid gap-2 text-sm text-foreground">
              <span className="font-medium">{texts.settings.club.treasury.emoji_label}</span>
              <select
                name="emoji"
                defaultValue={defaultCategory?.emoji ?? ""}
                className="min-h-11 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground"
              >
                <option value="">{texts.settings.club.treasury.emoji_placeholder}</option>
                {getEmojiOptions(TREASURY_CATEGORY_EMOJI_OPTIONS, defaultCategory?.emoji).map((emoji) => (
                  <option key={`category-emoji-${emoji}`} value={emoji}>
                    {emoji}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        <fieldset className="grid gap-3">
          <legend className="text-sm font-medium text-foreground">
            {texts.settings.club.treasury.account_visibility_label}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
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
                  onChange={(e) => handleVisibilityToggle(visibility, e.target.checked)}
                  className="size-4 rounded border-border"
                />
                <span className="font-medium">
                  {texts.settings.club.treasury.account_visibility_options[visibility]}
                </span>
              </label>
            ))}
          </div>
          {visibilityTouched && selectedVisibility.length === 0 ? (
            <p aria-live="assertive" className="text-sm text-destructive">
              {texts.settings.club.treasury.feedback.account_visibility_required}
            </p>
          ) : null}
        </fieldset>

        <PendingSubmitButton
          idleLabel={submitLabel}
          pendingLabel={pendingLabel}
          disabled={selectedVisibility.length === 0}
          className="min-h-11 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95 sm:justify-self-end"
        />
      </PendingFieldset>
    </form>
  );
}

type CategoriesTabProps = {
  categories: TreasuryCategory[];
  createTreasuryCategoryAction: (formData: FormData) => Promise<void>;
  updateTreasuryCategoryAction: (formData: FormData) => Promise<void>;
};

export function CategoriesTab({
  categories,
  createTreasuryCategoryAction,
  updateTreasuryCategoryAction
}: CategoriesTabProps) {
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TreasuryCategory | null>(null);

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <SettingsTabShell
        searchPlaceholder={texts.settings.club.treasury.categories_title}
        searchValue={search}
        onSearch={setSearch}
        ctaLabel={texts.settings.club.treasury.create_category_cta}
        onCta={() => {
          setIsCreating(true);
          setEditingCategory(null);
        }}
      >
        {filteredCategories.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-border bg-secondary/30 p-5 text-sm text-muted-foreground">
            {categories.length === 0
              ? texts.settings.club.treasury.empty_categories
              : "Sin resultados para la búsqueda."}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredCategories.map((category) => (
              <article
                key={category.id}
                className="rounded-[26px] border border-border/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.92)_0%,rgba(255,255,255,0.98)_100%)] p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-primary/10 text-xl">
                        {category.emoji ?? texts.settings.club.treasury.default_category_emoji}
                      </div>
                      <div>
                        <p className="truncate text-base font-semibold text-foreground">{category.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {getRoleVisibilityLabel(
                            category.visibleForSecretaria,
                            category.visibleForTesoreria
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-2 text-foreground">
                        <span className="font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {texts.settings.club.treasury.account_visibility_label}
                        </span>
                        <span className="font-medium">
                          {getRoleVisibilityLabel(
                            category.visibleForSecretaria,
                            category.visibleForTesoreria
                          )}
                        </span>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategory(category);
                      setIsCreating(false);
                    }}
                    aria-label={texts.settings.club.treasury.edit_category_cta}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </SettingsTabShell>

      <Modal
        open={isCreating}
        title={texts.settings.club.treasury.create_category_cta}
        onClose={() => setIsCreating(false)}
      >
        <CategoryForm
          action={createTreasuryCategoryAction}
          submitLabel={texts.settings.club.treasury.save_category_cta}
          pendingLabel={texts.settings.club.treasury.save_category_loading}
          onSuccess={() => setIsCreating(false)}
        />
      </Modal>

      <Modal
        open={editingCategory !== null}
        title={texts.settings.club.treasury.edit_category_cta}
        onClose={() => setEditingCategory(null)}
      >
        {editingCategory ? (
          <CategoryForm
            key={editingCategory.id}
            action={updateTreasuryCategoryAction}
            submitLabel={texts.settings.club.treasury.update_category_cta}
            pendingLabel={texts.settings.club.treasury.update_category_loading}
            defaultCategory={editingCategory}
            onSuccess={() => setEditingCategory(null)}
          />
        ) : null}
      </Modal>
    </>
  );
}
