"use client";

import { Modal } from "@/components/ui/modal";
import { ModalFooter } from "@/components/ui/modal-footer";
import {
  FormBanner,
  FormField,
  FormFieldLabel,
  FormHelpText,
  FormInput,
  FormReadonly,
  FormTextarea,
} from "@/components/ui/modal-form";
import { todayIso } from "@/lib/contract-detail-helpers";
import type { StaffContract } from "@/lib/domain/staff-contract";
import { texts } from "@/lib/texts";

const cdTexts = texts.rrhh.contract_detail;
const scTexts = texts.rrhh.staff_contracts;

export function FinalizeModal({
  contract,
  open,
  pending,
  onClose,
  onSubmit,
}: {
  contract: StaffContract;
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  return (
    <Modal
      open={open}
      onClose={() => {
        if (pending) return;
        onClose();
      }}
      title={cdTexts.finalize_modal_title}
      description={cdTexts.finalize_modal_description}
      size="sm"
      closeDisabled={pending}
    >
      <form action={onSubmit} className="grid gap-4">
        <input type="hidden" name="staff_contract_id" value={contract.id} />
        <FormBanner variant="destructive">{cdTexts.finalize_warning}</FormBanner>
        <FormField>
          <FormFieldLabel>{scTexts.form_member_label}</FormFieldLabel>
          <FormReadonly>{contract.staffMemberName ?? "—"}</FormReadonly>
        </FormField>
        <FormField>
          <FormFieldLabel required>{cdTexts.finalize_end_date_label}</FormFieldLabel>
          <FormInput type="date" name="end_date" defaultValue={todayIso()} required />
          <FormHelpText>{cdTexts.finalize_end_date_helper}</FormHelpText>
        </FormField>
        <FormField>
          <FormFieldLabel>{cdTexts.finalize_reason_label}</FormFieldLabel>
          <FormTextarea
            name="reason"
            rows={3}
            maxLength={500}
            placeholder={cdTexts.finalize_reason_placeholder}
          />
        </FormField>
        <ModalFooter
          onCancel={onClose}
          cancelLabel={cdTexts.cancel_cta}
          submitLabel={cdTexts.finalize_modal_submit_cta}
          pendingLabel={cdTexts.submit_pending}
          submitVariant="destructive"
        />
      </form>
    </Modal>
  );
}
