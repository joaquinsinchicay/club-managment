import { buttonClass } from "@/components/ui/button";
import { DataTableActions } from "@/components/ui/data-table";
import { texts } from "@/lib/texts";
import type { PayrollSettlement } from "@/lib/domain/payroll-settlement";

const sTexts = texts.rrhh.settlements;

export function RowActions({
  settlement,
  onDetail,
  onApprove,
  onPay,
  onReturn,
  onAnnul,
}: {
  settlement: PayrollSettlement;
  onDetail: (s: PayrollSettlement) => void;
  onApprove: (s: PayrollSettlement) => void;
  onPay: (s: PayrollSettlement) => void;
  onReturn: (s: PayrollSettlement) => void;
  onAnnul: (s: PayrollSettlement) => void;
}) {
  const s = settlement;
  return (
    <DataTableActions>
      {s.status === "generada" ? (
        <>
          <button
            type="button"
            onClick={() => onDetail(s)}
            className={buttonClass({ variant: "secondary", size: "sm" })}
          >
            {sTexts.action_detail}
          </button>
          <button
            type="button"
            onClick={() => onApprove(s)}
            className={buttonClass({ variant: "primary", size: "sm" })}
          >
            {sTexts.action_approve}
          </button>
        </>
      ) : null}
      {s.status === "aprobada_rrhh" ? (
        <>
          <button
            type="button"
            onClick={() => onPay(s)}
            className={buttonClass({ variant: "primary", size: "sm" })}
          >
            {sTexts.action_pay}
          </button>
          <button
            type="button"
            onClick={() => onReturn(s)}
            className={buttonClass({ variant: "secondary", size: "sm" })}
          >
            {sTexts.action_return}
          </button>
        </>
      ) : null}
      {s.status === "generada" || s.status === "aprobada_rrhh" ? (
        <button
          type="button"
          onClick={() => onAnnul(s)}
          className={buttonClass({ variant: "destructive", size: "sm" })}
        >
          {sTexts.action_annul}
        </button>
      ) : null}
      {s.status === "pagada" ? (
        <button
          type="button"
          onClick={() => onAnnul(s)}
          className={buttonClass({ variant: "destructive", size: "sm" })}
          title={sTexts.action_annul_paid_tooltip}
        >
          {sTexts.action_annul}
        </button>
      ) : null}
    </DataTableActions>
  );
}
