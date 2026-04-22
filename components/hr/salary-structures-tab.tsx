"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type {
  RrhhActionResult,
} from "@/app/(dashboard)/settings/rrhh/actions";
import { Button, buttonClass } from "@/components/ui/button";
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
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { ModalFooter } from "@/components/ui/modal-footer";
import {
  FormField,
  FormFieldLabel,
  FormHelpText,
  FormInput,
  FormReadonly,
  FormSelect,
} from "@/components/ui/modal-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { SettingsTabShell } from "@/components/settings/settings-tab-shell";
import type { ClubActivity } from "@/lib/domain/access";
import {
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
    <SettingsTabShell
      searchPlaceholder={ssTexts.search_placeholder}
      searchValue={search}
      onSearch={setSearch}
      ctaLabel={canMutate ? ssTexts.create_cta : undefined}
      onCta={canMutate ? () => setCreateOpen(true) : undefined}
    >
      <section className="grid gap-3">
        <header className="grid gap-1">
          <h2 className="text-lg font-semibold text-foreground">{ssTexts.section_title}</h2>
          <p className="text-sm text-muted-foreground">{ssTexts.section_description}</p>
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

        {filtered.length === 0 ? (
          structures.length === 0 ? (
            <EmptyState
              variant="dashed"
              title={ssTexts.empty_title}
              description={ssTexts.empty_description}
              action={
                canMutate ? (
                  <Button variant="primary" onClick={() => setCreateOpen(true)}>
                    {ssTexts.empty_cta}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <EmptyState
              variant="dashed"
              title={ssTexts.empty_filter_title}
              description={ssTexts.empty_filter_description}
            />
          )
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
      </section>

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
            clubCurrencyCode={clubCurrencyCode}
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
              clubCurrencyCode={clubCurrencyCode}
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
          <form action={handleAmountSubmit} className="grid gap-4">
            <input type="hidden" name="salary_structure_id" value={updatingAmount.id} />

            <FormField>
              <FormFieldLabel>{ssTexts.amount_current_label}</FormFieldLabel>
              <FormReadonly>
                {formatAmount(updatingAmount.currentAmount, clubCurrencyCode)}
              </FormReadonly>
            </FormField>

            <FormField>
              <FormFieldLabel required>{ssTexts.amount_new_label}</FormFieldLabel>
              <FormInput
                type="number"
                name="amount"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                placeholder={ssTexts.amount_new_placeholder}
                required
              />
              <FormHelpText>{ssTexts.amount_new_helper}</FormHelpText>
            </FormField>

            <FormField>
              <FormFieldLabel required>{ssTexts.effective_date_label}</FormFieldLabel>
              <FormInput
                type="date"
                name="effective_date"
                defaultValue={todayIso()}
                required
              />
              <FormHelpText>{ssTexts.effective_date_helper}</FormHelpText>
            </FormField>

            <AmountHistory
              versions={versionsByStructureId[updatingAmount.id] ?? []}
              currencyCode={clubCurrencyCode}
            />

            <ModalFooter
              onCancel={() => setUpdatingAmount(null)}
              cancelLabel={ssTexts.cancel_cta}
              submitLabel={ssTexts.amount_submit_cta}
              pendingLabel={ssTexts.submit_pending}
            />
          </form>
        ) : null}
      </Modal>
    </SettingsTabShell>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Shared form fields
 * ────────────────────────────────────────────────────────────────────────── */

type StructureFormFieldsProps = {
  mode: "create" | "edit";
  activities: ClubActivity[];
  structure?: SalaryStructure;
  clubCurrencyCode: string;
};

function StructureFormFields({
  mode,
  activities,
  structure,
  clubCurrencyCode,
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
            <FormInput
              type="text"
              name="functional_role"
              placeholder={ssTexts.form_role_placeholder}
              minLength={2}
              maxLength={120}
              required
            />
          )}
          {isEdit ? (
            <FormHelpText>{ssTexts.form_locked_field_hint}</FormHelpText>
          ) : (
            <FormHelpText>{ssTexts.form_role_helper}</FormHelpText>
          )}
        </FormField>

        <FormField>
          <FormFieldLabel required>{ssTexts.form_activity_label}</FormFieldLabel>
          {isEdit ? (
            <FormReadonly>{structure?.activityName ?? "—"}</FormReadonly>
          ) : (
            <FormSelect name="activity_id" defaultValue="" required>
              <option value="" disabled>
                {ssTexts.form_activity_placeholder}
              </option>
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
        <>
          <FormField>
            <FormFieldLabel required>{ssTexts.form_initial_amount_label}</FormFieldLabel>
            <FormInput
              type="number"
              name="initial_amount"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              placeholder={ssTexts.form_initial_amount_placeholder}
              required
            />
            <FormHelpText>
              {ssTexts.form_initial_amount_helper.replace("{currency}", clubCurrencyCode)}
            </FormHelpText>
          </FormField>

          <input type="hidden" name="status" value="activa" />
        </>
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
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {ssTexts.amount_history_title}
      </p>
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
