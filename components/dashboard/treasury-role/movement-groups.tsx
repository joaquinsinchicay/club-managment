import { SecretariaMovementList } from "@/components/dashboard/secretaria-movement-list";
import { EditIconButton } from "@/components/ui/edit-icon-button";
import { formatMovementGroupDate } from "@/lib/dates";
import { texts } from "@/lib/texts";
import type { TreasuryDashboardMovement } from "@/lib/domain/access";

export function TreasuryRoleMovementGroups({
  groups,
  onEditMovement,
}: {
  groups: Array<{ movementDate: string; movements: TreasuryDashboardMovement[] }>;
  onEditMovement: (movement: TreasuryDashboardMovement) => void;
}) {
  return (
    <div className="grid gap-4">
      {groups.map((group) => (
        <section key={group.movementDate} className="space-y-3">
          <div className="rounded-card border border-border bg-card px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-card-eyebrow text-muted-foreground">
              {texts.dashboard.treasury_role.date_label}
            </p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {formatMovementGroupDate(group.movementDate)}
            </p>
          </div>

          <SecretariaMovementList
            items={group.movements.map((movement) => ({
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
                  label={texts.dashboard.treasury_role.edit_movement_cta}
                />
              ) : undefined,
            }))}
          />
        </section>
      ))}
    </div>
  );
}
