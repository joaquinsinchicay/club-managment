"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useState, useTransition } from "react";

import type { TreasuryActionResponse } from "@/app/(dashboard)/dashboard/treasury-actions";
import { triggerClientFeedback } from "@/lib/client-feedback";
import { texts } from "@/lib/texts";
import type { SubTab } from "@/lib/treasury-role-helpers";
import type {
  TreasuryAccount,
  TreasuryDashboardMovement,
  TreasuryRoleDashboard,
} from "@/lib/domain/access";

export type TreasuryRoleCardActions = {
  createTreasuryRoleMovementAction: (formData: FormData) => Promise<TreasuryActionResponse>;
  updateTreasuryRoleMovementAction: (formData: FormData) => Promise<TreasuryActionResponse>;
  createFxOperationAction: (formData: FormData) => Promise<TreasuryActionResponse>;
  createAccountTransferAction: (formData: FormData) => Promise<TreasuryActionResponse>;
  createTreasuryAccountAction: (formData: FormData) => Promise<TreasuryActionResponse>;
  updateTreasuryAccountAction: (formData: FormData) => Promise<TreasuryActionResponse>;
};

export type ActiveModal =
  | "movement"
  | "edit_movement"
  | "fx"
  | "transfer"
  | "create_account"
  | "edit_account"
  | null;

export function useTreasuryRoleCard({
  dashboard,
  showPayrollTab,
  actions,
}: {
  dashboard: TreasuryRoleDashboard;
  showPayrollTab: boolean;
  actions: TreasuryRoleCardActions;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab = ((): SubTab => {
    const raw = searchParams.get("tab");
    if (
      raw === "cuentas" ||
      raw === "movimientos" ||
      raw === "conciliacion" ||
      raw === "cost_centers"
    ) {
      return raw;
    }
    if (raw === "payroll" && showPayrollTab) return "payroll";
    return "resumen";
  })();

  const [activeTab, setActiveTab] = useState<SubTab>(initialTab);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [selectedMovement, setSelectedMovement] = useState<TreasuryDashboardMovement | null>(null);
  const [editingAccount, setEditingAccount] = useState<TreasuryAccount | null>(null);
  const [selectedMovementAccountId, setSelectedMovementAccountId] = useState<string | null>(null);
  const [isMovementSubmissionPending, setIsMovementSubmissionPending] = useState(false);
  const [isMovementUpdatePending, setIsMovementUpdatePending] = useState(false);
  const [isFxSubmissionPending, setIsFxSubmissionPending] = useState(false);
  const [isTransferSubmissionPending, setIsTransferSubmissionPending] = useState(false);
  const [isAccountSubmissionPending, setIsAccountSubmissionPending] = useState(false);
  const [isMovementsRangePending, startMovementsRangeTransition] = useTransition();

  useEffect(() => {
    setSelectedMovementAccountId((currentAccountId) => {
      if (currentAccountId && dashboard.accounts.some((a) => a.accountId === currentAccountId)) {
        return currentAccountId;
      }
      return null;
    });
  }, [dashboard.accounts]);

  const pendingOverlayLabel = isMovementSubmissionPending
    ? texts.dashboard.treasury_role.create_loading
    : isMovementUpdatePending
      ? texts.dashboard.treasury_role.update_loading
      : isFxSubmissionPending
        ? texts.dashboard.treasury_role.fx_create_loading
        : isTransferSubmissionPending
          ? texts.dashboard.treasury_role.transfer_create_loading
          : isAccountSubmissionPending
            ? texts.settings.club.treasury.save_account_loading
            : null;

  async function handleCreateTreasuryRoleMovement(formData: FormData) {
    setIsMovementSubmissionPending(true);
    setActiveModal(null);

    try {
      const result = await actions.createTreasuryRoleMovementAction(formData);
      triggerClientFeedback("dashboard", result.code, { movementId: result.movementDisplayId });

      if (result.ok) {
        startTransition(() => {
          router.refresh();
        });
      }
    } finally {
      setIsMovementSubmissionPending(false);
    }
  }

  async function handleUpdateTreasuryRoleMovement(formData: FormData) {
    setIsMovementUpdatePending(true);
    setActiveModal(null);
    setSelectedMovement(null);

    try {
      const result = await actions.updateTreasuryRoleMovementAction(formData);
      triggerClientFeedback("dashboard", result.code, { movementId: result.movementDisplayId });

      if (result.ok) {
        startTransition(() => {
          router.refresh();
        });
      }
    } finally {
      setIsMovementUpdatePending(false);
    }
  }

  async function handleCreateAccountTransfer(formData: FormData) {
    setIsTransferSubmissionPending(true);
    setActiveModal(null);

    formData.set("origin_role", "tesoreria");

    try {
      const result = await actions.createAccountTransferAction(formData);
      triggerClientFeedback("dashboard", result.code, { movementId: result.movementDisplayId });

      if (result.ok) {
        startTransition(() => {
          router.refresh();
        });
      }
    } finally {
      setIsTransferSubmissionPending(false);
    }
  }

  async function handleCreateFxOperation(formData: FormData) {
    setIsFxSubmissionPending(true);
    setActiveModal(null);

    try {
      const result = await actions.createFxOperationAction(formData);
      triggerClientFeedback("dashboard", result.code);

      if (result.ok) {
        startTransition(() => {
          router.refresh();
        });
      }
    } finally {
      setIsFxSubmissionPending(false);
    }
  }

  async function handleCreateAccount(formData: FormData) {
    setIsAccountSubmissionPending(true);
    setActiveModal(null);

    try {
      const result = await actions.createTreasuryAccountAction(formData);
      triggerClientFeedback("dashboard", result.code);

      if (result.ok) {
        startTransition(() => {
          router.refresh();
        });
      }
    } finally {
      setIsAccountSubmissionPending(false);
    }
  }

  async function handleUpdateAccount(formData: FormData) {
    setIsAccountSubmissionPending(true);
    setActiveModal(null);
    setEditingAccount(null);

    try {
      const result = await actions.updateTreasuryAccountAction(formData);
      triggerClientFeedback("dashboard", result.code);

      if (result.ok) {
        startTransition(() => {
          router.refresh();
        });
      }
    } finally {
      setIsAccountSubmissionPending(false);
    }
  }

  function handleEditMovement(movement: TreasuryDashboardMovement) {
    if (!movement.canEdit) return;
    setSelectedMovement(movement);
    setActiveModal("edit_movement");
  }

  function handleConciliacion() {
    setActiveTab("conciliacion");
  }

  function handleEditAccount(account: TreasuryAccount) {
    setEditingAccount(account);
    setActiveModal("edit_account");
  }

  function handleUpdateMovementsDateRange({
    fromDate,
    toDate,
  }: {
    fromDate: string | null;
    toDate: string | null;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "movimientos");
    if (fromDate) params.set("movements_from", fromDate);
    else params.delete("movements_from");
    if (toDate) params.set("movements_to", toDate);
    else params.delete("movements_to");
    startMovementsRangeTransition(() => {
      router.push(`?${params.toString()}`, { scroll: false });
    });
  }

  function closeAllModals() {
    setActiveModal(null);
    setSelectedMovement(null);
    setEditingAccount(null);
  }

  return {
    // tab state
    activeTab,
    setActiveTab,
    handleConciliacion,

    // modal state
    activeModal,
    setActiveModal,
    selectedMovement,
    editingAccount,
    closeAllModals,
    handleEditMovement,
    handleEditAccount,

    // movements filter
    selectedMovementAccountId,
    setSelectedMovementAccountId,
    handleUpdateMovementsDateRange,
    isMovementsRangePending,

    // pending flags
    isMovementSubmissionPending,
    isMovementUpdatePending,
    isFxSubmissionPending,
    isTransferSubmissionPending,
    isAccountSubmissionPending,
    pendingOverlayLabel,

    // submit handlers
    handleCreateTreasuryRoleMovement,
    handleUpdateTreasuryRoleMovement,
    handleCreateAccountTransfer,
    handleCreateFxOperation,
    handleCreateAccount,
    handleUpdateAccount,
  };
}
