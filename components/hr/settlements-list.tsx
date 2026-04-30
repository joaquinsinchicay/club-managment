"use client";

import type { SettlementActionResult } from "@/app/(dashboard)/rrhh/settlements/actions";
import { Button } from "@/components/ui/button";
import { DataTableEmpty } from "@/components/ui/data-table";
import { BulkBar } from "@/components/hr/settlements/bulk-bar";
import { FiltersBar } from "@/components/hr/settlements/filters-bar";
import { SettlementsModals } from "@/components/hr/settlements/modals";
import { SettlementsTable } from "@/components/hr/settlements/settlements-table";
import { useSettlementsList } from "@/lib/hooks/use-settlements-list";
import type {
  PayrollSettlement,
  PayrollSettlementAdjustment,
} from "@/lib/domain/payroll-settlement";
import type { TreasuryAccount } from "@/lib/domain/access";
import { texts } from "@/lib/texts";

const sTexts = texts.rrhh.settlements;

type SettlementsListProps = {
  settlements: PayrollSettlement[];
  adjustmentsBySettlementId: Record<string, PayrollSettlementAdjustment[]>;
  clubCurrencyCode: string;
  canOperate: boolean;
  payableAccounts: TreasuryAccount[];
  generateAction: (formData: FormData) => Promise<SettlementActionResult>;
  addAdjustmentAction: (formData: FormData) => Promise<SettlementActionResult>;
  deleteAdjustmentAction: (formData: FormData) => Promise<SettlementActionResult>;
  updateHoursOrNotesAction: (formData: FormData) => Promise<SettlementActionResult>;
  approveAction: (formData: FormData) => Promise<SettlementActionResult>;
  approveBulkAction: (formData: FormData) => Promise<SettlementActionResult>;
  returnAction: (formData: FormData) => Promise<SettlementActionResult>;
  annulAction: (formData: FormData) => Promise<SettlementActionResult>;
  payAction: (formData: FormData) => Promise<SettlementActionResult>;
  payBatchAction: (formData: FormData) => Promise<SettlementActionResult>;
};

export function SettlementsList({
  settlements,
  adjustmentsBySettlementId,
  clubCurrencyCode,
  canOperate,
  payableAccounts,
  generateAction,
  addAdjustmentAction,
  deleteAdjustmentAction,
  updateHoursOrNotesAction,
  approveAction,
  approveBulkAction,
  returnAction,
  annulAction,
  payAction,
  payBatchAction,
}: SettlementsListProps) {
  const controller = useSettlementsList(settlements);

  const subtitleCounts = sTexts.subtitle_counts
    .replace("{generada}", String(controller.countsByStatus.get("generada") ?? 0))
    .replace("{aprobada_rrhh}", String(controller.countsByStatus.get("aprobada_rrhh") ?? 0))
    .replace("{pagada}", String(controller.countsByStatus.get("pagada") ?? 0))
    .replace("{anulada}", String(controller.countsByStatus.get("anulada") ?? 0));

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-h2 font-bold text-foreground">{sTexts.page_title}</h2>
        <p className="text-sm text-muted-foreground">{sTexts.page_description}</p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{subtitleCounts}</p>
        {canOperate ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => controller.setGenerateOpen(true)}
          >
            {sTexts.generate_cta}
          </Button>
        ) : null}
      </div>

      <FiltersBar
        search={controller.search}
        onSearchChange={controller.setSearch}
        statusFilter={controller.statusFilter}
        onStatusFilterChange={controller.setStatusFilter}
        totalForPeriod={controller.settlementsForPeriod.length}
        countsByStatus={controller.countsByStatus}
        periodFilter={controller.periodFilter}
        onPeriodFilterChange={controller.setPeriodFilter}
        periodLabelLong={controller.periodLabelLong}
      />

      {canOperate && controller.selectedIds.length > 0 ? (
        <BulkBar
          count={controller.selectedIds.length}
          total={controller.selectedTotal}
          clubCurrencyCode={clubCurrencyCode}
          selectionMode={controller.selectionMode}
          onClear={controller.clearSelection}
          onApprove={() => controller.setApprovingBulk(true)}
          onPay={() => controller.setPayingBulk(true)}
        />
      ) : null}

      {controller.filtered.length === 0 ? (
        controller.settlementsForPeriod.length === 0 ? (
          <DataTableEmpty
            title={sTexts.period_empty_title_template.replace(
              "{period}",
              controller.periodLabelLong,
            )}
            description={sTexts.period_empty_description}
            action={
              canOperate ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => controller.setGenerateOpen(true)}
                >
                  {sTexts.empty_cta}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <DataTableEmpty
            title={sTexts.empty_filter_title}
            description={sTexts.empty_filter_description}
          />
        )
      ) : (
        <SettlementsTable
          settlements={controller.filtered}
          clubCurrencyCode={clubCurrencyCode}
          canOperate={canOperate}
          selectedIds={controller.selectedIds}
          selectableIds={controller.selectableIds}
          allSelected={controller.allSelected}
          onToggleAll={controller.toggleAll}
          onToggleRow={controller.toggleSelection}
          onDetail={controller.setEditingDetail}
          onApprove={controller.setApprovingOne}
          onPay={controller.setPaying}
          onReturn={controller.setReturning}
          onAnnul={controller.setAnnulling}
        />
      )}

      <SettlementsModals
        controller={controller}
        clubCurrencyCode={clubCurrencyCode}
        payableAccounts={payableAccounts}
        adjustmentsBySettlementId={adjustmentsBySettlementId}
        generateAction={generateAction}
        approveAction={approveAction}
        approveBulkAction={approveBulkAction}
        returnAction={returnAction}
        annulAction={annulAction}
        payAction={payAction}
        payBatchAction={payBatchAction}
        addAdjustmentAction={addAdjustmentAction}
        deleteAdjustmentAction={deleteAdjustmentAction}
        updateHoursOrNotesAction={updateHoursOrNotesAction}
      />
    </div>
  );
}
