"use client";

import { FormCheckboxCard, FormError } from "@/components/ui/modal-form";
import { texts } from "@/lib/texts";
import {
  TREASURY_ACCOUNT_VISIBILITY_OPTIONS,
  type TreasuryAccountVisibility,
} from "@/lib/treasury-system-options";

const VISIBILITY_LABELS: Record<TreasuryAccountVisibility, string> = {
  secretaria: texts.settings.club.treasury.visibility_secretaria_checkbox,
  tesoreria: texts.settings.club.treasury.visibility_tesoreria_checkbox,
};

type TreasuryVisibilityCheckboxGroupProps = {
  selected: string[];
  onChange: (visibility: string, checked: boolean) => void;
  errorText?: string;
};

export function TreasuryVisibilityCheckboxGroup({
  selected,
  onChange,
  errorText,
}: TreasuryVisibilityCheckboxGroupProps) {
  return (
    <div className="grid gap-3 sm:col-span-2">
      {TREASURY_ACCOUNT_VISIBILITY_OPTIONS.map((visibility) => (
        <FormCheckboxCard
          key={`treasury-visibility-${visibility}`}
          name="visibility"
          value={visibility}
          label={VISIBILITY_LABELS[visibility]}
          checked={selected.includes(visibility)}
          onChange={(checked) => onChange(visibility, checked)}
        />
      ))}
      {errorText ? <FormError>{errorText}</FormError> : null}
    </div>
  );
}
