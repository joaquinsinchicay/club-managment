"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Modal } from "@/components/ui/modal";
import { PendingFieldset, PendingSubmitButton } from "@/components/ui/pending-form";
import { SettingsTabShell } from "@/components/settings/settings-tab-shell";
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

type ActivityFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  pendingLabel: string;
  defaultActivity?: ClubActivity;
  onSuccess: () => void;
};

function ActivityForm({
  action,
  submitLabel,
  pendingLabel,
  defaultActivity,
  onSuccess
}: ActivityFormProps) {
  const searchParams = useSearchParams();
  const feedbackCode = searchParams.get("feedback");

  useEffect(() => {
    if (feedbackCode === "activity_created" || feedbackCode === "activity_updated") {
      onSuccess();
    }
  }, [feedbackCode, onSuccess]);

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
                  defaultChecked={
                    visibility === "secretaria"
                      ? (defaultActivity?.visibleForSecretaria ?? true)
                      : (defaultActivity?.visibleForTesoreria ?? false)
                  }
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

type ActivitiesTabProps = {
  activities: ClubActivity[];
  createClubActivityAction: (formData: FormData) => Promise<void>;
  updateClubActivityAction: (formData: FormData) => Promise<void>;
};

export function ActivitiesTab({
  activities,
  createClubActivityAction,
  updateClubActivityAction
}: ActivitiesTabProps) {
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ClubActivity | null>(null);

  const filteredActivities = activities.filter((activity) =>
    activity.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <SettingsTabShell
        searchPlaceholder={texts.settings.club.treasury.activities_title}
        searchValue={search}
        onSearch={setSearch}
        ctaLabel={texts.settings.club.treasury.create_activity_cta}
        onCta={() => {
          setIsCreating(true);
          setEditingActivity(null);
        }}
      >
        {filteredActivities.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-border bg-secondary/30 p-5 text-sm text-muted-foreground">
            {activities.length === 0
              ? texts.settings.club.treasury.empty_activities
              : "Sin resultados para la búsqueda."}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredActivities.map((activity) => (
              <article
                key={activity.id}
                className="rounded-[26px] border border-border/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.92)_0%,rgba(255,255,255,0.98)_100%)] p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-primary/10 text-xl">
                        {activity.emoji ?? texts.settings.club.treasury.default_activity_emoji}
                      </div>
                      <div>
                        <p className="truncate text-base font-semibold text-foreground">{activity.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {getRoleVisibilityLabel(
                            activity.visibleForSecretaria,
                            activity.visibleForTesoreria
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
                            activity.visibleForSecretaria,
                            activity.visibleForTesoreria
                          )}
                        </span>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingActivity(activity);
                      setIsCreating(false);
                    }}
                    className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                  >
                    {texts.settings.club.treasury.edit_activity_cta}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </SettingsTabShell>

      <Modal
        open={isCreating}
        title={texts.settings.club.treasury.create_activity_cta}
        onClose={() => setIsCreating(false)}
      >
        <ActivityForm
          action={createClubActivityAction}
          submitLabel={texts.settings.club.treasury.save_activity_cta}
          pendingLabel={texts.settings.club.treasury.save_activity_loading}
          onSuccess={() => setIsCreating(false)}
        />
      </Modal>

      <Modal
        open={editingActivity !== null}
        title={texts.settings.club.treasury.edit_activity_cta}
        onClose={() => setEditingActivity(null)}
      >
        {editingActivity ? (
          <ActivityForm
            key={editingActivity.id}
            action={updateClubActivityAction}
            submitLabel={texts.settings.club.treasury.update_activity_cta}
            pendingLabel={texts.settings.club.treasury.update_activity_loading}
            defaultActivity={editingActivity}
            onSuccess={() => setEditingActivity(null)}
          />
        ) : null}
      </Modal>
    </>
  );
}
