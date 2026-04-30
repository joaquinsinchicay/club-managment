"use client";

import { ChipButton } from "@/components/ui/chip";
import { Modal } from "@/components/ui/modal";
import { ModalFooter } from "@/components/ui/modal-footer";
import {
  FormField,
  FormFieldLabel,
  FormHelpText,
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/ui/modal-form";
import {
  formatLocalizedAmountInputOnBlur,
  formatLocalizedAmountInputOnFocus,
  parseLocalizedAmount,
  sanitizeLocalizedAmountInput,
} from "@/lib/amounts";
import { formatAmount, todayIso } from "@/lib/contract-detail-helpers";
import type { ContractDetailController } from "@/lib/hooks/use-contract-detail";
import type { StaffContract } from "@/lib/domain/staff-contract";
import { texts } from "@/lib/texts";

const cdTexts = texts.rrhh.contract_detail;
const scTexts = texts.rrhh.staff_contracts;

export function ReviseModal({
  contract,
  clubCurrencyCode,
  controller,
}: {
  contract: StaffContract;
  clubCurrencyCode: string;
  controller: ContractDetailController;
}) {
  const motivoOptions = cdTexts.revision_motivo_options as Record<string, string>;
  const motivoOptionsList = Object.entries(motivoOptions);
  const motivoLabel =
    controller.motivoKey && controller.motivoKey !== "other"
      ? motivoOptions[controller.motivoKey]
      : null;

  const parsedPercent = parseLocalizedAmount(controller.percentInput.replace(",", "."));
  const baseAmount = contract.currentAmount ?? 0;
  const computedAmount = (() => {
    if (controller.calcMode === "amount") {
      const parsed = parseLocalizedAmount(controller.amountInput);
      return parsed !== null && parsed > 0 ? parsed : null;
    }
    if (controller.calcMode === "percent") {
      if (parsedPercent === null || baseAmount <= 0) return null;
      return baseAmount * (1 + parsedPercent / 100);
    }
    return null;
  })();
  const composedReason = (() => {
    const parts: string[] = [];
    if (motivoLabel) parts.push(motivoLabel);
    if (controller.observations.trim()) parts.push(controller.observations.trim());
    return parts.join(" · ");
  })();
  const reviseSubmitDisabled = computedAmount === null || computedAmount <= 0;

  const activitySeparator = contract.salaryStructureActivityName ? " · " : "";
  const revisionContext = cdTexts.revision_context_template
    .replace("{staff}", contract.staffMemberName ?? scTexts.unknown_member)
    .replace("{role}", contract.salaryStructureRole ?? "—")
    .replace("{activitySeparator}", activitySeparator)
    .replace("{activity}", contract.salaryStructureActivityName ?? "");

  return (
    <Modal
      open={controller.reviseOpen}
      onClose={() => {
        if (controller.revisePending) return;
        controller.closeReviseModal();
      }}
      title={cdTexts.new_revision_modal_title}
      description={cdTexts.new_revision_modal_description}
      size="md"
      closeDisabled={controller.revisePending}
    >
      <form action={controller.handleReviseSubmit} className="grid gap-4">
        <input type="hidden" name="staff_contract_id" value={contract.id} />
        <input
          type="hidden"
          name="amount"
          value={computedAmount !== null ? computedAmount.toFixed(2) : ""}
        />
        <input type="hidden" name="reason" value={composedReason} />

        <p className="text-xs font-semibold uppercase tracking-card-eyebrow text-ds-pink-700">
          {revisionContext}
        </p>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-card border border-border bg-secondary-subtle px-4 py-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-card-eyebrow text-muted-foreground">
              {cdTexts.revision_preview_current_label}
            </span>
            <span className="break-words text-sm font-bold tabular-nums text-foreground">
              {formatAmount(baseAmount || null, clubCurrencyCode)}
            </span>
          </div>
          <span aria-hidden="true" className="text-muted-foreground">
            →
          </span>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-card-eyebrow text-ds-pink-700">
              {cdTexts.revision_preview_new_label}
            </span>
            <span className="break-words text-sm font-bold tabular-nums text-ds-pink-700">
              {computedAmount !== null
                ? formatAmount(computedAmount, clubCurrencyCode)
                : cdTexts.revision_preview_new_placeholder}
            </span>
          </div>
        </div>

        <FormField>
          <FormFieldLabel>{cdTexts.revision_calc_mode_label}</FormFieldLabel>
          <div className="flex flex-wrap gap-1.5">
            <ChipButton
              active={controller.calcMode === "percent"}
              onClick={() => controller.setCalcMode("percent")}
            >
              {cdTexts.revision_calc_mode_percent}
            </ChipButton>
            <ChipButton
              active={controller.calcMode === "amount"}
              onClick={() => controller.setCalcMode("amount")}
            >
              {cdTexts.revision_calc_mode_amount}
            </ChipButton>
          </div>
        </FormField>

        {controller.calcMode === "percent" ? (
          <FormField>
            <FormFieldLabel required>{cdTexts.revision_percent_label}</FormFieldLabel>
            <div className="flex gap-2">
              <span className="inline-flex h-11 shrink-0 items-center rounded-card border border-border bg-secondary-readonly px-4 text-sm font-semibold text-muted-foreground">
                %
              </span>
              <FormInput
                type="text"
                inputMode="decimal"
                value={controller.percentInput}
                onChange={(e) =>
                  controller.setPercentInput(e.target.value.replace(/[^\d.,-]/g, ""))
                }
                placeholder={cdTexts.revision_percent_placeholder}
                className="tabular-nums"
              />
            </div>
            <FormHelpText>{cdTexts.revision_percent_helper}</FormHelpText>
          </FormField>
        ) : (
          <FormField>
            <FormFieldLabel required>{cdTexts.form_amount_label}</FormFieldLabel>
            <div className="flex gap-2">
              <span className="inline-flex h-11 shrink-0 items-center rounded-card border border-border bg-secondary-readonly px-4 text-sm font-semibold text-muted-foreground">
                {clubCurrencyCode}
              </span>
              <FormInput
                type="text"
                inputMode="decimal"
                value={controller.amountInput}
                onChange={(e) =>
                  controller.setAmountInput(sanitizeLocalizedAmountInput(e.target.value))
                }
                onBlur={(e) =>
                  controller.setAmountInput(formatLocalizedAmountInputOnBlur(e.target.value))
                }
                onFocus={(e) =>
                  controller.setAmountInput(formatLocalizedAmountInputOnFocus(e.target.value))
                }
                onKeyDown={(e) => {
                  if (e.key === "-") e.preventDefault();
                }}
                placeholder={cdTexts.form_amount_placeholder}
                className="tabular-nums"
              />
            </div>
            <FormHelpText>
              {cdTexts.form_amount_helper.replace("{currency}", clubCurrencyCode)}
            </FormHelpText>
          </FormField>
        )}

        <FormField>
          <FormFieldLabel required>{cdTexts.form_effective_date_label}</FormFieldLabel>
          <FormInput
            type="date"
            name="effective_date"
            defaultValue={todayIso()}
            required
          />
          <FormHelpText>{cdTexts.form_effective_date_helper}</FormHelpText>
        </FormField>

        <FormField>
          <FormFieldLabel>{cdTexts.revision_motivo_label}</FormFieldLabel>
          <FormSelect
            value={controller.motivoKey}
            onChange={(e) => controller.setMotivoKey(e.target.value)}
          >
            <option value="">{cdTexts.revision_motivo_placeholder}</option>
            {motivoOptionsList.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
            <option value="other">{cdTexts.revision_motivo_other}</option>
          </FormSelect>
        </FormField>

        <FormField>
          <FormFieldLabel>{cdTexts.revision_observations_label}</FormFieldLabel>
          <FormTextarea
            value={controller.observations}
            onChange={(e) => controller.setObservations(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={cdTexts.revision_observations_placeholder}
          />
          <FormHelpText>{cdTexts.revision_observations_helper}</FormHelpText>
        </FormField>

        <ModalFooter
          onCancel={controller.closeReviseModal}
          cancelLabel={cdTexts.cancel_cta}
          submitLabel={cdTexts.new_revision_submit_cta}
          pendingLabel={cdTexts.submit_pending}
          submitDisabled={reviseSubmitDisabled}
        />
      </form>
    </Modal>
  );
}
