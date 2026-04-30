"use client";

import { useState } from "react";

import { buttonClass } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import {
  FormField,
  FormFieldLabel,
  FormInput,
  FormSelect,
} from "@/components/ui/modal-form";
import {
  PAYROLL_ADJUSTMENT_TYPES,
  type PayrollAdjustmentType,
} from "@/lib/domain/payroll-settlement";
import { texts } from "@/lib/texts";

const sTexts = texts.rrhh.settlements;

export function AddAdjustmentForm({
  settlementId,
  onSubmit,
}: {
  settlementId: string;
  onSubmit: (fd: FormData) => void;
}) {
  const [type, setType] = useState<PayrollAdjustmentType>("adicional");

  return (
    <Card padding="compact">
      <CardBody>
        <form
          action={(fd) => onSubmit(fd)}
          className="grid gap-3 sm:grid-cols-[110px_minmax(0,1fr)_130px_auto] sm:items-end"
        >
          <input type="hidden" name="settlement_id" value={settlementId} />
          <FormField>
            <FormFieldLabel required>{sTexts.adjustments_col_type}</FormFieldLabel>
            <FormSelect
              name="type"
              value={type}
              onChange={(e) => setType(e.target.value as PayrollAdjustmentType)}
              required
            >
              {PAYROLL_ADJUSTMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {sTexts.adjustment_type_options[t]}
                </option>
              ))}
            </FormSelect>
          </FormField>
          <FormField>
            <FormFieldLabel required>{sTexts.adjustments_col_concept}</FormFieldLabel>
            <FormInput type="text" name="concept" maxLength={200} required />
          </FormField>
          <FormField>
            <FormFieldLabel required>{sTexts.adjustments_col_amount}</FormFieldLabel>
            <FormInput
              type="number"
              name="amount"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              required
            />
          </FormField>
          <button type="submit" className={buttonClass({ variant: "primary" })}>
            {sTexts.adjustment_add_cta}
          </button>
        </form>
      </CardBody>
    </Card>
  );
}
