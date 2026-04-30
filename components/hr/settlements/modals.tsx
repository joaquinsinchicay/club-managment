"use client";

import type { SettlementActionResult } from "@/app/(dashboard)/rrhh/settlements/actions";
import { Card, CardBody } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { ModalFooter } from "@/components/ui/modal-footer";
import {
  FormBanner,
  FormCheckboxCard,
  FormField,
  FormFieldLabel,
  FormHelpText,
  FormInput,
  FormReadonly,
  FormSelect,
  FormTextarea,
} from "@/components/ui/modal-form";
import { triggerClientFeedback } from "@/lib/client-feedback";
import {
  currentPeriodYearMonth,
  formatPeriodLabel,
  type PayrollSettlement,
  type PayrollSettlementAdjustment,
} from "@/lib/domain/payroll-settlement";
import type { TreasuryAccount } from "@/lib/domain/access";
import { formatAmount } from "@/lib/settlements-list-helpers";
import { texts } from "@/lib/texts";
import type { SettlementsListController } from "@/lib/hooks/use-settlements-list";
import { SettlementDetailBody } from "./settlement-detail-body";

const sTexts = texts.rrhh.settlements;

export type SettlementsModalsProps = {
  controller: SettlementsListController;
  clubCurrencyCode: string;
  payableAccounts: TreasuryAccount[];
  adjustmentsBySettlementId: Record<string, PayrollSettlementAdjustment[]>;
  generateAction: (formData: FormData) => Promise<SettlementActionResult>;
  approveAction: (formData: FormData) => Promise<SettlementActionResult>;
  approveBulkAction: (formData: FormData) => Promise<SettlementActionResult>;
  returnAction: (formData: FormData) => Promise<SettlementActionResult>;
  annulAction: (formData: FormData) => Promise<SettlementActionResult>;
  payAction: (formData: FormData) => Promise<SettlementActionResult>;
  payBatchAction: (formData: FormData) => Promise<SettlementActionResult>;
  addAdjustmentAction: (formData: FormData) => Promise<SettlementActionResult>;
  deleteAdjustmentAction: (formData: FormData) => Promise<SettlementActionResult>;
  updateHoursOrNotesAction: (formData: FormData) => Promise<SettlementActionResult>;
};

export function SettlementsModals({
  controller,
  clubCurrencyCode,
  payableAccounts,
  adjustmentsBySettlementId,
  generateAction,
  approveAction,
  approveBulkAction,
  returnAction,
  annulAction,
  payAction,
  payBatchAction,
  addAdjustmentAction,
  deleteAdjustmentAction,
  updateHoursOrNotesAction,
}: SettlementsModalsProps) {
  return (
    <>
      <GenerateModal
        open={controller.generateOpen}
        pending={controller.generate.isPending}
        onClose={() => controller.setGenerateOpen(false)}
        onSubmit={async (fd) => {
          await controller.generate.runAction(generateAction, fd, (result) => {
            controller.setGenerateOpen(false);
            const d = result.data as
              | {
                  generatedCount: number;
                  skippedCount: number;
                  errorCount: number;
                }
              | undefined;
            if (d && (d.skippedCount > 0 || d.errorCount > 0)) {
              triggerClientFeedback(
                "dashboard",
                d.errorCount > 0 ? "settlement_partial" : "settlement_generated",
              );
            }
          });
        }}
      />

      <DetailModal
        open={controller.editingDetail !== null}
        settlement={controller.editingDetail}
        adjustments={
          controller.editingDetail
            ? adjustmentsBySettlementId[controller.editingDetail.id] ?? []
            : []
        }
        clubCurrencyCode={clubCurrencyCode}
        onClose={() => controller.setEditingDetail(null)}
        addAdjustmentAction={addAdjustmentAction}
        deleteAdjustmentAction={deleteAdjustmentAction}
        updateHoursOrNotesAction={updateHoursOrNotesAction}
      />

      <ApproveOneModal
        settlement={controller.approvingOne}
        pending={controller.approve.isPending}
        clubCurrencyCode={clubCurrencyCode}
        onClose={() => controller.setApprovingOne(null)}
        onSubmit={async (fd) => {
          await controller.approve.runAction(approveAction, fd, () =>
            controller.setApprovingOne(null),
          );
        }}
      />

      <ApproveBulkModal
        open={controller.approvingBulk}
        pending={controller.approveBulk.isPending}
        selectedSettlements={controller.selectedSettlements}
        selectedTotal={controller.selectedTotal}
        selectedHasZero={controller.selectedHasZero}
        clubCurrencyCode={clubCurrencyCode}
        onClose={() => controller.setApprovingBulk(false)}
        onSubmit={async (fd) => {
          await controller.approveBulk.runAction(approveBulkAction, fd, () => {
            controller.setApprovingBulk(false);
            controller.clearSelection();
          });
        }}
      />

      <ReturnModal
        settlement={controller.returning}
        pending={controller.returnFlow.isPending}
        onClose={() => controller.setReturning(null)}
        onSubmit={async (fd) => {
          await controller.returnFlow.runAction(returnAction, fd, () =>
            controller.setReturning(null),
          );
        }}
      />

      <PayModal
        settlement={controller.paying}
        pending={controller.pay.isPending}
        clubCurrencyCode={clubCurrencyCode}
        payableAccounts={payableAccounts}
        onClose={() => controller.setPaying(null)}
        onSubmit={async (fd) => {
          await controller.pay.runAction(payAction, fd, () => controller.setPaying(null));
        }}
      />

      <PayBulkModal
        open={controller.payingBulk}
        pending={controller.payBulk.isPending}
        selectedSettlements={controller.selectedSettlements}
        selectedTotal={controller.selectedTotal}
        clubCurrencyCode={clubCurrencyCode}
        payableAccounts={payableAccounts}
        onClose={() => controller.setPayingBulk(false)}
        onSubmit={async (fd) => {
          await controller.payBulk.runAction(payBatchAction, fd, () => {
            controller.setPayingBulk(false);
            controller.clearSelection();
          });
        }}
      />

      <AnnulModal
        settlement={controller.annulling}
        pending={controller.annul.isPending}
        onClose={() => controller.setAnnulling(null)}
        onSubmit={async (fd) => {
          await controller.annul.runAction(annulAction, fd, () =>
            controller.setAnnulling(null),
          );
        }}
      />
    </>
  );
}

// ───────────────────────────── Generate ──────────────────────────────────────

function GenerateModal({
  open,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onSubmit: (fd: FormData) => Promise<void>;
}) {
  return (
    <Modal
      open={open}
      onClose={() => !pending && onClose()}
      title={sTexts.generate_modal_title}
      description={sTexts.generate_modal_description}
      size="sm"
      closeDisabled={pending}
    >
      <form action={onSubmit} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField>
            <FormFieldLabel required>{sTexts.generate_month_label}</FormFieldLabel>
            <FormSelect
              name="month"
              defaultValue={String(currentPeriodYearMonth().month)}
              required
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i + 1} value={String(i + 1)}>
                  {String(i + 1).padStart(2, "0")}
                </option>
              ))}
            </FormSelect>
          </FormField>
          <FormField>
            <FormFieldLabel required>{sTexts.generate_year_label}</FormFieldLabel>
            <FormInput
              type="number"
              name="year"
              defaultValue={currentPeriodYearMonth().year}
              min={2024}
              max={2100}
              required
            />
          </FormField>
        </div>
        <FormHelpText>{sTexts.generate_helper}</FormHelpText>
        <ModalFooter
          onCancel={onClose}
          cancelLabel={sTexts.cancel_cta}
          submitLabel={sTexts.generate_submit_cta}
          pendingLabel={sTexts.submit_pending}
        />
      </form>
    </Modal>
  );
}

// ───────────────────────────── Detail ────────────────────────────────────────

function DetailModal({
  open,
  settlement,
  adjustments,
  clubCurrencyCode,
  onClose,
  addAdjustmentAction,
  deleteAdjustmentAction,
  updateHoursOrNotesAction,
}: {
  open: boolean;
  settlement: PayrollSettlement | null;
  adjustments: PayrollSettlementAdjustment[];
  clubCurrencyCode: string;
  onClose: () => void;
  addAdjustmentAction: (formData: FormData) => Promise<SettlementActionResult>;
  deleteAdjustmentAction: (formData: FormData) => Promise<SettlementActionResult>;
  updateHoursOrNotesAction: (formData: FormData) => Promise<SettlementActionResult>;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={sTexts.detail_modal_title}
      description={sTexts.detail_modal_description}
      size="lg"
    >
      {settlement ? (
        <SettlementDetailBody
          settlement={settlement}
          adjustments={adjustments}
          clubCurrencyCode={clubCurrencyCode}
          addAdjustmentAction={addAdjustmentAction}
          deleteAdjustmentAction={deleteAdjustmentAction}
          updateHoursOrNotesAction={updateHoursOrNotesAction}
        />
      ) : null}
    </Modal>
  );
}

// ───────────────────────────── Approve one ───────────────────────────────────

function ApproveOneModal({
  settlement,
  pending,
  clubCurrencyCode,
  onClose,
  onSubmit,
}: {
  settlement: PayrollSettlement | null;
  pending: boolean;
  clubCurrencyCode: string;
  onClose: () => void;
  onSubmit: (fd: FormData) => Promise<void>;
}) {
  return (
    <Modal
      open={settlement !== null}
      onClose={() => !pending && onClose()}
      title={sTexts.approve_modal_title}
      size="sm"
      closeDisabled={pending}
    >
      {settlement ? (
        <form action={onSubmit} className="grid gap-4">
          <input type="hidden" name="settlement_id" value={settlement.id} />
          {settlement.totalAmount === 0 ? (
            <>
              <FormBanner variant="warning">{sTexts.approve_zero_warning}</FormBanner>
              <input type="hidden" name="approve_zero" value="true" />
            </>
          ) : null}
          <FormField>
            <FormFieldLabel>{sTexts.col_member}</FormFieldLabel>
            <FormReadonly>
              {settlement.staffMemberName ?? "—"} ·{" "}
              {formatPeriodLabel(settlement.periodYear, settlement.periodMonth)}
            </FormReadonly>
          </FormField>
          <FormField>
            <FormFieldLabel>{sTexts.col_total}</FormFieldLabel>
            <FormReadonly>
              {formatAmount(settlement.totalAmount, clubCurrencyCode)}
            </FormReadonly>
          </FormField>
          <ModalFooter
            onCancel={onClose}
            cancelLabel={sTexts.cancel_cta}
            submitLabel={sTexts.approve_submit_cta}
            pendingLabel={sTexts.submit_pending}
          />
        </form>
      ) : null}
    </Modal>
  );
}

// ───────────────────────────── Approve bulk ──────────────────────────────────

function ApproveBulkModal({
  open,
  pending,
  selectedSettlements,
  selectedTotal,
  selectedHasZero,
  clubCurrencyCode,
  onClose,
  onSubmit,
}: {
  open: boolean;
  pending: boolean;
  selectedSettlements: PayrollSettlement[];
  selectedTotal: number;
  selectedHasZero: boolean;
  clubCurrencyCode: string;
  onClose: () => void;
  onSubmit: (fd: FormData) => Promise<void>;
}) {
  return (
    <Modal
      open={open}
      onClose={() => !pending && onClose()}
      title={sTexts.bulk_modal_title}
      description={sTexts.bulk_modal_description}
      size="md"
      closeDisabled={pending}
    >
      <form action={onSubmit} className="grid gap-4">
        {selectedSettlements.map((s) => (
          <input key={s.id} type="hidden" name="settlement_ids" value={s.id} />
        ))}
        <Card padding="compact" tone="muted">
          <CardBody>
            <div className="grid gap-1 text-sm">
              <span>
                <strong>{sTexts.bulk_summary_count}:</strong> {selectedSettlements.length}
              </span>
              <span>
                <strong>{sTexts.bulk_summary_total}:</strong>{" "}
                {formatAmount(selectedTotal, clubCurrencyCode)}
              </span>
            </div>
          </CardBody>
        </Card>
        {selectedHasZero ? (
          <FormCheckboxCard
            name="approve_zero"
            value="true"
            label={sTexts.bulk_approve_zero_label}
            description={sTexts.bulk_approve_zero_description}
          />
        ) : null}
        <ModalFooter
          onCancel={onClose}
          cancelLabel={sTexts.cancel_cta}
          submitLabel={sTexts.bulk_submit_cta}
          pendingLabel={sTexts.submit_pending}
        />
      </form>
    </Modal>
  );
}

// ───────────────────────────── Return ────────────────────────────────────────

function ReturnModal({
  settlement,
  pending,
  onClose,
  onSubmit,
}: {
  settlement: PayrollSettlement | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (fd: FormData) => Promise<void>;
}) {
  return (
    <Modal
      open={settlement !== null}
      onClose={() => !pending && onClose()}
      title={sTexts.return_modal_title}
      description={sTexts.return_modal_description}
      size="sm"
      closeDisabled={pending}
    >
      {settlement ? (
        <form action={onSubmit} className="grid gap-4">
          <input type="hidden" name="settlement_id" value={settlement.id} />
          <FormField>
            <FormFieldLabel>{sTexts.col_member}</FormFieldLabel>
            <FormReadonly>
              {settlement.staffMemberName ?? "—"} ·{" "}
              {formatPeriodLabel(settlement.periodYear, settlement.periodMonth)}
            </FormReadonly>
          </FormField>
          <FormField>
            <FormFieldLabel required>{sTexts.return_reason_label}</FormFieldLabel>
            <FormTextarea
              name="reason"
              rows={3}
              required
              maxLength={500}
              placeholder={sTexts.return_reason_placeholder}
            />
          </FormField>
          <ModalFooter
            onCancel={onClose}
            cancelLabel={sTexts.cancel_cta}
            submitLabel={sTexts.return_submit_cta}
            pendingLabel={sTexts.submit_pending}
          />
        </form>
      ) : null}
    </Modal>
  );
}

// ───────────────────────────── Pay (single) ──────────────────────────────────

function PayModal({
  settlement,
  pending,
  clubCurrencyCode,
  payableAccounts,
  onClose,
  onSubmit,
}: {
  settlement: PayrollSettlement | null;
  pending: boolean;
  clubCurrencyCode: string;
  payableAccounts: TreasuryAccount[];
  onClose: () => void;
  onSubmit: (fd: FormData) => Promise<void>;
}) {
  return (
    <Modal
      open={settlement !== null}
      onClose={() => !pending && onClose()}
      title={sTexts.pay_modal_title}
      description={sTexts.pay_modal_description}
      size="md"
      closeDisabled={pending}
    >
      {settlement ? (
        <form action={onSubmit} className="grid gap-4">
          <input type="hidden" name="settlement_id" value={settlement.id} />
          <FormField>
            <FormFieldLabel>{sTexts.col_member}</FormFieldLabel>
            <FormReadonly>
              {settlement.staffMemberName ?? "—"} ·{" "}
              {formatPeriodLabel(settlement.periodYear, settlement.periodMonth)}
            </FormReadonly>
          </FormField>
          <FormField>
            <FormFieldLabel>{sTexts.pay_amount_label}</FormFieldLabel>
            <FormReadonly>
              {formatAmount(settlement.totalAmount, clubCurrencyCode)}
            </FormReadonly>
          </FormField>
          <FormField>
            <FormFieldLabel required>{sTexts.pay_account_label}</FormFieldLabel>
            <FormSelect name="account_id" defaultValue="" required>
              <option value="" disabled>
                {sTexts.pay_account_placeholder}
              </option>
              {payableAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </FormSelect>
            <FormHelpText>{sTexts.pay_account_helper}</FormHelpText>
          </FormField>
          <FormField>
            <FormFieldLabel required>{sTexts.pay_date_label}</FormFieldLabel>
            <FormInput
              type="date"
              name="payment_date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </FormField>
          <FormField>
            <FormFieldLabel>{sTexts.pay_receipt_label}</FormFieldLabel>
            <FormInput
              type="text"
              name="receipt_number"
              maxLength={120}
              placeholder={sTexts.pay_receipt_placeholder}
            />
          </FormField>
          <FormField>
            <FormFieldLabel>{sTexts.pay_notes_label}</FormFieldLabel>
            <FormTextarea
              name="notes"
              rows={3}
              maxLength={500}
              placeholder={sTexts.pay_notes_placeholder}
            />
          </FormField>
          <ModalFooter
            onCancel={onClose}
            cancelLabel={sTexts.cancel_cta}
            submitLabel={sTexts.pay_submit_cta}
            pendingLabel={sTexts.submit_pending}
          />
        </form>
      ) : null}
    </Modal>
  );
}

// ───────────────────────────── Pay bulk ──────────────────────────────────────

function PayBulkModal({
  open,
  pending,
  selectedSettlements,
  selectedTotal,
  clubCurrencyCode,
  payableAccounts,
  onClose,
  onSubmit,
}: {
  open: boolean;
  pending: boolean;
  selectedSettlements: PayrollSettlement[];
  selectedTotal: number;
  clubCurrencyCode: string;
  payableAccounts: TreasuryAccount[];
  onClose: () => void;
  onSubmit: (fd: FormData) => Promise<void>;
}) {
  return (
    <Modal
      open={open}
      onClose={() => !pending && onClose()}
      title={sTexts.pay_bulk_modal_title}
      description={sTexts.pay_bulk_modal_description}
      size="md"
      closeDisabled={pending}
    >
      <form action={onSubmit} className="grid gap-4">
        {selectedSettlements.map((s) => (
          <input key={s.id} type="hidden" name="settlement_ids" value={s.id} />
        ))}
        <Card padding="compact" tone="muted">
          <CardBody>
            <div className="grid gap-1 text-sm">
              <span>
                <strong>{sTexts.bulk_summary_count}:</strong> {selectedSettlements.length}
              </span>
              <span>
                <strong>{sTexts.bulk_summary_total}:</strong>{" "}
                {formatAmount(selectedTotal, clubCurrencyCode)}
              </span>
            </div>
          </CardBody>
        </Card>
        <FormField>
          <FormFieldLabel required>{sTexts.pay_account_label}</FormFieldLabel>
          <FormSelect name="account_id" defaultValue="" required>
            <option value="" disabled>
              {sTexts.pay_account_placeholder}
            </option>
            {payableAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </FormSelect>
        </FormField>
        <FormField>
          <FormFieldLabel required>{sTexts.pay_date_label}</FormFieldLabel>
          <FormInput
            type="date"
            name="payment_date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
          />
        </FormField>
        <FormField>
          <FormFieldLabel>{sTexts.pay_bulk_notes_label}</FormFieldLabel>
          <FormTextarea name="notes" rows={3} maxLength={500} />
          <FormHelpText>{sTexts.pay_bulk_notes_helper}</FormHelpText>
        </FormField>
        <FormBanner variant="warning">{sTexts.pay_bulk_warning}</FormBanner>
        <ModalFooter
          onCancel={onClose}
          cancelLabel={sTexts.cancel_cta}
          submitLabel={sTexts.pay_bulk_submit_cta}
          pendingLabel={sTexts.submit_pending}
        />
      </form>
    </Modal>
  );
}

// ───────────────────────────── Annul ─────────────────────────────────────────

function AnnulModal({
  settlement,
  pending,
  onClose,
  onSubmit,
}: {
  settlement: PayrollSettlement | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (fd: FormData) => Promise<void>;
}) {
  return (
    <Modal
      open={settlement !== null}
      onClose={() => !pending && onClose()}
      title={sTexts.annul_modal_title}
      description={sTexts.annul_modal_description}
      size="sm"
      closeDisabled={pending}
    >
      {settlement ? (
        <form action={onSubmit} className="grid gap-4">
          <input type="hidden" name="settlement_id" value={settlement.id} />
          {settlement.status === "pagada" ? (
            <FormBanner variant="warning">{sTexts.annul_paid_warning}</FormBanner>
          ) : (
            <FormBanner variant="destructive">{sTexts.annul_warning}</FormBanner>
          )}
          <FormField>
            <FormFieldLabel>{sTexts.form_reason_label}</FormFieldLabel>
            <FormTextarea
              name="reason"
              rows={3}
              maxLength={500}
              placeholder={sTexts.form_reason_placeholder}
            />
          </FormField>
          <ModalFooter
            onCancel={onClose}
            cancelLabel={sTexts.cancel_cta}
            submitLabel={sTexts.annul_submit_cta}
            pendingLabel={sTexts.submit_pending}
            submitVariant="destructive"
          />
        </form>
      ) : null}
    </Modal>
  );
}

