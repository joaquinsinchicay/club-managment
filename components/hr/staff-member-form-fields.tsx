"use client";

import {
  FormField,
  FormFieldLabel,
  FormHelpText,
  FormInput,
  FormSelect,
} from "@/components/ui/modal-form";
import {
  STAFF_VINCULO_TYPES,
  type StaffMember,
} from "@/lib/domain/staff-member";
import { rrhh as txtRrhh } from "@/lib/texts";

const smTexts = txtRrhh.staff_members;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

type StaffMemberFormFieldsProps = { member?: StaffMember };

export function StaffMemberFormFields({ member }: StaffMemberFormFieldsProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField>
          <FormFieldLabel required>{smTexts.form_first_name_label}</FormFieldLabel>
          <FormInput
            type="text"
            name="first_name"
            defaultValue={member?.firstName ?? ""}
            minLength={1}
            maxLength={80}
            required
          />
        </FormField>
        <FormField>
          <FormFieldLabel required>{smTexts.form_last_name_label}</FormFieldLabel>
          <FormInput
            type="text"
            name="last_name"
            defaultValue={member?.lastName ?? ""}
            minLength={1}
            maxLength={80}
            required
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField>
          <FormFieldLabel required>{smTexts.form_dni_label}</FormFieldLabel>
          <FormInput
            type="text"
            name="dni"
            inputMode="numeric"
            pattern="\d{7,8}"
            minLength={7}
            maxLength={8}
            defaultValue={member?.dni ?? ""}
            required
          />
          <FormHelpText>{smTexts.form_dni_helper}</FormHelpText>
        </FormField>
        <FormField>
          <FormFieldLabel>{smTexts.form_cuit_label}</FormFieldLabel>
          <FormInput
            type="text"
            name="cuit_cuil"
            inputMode="numeric"
            defaultValue={member?.cuitCuil ?? ""}
            placeholder={smTexts.form_cuit_placeholder}
          />
          <FormHelpText>{smTexts.form_cuit_helper}</FormHelpText>
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField>
          <FormFieldLabel>{smTexts.form_email_label}</FormFieldLabel>
          <FormInput
            type="email"
            name="email"
            autoComplete="email"
            defaultValue={member?.email ?? ""}
            placeholder={smTexts.form_email_placeholder}
          />
        </FormField>
        <FormField>
          <FormFieldLabel>{smTexts.form_phone_label}</FormFieldLabel>
          <FormInput
            type="tel"
            name="phone"
            inputMode="tel"
            defaultValue={member?.phone ?? ""}
            placeholder={smTexts.form_phone_placeholder}
          />
        </FormField>
      </div>

      <FormField>
        <FormFieldLabel required>{smTexts.form_vinculo_label}</FormFieldLabel>
        <FormSelect
          name="vinculo_type"
          defaultValue={member?.vinculoType ?? ""}
          required
        >
          <option value="" disabled>
            {smTexts.form_vinculo_placeholder}
          </option>
          {STAFF_VINCULO_TYPES.map((v) => (
            <option key={v} value={v}>
              {smTexts.vinculo_options[v]}
            </option>
          ))}
        </FormSelect>
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField>
          <FormFieldLabel>{smTexts.form_cbu_label}</FormFieldLabel>
          <FormInput
            type="text"
            name="cbu_alias"
            defaultValue={member?.cbuAlias ?? ""}
            placeholder={smTexts.form_cbu_placeholder}
            maxLength={50}
          />
        </FormField>
        <FormField>
          <FormFieldLabel required>{smTexts.form_hire_date_label}</FormFieldLabel>
          <FormInput
            type="date"
            name="hire_date"
            defaultValue={member?.hireDate ?? todayIso()}
            required
          />
        </FormField>
      </div>
    </>
  );
}
