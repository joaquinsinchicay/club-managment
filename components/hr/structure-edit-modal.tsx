"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { RrhhActionResult } from "@/app/(dashboard)/settings/rrhh/actions";
import { Modal } from "@/components/ui/modal";
import { ModalFooter } from "@/components/ui/modal-footer";
import {
  FormField,
  FormFieldLabel,
  FormHelpText,
  FormInput,
  FormReadonly,
  FormSelect,
} from "@/components/ui/modal-form";
import { triggerClientFeedback } from "@/lib/client-feedback";
import {
  SALARY_REMUNERATION_TYPES,
  type SalaryStructure,
} from "@/lib/domain/salary-structure";
import { texts } from "@/lib/texts";

const ssTexts = texts.rrhh.salary_structures;

type StructureEditModalProps = {
  structure: SalaryStructure;
  open: boolean;
  onClose: () => void;
  updateAction: (formData: FormData) => Promise<RrhhActionResult>;
};

export function StructureEditModal({
  structure,
  open,
  onClose,
  updateAction,
}: StructureEditModalProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    try {
      const result = await updateAction(formData);
      triggerClientFeedback("settings", result.code);
      if (result.ok) {
        onClose();
        startTransition(() => router.refresh());
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !pending && onClose()}
      title={ssTexts.edit_modal_title}
      description={ssTexts.edit_modal_description}
      size="md"
      closeDisabled={pending}
    >
      <form action={handleSubmit} className="grid gap-4">
        <input type="hidden" name="salary_structure_id" value={structure.id} />

        <FormField>
          <FormFieldLabel required>{ssTexts.form_name_label}</FormFieldLabel>
          <FormInput
            type="text"
            name="name"
            defaultValue={structure.name}
            placeholder={ssTexts.form_name_placeholder}
            minLength={2}
            maxLength={120}
            required
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField>
            <FormFieldLabel>{ssTexts.form_role_label}</FormFieldLabel>
            <FormReadonly>{structure.functionalRole}</FormReadonly>
            <FormHelpText>{ssTexts.form_locked_field_hint}</FormHelpText>
          </FormField>

          <FormField>
            <FormFieldLabel>{ssTexts.form_activity_label}</FormFieldLabel>
            <FormReadonly>{structure.activityName ?? "—"}</FormReadonly>
            <FormHelpText>{ssTexts.form_locked_field_hint}</FormHelpText>
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField>
            <FormFieldLabel>{ssTexts.form_divisions_label}</FormFieldLabel>
            <FormReadonly>
              {structure.divisions.length === 0 ? "—" : structure.divisions.join(" / ")}
            </FormReadonly>
            <FormHelpText>{ssTexts.form_locked_field_hint}</FormHelpText>
          </FormField>

          <FormField>
            <FormFieldLabel>{ssTexts.form_payment_type_label}</FormFieldLabel>
            <FormReadonly>{ssTexts.payment_type_options[structure.paymentType]}</FormReadonly>
            <FormHelpText>{ssTexts.form_locked_field_hint}</FormHelpText>
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField>
            <FormFieldLabel required>{ssTexts.form_remuneration_type_label}</FormFieldLabel>
            <FormSelect
              name="remuneration_type"
              defaultValue={structure.remunerationType}
              required
            >
              <option value="" disabled>
                {ssTexts.form_remuneration_type_placeholder}
              </option>
              {SALARY_REMUNERATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ssTexts.remuneration_type_options[t]}
                </option>
              ))}
            </FormSelect>
          </FormField>

          <FormField>
            <FormFieldLabel>{ssTexts.form_workload_hours_label}</FormFieldLabel>
            <FormInput
              type="number"
              name="workload_hours"
              inputMode="decimal"
              min="0"
              step="0.5"
              defaultValue={structure.workloadHours ?? ""}
              placeholder={ssTexts.form_workload_hours_placeholder}
            />
            <FormHelpText>{ssTexts.form_workload_hours_helper}</FormHelpText>
          </FormField>
        </div>

        <FormField>
          <FormFieldLabel required>{ssTexts.form_status_label}</FormFieldLabel>
          <FormSelect name="status" defaultValue={structure.status} required>
            <option value="activa">{ssTexts.status_options.activa}</option>
            <option value="inactiva">{ssTexts.status_options.inactiva}</option>
          </FormSelect>
          <FormHelpText>{ssTexts.form_status_helper}</FormHelpText>
        </FormField>

        <ModalFooter
          onCancel={onClose}
          cancelLabel={ssTexts.cancel_cta}
          submitLabel={ssTexts.edit_submit_cta}
          pendingLabel={ssTexts.submit_pending}
        />
      </form>
    </Modal>
  );
}
