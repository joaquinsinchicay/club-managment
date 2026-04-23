"use client";

import { useState } from "react";

import { Card } from "@/components/ui/card";
import { EditIconButton } from "@/components/ui/edit-icon-button";
import { MetaPill } from "@/components/ui/meta-pill";
import { Modal } from "@/components/ui/modal";
import { ModalFooter } from "@/components/ui/modal-footer";
import {
  FormCheckboxCard,
  FormField,
  FormFieldLabel,
  FormInput,
  FormSection,
  FormSelect,
} from "@/components/ui/modal-form";
import { PendingFieldset } from "@/components/ui/pending-form";
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
  onCancel: () => void;
  onSuccess: () => void;
};

function ReceiptFormatForm({ action, defaultFormat, onCancel, onSuccess }: ReceiptFormatFormProps) {
  const [selectedVisibility, setSelectedVisibility] = useState<string[]>(
    TREASURY_VISIBILITY_OPTIONS.filter((v) =>
      v === "secretaria" ? defaultFormat.visibleForSecretaria : defaultFormat.visibleForTesoreria
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
    <form action={handleSubmit} className="grid gap-4">
      <PendingFieldset className="grid gap-4">
        <input type="hidden" name="receipt_format_id" value={defaultFormat.id} />

        <FormField>
          <FormFieldLabel>{texts.settings.club.treasury.receipt_name_label}</FormFieldLabel>
          <FormInput
            type="text"
            name="name"
            defaultValue={defaultFormat.name}
            maxLength={50}
          />
        </FormField>

        <FormField>
          <FormFieldLabel>{texts.settings.club.treasury.receipt_validation_type_label}</FormFieldLabel>
          <FormSelect name="validation_type" defaultValue={defaultFormat.validationType}>
            {RECEIPT_VALIDATION_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {getValidationTypeLabel(type)}
              </option>
            ))}
          </FormSelect>
        </FormField>

        <div className="grid gap-3">
          <FormSection>{texts.settings.club.treasury.account_visibility_label}</FormSection>
          <div className="grid gap-3 sm:grid-cols-2">
            {TREASURY_VISIBILITY_OPTIONS.map((visibility) => (
              <FormCheckboxCard
                key={`receipt-visibility-${visibility}`}
                name="visibility"
                value={visibility}
                label={texts.settings.club.treasury.account_visibility_options[visibility]}
                checked={selectedVisibility.includes(visibility)}
                onChange={(checked) => handleVisibilityToggle(visibility, checked)}
              />
            ))}
          </div>
        </div>

        <ModalFooter
          onCancel={onCancel}
          cancelLabel={texts.settings.club.treasury.cancel_cta}
          submitLabel={texts.settings.club.treasury.update_receipt_format_cta}
          pendingLabel={texts.settings.club.treasury.update_receipt_format_loading}
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
    return null;
  }

  return (
    <>
      <Card as="article" padding="compact">
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
            <div className="mt-4 flex flex-wrap gap-2">
              <MetaPill
                label={texts.settings.club.treasury.account_visibility_label}
                value={getRoleVisibilityLabel(receiptFormat.visibleForSecretaria, receiptFormat.visibleForTesoreria)}
              />
            </div>
          </div>

          <EditIconButton
            onClick={() => setIsEditing(true)}
            label={texts.settings.club.treasury.edit_receipt_format_cta}
            className="size-10 shrink-0"
          />
        </div>

        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          {texts.settings.club.treasury.receipt_formats_read_only}
        </p>
      </Card>

      <Modal
        open={isEditing}
        title={texts.settings.club.treasury.edit_receipt_format_cta}
        onClose={() => setIsEditing(false)}
        size="md"
      >
        <ReceiptFormatForm
          key={receiptFormat.id}
          action={updateReceiptFormatAction}
          defaultFormat={receiptFormat}
          onCancel={() => setIsEditing(false)}
          onSuccess={() => setIsEditing(false)}
        />
      </Modal>
    </>
  );
}
