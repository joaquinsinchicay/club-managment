"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { RrhhActionResult } from "@/app/(dashboard)/settings/rrhh/actions";
import { Modal } from "@/components/ui/modal";
import { ModalFooter } from "@/components/ui/modal-footer";
import {
  FormBanner,
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
import { triggerClientFeedback } from "@/lib/client-feedback";
import type { SalaryStructure } from "@/lib/domain/salary-structure";
import type { StaffMember } from "@/lib/domain/staff-member";
import { texts } from "@/lib/texts";

const adTexts = texts.rrhh.activity_detail;
const ssTexts = texts.rrhh.salary_structures;
const mTexts = adTexts.assign_contract_modal;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

type AssignContractToActivityModalProps = {
  open: boolean;
  onClose: () => void;
  activityName: string;
  structures: SalaryStructure[];
  eligibleStaff: StaffMember[];
  clubCurrencyCode: string;
  createContractAction: (formData: FormData) => Promise<RrhhActionResult>;
};

export function AssignContractToActivityModal({
  open,
  onClose,
  activityName: _activityName,
  structures,
  eligibleStaff,
  clubCurrencyCode,
  createContractAction,
}: AssignContractToActivityModalProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);
  const [initialAmount, setInitialAmount] = useState("");

  const noEligibleStaff = eligibleStaff.length === 0;

  async function handleSubmit(formData: FormData) {
    setPending(true);
    try {
      const result = await createContractAction(formData);
      triggerClientFeedback("settings", result.code);
      if (result.ok) {
        setInitialAmount("");
        onClose();
        startTransition(() => router.refresh());
      }
    } finally {
      setPending(false);
    }
  }

  function structureLabel(s: SalaryStructure): string {
    const divisions =
      s.divisions.length === 0 ? mTexts.no_divisions_label : s.divisions.join(" / ");
    return mTexts.field_structure_option_template
      .replace("{role}", s.functionalRole)
      .replace("{divisions}", divisions)
      .replace("{remunerationType}", ssTexts.remuneration_type_options[s.remunerationType]);
  }

  return (
    <Modal
      open={open}
      onClose={() => !pending && onClose()}
      title={mTexts.title}
      description={mTexts.description}
      size="md"
      closeDisabled={pending}
    >
      <form action={handleSubmit} className="grid gap-4">
        {noEligibleStaff ? (
          <FormBanner variant="warning">{mTexts.no_eligible_staff}</FormBanner>
        ) : null}

        <FormField>
          <FormFieldLabel required>{mTexts.field_structure_label}</FormFieldLabel>
          <FormSelect name="salary_structure_id" defaultValue="" required>
            <option value="" disabled>
              {mTexts.field_structure_placeholder}
            </option>
            {structures.map((s) => (
              <option key={s.id} value={s.id}>
                {structureLabel(s)}
              </option>
            ))}
          </FormSelect>
        </FormField>

        <FormField>
          <FormFieldLabel required>{mTexts.field_staff_label}</FormFieldLabel>
          <FormSelect
            name="staff_member_id"
            defaultValue=""
            required
            disabled={noEligibleStaff}
          >
            <option value="" disabled>
              {mTexts.field_staff_placeholder}
            </option>
            {eligibleStaff.map((m) => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName} · {m.dni}
              </option>
            ))}
          </FormSelect>
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField>
            <FormFieldLabel required>{mTexts.field_start_date_label}</FormFieldLabel>
            <FormInput
              type="date"
              name="start_date"
              defaultValue={todayIso()}
              required
            />
          </FormField>
          <FormField>
            <FormFieldLabel required>{mTexts.field_amount_label}</FormFieldLabel>
            <div className="flex gap-2">
              <span className="inline-flex h-11 shrink-0 items-center rounded-card border border-border bg-secondary/40 px-4 text-sm font-semibold text-muted-foreground">
                {clubCurrencyCode}
              </span>
              <FormInput
                type="text"
                name="initial_amount"
                inputMode="decimal"
                required
                value={initialAmount}
                onChange={(e) =>
                  setInitialAmount(sanitizeLocalizedAmountInput(e.target.value))
                }
                onBlur={(e) =>
                  setInitialAmount(formatLocalizedAmountInputOnBlur(e.target.value))
                }
                onFocus={(e) =>
                  setInitialAmount(formatLocalizedAmountInputOnFocus(e.target.value))
                }
                onKeyDown={(e) => {
                  if (e.key === "-") e.preventDefault();
                }}
                className="tabular-nums"
              />
            </div>
            <FormHelpText>{texts.rrhh.staff_contracts.form_initial_amount_helper}</FormHelpText>
          </FormField>
        </div>

        <ModalFooter
          onCancel={onClose}
          cancelLabel={ssTexts.cancel_cta}
          submitLabel={mTexts.submit}
          pendingLabel={mTexts.pending}
          submitDisabled={noEligibleStaff || initialAmount.trim().length === 0}
        />
      </form>
    </Modal>
  );
}
