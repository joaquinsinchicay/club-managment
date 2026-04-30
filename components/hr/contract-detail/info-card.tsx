import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  formatIsoDate,
  resolvePaymentTypeLabel,
} from "@/lib/contract-detail-helpers";
import {
  formatContractCode,
  type StaffContract,
} from "@/lib/domain/staff-contract";
import { texts } from "@/lib/texts";
import { InfoItem } from "./info-item";

const cdTexts = texts.rrhh.contract_detail;

export function ContractInfoCard({ contract }: { contract: StaffContract }) {
  const contractCode = formatContractCode(contract.id);
  const paymentTypeLabel = resolvePaymentTypeLabel(contract.salaryStructurePaymentType);

  return (
    <Card padding="comfortable">
      <CardHeader title={cdTexts.info_title} description={cdTexts.info_description} divider />
      <CardBody>
        <dl className="grid gap-x-6 gap-y-4 text-sm grid-cols-2 lg:grid-cols-3">
          <InfoItem label={cdTexts.info_number_label} value={contractCode} />
          <InfoItem label={cdTexts.info_payment_type_label} value={paymentTypeLabel} />
          <InfoItem
            label={cdTexts.info_structure_label}
            value={contract.salaryStructureName}
          />
          <InfoItem
            label={cdTexts.info_division_label}
            value={
              contract.salaryStructureDivisions.length > 0
                ? contract.salaryStructureDivisions.join(" · ")
                : null
            }
          />
          <InfoItem label={cdTexts.info_role_label} value={contract.salaryStructureRole} />
          <InfoItem
            label={cdTexts.info_start_label}
            value={formatIsoDate(contract.startDate)}
          />
          <InfoItem
            label={cdTexts.info_end_label}
            value={
              contract.endDate
                ? formatIsoDate(contract.endDate)
                : cdTexts.info_end_indefinite
            }
          />
        </dl>
      </CardBody>
    </Card>
  );
}
