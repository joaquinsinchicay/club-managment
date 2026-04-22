"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { RrhhActionResult } from "@/app/(dashboard)/settings/rrhh/actions";
import { Button, buttonClass } from "@/components/ui/button";
import { ChipButton } from "@/components/ui/chip";
import {
  DataTable,
  DataTableActions,
  DataTableBody,
  DataTableCell,
  DataTableChip,
  DataTableHeadCell,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { ModalFooter } from "@/components/ui/modal-footer";
import {
  FormBanner,
  FormCheckboxCard,
  FormField,
  FormFieldLabel,
  FormHelpText,
  FormInput,
  FormReadonly,
  FormSelect,
  FormTextarea,
} from "@/components/ui/modal-form";
import { StatusBadge } from "@/components/ui/status-badge";
import type { SalaryStructure } from "@/lib/domain/salary-structure";
import type { StaffContract, StaffContractStatus } from "@/lib/domain/staff-contract";
import type { StaffMember } from "@/lib/domain/staff-member";
import { triggerClientFeedback } from "@/lib/client-feedback";
import { texts } from "@/lib/texts";

type StaffContractsTabProps = {
  contracts: StaffContract[];
  members: StaffMember[];
  structures: SalaryStructure[];
  clubCurrencyCode: string;
  canMutate: boolean;
  createAction: (formData: FormData) => Promise<RrhhActionResult>;
  updateAction: (formData: FormData) => Promise<RrhhActionResult>;
  finalizeAction: (formData: FormData) => Promise<RrhhActionResult>;
};

type StatusFilter = "all" | StaffContractStatus;

const scTexts = texts.rrhh.staff_contracts;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: scTexts.filter_all },
  { value: "vigente", label: scTexts.filter_vigente },
  { value: "finalizado", label: scTexts.filter_finalizado },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatAmount(amount: number | null | undefined, currencyCode: string): string {
  if (amount === null || amount === undefined) return "—";
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

export function StaffContractsTab({
  contracts,
  members,
  structures,
  clubCurrencyCode,
  canMutate,
  createAction,
  updateAction,
  finalizeAction,
}: StaffContractsTabProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("vigente");

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<StaffContract | null>(null);
  const [finalizing, setFinalizing] = useState<StaffContract | null>(null);

  const [createPending, setCreatePending] = useState(false);
  const [editPending, setEditPending] = useState(false);
  const [finalizePending, setFinalizePending] = useState(false);

  // For the create flow: only active members + active structures without active contract.
  const activeMembers = useMemo(
    () => members.filter((m) => m.status === "activo"),
    [members],
  );
  const availableStructures = useMemo(
    () =>
      structures.filter((s) => s.status === "activa" && !s.hasActiveContract),
    [structures],
  );

  const filtered = useMemo(() => {
    if (statusFilter === "all") return contracts;
    return contracts.filter((c) => c.status === statusFilter);
  }, [contracts, statusFilter]);

  async function runAction(
    action: (fd: FormData) => Promise<RrhhActionResult>,
    formData: FormData,
    onSuccess: () => void,
    setPending: (v: boolean) => void,
  ) {
    setPending(true);
    try {
      const result = await action(formData);
      triggerClientFeedback("settings", result.code);
      if (result.ok) {
        onSuccess();
        startTransition(() => router.refresh());
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="grid gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-lg font-semibold text-foreground">{scTexts.section_title}</h2>
          <p className="text-sm text-muted-foreground">{scTexts.section_description}</p>
        </div>
        {canMutate ? (
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            {scTexts.create_cta}
          </Button>
        ) : null}
      </header>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <ChipButton
            key={f.value}
            active={statusFilter === f.value}
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </ChipButton>
        ))}
      </div>

      {filtered.length === 0 ? (
        contracts.length === 0 ? (
          <EmptyState
            variant="dashed"
            title={scTexts.empty_title}
            description={scTexts.empty_description}
            action={
              canMutate ? (
                <Button variant="primary" onClick={() => setCreateOpen(true)}>
                  {scTexts.empty_cta}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <EmptyState
            variant="dashed"
            title={scTexts.empty_filter_title}
            description={scTexts.empty_filter_description}
          />
        )
      ) : (
        <DataTable
          density="comfortable"
          gridColumns="minmax(0,1.2fr) minmax(0,1.2fr) 120px 120px 120px 130px 120px 160px"
        >
          <DataTableHeader>
            <DataTableHeadCell>{scTexts.col_member}</DataTableHeadCell>
            <DataTableHeadCell>{scTexts.col_structure}</DataTableHeadCell>
            <DataTableHeadCell>{scTexts.col_start}</DataTableHeadCell>
            <DataTableHeadCell>{scTexts.col_end}</DataTableHeadCell>
            <DataTableHeadCell>{scTexts.col_amount_mode}</DataTableHeadCell>
            <DataTableHeadCell align="right">{scTexts.col_amount}</DataTableHeadCell>
            <DataTableHeadCell>{scTexts.col_status}</DataTableHeadCell>
            <DataTableHeadCell />
          </DataTableHeader>
          <DataTableBody>
            {filtered.map((c) => (
              <DataTableRow key={c.id} density="comfortable" hoverReveal>
                <DataTableCell>
                  <span className="font-medium text-foreground">
                    {c.staffMemberName ?? scTexts.unknown_member}
                  </span>
                </DataTableCell>
                <DataTableCell>
                  <span className="grid leading-tight">
                    <span className="font-medium text-foreground">
                      {c.salaryStructureName ?? scTexts.unknown_structure}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {c.salaryStructureRole ?? ""}
                      {c.salaryStructureActivityName ? ` · ${c.salaryStructureActivityName}` : ""}
                    </span>
                  </span>
                </DataTableCell>
                <DataTableCell>{c.startDate}</DataTableCell>
                <DataTableCell>{c.endDate ?? "—"}</DataTableCell>
                <DataTableCell>
                  <DataTableChip tone={c.usesStructureAmount ? "neutral" : "warning"}>
                    {c.usesStructureAmount
                      ? scTexts.amount_mode_structure
                      : scTexts.amount_mode_frozen}
                  </DataTableChip>
                </DataTableCell>
                <DataTableCell align="right">
                  <span className="font-semibold text-foreground">
                    {formatAmount(c.effectiveAmount, clubCurrencyCode)}
                  </span>
                </DataTableCell>
                <DataTableCell>
                  <StatusBadge
                    tone={c.status === "vigente" ? "success" : "neutral"}
                    label={scTexts.status_options[c.status]}
                  />
                </DataTableCell>
                <DataTableCell align="right">
                  {canMutate && c.status === "vigente" ? (
                    <DataTableActions>
                      <button
                        type="button"
                        onClick={() => setEditing(c)}
                        className={buttonClass({ variant: "secondary", size: "sm" })}
                      >
                        {scTexts.action_edit}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFinalizing(c)}
                        className={buttonClass({ variant: "destructive", size: "sm" })}
                      >
                        {scTexts.action_finalize}
                      </button>
                    </DataTableActions>
                  ) : null}
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}

      {/* Create */}
      <Modal
        open={createOpen}
        onClose={() => !createPending && setCreateOpen(false)}
        title={scTexts.create_modal_title}
        description={scTexts.create_modal_description}
        size="md"
        closeDisabled={createPending}
      >
        <CreateContractForm
          members={activeMembers}
          structures={availableStructures}
          clubCurrencyCode={clubCurrencyCode}
          onCancel={() => setCreateOpen(false)}
          onSubmit={(fd) =>
            runAction(createAction, fd, () => setCreateOpen(false), setCreatePending)
          }
        />
      </Modal>

      {/* Edit */}
      <Modal
        open={editing !== null}
        onClose={() => !editPending && setEditing(null)}
        title={scTexts.edit_modal_title}
        description={scTexts.edit_modal_description}
        size="md"
        closeDisabled={editPending}
      >
        {editing ? (
          <EditContractForm
            contract={editing}
            clubCurrencyCode={clubCurrencyCode}
            onCancel={() => setEditing(null)}
            onSubmit={(fd) =>
              runAction(updateAction, fd, () => setEditing(null), setEditPending)
            }
          />
        ) : null}
      </Modal>

      {/* Finalize */}
      <Modal
        open={finalizing !== null}
        onClose={() => !finalizePending && setFinalizing(null)}
        title={scTexts.finalize_modal_title}
        description={scTexts.finalize_modal_description}
        size="sm"
        closeDisabled={finalizePending}
      >
        {finalizing ? (
          <form
            action={(fd) =>
              runAction(finalizeAction, fd, () => setFinalizing(null), setFinalizePending)
            }
            className="grid gap-4"
          >
            <input type="hidden" name="staff_contract_id" value={finalizing.id} />
            <FormBanner variant="destructive">{scTexts.finalize_warning}</FormBanner>
            <FormField>
              <FormFieldLabel>{scTexts.form_member_label}</FormFieldLabel>
              <FormReadonly>{finalizing.staffMemberName ?? "—"}</FormReadonly>
            </FormField>
            <FormField>
              <FormFieldLabel required>{scTexts.form_end_date_label}</FormFieldLabel>
              <FormInput type="date" name="end_date" defaultValue={todayIso()} required />
              <FormHelpText>{scTexts.finalize_end_date_helper}</FormHelpText>
            </FormField>
            <FormField>
              <FormFieldLabel>{scTexts.form_reason_label}</FormFieldLabel>
              <FormTextarea
                name="reason"
                rows={3}
                maxLength={500}
                placeholder={scTexts.form_reason_placeholder}
              />
            </FormField>
            <ModalFooter
              onCancel={() => setFinalizing(null)}
              cancelLabel={scTexts.cancel_cta}
              submitLabel={scTexts.finalize_submit_cta}
              pendingLabel={scTexts.submit_pending}
              submitVariant="destructive"
            />
          </form>
        ) : null}
      </Modal>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Create form
// ---------------------------------------------------------------------------

type CreateContractFormProps = {
  members: StaffMember[];
  structures: SalaryStructure[];
  clubCurrencyCode: string;
  onCancel: () => void;
  onSubmit: (fd: FormData) => void;
};

function CreateContractForm({
  members,
  structures,
  clubCurrencyCode,
  onCancel,
  onSubmit,
}: CreateContractFormProps) {
  const [usesStructureAmount, setUsesStructureAmount] = useState(true);

  return (
    <form action={(fd) => onSubmit(fd)} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField>
          <FormFieldLabel required>{scTexts.form_member_label}</FormFieldLabel>
          <FormSelect name="staff_member_id" defaultValue="" required>
            <option value="" disabled>
              {scTexts.form_member_placeholder}
            </option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName} · {m.dni}
              </option>
            ))}
          </FormSelect>
          <FormHelpText>{scTexts.form_member_helper}</FormHelpText>
        </FormField>
        <FormField>
          <FormFieldLabel required>{scTexts.form_structure_label}</FormFieldLabel>
          <FormSelect name="salary_structure_id" defaultValue="" required>
            <option value="" disabled>
              {scTexts.form_structure_placeholder}
            </option>
            {structures.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.functionalRole}
              </option>
            ))}
          </FormSelect>
          <FormHelpText>{scTexts.form_structure_helper}</FormHelpText>
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField>
          <FormFieldLabel required>{scTexts.form_start_date_label}</FormFieldLabel>
          <FormInput type="date" name="start_date" defaultValue={todayIso()} required />
          <FormHelpText>{scTexts.form_start_date_helper}</FormHelpText>
        </FormField>
        <FormField>
          <FormFieldLabel>{scTexts.form_end_date_label}</FormFieldLabel>
          <FormInput type="date" name="end_date" />
          <FormHelpText>{scTexts.form_end_date_helper}</FormHelpText>
        </FormField>
      </div>

      <FormField>
        <FormCheckboxCard
          name="uses_structure_amount"
          value="true"
          checked={usesStructureAmount}
          onChange={setUsesStructureAmount}
          label={scTexts.form_uses_structure_amount_label}
          description={scTexts.form_uses_structure_amount_description}
        />
      </FormField>

      {!usesStructureAmount ? (
        <FormField>
          <FormFieldLabel required>{scTexts.form_agreed_amount_label}</FormFieldLabel>
          <FormInput
            type="number"
            name="agreed_amount"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            placeholder={scTexts.form_agreed_amount_placeholder}
            required
          />
          <FormHelpText>
            {scTexts.form_agreed_amount_helper.replace("{currency}", clubCurrencyCode)}
          </FormHelpText>
        </FormField>
      ) : null}

      <ModalFooter
        onCancel={onCancel}
        cancelLabel={scTexts.cancel_cta}
        submitLabel={scTexts.create_submit_cta}
        pendingLabel={scTexts.submit_pending}
      />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Edit form
// ---------------------------------------------------------------------------

type EditContractFormProps = {
  contract: StaffContract;
  clubCurrencyCode: string;
  onCancel: () => void;
  onSubmit: (fd: FormData) => void;
};

function EditContractForm({
  contract,
  clubCurrencyCode,
  onCancel,
  onSubmit,
}: EditContractFormProps) {
  const [usesStructureAmount, setUsesStructureAmount] = useState(contract.usesStructureAmount);
  const [frozenAmount, setFrozenAmount] = useState(
    contract.frozenAmount !== null ? contract.frozenAmount.toString() : "",
  );

  return (
    <form action={(fd) => onSubmit(fd)} className="grid gap-4">
      <input type="hidden" name="staff_contract_id" value={contract.id} />

      <FormField>
        <FormFieldLabel>{scTexts.form_member_label}</FormFieldLabel>
        <FormReadonly>{contract.staffMemberName ?? "—"}</FormReadonly>
        <FormHelpText>{scTexts.form_locked_field_hint}</FormHelpText>
      </FormField>

      <FormField>
        <FormFieldLabel>{scTexts.form_structure_label}</FormFieldLabel>
        <FormReadonly>
          {contract.salaryStructureName ?? "—"}
          {contract.salaryStructureRole ? ` · ${contract.salaryStructureRole}` : ""}
        </FormReadonly>
        <FormHelpText>{scTexts.form_locked_field_hint}</FormHelpText>
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField>
          <FormFieldLabel>{scTexts.form_start_date_label}</FormFieldLabel>
          <FormReadonly>{contract.startDate}</FormReadonly>
        </FormField>
        <FormField>
          <FormFieldLabel>{scTexts.form_end_date_label}</FormFieldLabel>
          <FormInput
            type="date"
            name="end_date"
            defaultValue={contract.endDate ?? ""}
          />
          <FormHelpText>{scTexts.form_end_date_helper}</FormHelpText>
        </FormField>
      </div>

      <FormField>
        <FormCheckboxCard
          name="uses_structure_amount"
          value="true"
          checked={usesStructureAmount}
          onChange={setUsesStructureAmount}
          label={scTexts.form_uses_structure_amount_label}
          description={scTexts.form_uses_structure_amount_description}
        />
      </FormField>

      {!usesStructureAmount ? (
        <FormField>
          <FormFieldLabel required>{scTexts.form_frozen_amount_label}</FormFieldLabel>
          <FormInput
            type="number"
            name="frozen_amount"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={frozenAmount}
            onChange={(e) => setFrozenAmount(e.target.value)}
            placeholder={scTexts.form_frozen_amount_placeholder}
            required
          />
          <FormHelpText>
            {scTexts.form_frozen_amount_helper.replace("{currency}", clubCurrencyCode)}
          </FormHelpText>
        </FormField>
      ) : null}

      <ModalFooter
        onCancel={onCancel}
        cancelLabel={scTexts.cancel_cta}
        submitLabel={scTexts.edit_submit_cta}
        pendingLabel={scTexts.submit_pending}
      />
    </form>
  );
}
