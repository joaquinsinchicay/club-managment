import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeadCell,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
import { getSettlementStatusTone } from "@/lib/labels";
import { formatAmount } from "@/lib/settlements-list-helpers";
import { texts } from "@/lib/texts";
import {
  formatPeriodLabel,
  type PayrollSettlement,
} from "@/lib/domain/payroll-settlement";
import { RowActions } from "./row-actions";

const sTexts = texts.rrhh.settlements;

export function SettlementsTable({
  settlements,
  clubCurrencyCode,
  canOperate,
  selectedIds,
  selectableIds,
  allSelected,
  onToggleAll,
  onToggleRow,
  onDetail,
  onApprove,
  onPay,
  onReturn,
  onAnnul,
}: {
  settlements: PayrollSettlement[];
  clubCurrencyCode: string;
  canOperate: boolean;
  selectedIds: string[];
  selectableIds: string[];
  allSelected: boolean;
  onToggleAll: () => void;
  onToggleRow: (id: string) => void;
  onDetail: (s: PayrollSettlement) => void;
  onApprove: (s: PayrollSettlement) => void;
  onPay: (s: PayrollSettlement) => void;
  onReturn: (s: PayrollSettlement) => void;
  onAnnul: (s: PayrollSettlement) => void;
}) {
  return (
    <DataTable
      density="compact"
      gridColumns="32px 90px minmax(0,1.2fr) minmax(0,1.2fr) 120px 140px 110px 180px"
    >
      <DataTableHeader>
        <DataTableHeadCell>
          <input
            type="checkbox"
            aria-label={sTexts.select_all_label}
            checked={allSelected}
            onChange={onToggleAll}
            disabled={selectableIds.length === 0}
            className="size-4 rounded border-border text-foreground focus:ring-foreground"
          />
        </DataTableHeadCell>
        <DataTableHeadCell>{sTexts.col_period}</DataTableHeadCell>
        <DataTableHeadCell>{sTexts.col_member}</DataTableHeadCell>
        <DataTableHeadCell>{sTexts.col_structure}</DataTableHeadCell>
        <DataTableHeadCell align="right">{sTexts.col_base}</DataTableHeadCell>
        <DataTableHeadCell align="right">{sTexts.col_total}</DataTableHeadCell>
        <DataTableHeadCell>{sTexts.col_status}</DataTableHeadCell>
        <DataTableHeadCell />
      </DataTableHeader>
      <DataTableBody>
        {settlements.map((s) => {
          const selectable = s.status === "generada" || s.status === "aprobada_rrhh";
          return (
            <DataTableRow key={s.id} density="compact" hoverReveal>
              <DataTableCell>
                {selectable ? (
                  <input
                    type="checkbox"
                    aria-label={`${sTexts.select_row_label} ${s.id}`}
                    checked={selectedIds.includes(s.id)}
                    onChange={() => onToggleRow(s.id)}
                    className="size-4 rounded border-border text-foreground focus:ring-foreground"
                  />
                ) : null}
              </DataTableCell>
              <DataTableCell>
                <span className="font-mono text-xs">
                  {formatPeriodLabel(s.periodYear, s.periodMonth)}
                </span>
              </DataTableCell>
              <DataTableCell>
                <span className="font-medium text-foreground">
                  {s.staffMemberName ?? "—"}
                </span>
              </DataTableCell>
              <DataTableCell>
                <span className="grid leading-tight">
                  <span className="text-foreground">{s.salaryStructureName ?? "—"}</span>
                  <span className="text-xs text-muted-foreground">
                    {s.salaryStructureRole ?? ""}
                    {s.salaryStructureActivityName
                      ? ` · ${s.salaryStructureActivityName}`
                      : ""}
                  </span>
                </span>
              </DataTableCell>
              <DataTableCell align="right">
                {formatAmount(s.baseAmount, clubCurrencyCode)}
                {s.requiresHoursInput ? (
                  <span className="ml-2 text-eyebrow font-semibold uppercase text-ds-amber-700">
                    {sTexts.requires_hours_badge}
                  </span>
                ) : null}
              </DataTableCell>
              <DataTableCell align="right">
                <span className="font-semibold text-foreground">
                  {formatAmount(s.totalAmount, clubCurrencyCode)}
                </span>
              </DataTableCell>
              <DataTableCell>
                <div className="flex flex-col items-start gap-0.5">
                  <Badge
                    tone={getSettlementStatusTone(s.status)}
                    label={sTexts.status_options[s.status]}
                  />
                  {s.status === "generada" && s.returnedByRole ? (
                    <span className="text-eyebrow font-medium text-ds-amber-700">
                      {sTexts.returned_by_template.replace(
                        "{role}",
                        sTexts.returned_role_options[s.returnedByRole],
                      )}
                    </span>
                  ) : null}
                </div>
              </DataTableCell>
              <DataTableCell align="right">
                {canOperate ? (
                  <RowActions
                    settlement={s}
                    onDetail={onDetail}
                    onApprove={onApprove}
                    onPay={onPay}
                    onReturn={onReturn}
                    onAnnul={onAnnul}
                  />
                ) : null}
              </DataTableCell>
            </DataTableRow>
          );
        })}
      </DataTableBody>
    </DataTable>
  );
}
