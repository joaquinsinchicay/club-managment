"use client";

import { useState } from "react";

import { ModalFooter } from "@/components/ui/modal-footer";
import {
  FormField,
  FormFieldLabel,
  FormHelpText,
  FormInput,
  FormSelect,
} from "@/components/ui/modal-form";
import {
  formatLocalizedAmountInputOnBlur,
  formatLocalizedAmountInputOnFocus,
  sanitizeLocalizedAmountInput,
} from "@/lib/amounts";
import type { SalaryStructure } from "@/lib/domain/salary-structure";
import type { StaffMember } from "@/lib/domain/staff-member";
import { texts } from "@/lib/texts";

const scTexts = texts.rrhh.staff_contracts;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export type CreateContractFormProps = {
  members: StaffMember[];
  structures: SalaryStructure[];
  clubCurrencyCode: string;
  onCancel: () => void;
  onSubmit: (fd: FormData) => void;
};

export function CreateContractForm({
  members,
  structures,
  clubCurrencyCode,
  onCancel,
  onSubmit,
}: CreateContractFormProps) {
  const [initialAmount, setInitialAmount] = useState("");

  return (
    <form action={(fd) => onSubmit(fd)} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField>
          <FormFieldLabel required>{scTexts.form_member_label}</FormFieldLabel>
          <FormSelect name="staff_member_id" defaultValue="" required>
            <option value="" disabled>
              {scTexts.form_member_placeholder}
            </option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName} · {m.dni}
              </option>
            ))}
          </FormSelect>
        </FormField>
        <FormField>
          <FormFieldLabel required>{scTexts.form_structure_label}</FormFieldLabel>
          <FormSelect name="salary_structure_id" defaultValue="" required>
            <option value="" disabled>
              {scTexts.form_structure_placeholder}
            </option>
            {structures.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </FormSelect>
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField>
          <FormFieldLabel required>{scTexts.form_start_date_label}</FormFieldLabel>
          <FormInput type="date" name="start_date" defaultValue={todayIso()} required />
          <FormHelpText>{scTexts.form_start_date_helper}</FormHelpText>
        </FormField>
        <FormField>
          <FormFieldLabel>{scTexts.form_end_date_label}</FormFieldLabel>
          <FormInput type="date" name="end_date" />
          <FormHelpText>{scTexts.form_end_date_helper}</FormHelpText>
        </FormField>
      </div>

      <FormField>
        <FormFieldLabel required>{scTexts.form_initial_amount_label}</FormFieldLabel>
        <div className="flex gap-2">
          <span className="inline-flex h-11 shrink-0 items-center rounded-card border border-border bg-secondary-readonly px-4 text-sm font-semibold text-muted-foreground">
            {clubCurrencyCode}
          </span>
          <FormInput
            type="text"
            name="initial_amount"
            inputMode="decimal"
            required
            value={initialAmount}
            onChange={(e) => setInitialAmount(sanitizeLocalizedAmountInput(e.target.value))}
            onBlur={(e) => setInitialAmount(formatLocalizedAmountInputOnBlur(e.target.value))}
            onFocus={(e) => setInitialAmount(formatLocalizedAmountInputOnFocus(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "-") e.preventDefault();
            }}
            placeholder={scTexts.form_initial_amount_placeholder}
            className="tabular-nums"
          />
        </div>
        <FormHelpText>{scTexts.form_initial_amount_helper}</FormHelpText>
      </FormField>

      <FormField>
        <FormFieldLabel>{scTexts.form_initial_revision_reason_label}</FormFieldLabel>
        <FormInput
          type="text"
          name="initial_revision_reason"
          placeholder={scTexts.form_initial_revision_reason_placeholder}
          maxLength={500}
        />
        <FormHelpText>{scTexts.form_initial_revision_reason_helper}</FormHelpText>
      </FormField>

      <ModalFooter
        onCancel={onCancel}
        cancelLabel={scTexts.cancel_cta}
        submitLabel={scTexts.create_submit_cta}
        pendingLabel={scTexts.submit_pending}
        submitDisabled={initialAmount.trim().length === 0}
      />
    </form>
  );
}
