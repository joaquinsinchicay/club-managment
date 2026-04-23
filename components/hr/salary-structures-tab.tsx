"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type {
  RrhhActionResult,
} from "@/app/(dashboard)/settings/rrhh/actions";
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
  FormField,
  FormFieldLabel,
  FormHelpText,
  FormInput,
  FormReadonly,
  FormSection,
  FormSelect,
} from "@/components/ui/modal-form";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ClubActivity } from "@/lib/domain/access";
import {
  FUNCTIONAL_ROLES,
  SALARY_REMUNERATION_TYPES,
  type SalaryRemunerationType,
  type SalaryStructure,
  type SalaryStructureStatus,
  type SalaryStructureVersion,
} from "@/lib/domain/salary-structure";
import { triggerClientFeedback } from "@/lib/client-feedback";
import { texts } from "@/lib/texts";

type SalaryStructuresTabProps = {
  structures: SalaryStructure[];
  versionsByStructureId: Record<string, SalaryStructureVersion[]>;
  activities: ClubActivity[];
  clubCurrencyCode: string;
  canMutate: boolean;
  createAction: (formData: FormData) => Promise<RrhhActionResult>;
  updateAction: (formData: FormData) => Promise<RrhhActionResult>;
  updateAmountAction: (formData: FormData) => Promise<RrhhActionResult>;
};

type StatusFilter = "all" | SalaryStructureStatus;

const ssTexts = texts.rrhh.salary_structures;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: ssTexts.filter_all },
  { value: "activa", label: ssTexts.filter_active },
  { value: "inactiva", label: ssTexts.filter_inactive },
];

function todayIso(): string {
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

export function SalaryStructuresTab({
  structures,
  versionsByStructureId,
  activities,
  clubCurrencyCode,
  canMutate,
  createAction,
  updateAction,
  updateAmountAction,
}: SalaryStructuresTabProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [activityFilter, setActivityFilter] = useState<string>("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<SalaryStructure | null>(null);
  const [updatingAmount, setUpdatingAmount] = useState<SalaryStructure | null>(null);

  const [createPending, setCreatePending] = useState(false);
  const [editPending, setEditPending] = useState(false);
  const [amountPending, setAmountPending] = useState(false);

  const activeActivities = useMemo(
    () => activities.filter((a) => a.visibleForSecretaria || a.visibleForTesoreria),
    [activities],
  );

  const countsByStatus = useMemo(() => {
    const out = new Map<SalaryStructureStatus, number>();
    for (const s of structures) {
      out.set(s.status, (out.get(s.status) ?? 0) + 1);
    }
    return out;
  }, [structures]);

  const activeCount = countsByStatus.get("activa") ?? 0;
  const inactiveCount = countsByStatus.get("inactiva") ?? 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return structures.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (activityFilter !== "all" && s.activityId !== activityFilter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.functionalRole.toLowerCase().includes(q) ||
        (s.activityName ?? "").toLowerCase().includes(q)
      );
    });
  }, [structures, search, statusFilter, activityFilter]);

  async function handleCreateSubmit(formData: FormData) {
    setCreatePending(true);
    try {
      const result = await createAction(formData);
      triggerClientFeedback("settings", result.code);
      if (result.ok) {
        setCreateOpen(false);
        startTransition(() => router.refresh());
      }
    } finally {
      setCreatePending(false);
    }
  }

  async function handleEditSubmit(formData: FormData) {
    if (!editing) return;
    setEditPending(true);
    try {
      const result = await updateAction(formData);
      triggerClientFeedback("settings", result.code);
      if (result.ok) {
        setEditing(null);
        startTransition(() => router.refresh());
      }
    } finally {
      setEditPending(false);
    }
  }

  async function handleAmountSubmit(formData: FormData) {
    if (!updatingAmount) return;
    setAmountPending(true);
    try {
      const result = await updateAmountAction(formData);
      triggerClientFeedback("settings", result.code);
      if (result.ok) {
        setUpdatingAmount(null);
        startTransition(() => router.refresh());
      }
    } finally {
      setAmountPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-h2 font-bold text-foreground">{ssTexts.section_title}</h2>
        <p className="text-sm text-muted-foreground">{ssTexts.section_description}</p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {ssTexts.subtitle_counts
            .replace("{active}", String(activeCount))
            .replace("{inactive}", String(inactiveCount))}
        </p>
        {canMutate ? (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className={buttonClass({ variant: "primary", size: "sm" })}
          >
            {ssTexts.create_cta}
          </button>
        ) : null}
      </div>

      <div className="rounded-card border border-border bg-card px-4 py-3">
        <input
          type="search"
          placeholder={ssTexts.search_placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-btn border border-border bg-background px-3 py-2 text-sm"
        />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => {
            const count =
              f.value === "all"
                ? structures.length
                : countsByStatus.get(f.value as SalaryStructureStatus) ?? 0;
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
        <div className="mt-2 flex flex-wrap gap-1.5">
          {/* eslint-disable-next-line no-restricted-syntax -- Dropdown-chip (inline con ChipButtons): no existe primitivo dropdown-chip. Usa tokens canonicos rounded-chip + estilo inactive de ChipButton. */}
          <select
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value)}
            className="inline-flex items-center rounded-chip border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground hover:bg-secondary"
          >
            <option value="all">{ssTexts.filter_activity_all}</option>
            {activeActivities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <DataTableEmpty
          title={structures.length === 0 ? ssTexts.empty_title : ssTexts.empty_filter_title}
          description={
            structures.length === 0 ? ssTexts.empty_description : ssTexts.empty_filter_description
          }
          action={
            canMutate && structures.length === 0 ? (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className={buttonClass({ variant: "primary", size: "sm" })}
              >
                {ssTexts.create_full_cta}
              </button>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          density="comfortable"
          gridColumns="minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr) 120px 150px 120px 160px 44px"
        >
          <DataTableHeader>
            <DataTableHeadCell>{ssTexts.col_name}</DataTableHeadCell>
            <DataTableHeadCell>{ssTexts.col_role}</DataTableHeadCell>
            <DataTableHeadCell>{ssTexts.col_activity}</DataTableHeadCell>
            <DataTableHeadCell>{ssTexts.col_type}</DataTableHeadCell>
            <DataTableHeadCell align="right">{ssTexts.col_amount}</DataTableHeadCell>
            <DataTableHeadCell>{ssTexts.col_status}</DataTableHeadCell>
            <DataTableHeadCell>{ssTexts.col_contract}</DataTableHeadCell>
            <DataTableHeadCell />
          </DataTableHeader>

          <DataTableBody>
            {filtered.map((s) => (
              <DataTableRow key={s.id} density="comfortable" hoverReveal>
                <DataTableCell>
                  <span className="font-medium text-foreground">{s.name}</span>
                </DataTableCell>
                <DataTableCell>{s.functionalRole}</DataTableCell>
                <DataTableCell>{s.activityName ?? "—"}</DataTableCell>
                <DataTableCell>
                  <DataTableChip tone="neutral">
                    {ssTexts.remuneration_type_options[s.remunerationType]}
                  </DataTableChip>
                </DataTableCell>
                <DataTableCell align="right">
                  <span className="font-semibold text-foreground">
                    {formatAmount(s.currentAmount, clubCurrencyCode)}
                  </span>
                </DataTableCell>
                <DataTableCell>
                  <StatusBadge
                    tone={s.status === "activa" ? "success" : "neutral"}
                    label={ssTexts.status_options[s.status]}
                  />
                </DataTableCell>
                <DataTableCell>
                  {s.hasActiveContract ? (
                    <span className="text-xs text-foreground">
                      {s.activeContractStaffName ?? ssTexts.contract_assigned_generic}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {ssTexts.contract_vacant}
                    </span>
                  )}
                </DataTableCell>
                <DataTableCell align="right">
                  {canMutate ? (
                    <DataTableActions>
                      <button
                        type="button"
                        onClick={() => setUpdatingAmount(s)}
                        className={buttonClass({ variant: "secondary", size: "sm" })}
                      >
                        {ssTexts.action_update_amount}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(s)}
                        className={buttonClass({ variant: "secondary", size: "sm" })}
                      >
                        {ssTexts.action_edit}
                      </button>
                    </DataTableActions>
                  ) : null}
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => !createPending && setCreateOpen(false)}
        title={ssTexts.create_modal_title}
        description={ssTexts.create_modal_description}
        size="md"
        closeDisabled={createPending}
      >
        <form action={handleCreateSubmit} className="grid gap-4">
          <StructureFormFields
            activities={activeActivities}
            mode="create"
          />
          <ModalFooter
            onCancel={() => setCreateOpen(false)}
            cancelLabel={ssTexts.cancel_cta}
            submitLabel={ssTexts.create_submit_cta}
            pendingLabel={ssTexts.submit_pending}
          />
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={editing !== null}
        onClose={() => !editPending && setEditing(null)}
        title={ssTexts.edit_modal_title}
        description={ssTexts.edit_modal_description}
        size="md"
        closeDisabled={editPending}
      >
        {editing ? (
          <form action={handleEditSubmit} className="grid gap-4">
            <input type="hidden" name="salary_structure_id" value={editing.id} />
            <StructureFormFields
              mode="edit"
              activities={activeActivities}
              structure={editing}
            />
            <ModalFooter
              onCancel={() => setEditing(null)}
              cancelLabel={ssTexts.cancel_cta}
              submitLabel={ssTexts.edit_submit_cta}
              pendingLabel={ssTexts.submit_pending}
            />
          </form>
        ) : null}
      </Modal>

      {/* Amount update modal */}
      <Modal
        open={updatingAmount !== null}
        onClose={() => !amountPending && setUpdatingAmount(null)}
        title={ssTexts.amount_modal_title}
        description={ssTexts.amount_modal_description}
        size="md"
        closeDisabled={amountPending}
      >
        {updatingAmount ? (
          <UpdateAmountForm
            structure={updatingAmount}
            versions={versionsByStructureId[updatingAmount.id] ?? []}
            currencyCode={clubCurrencyCode}
            onSubmit={handleAmountSubmit}
            onCancel={() => setUpdatingAmount(null)}
          />
        ) : null}
      </Modal>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Update amount sub-form
 * ────────────────────────────────────────────────────────────────────────── */

type UpdateAmountFormProps = {
  structure: SalaryStructure;
  versions: SalaryStructureVersion[];
  currencyCode: string;
  onSubmit: (formData: FormData) => Promise<void>;
  onCancel: () => void;
};

function UpdateAmountForm({
  structure,
  versions,
  currencyCode,
  onSubmit,
  onCancel,
}: UpdateAmountFormProps) {
  const [amountInput, setAmountInput] = useState("");

  return (
    <form action={onSubmit} className="grid gap-4">
      <input type="hidden" name="salary_structure_id" value={structure.id} />

      <FormField>
        <FormFieldLabel>{ssTexts.amount_current_label}</FormFieldLabel>
        <FormReadonly>{formatAmount(structure.currentAmount, currencyCode)}</FormReadonly>
      </FormField>

      <FormField>
        <FormFieldLabel required>{ssTexts.amount_new_label}</FormFieldLabel>
        <FormInput
          type="text"
          name="amount"
          inputMode="decimal"
          required
          value={amountInput}
          onChange={(e) => setAmountInput(sanitizeLocalizedAmountInput(e.target.value))}
          onBlur={(e) => setAmountInput(formatLocalizedAmountInputOnBlur(e.target.value))}
          onFocus={(e) => setAmountInput(formatLocalizedAmountInputOnFocus(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "-") e.preventDefault();
          }}
          placeholder={ssTexts.amount_new_placeholder}
          className="tabular-nums"
        />
        <FormHelpText>{ssTexts.amount_new_helper}</FormHelpText>
      </FormField>

      <FormField>
        <FormFieldLabel required>{ssTexts.effective_date_label}</FormFieldLabel>
        <FormInput type="date" name="effective_date" defaultValue={todayIso()} required />
        <FormHelpText>{ssTexts.effective_date_helper}</FormHelpText>
      </FormField>

      <AmountHistory versions={versions} currencyCode={currencyCode} />

      <ModalFooter
        onCancel={onCancel}
        cancelLabel={ssTexts.cancel_cta}
        submitLabel={ssTexts.amount_submit_cta}
        pendingLabel={ssTexts.submit_pending}
        submitDisabled={amountInput.trim().length === 0}
      />
    </form>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Shared form fields
 * ────────────────────────────────────────────────────────────────────────── */

type StructureFormFieldsProps = {
  mode: "create" | "edit";
  activities: ClubActivity[];
  structure?: SalaryStructure;
};

function StructureFormFields({
  mode,
  activities,
  structure,
}: StructureFormFieldsProps) {
  const isEdit = mode === "edit";

  return (
    <>
      <FormField>
        <FormFieldLabel required>{ssTexts.form_name_label}</FormFieldLabel>
        <FormInput
          type="text"
          name="name"
          defaultValue={structure?.name ?? ""}
          placeholder={ssTexts.form_name_placeholder}
          minLength={2}
          maxLength={120}
          required
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField>
          <FormFieldLabel required>{ssTexts.form_role_label}</FormFieldLabel>
          {isEdit ? (
            <FormReadonly>{structure?.functionalRole}</FormReadonly>
          ) : (
            <FormSelect name="functional_role" defaultValue="" required>
              <option value="" disabled>
                {ssTexts.form_role_placeholder}
              </option>
              {FUNCTIONAL_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </FormSelect>
          )}
          {isEdit ? (
            <FormHelpText>{ssTexts.form_locked_field_hint}</FormHelpText>
          ) : (
            <FormHelpText>{ssTexts.form_role_helper}</FormHelpText>
          )}
        </FormField>

        <FormField>
          <FormFieldLabel>{ssTexts.form_activity_label}</FormFieldLabel>
          {isEdit ? (
            <FormReadonly>{structure?.activityName ?? "—"}</FormReadonly>
          ) : (
            <FormSelect name="activity_id" defaultValue="">
              <option value="">{ssTexts.form_activity_placeholder}</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </FormSelect>
          )}
          {isEdit ? (
            <FormHelpText>{ssTexts.form_locked_field_hint}</FormHelpText>
          ) : null}
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField>
          <FormFieldLabel required>{ssTexts.form_remuneration_type_label}</FormFieldLabel>
          <FormSelect
            name="remuneration_type"
            defaultValue={structure?.remunerationType ?? ""}
            required
          >
            <option value="" disabled>
              {ssTexts.form_remuneration_type_placeholder}
            </option>
            {SALARY_REMUNERATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {ssTexts.remuneration_type_options[t]}
              </option>
            ))}
          </FormSelect>
        </FormField>

        <FormField>
          <FormFieldLabel>{ssTexts.form_workload_hours_label}</FormFieldLabel>
          <FormInput
            type="number"
            name="workload_hours"
            inputMode="decimal"
            min="0"
            step="0.5"
            defaultValue={structure?.workloadHours ?? ""}
            placeholder={ssTexts.form_workload_hours_placeholder}
          />
          <FormHelpText>{ssTexts.form_workload_hours_helper}</FormHelpText>
        </FormField>
      </div>

      {isEdit ? (
        <FormField>
          <FormFieldLabel required>{ssTexts.form_status_label}</FormFieldLabel>
          <FormSelect name="status" defaultValue={structure?.status ?? "activa"} required>
            <option value="activa">{ssTexts.status_options.activa}</option>
            <option value="inactiva">{ssTexts.status_options.inactiva}</option>
          </FormSelect>
          <FormHelpText>{ssTexts.form_status_helper}</FormHelpText>
        </FormField>
      ) : (
        <input type="hidden" name="status" value="activa" />
      )}
    </>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Amount history table
 * ────────────────────────────────────────────────────────────────────────── */

type AmountHistoryProps = {
  versions: SalaryStructureVersion[];
  currencyCode: string;
};

function AmountHistory({ versions, currencyCode }: AmountHistoryProps) {
  if (versions.length === 0) {
    return null;
  }
  return (
    <section className="grid gap-2">
      <FormSection>{ssTexts.amount_history_title}</FormSection>
      <DataTable density="compact" gridColumns="minmax(0,1fr) 130px 130px 90px">
        <DataTableHeader>
          <DataTableHeadCell align="right">{ssTexts.amount_history_amount}</DataTableHeadCell>
          <DataTableHeadCell>{ssTexts.amount_history_start}</DataTableHeadCell>
          <DataTableHeadCell>{ssTexts.amount_history_end}</DataTableHeadCell>
          <DataTableHeadCell />
        </DataTableHeader>
        <DataTableBody>
          {versions.map((v) => (
            <DataTableRow key={v.id} density="compact">
              <DataTableCell align="right">
                <span className="font-semibold text-foreground">
                  {formatAmount(v.amount, currencyCode)}
                </span>
              </DataTableCell>
              <DataTableCell>{v.startDate}</DataTableCell>
              <DataTableCell>{v.endDate ?? "—"}</DataTableCell>
              <DataTableCell>
                {v.endDate === null ? (
                  <StatusBadge tone="success" label={ssTexts.amount_history_current_badge} />
                ) : null}
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </section>
  );
}
