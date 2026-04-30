"use client";

import type { SettlementActionResult } from "@/app/(dashboard)/rrhh/settlements/actions";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  DataTable,
  DataTableActions,
  DataTableAmount,
  DataTableBody,
  DataTableCell,
  DataTableChip,
  DataTableEmpty,
  DataTableHeadCell,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
import {
  FormField,
  FormFieldLabel,
  FormHelpText,
  FormInput,
  FormSection,
  FormTextarea,
} from "@/components/ui/modal-form";
import {
  formatPeriodLabel,
  type PayrollSettlement,
  type PayrollSettlementAdjustment,
} from "@/lib/domain/payroll-settlement";
import { useServerAction } from "@/lib/hooks/use-server-action";
import { formatAmount } from "@/lib/settlements-list-helpers";
import { texts } from "@/lib/texts";
import { AddAdjustmentForm } from "./add-adjustment-form";

const sTexts = texts.rrhh.settlements;

type SettlementDetailBodyProps = {
  settlement: PayrollSettlement;
  adjustments: PayrollSettlementAdjustment[];
  clubCurrencyCode: string;
  addAdjustmentAction: (formData: FormData) => Promise<SettlementActionResult>;
  deleteAdjustmentAction: (formData: FormData) => Promise<SettlementActionResult>;
  updateHoursOrNotesAction: (formData: FormData) => Promise<SettlementActionResult>;
};

export function SettlementDetailBody({
  settlement,
  adjustments,
  clubCurrencyCode,
  addAdjustmentAction,
  deleteAdjustmentAction,
  updateHoursOrNotesAction,
}: SettlementDetailBodyProps) {
  const { isPending: pending, runAction } = useServerAction<SettlementActionResult>("dashboard");

  const isHourly =
    settlement.remunerationType === "por_hora" ||
    settlement.remunerationType === "por_clase";

  return (
    <div className="grid gap-5">
      <Card padding="compact" tone="muted">
        <CardHeader
          eyebrow={`${formatPeriodLabel(settlement.periodYear, settlement.periodMonth)}`}
          title={settlement.staffMemberName ?? "—"}
          description={
            (settlement.salaryStructureName ?? "") +
            (settlement.salaryStructureRole ? ` · ${settlement.salaryStructureRole}` : "")
          }
        />
        <CardBody>
          <div className="grid gap-1 text-sm">
            <span>
              <strong>{sTexts.col_base}:</strong>{" "}
              {formatAmount(settlement.baseAmount, clubCurrencyCode)}
            </span>
            <span>
              <strong>{sTexts.adjustments_total_label}:</strong>{" "}
              {formatAmount(settlement.adjustmentsTotal, clubCurrencyCode)}
            </span>
            <span className="text-lg font-semibold text-foreground">
              <strong>{sTexts.col_total}:</strong>{" "}
              {formatAmount(settlement.totalAmount, clubCurrencyCode)}
            </span>
          </div>
        </CardBody>
      </Card>

      {isHourly ? (
        <form
          action={async (fd) => {
            await runAction(updateHoursOrNotesAction, fd);
          }}
          className="grid gap-3"
        >
          <input type="hidden" name="settlement_id" value={settlement.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            {settlement.remunerationType === "por_hora" ? (
              <FormField>
                <FormFieldLabel>{sTexts.hours_worked_label}</FormFieldLabel>
                <FormInput
                  type="number"
                  name="hours_worked"
                  inputMode="decimal"
                  min="0"
                  step="0.25"
                  defaultValue={settlement.hoursWorked}
                />
              </FormField>
            ) : (
              <FormField>
                <FormFieldLabel>{sTexts.classes_worked_label}</FormFieldLabel>
                <FormInput
                  type="number"
                  name="classes_worked"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  defaultValue={settlement.classesWorked}
                />
              </FormField>
            )}
            <div className="flex items-end">
              <button
                type="submit"
                disabled={pending}
                className={buttonClass({ variant: "secondary" })}
              >
                {sTexts.save_hours_cta}
              </button>
            </div>
          </div>
          <FormHelpText>{sTexts.hours_helper}</FormHelpText>
        </form>
      ) : null}

      {/* Adjustments */}
      <section className="grid gap-2">
        <FormSection>{sTexts.adjustments_section_title}</FormSection>

        {adjustments.length === 0 ? (
          <DataTableEmpty title={sTexts.adjustments_empty} />
        ) : (
          <DataTable density="compact" gridColumns="100px minmax(0,1fr) 110px 40px">
            <DataTableHeader>
              <DataTableHeadCell>{sTexts.adjustments_col_type}</DataTableHeadCell>
              <DataTableHeadCell>{sTexts.adjustments_col_concept}</DataTableHeadCell>
              <DataTableHeadCell align="right">
                {sTexts.adjustments_col_amount}
              </DataTableHeadCell>
              <DataTableHeadCell />
            </DataTableHeader>
            <DataTableBody>
              {adjustments.map((a) => (
                <DataTableRow key={a.id} density="compact" hoverReveal>
                  <DataTableCell>
                    <DataTableChip tone={a.type === "descuento" ? "expense" : "income"}>
                      {sTexts.adjustment_type_options[a.type]}
                    </DataTableChip>
                  </DataTableCell>
                  <DataTableCell>{a.concept}</DataTableCell>
                  <DataTableCell align="right">
                    <DataTableAmount
                      type={a.type === "descuento" ? "egreso" : "ingreso"}
                      currencyCode={clubCurrencyCode}
                      amount={a.amount}
                    />
                  </DataTableCell>
                  <DataTableCell align="right">
                    <DataTableActions>
                      <form
                        action={async (fd) => {
                          await runAction(deleteAdjustmentAction, fd);
                        }}
                        className="inline"
                      >
                        <input type="hidden" name="settlement_id" value={settlement.id} />
                        <input type="hidden" name="adjustment_id" value={a.id} />
                        <button
                          type="submit"
                          disabled={pending}
                          className={buttonClass({ variant: "destructive", size: "sm" })}
                          aria-label={sTexts.adjustment_delete_cta}
                        >
                          ×
                        </button>
                      </form>
                    </DataTableActions>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}

        <AddAdjustmentForm
          settlementId={settlement.id}
          onSubmit={(fd) => {
            void runAction(addAdjustmentAction, fd);
          }}
        />
      </section>

      {/* Notes */}
      <form
        action={async (fd) => {
          await runAction(updateHoursOrNotesAction, fd);
        }}
        className="grid gap-3"
      >
        <input type="hidden" name="settlement_id" value={settlement.id} />
        <FormField>
          <FormFieldLabel>{sTexts.notes_label}</FormFieldLabel>
          <FormTextarea
            name="notes"
            rows={3}
            maxLength={500}
            defaultValue={settlement.notes ?? ""}
            placeholder={sTexts.notes_placeholder}
          />
        </FormField>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className={buttonClass({ variant: "secondary" })}
          >
            {sTexts.save_notes_cta}
          </button>
        </div>
      </form>
    </div>
  );
}
