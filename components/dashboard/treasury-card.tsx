"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { startTransition, type ReactNode, useEffect, useMemo, useState } from "react";

import { triggerClientFeedback } from "@/lib/client-feedback";
import { useTreasuryData } from "@/lib/contexts/treasury-data-context";

// Modales lazy: <Modal> hace `if (!open) return null` → mientras estén
// cerrados, los chunks no se descargan ni evalúan. ssr:false porque son
// flujos puramente interactivos (sin render en server).
const CloseSessionModalForm = dynamic(
  () => import("@/components/dashboard/close-session-modal-form").then((m) => m.CloseSessionModalForm),
  { ssr: false },
);
const OpenSessionModalForm = dynamic(
  () => import("@/components/dashboard/open-session-modal-form").then((m) => m.OpenSessionModalForm),
  { ssr: false },
);
const SecretariaMovementForm = dynamic(
  () => import("@/components/dashboard/treasury-operation-forms").then((m) => m.SecretariaMovementForm),
  { ssr: false },
);
const SecretariaMovementEditForm = dynamic(
  () => import("@/components/dashboard/treasury-operation-forms").then((m) => m.SecretariaMovementEditForm),
  { ssr: false },
);
const AccountTransferForm = dynamic(
  () => import("@/components/dashboard/treasury-operation-forms").then((m) => m.AccountTransferForm),
  { ssr: false },
);
const AccountTransferEditForm = dynamic(
  () => import("@/components/dashboard/treasury-operation-forms").then((m) => m.AccountTransferEditForm),
  { ssr: false },
);

import { SecretariaMovementList } from "@/components/dashboard/secretaria-movement-list";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ChipButton } from "@/components/ui/chip";
import {
  DataTable,
  DataTableBody,
  DataTableEmpty,
  DataTableRow,
} from "@/components/ui/data-table";
import { EditIconButton } from "@/components/ui/edit-icon-button";
import { Modal } from "@/components/ui/modal";
import { NavigationLinkWithLoader } from "@/components/ui/navigation-link-with-loader";
import { BlockingStatusOverlay } from "@/components/ui/overlay";
import { formatLocalizedAmount, parseLocalizedAmount } from "@/lib/amounts";
import { formatSessionTime } from "@/lib/dates";
import type { TreasuryActionResponse } from "@/app/(dashboard)/dashboard/treasury-actions";
import type {
  ClubCalendarEvent,
  DailyCashSessionValidation,
  DashboardTreasuryCard as DashboardTreasuryCardData,
  TreasuryMovementType
} from "@/lib/domain/access";
import { dashboard as txtDashboard } from "@/lib/texts";
import { cn } from "@/lib/utils";

type TreasuryCardProps = {
  treasuryCard: DashboardTreasuryCardData;
  calendarEvents: ClubCalendarEvent[];
  closeSessionValidation: DailyCashSessionValidation | null;
  openSessionValidation: DailyCashSessionValidation | null;
  currentUserDisplayName: string;
  createTreasuryMovementAction: (formData: FormData) => Promise<TreasuryActionResponse>;
  updateSecretariaMovementAction: (formData: FormData) => Promise<TreasuryActionResponse>;
  updateSecretariaTransferAction: (formData: FormData) => Promise<TreasuryActionResponse>;
  createAccountTransferAction: (formData: FormData) => Promise<TreasuryActionResponse>;
  closeDailyCashSessionModalAction: (formData: FormData) => Promise<TreasuryActionResponse>;
  openDailyCashSessionModalAction: (formData: FormData) => Promise<TreasuryActionResponse>;
};

// formatSessionTime importado de lib/dates.ts (Fase 4 · T1.1).

type SessionConfig = {
  borderColor: string;
  iconBg: string;
  iconColor: string;
  iconText: string;
  badgeClass: string;
  badgeText: string;
};

function getSessionConfig(sessionStatus: DashboardTreasuryCardData["sessionStatus"]): SessionConfig {
  if (sessionStatus === "open") {
    return {
      borderColor: "border-l-ds-green",
      iconBg: "bg-ds-green-050",
      iconColor: "text-ds-green-700",
      iconText: "●",
      badgeClass: "bg-ds-green-050 text-ds-green-700",
      badgeText: txtDashboard.treasury.session_open
    };
  }
  if (sessionStatus === "closed") {
    return {
      borderColor: "border-l-ds-red",
      iconBg: "bg-ds-red-050",
      iconColor: "text-ds-red-700",
      iconText: "✕",
      badgeClass: "bg-ds-red-050 text-ds-red-700",
      badgeText: txtDashboard.treasury.session_closed
    };
  }
  return {
    borderColor: "border-l-ds-amber",
    iconBg: "bg-ds-amber-050",
    iconColor: "text-ds-amber-700",
    iconText: "!",
    badgeClass: "bg-ds-amber-050 text-ds-amber-700",
    badgeText: txtDashboard.treasury.session_not_started
  };
}

type SessionMetaItem = {
  label: string;
  value: string;
};

function buildSessionMeta(
  sessionStatus: DashboardTreasuryCardData["sessionStatus"],
  card: DashboardTreasuryCardData
): SessionMetaItem[] {
  const openingTime = formatSessionTime(card.sessionOpenedAt);
  const closingTime = formatSessionTime(card.sessionClosedAt);
  const openedBy = card.sessionOpenedByUserName;
  const movementsCount = txtDashboard.treasury.session_meta_movements_count.replace(
    "{count}",
    String(card.movements.length)
  );
  const totalArs = card.accounts.reduce((sum, account) => {
    const ars = account.balances.find((b) => b.currencyCode === "ARS");
    return sum + (ars?.amount ?? 0);
  }, 0);
  const currentBalance = `$ ${formatLocalizedAmount(totalArs)}`;

  if (sessionStatus === "open") {
    const aperturaValue =
      openingTime && openedBy
        ? `${openingTime} · ${openedBy}`
        : openingTime
          ? openingTime
          : txtDashboard.treasury.session_meta_not_registered;
    return [
      { label: txtDashboard.treasury.session_meta_opening, value: aperturaValue },
      { label: txtDashboard.treasury.session_meta_movements, value: movementsCount },
      { label: txtDashboard.treasury.session_meta_balance_current, value: currentBalance }
    ];
  }

  if (sessionStatus === "closed") {
    const aperturaValue =
      openingTime && openedBy
        ? `${openingTime} · ${openedBy}`
        : openingTime ?? txtDashboard.treasury.session_meta_not_registered;
    const cierreValue = closingTime ?? txtDashboard.treasury.session_meta_not_registered;
    return [
      { label: txtDashboard.treasury.session_meta_opening, value: aperturaValue },
      { label: txtDashboard.treasury.session_meta_closing, value: cierreValue },
      { label: txtDashboard.treasury.session_meta_movements, value: movementsCount }
    ];
  }

  return [
    {
      label: txtDashboard.treasury.session_meta_opening,
      value: txtDashboard.treasury.session_meta_not_registered
    },
    { label: txtDashboard.treasury.session_meta_movements, value: movementsCount }
  ];
}

function SessionCard({
  sessionStatus,
  card,
  canOpenSession,
  canCreateMovement,
  canCloseSession,
  onOpenSession,
  onOpenMovement,
  onOpenTransfer,
  onOpenCloseSession
}: {
  sessionStatus: DashboardTreasuryCardData["sessionStatus"];
  card: DashboardTreasuryCardData;
  canOpenSession: boolean;
  canCreateMovement: boolean;
  canCloseSession: boolean;
  onOpenSession: () => void;
  onOpenMovement: () => void;
  onOpenTransfer: () => void;
  onOpenCloseSession: () => void;
}) {
  const cfg = getSessionConfig(sessionStatus);
  const metaItems = buildSessionMeta(sessionStatus, card);
  const isUnresolved = sessionStatus === "unresolved";

  return (
    <Card
      as="section"
      padding="none"
      className={cn(
        "border-l-[3px]",
        isUnresolved ? "border-l-slate-300" : cfg.borderColor
      )}
      aria-label={txtDashboard.treasury.session_card_label}
    >
      {/* Session state header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-card text-sm font-bold",
            isUnresolved ? "bg-ds-slate-100 text-ds-slate-500" : cn(cfg.iconBg, cfg.iconColor)
          )}
          aria-hidden="true"
        >
          {isUnresolved ? "?" : cfg.iconText}
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-eyebrow font-semibold uppercase tracking-eyebrow text-muted-foreground">
            {txtDashboard.treasury.session_card_label}
          </span>
          <span className="text-card-title font-semibold leading-tight tracking-tight text-foreground">
            {isUnresolved
              ? txtDashboard.treasury.actions_card_unresolved_description.split(".")[0]
              : cfg.badgeText}
          </span>
        </div>
        {!isUnresolved ? (
          <span
            className={cn(
              "ml-auto inline-flex items-center gap-1.5 rounded-btn px-2 py-1 text-meta font-semibold",
              cfg.badgeClass
            )}
          >
            <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
            {cfg.badgeText}
          </span>
        ) : null}
      </div>

      {/* Session meta */}
      {!isUnresolved ? (
        <div className="mx-4 mb-3 grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-dashed border-border pt-3">
          {metaItems.map((item) => (
            <div key={item.label} className="flex min-w-0 flex-col gap-0.5">
              <span className="text-eyebrow font-semibold uppercase tracking-eyebrow text-muted-foreground">
                {item.label}
              </span>
              <span className="truncate text-label tabular-nums text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Closed message */}
      {sessionStatus === "closed" ? (
        <p className="px-4 pb-3 text-xs leading-relaxed text-muted-foreground">
          {txtDashboard.treasury.actions_card_closed_description}
        </p>
      ) : null}

      {/* Pending message */}
      {sessionStatus === "not_started" ? (
        <p className="px-4 pb-3 text-xs leading-relaxed text-muted-foreground">
          {txtDashboard.treasury.session_pending_message}
        </p>
      ) : null}

      {/* CTAs */}
      {canOpenSession ? (
        <div className="px-4 pb-4">
          <Button onClick={onOpenSession} fullWidth>
            {txtDashboard.treasury.open_session_flow_cta}
          </Button>
        </div>
      ) : null}

      {canCreateMovement ? (
        <div className="grid grid-cols-2 gap-2 px-4 pb-4">
          <Button onClick={onOpenMovement} className="px-3">
            {txtDashboard.treasury.movement_modal_cta}
          </Button>
          <Button variant="secondary" onClick={onOpenTransfer} className="px-3">
            {txtDashboard.treasury.transfer_modal_cta}
          </Button>
          {canCloseSession ? (
            <Button variant="destructive" onClick={onOpenCloseSession} className="col-span-2">
              {txtDashboard.treasury.close_session_flow_cta}
            </Button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function BalancesCard({ card }: { card: DashboardTreasuryCardData }) {
  const isUnresolved = card.movementDataStatus === "unresolved";

  return (
    <Card
      as="section"
      padding="none"
      aria-label={txtDashboard.treasury.balances_visible_title}
    >
      <CardHeader
        title={txtDashboard.treasury.balances_visible_title}
        description={txtDashboard.treasury.balances_visible_description}
        action={
          <span className="mt-0.5 shrink-0 rounded-btn bg-secondary px-2 py-1 text-eyebrow font-semibold text-muted-foreground">
            ARS
          </span>
        }
        className="px-4 pt-4 pb-3"
      />

      <div className="border-t border-border px-4 pb-4">
        {isUnresolved ? (
          <p className="pt-3 text-xs text-muted-foreground">{txtDashboard.treasury.balances_unresolved}</p>
        ) : card.accounts.length === 0 ? (
          <p className="pt-3 text-xs text-muted-foreground">{txtDashboard.treasury.empty_accounts}</p>
        ) : (
          <DataTable density="compact" className="rounded-none border-0">
            <DataTableBody>
              {card.accounts.map((account) => (
                <DataTableRow key={account.accountId} density="compact" useGrid={false}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-label font-medium text-foreground">{account.name}</span>
                      <span className="text-eyebrow font-semibold uppercase tracking-eyebrow text-muted-foreground">
                        {txtDashboard.treasury_role.cash_account_label}
                      </span>
                    </div>
                    <div className="shrink-0 text-right">
                      {account.balances.map((balance) => (
                        <p
                          key={`${account.accountId}-${balance.currencyCode}`}
                          className="text-card-title font-semibold tabular-nums tracking-tight text-foreground"
                        >
                          <span className="mr-0.5 text-eyebrow font-medium text-muted-foreground">$</span>
                          {formatLocalizedAmount(balance.amount)}
                        </p>
                      ))}
                    </div>
                  </div>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </div>
    </Card>
  );
}

function MovementsCard({
  card,
  activeFilter,
  onFilterChange,
  onEditMovement
}: {
  card: DashboardTreasuryCardData;
  activeFilter: string | null;
  onFilterChange: (accountId: string | null) => void;
  onEditMovement: (movement: DashboardTreasuryCardData["movements"][number]) => void;
}) {
  const isSessionUnresolved = card.sessionStatus === "unresolved";
  const isDataUnresolved = card.movementDataStatus === "unresolved";

  const filteredMovements = useMemo(() => {
    if (!activeFilter) return card.movements;
    return card.movements.filter((m) => m.accountId === activeFilter);
  }, [card.movements, activeFilter]);

  const shouldHide =
    card.sessionStatus === "not_started" && !isDataUnresolved && card.movements.length === 0;

  if (shouldHide) return null;

  const today = (() => {
    const d = new Date();
    return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(d);
  })();

  const detailHref = !isDataUnresolved && card.accounts.length > 0
    ? `/secretary/accounts/${activeFilter ?? card.accounts[0]?.accountId}`
    : null;

  return (
    <Card
      as="section"
      padding="none"
      className="sm:col-span-2"
      aria-label={txtDashboard.treasury.movements_card_title}
    >
      <CardHeader
        title={txtDashboard.treasury.movements_card_title}
        description={`${card.movements.length} ${txtDashboard.treasury.movements_card_description} · ${today}`}
        action={
          detailHref ? (
            <NavigationLinkWithLoader
              href={detailHref}
              prefetch={false}
              className="shrink-0 text-small font-semibold text-muted-foreground transition hover:text-foreground"
            >
              {txtDashboard.treasury.movements_see_all_cta}
            </NavigationLinkWithLoader>
          ) : undefined
        }
        className="px-4 pt-4 pb-2"
      />

      {/* Filter chips */}
      {card.accounts.length > 1 && !isDataUnresolved && card.movements.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
          <ChipButton
            active={activeFilter === null}
            onClick={() => onFilterChange(null)}
            className="shrink-0"
          >
            {txtDashboard.treasury.movements_filter_all_accounts}
          </ChipButton>
          {card.accounts.map((account) => (
            <ChipButton
              key={account.accountId}
              active={activeFilter === account.accountId}
              onClick={() => onFilterChange(account.accountId)}
              className="shrink-0"
            >
              {account.name}
            </ChipButton>
          ))}
        </div>
      ) : null}

      <div className="border-t border-border">
        {isSessionUnresolved || isDataUnresolved ? (
          <DataTableEmpty title={txtDashboard.treasury.movements_unresolved} />
        ) : filteredMovements.length === 0 ? (
          <DataTableEmpty title={txtDashboard.treasury.movements_empty} />
        ) : (
          <SecretariaMovementList
            items={filteredMovements.map((movement) => ({
              movementId: movement.movementId,
              movementDisplayId: movement.movementDisplayId,
              concept: movement.concept,
              createdAt: movement.createdAt,
              createdByUserName: movement.createdByUserName,
              accountName: movement.accountName,
              movementType: movement.movementType,
              currencyCode: movement.currencyCode,
              amount: movement.amount,
              categoryName: movement.categoryName,
              activityName: movement.activityName,
              receiptNumber: movement.receiptNumber,
              calendarEventTitle: movement.calendarEventTitle,
              transferReference: movement.transferReference,
              fxOperationReference: movement.fxOperationReference,
              action: movement.canEdit ? (
                <EditIconButton
                  onClick={() => onEditMovement(movement)}
                  label={txtDashboard.treasury.edit_movement_cta}
                />
              ) : undefined
            }))}
          />
        )}
      </div>
    </Card>
  );
}

export function TreasuryCard({
  treasuryCard,
  calendarEvents,
  closeSessionValidation,
  openSessionValidation,
  currentUserDisplayName,
  createTreasuryMovementAction,
  updateSecretariaMovementAction,
  updateSecretariaTransferAction,
  createAccountTransferAction,
  closeDailyCashSessionModalAction,
  openDailyCashSessionModalAction
}: TreasuryCardProps) {
  // Datos de dominio del context (Fase 4 · T3.2 — extension a TreasuryCard
  // y a sus 7 forms internos). Antes eran 9 props (movementAccounts,
  // transferSourceAccounts, transferTargetAccounts, categories, activities,
  // currencies, movementTypes, receiptFormats, staffContracts). Ahora cada
  // form los consume directamente via useTreasuryData(). Este componente
  // solo necesita transferSourceAccounts/transferTargetAccounts para
  // pasarlos a AccountTransferForm/EditForm — las cuentas de transfer
  // siguen como prop porque varían según el rol del consumer (secretaria
  // vs tesoreria); ver doc en account-transfer-form.tsx.
  const { transferSourceAccounts, transferTargetAccounts } = useTreasuryData();

  const router = useRouter();
  const [localTreasuryCard, setLocalTreasuryCard] = useState(treasuryCard);
  const canCreateMovement = localTreasuryCard.availableActions.includes("create_movement");
  const canCloseSession = localTreasuryCard.availableActions.includes("close_session");
  const canOpenSession = localTreasuryCard.availableActions.includes("open_session");
  const [activeModal, setActiveModal] = useState<"movement" | "edit_movement" | "edit_transfer" | "transfer" | "close_session" | "open_session" | null>(null);
  const [isSessionClosePending, setIsSessionClosePending] = useState(false);
  const [isSessionOpenPending, setIsSessionOpenPending] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<DashboardTreasuryCardData["movements"][number] | null>(null);
  const [isMovementSubmissionPending, setIsMovementSubmissionPending] = useState(false);
  const [isTransferSubmissionPending, setIsTransferSubmissionPending] = useState(false);
  const [pendingTransferMovementDisplayId, setPendingTransferMovementDisplayId] = useState<string | null>(null);
  const [isMovementUpdatePending, setIsMovementUpdatePending] = useState(false);
  const [activeAccountFilter, setActiveAccountFilter] = useState<string | null>(null);
  const [pendingMovementUpdate, setPendingMovementUpdate] = useState<{
    movementId: string;
    accountId: string;
    categoryId: string;
    movementType: TreasuryMovementType;
    activityId: string | null;
    receiptNumber: string | null;
    calendarEventId: string | null;
    concept: string;
    currencyCode: string;
    amount: number;
  } | null>(null);

  const pendingOverlayLabel = isMovementSubmissionPending
    ? txtDashboard.treasury.create_loading
    : isTransferSubmissionPending
      ? txtDashboard.treasury.transfer_create_loading
      : isMovementUpdatePending
        ? txtDashboard.treasury.update_loading
        : isSessionClosePending
          ? txtDashboard.treasury.confirm_close_session_loading
          : isSessionOpenPending
            ? txtDashboard.treasury.confirm_open_session_loading
            : null;

  useEffect(() => {
    setLocalTreasuryCard(treasuryCard);
  }, [treasuryCard]);

  useEffect(() => {
    if (!isTransferSubmissionPending) return;
    if (
      pendingTransferMovementDisplayId &&
      localTreasuryCard.movements.some((m) => m.movementDisplayId === pendingTransferMovementDisplayId)
    ) {
      setIsTransferSubmissionPending(false);
      setPendingTransferMovementDisplayId(null);
    }
  }, [isTransferSubmissionPending, pendingTransferMovementDisplayId, localTreasuryCard.movements]);

  useEffect(() => {
    if (!isMovementUpdatePending || !pendingMovementUpdate) return;
    const matchingMovement = localTreasuryCard.movements.find(
      (m) => m.movementId === pendingMovementUpdate.movementId
    );
    if (
      matchingMovement &&
      matchingMovement.accountId === pendingMovementUpdate.accountId &&
      matchingMovement.categoryId === pendingMovementUpdate.categoryId &&
      matchingMovement.movementType === pendingMovementUpdate.movementType &&
      matchingMovement.activityId === pendingMovementUpdate.activityId &&
      matchingMovement.receiptNumber === pendingMovementUpdate.receiptNumber &&
      matchingMovement.calendarEventId === pendingMovementUpdate.calendarEventId &&
      matchingMovement.concept === pendingMovementUpdate.concept &&
      matchingMovement.currencyCode === pendingMovementUpdate.currencyCode &&
      matchingMovement.amount === pendingMovementUpdate.amount
    ) {
      setIsMovementUpdatePending(false);
      setPendingMovementUpdate(null);
    }
  }, [isMovementUpdatePending, pendingMovementUpdate, localTreasuryCard.movements]);

  function applyOptimisticMovementUpdate(result: TreasuryActionResponse) {
    if (!result.optimisticUpdate) return;
    const { optimisticUpdate } = result;
    setLocalTreasuryCard((currentCard) => {
      const movementAlreadyPresent = currentCard.movements.some(
        (m) => m.movementId === optimisticUpdate.movement.movementId
      );
      if (movementAlreadyPresent) return currentCard;
      return {
        ...currentCard,
        accounts: currentCard.accounts.map((account) => {
          if (account.accountId !== optimisticUpdate.balanceDelta.accountId) return account;
          return {
            ...account,
            balances: account.balances.map((balance) =>
              balance.currencyCode === optimisticUpdate.balanceDelta.currencyCode
                ? { ...balance, amount: balance.amount + optimisticUpdate.balanceDelta.amountDelta }
                : balance
            )
          };
        }),
        movements: [optimisticUpdate.movement, ...currentCard.movements].sort((left, right) =>
          right.createdAt.localeCompare(left.createdAt)
        )
      };
    });
  }

  async function handleCreateTreasuryMovement(formData: FormData) {
    setIsMovementSubmissionPending(true);
    setActiveModal(null);
    try {
      const result = await createTreasuryMovementAction(formData);
      if (result.ok) {
        applyOptimisticMovementUpdate(result);
      }
      setIsMovementSubmissionPending(false);
      triggerClientFeedback("dashboard", result.code, { movementId: result.movementDisplayId });
      if (result.ok) {
        startTransition(() => { router.refresh(); });
      }
    } catch (error) {
      setIsMovementSubmissionPending(false);
      throw error;
    }
  }

  async function handleUpdateSecretariaMovement(formData: FormData) {
    const movementId = String(formData.get("movement_id") ?? "");
    const movementType = String(formData.get("movement_type") ?? "");
    const amount = String(formData.get("amount") ?? "");
    const parsedAmount = parseLocalizedAmount(amount);
    setIsMovementUpdatePending(true);
    setActiveModal(null);
    setPendingMovementUpdate({
      movementId,
      accountId: String(formData.get("account_id") ?? ""),
      categoryId: String(formData.get("category_id") ?? ""),
      movementType: movementType === "egreso" ? "egreso" : "ingreso",
      activityId: String(formData.get("activity_id") ?? "").trim() || null,
      receiptNumber: String(formData.get("receipt_number") ?? "").trim() || null,
      calendarEventId: null,
      concept: String(formData.get("concept") ?? "").trim(),
      currencyCode: String(formData.get("currency_code") ?? ""),
      amount: parsedAmount ?? 0
    });
    try {
      const result = await updateSecretariaMovementAction(formData);
      if (!result.ok) {
        setPendingMovementUpdate(null);
        setIsMovementUpdatePending(false);
      }
      triggerClientFeedback("dashboard", result.code, { movementId: result.movementDisplayId });
      startTransition(() => { router.refresh(); });
    } catch (error) {
      setPendingMovementUpdate(null);
      setIsMovementUpdatePending(false);
      throw error;
    }
  }

  async function handleUpdateSecretariaTransfer(formData: FormData) {
    setIsMovementUpdatePending(true);
    setActiveModal(null);
    try {
      const result = await updateSecretariaTransferAction(formData);
      setIsMovementUpdatePending(false);
      setSelectedMovement(null);
      triggerClientFeedback("dashboard", result.code, { movementId: result.movementDisplayId });
      startTransition(() => { router.refresh(); });
    } catch (error) {
      setIsMovementUpdatePending(false);
      setSelectedMovement(null);
      throw error;
    }
  }

  async function handleCreateAccountTransfer(formData: FormData) {
    setIsTransferSubmissionPending(true);
    setActiveModal(null);
    try {
      const result = await createAccountTransferAction(formData);
      if (result.ok) {
        setPendingTransferMovementDisplayId(result.movementDisplayId ?? null);
      } else {
        setPendingTransferMovementDisplayId(null);
        setIsTransferSubmissionPending(false);
      }
      triggerClientFeedback("dashboard", result.code, { movementId: result.movementDisplayId });
      startTransition(() => { router.refresh(); });
    } catch (error) {
      setPendingTransferMovementDisplayId(null);
      setIsTransferSubmissionPending(false);
      throw error;
    }
  }

  async function handleCloseSession(formData: FormData) {
    setIsSessionClosePending(true);
    setActiveModal(null);
    try {
      const result = await closeDailyCashSessionModalAction(formData);
      triggerClientFeedback("dashboard", result.code);
      startTransition(() => { router.refresh(); });
    } finally {
      setIsSessionClosePending(false);
    }
  }

  async function handleOpenSession(formData: FormData) {
    setIsSessionOpenPending(true);
    setActiveModal(null);
    try {
      const result = await openDailyCashSessionModalAction(formData);
      triggerClientFeedback("dashboard", result.code);
      startTransition(() => { router.refresh(); });
    } finally {
      setIsSessionOpenPending(false);
    }
  }

  return (
    <>
      <BlockingStatusOverlay open={pendingOverlayLabel !== null} label={pendingOverlayLabel ?? ""} />

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <SessionCard
          sessionStatus={localTreasuryCard.sessionStatus}
          card={localTreasuryCard}
          canOpenSession={canOpenSession}
          canCreateMovement={canCreateMovement}
          canCloseSession={canCloseSession}
          onOpenSession={() => setActiveModal("open_session")}
          onOpenMovement={() => setActiveModal("movement")}
          onOpenTransfer={() => setActiveModal("transfer")}
          onOpenCloseSession={() => setActiveModal("close_session")}
        />

        <BalancesCard card={localTreasuryCard} />

        <MovementsCard
          card={localTreasuryCard}
          activeFilter={activeAccountFilter}
          onFilterChange={setActiveAccountFilter}
          onEditMovement={(movement) => {
            setSelectedMovement(movement);
            setActiveModal(movement.transferReference !== null ? "edit_transfer" : "edit_movement");
          }}
        />
      </div>

      <Modal
        open={activeModal === "movement"}
        onClose={() => setActiveModal(null)}
        title={txtDashboard.treasury.movement_form_title}
        description={txtDashboard.treasury.movement_form_description}
        closeDisabled={isMovementSubmissionPending}
        size="md"
      >
        <SecretariaMovementForm
          submitAction={handleCreateTreasuryMovement}
          submitLabel={txtDashboard.treasury.create_cta}
          pendingLabel={txtDashboard.treasury.create_loading}
          sessionDate={localTreasuryCard.sessionDate}
          onCancel={() => setActiveModal(null)}
        />
      </Modal>

      <Modal
        open={activeModal === "edit_movement" && selectedMovement !== null}
        onClose={() => {
          setActiveModal(null);
          setSelectedMovement(null);
        }}
        title={txtDashboard.treasury.edit_form_title}
        description={txtDashboard.treasury.edit_form_description}
        closeDisabled={isMovementUpdatePending}
        size="md"
      >
        {selectedMovement ? (
          <SecretariaMovementEditForm
            submitAction={handleUpdateSecretariaMovement}
            submitLabel={txtDashboard.treasury.update_cta}
            pendingLabel={txtDashboard.treasury.update_loading}
            movement={selectedMovement}
            initialCostCenterIds={selectedMovement.costCenterIds ?? []}
            onCancel={() => {
              setActiveModal(null);
              setSelectedMovement(null);
            }}
          />
        ) : null}
      </Modal>

      <Modal
        open={activeModal === "edit_transfer" && selectedMovement !== null}
        onClose={() => {
          setActiveModal(null);
          setSelectedMovement(null);
        }}
        title={txtDashboard.treasury.transfer_form_title}
        description={txtDashboard.treasury.edit_form_description}
        closeDisabled={isMovementUpdatePending}
        size="md"
      >
        {selectedMovement && selectedMovement.transferReference !== null ? (() => {
          const pairedMovement = localTreasuryCard.movements.find(
            (m) => m.transferReference === selectedMovement.transferReference && m.movementId !== selectedMovement.movementId
          );
          const sourceMovement = selectedMovement.movementType === "egreso"
            ? selectedMovement
            : (pairedMovement ?? selectedMovement);
          const targetMovement = selectedMovement.movementType === "ingreso"
            ? selectedMovement
            : (pairedMovement ?? selectedMovement);
          const initialValues = {
            sourceAccountId: sourceMovement.accountId,
            targetAccountId: targetMovement.accountId,
            currencyCode: selectedMovement.currencyCode,
            concept: selectedMovement.concept,
            amount: formatLocalizedAmount(selectedMovement.amount)
          };
          return (
            <AccountTransferEditForm
              movementId={selectedMovement.movementId}
              initialValues={initialValues}
              sourceAccounts={transferSourceAccounts}
              targetAccounts={transferTargetAccounts}
              submitAction={handleUpdateSecretariaTransfer}
              sessionDate={localTreasuryCard.sessionDate}
              onCancel={() => {
                setActiveModal(null);
                setSelectedMovement(null);
              }}
            />
          );
        })() : null}
      </Modal>

      <Modal
        open={activeModal === "transfer"}
        onClose={() => setActiveModal(null)}
        title={txtDashboard.treasury.transfer_form_title}
        description={txtDashboard.treasury.transfer_form_description}
        closeDisabled={isTransferSubmissionPending}
        size="md"
      >
        <AccountTransferForm
          sourceAccounts={transferSourceAccounts}
          targetAccounts={transferTargetAccounts}
          submitAction={handleCreateAccountTransfer}
          sessionDate={localTreasuryCard.sessionDate}
          onCancel={() => setActiveModal(null)}
        />
      </Modal>

      {/* check-primitives-ignore-next-line: submitVariant="destructive" vive en CloseSessionModalForm L320 (cross-file) */}
      <Modal
        open={activeModal === "close_session" && closeSessionValidation !== null}
        onClose={() => setActiveModal(null)}
        title={txtDashboard.treasury.closing_title}
        description={txtDashboard.treasury.closing_description}
        closeDisabled={isSessionClosePending}
        size="lg"
      >
        {closeSessionValidation ? (
          <CloseSessionModalForm
            validation={closeSessionValidation}
            movements={localTreasuryCard.movements}
            currentUserDisplayName={currentUserDisplayName}
            submitAction={handleCloseSession}
            onCancel={() => setActiveModal(null)}
          />
        ) : null}
      </Modal>

      <Modal
        open={activeModal === "open_session" && openSessionValidation !== null}
        onClose={() => setActiveModal(null)}
        title={txtDashboard.treasury.opening_title}
        description={txtDashboard.treasury.opening_description}
        closeDisabled={isSessionOpenPending}
        size="lg"
      >
        {openSessionValidation ? (
          <OpenSessionModalForm
            validation={openSessionValidation}
            submitAction={handleOpenSession}
            onCancel={() => setActiveModal(null)}
          />
        ) : null}
      </Modal>
    </>
  );
}
