import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { texts } from "@/lib/texts";

const cardTexts = texts.dashboard.treasury.payroll;

function formatAmount(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

type Props = {
  count: number;
  totalAmount: number;
  clubCurrencyCode: string;
};

/**
 * US-45 · Card destacada en el dashboard de Tesorería con la cantidad
 * y monto total de liquidaciones aprobadas pendientes de pago.
 * Solo se renderiza si hay al menos una pendiente.
 */
export function TreasuryPayrollPendingCard({
  count,
  totalAmount,
  clubCurrencyCode,
}: Props) {
  return (
    <Card padding="comfortable">
      <CardHeader
        eyebrow={cardTexts.dashboard_card_eyebrow}
        title={cardTexts.dashboard_card_title}
        description={cardTexts.dashboard_card_description}
        action={
          <LinkButton href="/treasury/payroll" variant="primary" size="sm">
            {cardTexts.dashboard_card_cta}
          </LinkButton>
        }
      />
      <CardBody>
        <div className="flex items-baseline gap-3">
          <span className="text-h2 font-semibold text-foreground">{count}</span>
          <span className="text-sm text-muted-foreground">
            {formatAmount(totalAmount, clubCurrencyCode)}
          </span>
        </div>
        <div className="mt-3">
          <LinkButton href="/treasury/reports/payroll" variant="secondary" size="sm">
            {cardTexts.dashboard_card_reports_cta}
          </LinkButton>
        </div>
      </CardBody>
    </Card>
  );
}
