"use client";

import { FormError, FormInput } from "@/components/ui/modal-form";
import {
  formatLocalizedAmountInputOnBlur,
  formatLocalizedAmountInputOnFocus,
  sanitizeLocalizedAmountInput,
} from "@/lib/amounts";
import { cn } from "@/lib/utils";

type SessionBalanceInputProps = {
  value: string;
  onChange: (next: string) => void;
  errorText?: string;
};

export function SessionBalanceInput({ value, onChange, errorText }: SessionBalanceInputProps) {
  const isInvalid = Boolean(errorText);

  return (
    <div className="flex flex-col gap-1">
      <FormInput
        type="text"
        name="declared_balance"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(sanitizeLocalizedAmountInput(e.target.value))}
        onBlur={(e) => onChange(formatLocalizedAmountInputOnBlur(e.target.value))}
        onFocus={(e) => onChange(formatLocalizedAmountInputOnFocus(e.target.value))}
        className={cn(
          "text-right tabular-nums",
          isInvalid && "border-destructive focus:ring-destructive/20",
        )}
      />
      {errorText ? (
        <FormError className="text-right">{errorText}</FormError>
      ) : null}
    </div>
  );
}
