/**
 * Domain entity y helpers para Revisiones Salariales (US-34 / US-35).
 *
 * Cada contrato rentado tiene 1..N revisiones. El monto vigente del contrato
 * es la revisión cuya `endDate` es null. Cuando se crea una revisión nueva,
 * la anterior se cierra con `endDate = effective_date - 1 dia`. Al finalizar
 * el contrato, la revisión vigente se cierra con `endDate = contract.endDate`.
 *
 * La RPC `hr_create_contract_with_initial_revision` inserta contrato +
 * primera revisión en una sola transacción. La RPC `hr_create_salary_revision`
 * cierra la vigente y abre una nueva. La RPC
 * `hr_create_salary_revisions_bulk` aplica un ajuste (percent | fixed | set)
 * sobre N contratos en una transacción única (rollback si alguno falla).
 */

export type StaffContractRevision = {
  id: string;
  clubId: string;
  contractId: string;
  amount: number;
  effectiveDate: string;
  endDate: string | null;
  reason: string | null;
  createdAt: string;
  createdByUserId: string | null;
};

export const SALARY_REVISION_ADJUSTMENT_TYPES = [
  "percent",
  "fixed",
  "set",
] as const;
export type SalaryRevisionAdjustmentType =
  (typeof SALARY_REVISION_ADJUSTMENT_TYPES)[number];

export function isSalaryRevisionAdjustmentType(
  value: unknown,
): value is SalaryRevisionAdjustmentType {
  return (
    typeof value === "string" &&
    (SALARY_REVISION_ADJUSTMENT_TYPES as readonly string[]).includes(value)
  );
}
