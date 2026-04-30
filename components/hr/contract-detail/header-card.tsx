import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTableChip } from "@/components/ui/data-table";
import { LinkButton } from "@/components/ui/link-button";
import {
  formatIsoDate,
  resolvePaymentTypeLabel,
  resolveRemunerationTypeLabel,
} from "@/lib/contract-detail-helpers";
import {
  formatContractCode,
  type StaffContract,
} from "@/lib/domain/staff-contract";
import { texts } from "@/lib/texts";

const cdTexts = texts.rrhh.contract_detail;
const scTexts = texts.rrhh.staff_contracts;

export function ContractHeaderCard({
  contract,
  canMutate,
  onRevise,
  onFinalize,
}: {
  contract: StaffContract;
  canMutate: boolean;
  onRevise: () => void;
  onFinalize: () => void;
}) {
  const contractCode = formatContractCode(contract.id);
  const isVigente = contract.status === "vigente";
  const canNewRevision = canMutate && isVigente;
  const canFinalize = canMutate && isVigente;
  const paymentTypeLabel = resolvePaymentTypeLabel(contract.salaryStructurePaymentType);
  const remunerationTypeLabel = resolveRemunerationTypeLabel(
    contract.salaryStructureRemunerationType,
  );
  const headerTitle = isVigente
    ? cdTexts.header_vigente_since_template
        .replace("{code}", contractCode)
        .replace("{date}", formatIsoDate(contract.startDate))
    : cdTexts.header_finalizado_since_template
        .replace("{code}", contractCode)
        .replace("{date}", formatIsoDate(contract.finalizedAt ?? contract.endDate));
  const divisionsLabel =
    contract.salaryStructureDivisions.length > 0
      ? contract.salaryStructureDivisions.join(" · ")
      : cdTexts.info_value_fallback;

  return (
    <Card padding="comfortable">
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-4">
          <Avatar
            name={contract.staffMemberName ?? scTexts.unknown_member}
            size="lg"
            tone="neutral"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-card-eyebrow text-muted-foreground">
              {headerTitle}
            </p>
            <Link
              href={`/rrhh/staff/${contract.staffMemberId}`}
              className="text-h2 font-bold text-foreground hover:underline"
            >
              {contract.staffMemberName ?? scTexts.unknown_member}
            </Link>
            <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              {contract.salaryStructureRole ? (
                <span>{contract.salaryStructureRole}</span>
              ) : null}
              {contract.salaryStructureActivityName ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{contract.salaryStructureActivityName}</span>
                </>
              ) : null}
              {divisionsLabel !== cdTexts.info_value_fallback ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{divisionsLabel}</span>
                </>
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge
                tone={isVigente ? "success" : "neutral"}
                label={scTexts.status_options[contract.status]}
              />
              {paymentTypeLabel ? (
                <DataTableChip tone="neutral">{paymentTypeLabel}</DataTableChip>
              ) : null}
              {remunerationTypeLabel ? (
                <DataTableChip tone="neutral">{remunerationTypeLabel}</DataTableChip>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canNewRevision ? (
            <button
              type="button"
              onClick={onRevise}
              className={buttonClass({ variant: "accent-rrhh", size: "md" })}
            >
              {cdTexts.new_revision_cta_plus}
            </button>
          ) : null}
          <LinkButton
            href={`/rrhh/staff/${contract.staffMemberId}`}
            variant="secondary"
            size="md"
          >
            {cdTexts.view_staff_profile_cta}
          </LinkButton>
          {canFinalize ? (
            <button
              type="button"
              onClick={onFinalize}
              className={buttonClass({ variant: "destructive-outline", size: "md" })}
            >
              {cdTexts.finalize_contract_cta}
            </button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
