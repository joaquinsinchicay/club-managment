"use client";

import { FormFieldLabel, FormTextarea } from "@/components/ui/modal-form";

type ConfirmDifferencesSectionProps = {
  visible: boolean;
  id: string;
  label: string;
  placeholder: string;
};

export function ConfirmDifferencesSection({
  visible,
  id,
  label,
  placeholder,
}: ConfirmDifferencesSectionProps) {
  if (!visible) return null;

  return (
    <div className="flex flex-col gap-2">
      <FormFieldLabel required>{label}</FormFieldLabel>
      <FormTextarea
        id={id}
        name="diff_notes"
        placeholder={placeholder}
        rows={3}
        required
      />
    </div>
  );
}
