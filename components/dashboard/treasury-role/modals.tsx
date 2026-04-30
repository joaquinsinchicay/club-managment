import {
  AccountTransferForm,
  SecretariaMovementEditForm,
  TreasuryRoleFxForm,
  TreasuryRoleMovementForm,
} from "@/components/dashboard/treasury-operation-forms";
import { TreasuryAccountForm } from "@/components/treasury/account-form";
import { Modal } from "@/components/ui/modal";
import { texts } from "@/lib/texts";
import type { ActiveCostCenterOption } from "@/lib/contexts/treasury-data-context";
import type { ActiveModal } from "@/lib/hooks/use-treasury-role-card";
import type {
  TreasuryAccount,
  TreasuryDashboardMovement,
  TreasuryRoleDashboard,
} from "@/lib/domain/access";

type TreasuryRoleModalsProps = {
  activeModal: ActiveModal;
  selectedMovement: TreasuryDashboardMovement | null;
  editingAccount: TreasuryAccount | null;
  dashboard: TreasuryRoleDashboard;
  accounts: TreasuryAccount[];
  allAccounts: TreasuryAccount[];
  activeCostCenters: ActiveCostCenterOption[] | undefined;
  isMovementSubmissionPending: boolean;
  isMovementUpdatePending: boolean;
  isFxSubmissionPending: boolean;
  isTransferSubmissionPending: boolean;
  isAccountSubmissionPending: boolean;
  onClose: () => void;
  onCreateMovement: (formData: FormData) => Promise<void>;
  onUpdateMovement: (formData: FormData) => Promise<void>;
  onCreateFx: (formData: FormData) => Promise<void>;
  onCreateTransfer: (formData: FormData) => Promise<void>;
  onCreateAccount: (formData: FormData) => Promise<void>;
  onUpdateAccount: (formData: FormData) => Promise<void>;
};

export function TreasuryRoleModals({
  activeModal,
  selectedMovement,
  editingAccount,
  dashboard,
  accounts,
  allAccounts,
  activeCostCenters,
  isMovementSubmissionPending,
  isMovementUpdatePending,
  isFxSubmissionPending,
  isTransferSubmissionPending,
  isAccountSubmissionPending,
  onClose,
  onCreateMovement,
  onUpdateMovement,
  onCreateFx,
  onCreateTransfer,
  onCreateAccount,
  onUpdateAccount,
}: TreasuryRoleModalsProps) {
  const movementCloseDisabled =
    isMovementSubmissionPending || isMovementUpdatePending || isFxSubmissionPending;
  const transferCloseDisabled = movementCloseDisabled || isTransferSubmissionPending;

  return (
    <>
      <Modal
        open={activeModal === "movement"}
        onClose={onClose}
        title={texts.dashboard.treasury_role.movement_form_title}
        description={texts.dashboard.treasury_role.movement_form_description}
        closeDisabled={movementCloseDisabled}
        size="md"
      >
        <TreasuryRoleMovementForm
          submitAction={onCreateMovement}
          submitLabel={texts.dashboard.treasury_role.create_cta}
          pendingLabel={texts.dashboard.treasury_role.create_loading}
          sessionDate={dashboard.sessionDate}
          onCancel={onClose}
          costCenters={activeCostCenters}
        />
      </Modal>

      <Modal
        open={
          activeModal === "edit_movement" &&
          selectedMovement !== null &&
          selectedMovement.canEdit
        }
        onClose={onClose}
        title={texts.dashboard.treasury_role.edit_form_title}
        description={texts.dashboard.treasury_role.edit_form_description}
        closeDisabled={movementCloseDisabled}
        size="md"
      >
        {selectedMovement?.canEdit ? (
          <SecretariaMovementEditForm
            submitAction={onUpdateMovement}
            submitLabel={texts.dashboard.treasury_role.update_cta}
            pendingLabel={texts.dashboard.treasury_role.update_loading}
            movement={selectedMovement}
            copy={texts.dashboard.treasury_role}
            costCenters={activeCostCenters}
            initialCostCenterIds={selectedMovement.costCenterIds ?? []}
            onCancel={onClose}
          />
        ) : null}
      </Modal>

      <Modal
        open={activeModal === "fx"}
        onClose={onClose}
        title={texts.dashboard.treasury_role.fx_form_title}
        description={texts.dashboard.treasury_role.fx_form_description}
        closeDisabled={movementCloseDisabled}
        size="md"
      >
        <TreasuryRoleFxForm
          submitAction={onCreateFx}
          sessionDate={dashboard.sessionDate}
          onCancel={onClose}
        />
      </Modal>

      <Modal
        open={activeModal === "transfer"}
        onClose={onClose}
        title={texts.dashboard.treasury_role.transfer_form_title}
        description={texts.dashboard.treasury_role.transfer_form_description}
        closeDisabled={transferCloseDisabled}
        size="md"
      >
        <AccountTransferForm
          sourceAccounts={accounts}
          targetAccounts={allAccounts}
          submitAction={onCreateTransfer}
          sessionDate={dashboard.sessionDate}
          onCancel={onClose}
        />
      </Modal>

      <Modal
        open={activeModal === "create_account"}
        onClose={onClose}
        title={texts.dashboard.treasury_role.accounts_tab_create_title}
        description={texts.settings.club.treasury.create_account_description}
        closeDisabled={isAccountSubmissionPending}
        size="md"
      >
        <TreasuryAccountForm
          action={onCreateAccount}
          submitLabel={texts.settings.club.treasury.save_account_cta}
          pendingLabel={texts.settings.club.treasury.save_account_loading}
          cancelLabel={texts.settings.club.treasury.cancel_cta}
          onCancel={onClose}
        />
      </Modal>

      <Modal
        open={activeModal === "edit_account" && editingAccount !== null}
        onClose={onClose}
        title={texts.dashboard.treasury_role.accounts_tab_edit_title}
        description={texts.settings.club.treasury.edit_account_description}
        closeDisabled={isAccountSubmissionPending}
        size="md"
      >
        {editingAccount ? (
          <TreasuryAccountForm
            key={editingAccount.id}
            action={onUpdateAccount}
            submitLabel={texts.settings.club.treasury.update_account_cta}
            pendingLabel={texts.settings.club.treasury.update_account_loading}
            cancelLabel={texts.settings.club.treasury.cancel_cta}
            onCancel={onClose}
            defaultAccount={editingAccount}
          />
        ) : null}
      </Modal>
    </>
  );
}
