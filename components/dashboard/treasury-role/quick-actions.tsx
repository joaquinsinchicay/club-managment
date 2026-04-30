import { Button } from "@/components/ui/button";
import { texts } from "@/lib/texts";

export function QuickActions({
  canCreateMovement,
  canCreateFxOperation,
  canCreateTransfer,
  pendingConciliationCount,
  onMovement,
  onFx,
  onTransfer,
  onConciliacion,
  onMovements,
}: {
  canCreateMovement: boolean;
  canCreateFxOperation: boolean;
  canCreateTransfer: boolean;
  pendingConciliationCount: number;
  onMovement: () => void;
  onFx: () => void;
  onTransfer: () => void;
  onConciliacion: () => void;
  onMovements: () => void;
}) {
  return (
    <div className="rounded-card border border-border bg-card p-4">
      <p className="text-sm font-semibold tracking-tight text-foreground">
        {texts.dashboard.treasury_role.quick_actions_title}
      </p>
      <p className="mt-0.5 text-meta text-muted-foreground">
        {texts.dashboard.treasury_role.quick_actions_description}
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {canCreateMovement && (
          <Button variant="dark" radius="btn" onClick={onMovement}>
            {texts.dashboard.treasury_role.movement_modal_cta}
          </Button>
        )}
        {canCreateFxOperation && (
          <Button variant="secondary" radius="btn" onClick={onFx}>
            {texts.dashboard.treasury_role.fx_modal_cta}
          </Button>
        )}
        {canCreateTransfer && (
          <Button variant="secondary" radius="btn" onClick={onTransfer}>
            {texts.dashboard.treasury_role.transfer_modal_cta}
          </Button>
        )}
        <Button variant="secondary" radius="btn" onClick={onConciliacion} className="relative">
          {texts.dashboard.treasury_role.consolidation_cta}
          {pendingConciliationCount > 0 && (
            <span className="absolute right-3 flex size-5 items-center justify-center rounded-full bg-ds-amber-050 text-eyebrow font-bold text-ds-amber-700">
              {pendingConciliationCount}
            </span>
          )}
        </Button>
        <Button variant="secondary" radius="btn" onClick={onMovements}>
          {texts.dashboard.treasury_role.view_movements_cta}
        </Button>
      </div>
    </div>
  );
}
