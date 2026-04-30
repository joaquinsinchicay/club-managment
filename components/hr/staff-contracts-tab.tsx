"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";

import type { RrhhActionResult } from "@/app/(dashboard)/settings/rrhh/actions";
import { CreateContractForm } from "@/components/hr/create-contract-form";
import {
  formatLocalizedAmountInputOnBlur,
  formatLocalizedAmountInputOnFocus,
  sanitizeLocalizedAmountInput,
} from "@/lib/amounts";
import { buttonClass } from "@/components/ui/button";
import { ChipButton } from "@/components/ui/chip";
import {
  DataTable,
  DataTableActions,
  DataTableBody,
  DataTableCell,
  DataTableChip,
  DataTableEmpty,
  DataTableHeadCell,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { ModalFooter } from "@/components/ui/modal-footer";
import {
  FormBanner,
  FormField,
  FormFieldLabel,
  FormHelpText,
  FormInput,
  FormReadonly,
  FormSelect,
  FormTextarea,
} from "@/components/ui/modal-form";
import { Badge } from "@/components/ui/badge";
import type { SalaryStructure } from "@/lib/domain/salary-structure";
import {
  formatContractCode,
  type StaffContract,
  type StaffContractStatus,
} from "@/lib/domain/staff-contract";
import type { StaffMember } from "@/lib/domain/staff-member";
import { useFilteredList } from "@/lib/hooks/use-filtered-list";
import { useFormModal } from "@/lib/hooks/use-form-modal";
import { texts } from "@/lib/texts";

type StaffContractsTabProps = {
  contracts: StaffContract[];
  members: StaffMember[];
  structures: SalaryStructure[];
  clubCurrencyCode: string;
  canMutate: boolean;
  createAction: (formData: FormData) => Promise<RrhhActionResult>;
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
  finalizeAction,
}: StaffContractsTabProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("vigente");

  // Hooks canonicos: useFormModal encapsula isOpen/target + isPending +
  // handleSubmit que cierra el modal antes del await.
  const create = useFormModal<void, RrhhActionResult>({
    feedbackDomain: "settings",
    action: createAction,
  });
  const finalize = useFormModal<StaffContract, RrhhActionResult>({
    feedbackDomain: "settings",
    action: finalizeAction,
  });

  // Para el create flow: todos los colaboradores (no hay concepto de
  // activo/inactivo) + estructuras activas sin contrato vigente.
  const activeMembers = members;
  const availableStructures = useMemo(
    () =>
      structures.filter((s) => s.status === "activa" && !s.hasActiveContract),
    [structures],
  );

  const countsByStatus = useMemo(() => {
    const out = new Map<StaffContractStatus, number>();
    for (const c of contracts) {
      out.set(c.status, (out.get(c.status) ?? 0) + 1);
    }
    return out;
  }, [contracts]);
  const vigenteCount = countsByStatus.get("vigente") ?? 0;
  const finalizadoCount = countsByStatus.get("finalizado") ?? 0;

  const filterPredicate = useCallback(
    (c: StaffContract) =>
      statusFilter === "all" ? true : c.status === statusFilter,
    [statusFilter],
  );
  const searchPredicate = useCallback(
    (c: StaffContract, q: string) =>
      (c.staffMemberName ?? "").toLowerCase().includes(q) ||
      (c.salaryStructureName ?? "").toLowerCase().includes(q) ||
      (c.salaryStructureRole ?? "").toLowerCase().includes(q),
    [],
  );
  const { search, setSearch, filtered } = useFilteredList({
    items: contracts,
    searchPredicate,
    filterPredicate,
  });

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-h2 font-bold text-foreground">{scTexts.section_title}</h2>
        <p className="text-sm text-muted-foreground">{scTexts.section_description}</p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {scTexts.subtitle_counts
            .replace("{vigente}", String(vigenteCount))
            .replace("{finalizado}", String(finalizadoCount))}
        </p>
        {canMutate ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/rrhh/contracts/bulk-revision"
              className={buttonClass({ variant: "secondary", size: "sm" })}
            >
              {scTexts.bulk_revision_cta}
            </Link>
            <button
              type="button"
              onClick={() => create.open()}
              className={buttonClass({ variant: "primary", size: "sm" })}
            >
              {scTexts.create_cta}
            </button>
          </div>
        ) : null}
      </div>

      <div className="rounded-card border border-border bg-card px-4 py-3">
        <input
          type="search"
          placeholder={scTexts.search_placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-btn border border-border bg-background px-3 py-2 text-sm"
        />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => {
            const count =
              f.value === "all"
                ? contracts.length
                : countsByStatus.get(f.value as StaffContractStatus) ?? 0;
            return (
              <ChipButton
                key={f.value}
                active={statusFilter === f.value}
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label} · {count}
              </ChipButton>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <DataTableEmpty
          title={contracts.length === 0 ? scTexts.empty_title : scTexts.empty_filter_title}
          description={
            contracts.length === 0 ? scTexts.empty_description : scTexts.empty_filter_description
          }
          action={
            canMutate && contracts.length === 0 ? (
              <button
                type="button"
                onClick={() => create.open()}
                className={buttonClass({ variant: "primary", size: "sm" })}
              >
                {scTexts.create_full_cta}
              </button>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          density="comfortable"
          gridColumns="minmax(0,1.3fr) minmax(0,1.3fr) 120px 120px 140px 110px 92px"
        >
          <DataTableHeader>
            <DataTableHeadCell>{scTexts.col_member}</DataTableHeadCell>
            <DataTableHeadCell>{scTexts.col_structure}</DataTableHeadCell>
            <DataTableHeadCell>{scTexts.col_start}</DataTableHeadCell>
            <DataTableHeadCell>{scTexts.col_end}</DataTableHeadCell>
            <DataTableHeadCell align="right">{scTexts.col_amount}</DataTableHeadCell>
            <DataTableHeadCell>{scTexts.col_status}</DataTableHeadCell>
            <DataTableHeadCell />
          </DataTableHeader>
          <DataTableBody>
            {filtered.map((c) => (
              <DataTableRow key={c.id} density="comfortable" hoverReveal>
                <DataTableCell>
                  <span className="grid leading-tight">
                    <Link
                      href={`/rrhh/contracts/${c.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {c.staffMemberName ?? scTexts.unknown_member}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {formatContractCode(c.id)}
                    </span>
                  </span>
                </DataTableCell>
                <DataTableCell>
                  <span className="font-medium text-foreground">
                    {c.salaryStructureName ?? scTexts.unknown_structure}
                  </span>
                </DataTableCell>
                <DataTableCell>{c.startDate}</DataTableCell>
                <DataTableCell>{c.endDate ?? "—"}</DataTableCell>
                <DataTableCell align="right">
                  <span className="font-semibold text-foreground">
                    {formatAmount(c.currentAmount, clubCurrencyCode)}
                  </span>
                </DataTableCell>
                <DataTableCell>
                  <Badge
                    tone={c.status === "vigente" ? "success" : "neutral"}
                    label={scTexts.status_options[c.status]}
                  />
                </DataTableCell>
                <DataTableCell align="right">
                  <DataTableActions>
                    <ViewIconLink
                      href={`/rrhh/contracts/${c.id}`}
                      label={scTexts.action_view_detail}
                    />
                    {canMutate && c.status === "vigente" ? (
                      <FinalizeIconButton
                        label={scTexts.action_finalize}
                        onClick={() => finalize.openWith(c)}
                      />
                    ) : null}
                  </DataTableActions>
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}

      {/* Create */}
      <Modal
        open={create.isOpen}
        onClose={create.close}
        title={scTexts.create_modal_title}
        description={scTexts.create_modal_description}
        size="md"
        closeDisabled={create.isPending}
      >
        <CreateContractForm
          members={activeMembers}
          structures={availableStructures}
          clubCurrencyCode={clubCurrencyCode}
          onCancel={create.close}
          onSubmit={create.handleSubmit}
        />
      </Modal>

      {/* Finalize */}
      <Modal
        open={finalize.isOpen}
        onClose={finalize.close}
        title={scTexts.finalize_modal_title}
        description={scTexts.finalize_modal_description}
        size="sm"
        closeDisabled={finalize.isPending}
      >
        {finalize.target ? (
          <form action={finalize.handleSubmit} className="grid gap-4">
            <input type="hidden" name="staff_contract_id" value={finalize.target.id} />
            <FormBanner variant="destructive">{scTexts.finalize_warning}</FormBanner>
            <FormField>
              <FormFieldLabel>{scTexts.form_member_label}</FormFieldLabel>
              <FormReadonly>{finalize.target.staffMemberName ?? "—"}</FormReadonly>
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
              onCancel={finalize.close}
              cancelLabel={scTexts.cancel_cta}
              submitLabel={scTexts.finalize_submit_cta}
              pendingLabel={scTexts.submit_pending}
              submitVariant="destructive"
            />
          </form>
        ) : null}
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ViewIconLink — link a la ficha del contrato
// ---------------------------------------------------------------------------

type ViewIconLinkProps = {
  href: string;
  label: string;
};

function ViewIconLink({ href, label }: ViewIconLinkProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="inline-flex size-8 items-center justify-center rounded-btn border border-border bg-card text-muted-foreground transition hover:bg-secondary hover:text-foreground"
    >
      <svg
        className="size-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z"
        />
        <circle cx="12" cy="12" r="3" strokeWidth={2} />
      </svg>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// FinalizeIconButton — complemento destructivo de EditIconButton
// ---------------------------------------------------------------------------

type FinalizeIconButtonProps = Omit<
  React.ComponentPropsWithoutRef<"button">,
  "children"
> & {
  label: string;
};

function FinalizeIconButton({ label, className, ...props }: FinalizeIconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={[
        "inline-flex size-8 items-center justify-center rounded-btn border border-destructive/30 bg-destructive/10 text-destructive transition hover:bg-destructive/20",
        className ?? "",
      ].join(" ")}
      {...props}
    >
      <svg
        className="size-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" strokeWidth={2} />
        <line x1="5" y1="5" x2="19" y2="19" strokeWidth={2} strokeLinecap="round" />
      </svg>
    </button>
  );
}

