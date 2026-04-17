"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Modal } from "@/components/ui/modal";
import { PendingFieldset, PendingSubmitButton } from "@/components/ui/pending-form";
import type { ReceiptFormat } from "@/lib/domain/access";
import { texts } from "@/lib/texts";

const TREASURY_VISIBILITY_OPTIONS = ["secretaria", "tesoreria"] as const;
const RECEIPT_VALIDATION_TYPE_OPTIONS = ["numeric", "pattern"] as const;

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

function getValidationTypeLabel(validationType: ReceiptFormat["validationType"]) {
  return texts.settings.club.treasury.receipt_validation_type_options[validationType];
}

type ReceiptFormatFormProps = {
  action: (formData: FormData) => Promise<void>;
  defaultFormat: ReceiptFormat;
  onSuccess: () => void;
};

function ReceiptFormatForm({ action, defaultFormat, onSuccess }: ReceiptFormatFormProps) {
  const [selectedVisibility, setSelectedVisibility] = useState<string[]>(
    TREASURY_VISIBILITY_OPTIONS.filter((v) =>
      v === "secretaria" ? defaultFormat.visibleForSecretaria : defaultFormat.visibleForTesoreria
    )
  );
  const [visibilityTouched, setVisibilityTouched] = useState(false);
  const searchParams = useSearchParams();
  const feedbackCode = searchParams.get("feedback");

  useEffect(() => {
    if (feedbackCode === "receipt_format_updated") {
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
        <input type="hidden" name="receipt_format_id" value={defaultFormat.id} />

        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.settings.club.treasury.receipt_name_label}</span>
          <input
            type="text"
            name="name"
            defaultValue={defaultFormat.name}
            maxLength={50}
            className="min-h-11 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground"
          />
        </label>

        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.settings.club.treasury.receipt_validation_type_label}</span>
          <select
            name="validation_type"
            defaultValue={defaultFormat.validationType}
            className="min-h-11 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground"
          >
            {RECEIPT_VALIDATION_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {getValidationTypeLabel(type)}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="grid gap-3">
          <legend className="text-sm font-medium text-foreground">
            {texts.settings.club.treasury.account_visibility_label}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {TREASURY_VISIBILITY_OPTIONS.map((visibility) => (
              <label
                key={`receipt-visibility-${visibility}`}
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
          idleLabel={texts.settings.club.treasury.update_receipt_format_cta}
          pendingLabel={texts.settings.club.treasury.update_receipt_format_loading}
          disabled={selectedVisibility.length === 0}
          className="min-h-11 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95 sm:justify-self-end"
        />
      </PendingFieldset>
    </form>
  );
}

type MembershipSystemsTabProps = {
  receiptFormats: ReceiptFormat[];
  updateReceiptFormatAction: (formData: FormData) => Promise<void>;
};

export function MembershipSystemsTab({ receiptFormats, updateReceiptFormatAction }: MembershipSystemsTabProps) {
  const receiptFormat = receiptFormats[0];
  const [isEditing, setIsEditing] = useState(false);

  if (!receiptFormat) {
    return (
      <div className="rounded-[24px] border border-dashed border-border bg-secondary/30 p-5 text-sm text-muted-foreground">
        {texts.settings.club.treasury.empty_receipt_formats}
      </div>
    );
  }

  return (
    <>
      <article className="rounded-[26px] border border-border/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.92)_0%,rgba(255,255,255,0.98)_100%)] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <div>
                <p className="truncate text-base font-semibold text-foreground">{receiptFormat.name}</p>
                <p className="text-sm text-muted-foreground">
                  {getValidationTypeLabel(receiptFormat.validationType)}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-2 text-foreground">
                <span className="font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {texts.settings.club.treasury.account_visibility_label}
                </span>
                <span className="font-medium">
                  {getRoleVisibilityLabel(receiptFormat.visibleForSecretaria, receiptFormat.visibleForTesoreria)}
                </span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsEditing(true)}
            aria-label={texts.settings.club.treasury.edit_receipt_format_cta}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>

        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          {texts.settings.club.treasury.receipt_formats_read_only}
        </p>
      </article>

      <Modal
        open={isEditing}
        title={texts.settings.club.treasury.edit_receipt_format_cta}
        onClose={() => setIsEditing(false)}
      >
        <ReceiptFormatForm
          key={receiptFormat.id}
          action={updateReceiptFormatAction}
          defaultFormat={receiptFormat}
          onSuccess={() => setIsEditing(false)}
        />
      </Modal>
    </>
  );
}
