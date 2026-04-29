"use client";

import {
  FIELD_LABEL_CLASSNAME,
  FormSelect,
} from "@/components/ui/modal-form";

/* ──────────────────────────────────────────────────────────────────────────
 * StaffContractSelect — select simple para vincular un movimiento a un
 * contrato RRHH (carga historica + futuro flow de pagos manuales).
 *
 * Renderiza un <select> nativo con la lista de contratos del club + opcion
 * "Sin asignar". Hidden flag `staff_contract_present` indica que el form
 * incluye el campo (asi la action server-side hace el sync).
 * ────────────────────────────────────────────────────────────────────────── */

export type StaffContractOption = {
  contractId: string;
  staffMemberId: string;
  label: string;
};

export function StaffContractField({
  options,
  value,
  onChange,
  label,
  placeholder,
  emptyOptionsLabel
}: {
  options: StaffContractOption[];
  value: string;
  onChange: (next: string) => void;
  label: string;
  placeholder: string;
  emptyOptionsLabel: string;
}) {
  const isEmpty = options.length === 0;
  // Si la opcion seleccionada no esta en la lista (ej. contrato historico
  // finalizado que no se devolvio por filtro), preservala via hidden input
  // para no perder el dato al guardar.
  const valueInOptions = options.some((o) => o.contractId === value);
  return (
    <div className="grid gap-2">
      <p className={FIELD_LABEL_CLASSNAME}>{label}</p>
      <input type="hidden" name="staff_contract_present" value="1" />
      {!valueInOptions && value ? (
        <input type="hidden" name="staff_contract_id" value={value} />
      ) : null}
      <FormSelect
        name={valueInOptions || !value ? "staff_contract_id" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={isEmpty}
      >
        <option value="">{isEmpty ? emptyOptionsLabel : placeholder}</option>
        {options.map((option) => (
          <option key={option.contractId} value={option.contractId}>
            {option.label}
          </option>
        ))}
        {!valueInOptions && value ? (
          <option value={value} disabled>
            {value}
          </option>
        ) : null}
      </FormSelect>
    </div>
  );
}
