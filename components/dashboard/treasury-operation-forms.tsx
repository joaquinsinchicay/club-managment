// Barrel file: re-exports the 7 forms previously co-located here. The
// implementation now lives one level deeper in `./treasury-forms/` (one file
// per form + `_shared.tsx` for the cross-form helpers + dedicated files for
// the `MovementFormFields`, `StaffContractField` and `CostCenterMultiSelect`
// internal components).
//
// Consumers (treasury-card, treasury-role-card, treasury-conciliacion-tab)
// keep importing from `@/components/dashboard/treasury-operation-forms` —
// this barrel keeps that public surface stable.

export { SecretariaMovementForm } from "./treasury-forms/secretaria-movement-form";
export { SecretariaMovementEditForm } from "./treasury-forms/secretaria-movement-edit-form";
export { AccountTransferForm } from "./treasury-forms/account-transfer-form";
export { AccountTransferEditForm } from "./treasury-forms/account-transfer-edit-form";
export { ConsolidationTransferEditForm } from "./treasury-forms/consolidation-transfer-edit-form";
export { TreasuryRoleMovementForm } from "./treasury-forms/treasury-role-movement-form";
export { TreasuryRoleFxForm } from "./treasury-forms/treasury-role-fx-form";
