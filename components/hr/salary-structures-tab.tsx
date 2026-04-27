"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type {
  RrhhActionResult,
} from "@/app/(dashboard)/settings/rrhh/actions";
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
  FormSelect,
} from "@/components/ui/modal-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewIconLink } from "@/components/ui/view-icon-link";
import type { ClubActivity } from "@/lib/domain/access";
import {
  composeStructureName,
  FUNCTIONAL_ROLES,
  SALARY_DIVISIONS,
  SALARY_PAYMENT_TYPES,
  SALARY_REMUNERATION_TYPES,
  sortDivisions,
  type SalaryDivision,
  type SalaryStructure,
  type SalaryStructureStatus,
} from "@/lib/domain/salary-structure";
import { triggerClientFeedback } from "@/lib/client-feedback";
import { texts } from "@/lib/texts";
import { cn } from "@/lib/utils";

type SalaryStructuresTabProps = {
  structures: SalaryStructure[];
  activities: ClubActivity[];
  canMutate: boolean;
  createAction: (formData: FormData) => Promise<RrhhActionResult>;
};

type StatusFilter = "all" | SalaryStructureStatus;

const ssTexts = texts.rrhh.salary_structures;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: ssTexts.filter_all },
  { value: "activa", label: ssTexts.filter_active },
  { value: "inactiva", label: ssTexts.filter_inactive },
];

export function SalaryStructuresTab({
  structures,
  activities,
  canMutate,
  createAction,
}: SalaryStructuresTabProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [activityFilter, setActivityFilter] = useState<string>("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [createPending, setCreatePending] = useState(false);

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

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-h2 text-foreground">{ssTexts.section_title}</h2>
        <p className="text-body text-muted-foreground">{ssTexts.section_description}</p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-body text-muted-foreground">
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

      <div className="flex flex-col gap-3">
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          {/* eslint-disable-next-line no-restricted-syntax -- Search input con icono leading: el wrapping requiere un input crudo, FormInput no soporta slot leading. */}
          <input
            type="search"
            placeholder={ssTexts.search_placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-card border border-border bg-card py-3 pl-10 pr-4 text-body text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/10"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
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
          {/* eslint-disable-next-line no-restricted-syntax -- Dropdown-chip (inline con ChipButtons): no existe primitivo dropdown-chip. Usa tokens canonicos rounded-chip + estilo inactive de ChipButton. */}
          <select
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value)}
            className="inline-flex items-center rounded-chip border border-border bg-card px-3 py-1 text-small font-semibold text-foreground hover:bg-secondary"
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
          gridColumns="minmax(0,1.6fr) 140px minmax(0,1fr) 120px 140px 110px minmax(0,1fr) 44px"
        >
          <DataTableHeader>
            <DataTableHeadCell>{ssTexts.col_name}</DataTableHeadCell>
            <DataTableHeadCell>{ssTexts.col_divisions}</DataTableHeadCell>
            <DataTableHeadCell>{ssTexts.col_activity}</DataTableHeadCell>
            <DataTableHeadCell>{ssTexts.col_payment_type}</DataTableHeadCell>
            <DataTableHeadCell>{ssTexts.col_type}</DataTableHeadCell>
            <DataTableHeadCell>{ssTexts.col_status}</DataTableHeadCell>
            <DataTableHeadCell>{ssTexts.col_contract}</DataTableHeadCell>
            <DataTableHeadCell />
          </DataTableHeader>

          <DataTableBody>
            {filtered.map((s) => (
              <DataTableRow key={s.id} density="comfortable" hoverReveal>
                <DataTableCell>
                  <span className="grid leading-tight">
                    <span className="font-medium text-foreground">{s.functionalRole}</span>
                    {s.name && s.name !== s.functionalRole ? (
                      <span className="text-small text-muted-foreground">{s.name}</span>
                    ) : null}
                  </span>
                </DataTableCell>
                <DataTableCell>
                  {s.divisions.length === 0 ? (
                    <span className="text-small text-muted-foreground">—</span>
                  ) : (
                    <span className="text-small text-foreground">{s.divisions.join(" / ")}</span>
                  )}
                </DataTableCell>
                <DataTableCell>
                  {s.activityName ? (
                    <span className="text-small text-foreground">{s.activityName}</span>
                  ) : (
                    <span className="text-small text-muted-foreground">—</span>
                  )}
                </DataTableCell>
                <DataTableCell>
                  <DataTableChip tone="neutral">
                    {ssTexts.payment_type_options[s.paymentType]}
                  </DataTableChip>
                </DataTableCell>
                <DataTableCell>
                  <DataTableChip tone="neutral">
                    {ssTexts.remuneration_type_options[s.remunerationType]}
                  </DataTableChip>
                </DataTableCell>
                <DataTableCell>
                  <StatusBadge
                    tone={s.status === "activa" ? "success" : "neutral"}
                    label={ssTexts.status_options[s.status]}
                  />
                </DataTableCell>
                <DataTableCell>
                  {s.hasActiveContract ? (
                    <span className="text-small text-foreground">
                      {s.activeContractStaffName ?? ssTexts.contract_assigned_generic}
                    </span>
                  ) : (
                    <span className="text-small text-muted-foreground">
                      {ssTexts.contract_vacant}
                    </span>
                  )}
                </DataTableCell>
                <DataTableCell align="right">
                  {s.activityId ? (
                    <DataTableActions>
                      <ViewIconLink
                        href={`/rrhh/structures/${s.activityId}`}
                        label={ssTexts.action_view_detail}
                      />
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
          <CreateStructureFields activities={activeActivities} />
          <ModalFooter
            onCancel={() => setCreateOpen(false)}
            cancelLabel={ssTexts.cancel_cta}
            submitLabel={ssTexts.create_submit_cta}
            pendingLabel={ssTexts.submit_pending}
          />
        </form>
      </Modal>

    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * CreateStructureFields — fields para el modal de creación
 * ────────────────────────────────────────────────────────────────────────── */

function CreateStructureFields({ activities }: { activities: ClubActivity[] }) {
  const [role, setRole] = useState<string>("");
  const [divisions, setDivisions] = useState<SalaryDivision[]>([]);
  const [activityId, setActivityId] = useState<string>("");

  const activityName = useMemo(
    () => activities.find((a) => a.id === activityId)?.name ?? null,
    [activities, activityId],
  );
  const namePreview = role ? composeStructureName(role, divisions, activityName) : "";

  return (
    <>
      <FormField>
        <FormFieldLabel>{ssTexts.form_name_preview_label}</FormFieldLabel>
        <FormReadonly>{namePreview || "—"}</FormReadonly>
        <FormHelpText>{ssTexts.form_name_preview_hint}</FormHelpText>
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField>
          <FormFieldLabel required>{ssTexts.form_role_label}</FormFieldLabel>
          <FormSelect
            name="functional_role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
          >
            <option value="" disabled>
              {ssTexts.form_role_placeholder}
            </option>
            {FUNCTIONAL_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </FormSelect>
        </FormField>

        <FormField>
          <FormFieldLabel>{ssTexts.form_activity_label}</FormFieldLabel>
          <FormSelect
            name="activity_id"
            value={activityId}
            onChange={(e) => setActivityId(e.target.value)}
          >
            <option value="">{ssTexts.form_activity_placeholder}</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </FormSelect>
        </FormField>
      </div>

      <FormField>
        <FormFieldLabel>{ssTexts.form_divisions_label}</FormFieldLabel>
        <DivisionsMultiSelect
          value={divisions}
          onChange={setDivisions}
          placeholder={ssTexts.form_divisions_placeholder}
        />
        <FormHelpText>{ssTexts.form_divisions_helper}</FormHelpText>
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField>
          <FormFieldLabel required>{ssTexts.form_payment_type_label}</FormFieldLabel>
          <FormSelect name="payment_type" defaultValue="sueldo" required>
            {SALARY_PAYMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {ssTexts.payment_type_options[t]}
              </option>
            ))}
          </FormSelect>
          <FormHelpText>{ssTexts.form_payment_type_helper}</FormHelpText>
        </FormField>

        <FormField>
          <FormFieldLabel required>{ssTexts.form_remuneration_type_label}</FormFieldLabel>
          <FormSelect name="remuneration_type" defaultValue="" required>
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
      </div>

      <FormField>
        <FormFieldLabel>{ssTexts.form_workload_hours_label}</FormFieldLabel>
        <FormInput
          type="number"
          name="workload_hours"
          inputMode="decimal"
          min="0"
          step="0.5"
          placeholder={ssTexts.form_workload_hours_placeholder}
        />
        <FormHelpText>{ssTexts.form_workload_hours_helper}</FormHelpText>
      </FormField>

      <input type="hidden" name="status" value="activa" />
    </>
  );
}


/* ──────────────────────────────────────────────────────────────────────────
 * DivisionsMultiSelect — dropdown con checkboxes interno
 * ────────────────────────────────────────────────────────────────────────── */

type DivisionsMultiSelectProps = {
  value: SalaryDivision[];
  onChange: (next: SalaryDivision[]) => void;
  placeholder: string;
};

function DivisionsMultiSelect({ value, onChange, placeholder }: DivisionsMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle(division: SalaryDivision) {
    if (value.includes(division)) {
      onChange(sortDivisions(value.filter((d) => d !== division)));
    } else {
      onChange(sortDivisions([...value, division]));
    }
  }

  const label = value.length === 0 ? placeholder : value.join(", ");
  const isPlaceholder = value.length === 0;

  return (
    <div ref={wrapperRef} className="relative">
      {/* Hidden inputs para FormData — serializan cada division como name="divisions" */}
      {value.map((d) => (
        <input key={d} type="hidden" name="divisions" value={d} />
      ))}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "h-11 w-full rounded-card border border-border bg-card px-4 text-left text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10",
          "flex items-center justify-between gap-2",
          isPlaceholder ? "text-muted-foreground" : "text-foreground",
        )}
      >
        <span className="truncate">{label}</span>
        <svg
          className="size-4 shrink-0 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-card border border-border bg-card p-1 shadow-lg"
        >
          {SALARY_DIVISIONS.map((d) => {
            const checked = value.includes(d);
            return (
              <label
                key={d}
                role="option"
                aria-selected={checked}
                className="flex min-h-10 cursor-pointer items-center gap-2 rounded-btn px-3 py-2 text-sm text-foreground transition hover:bg-secondary/60"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(d)}
                  className="size-4 rounded border-border text-foreground focus:ring-foreground"
                />
                <span className="font-medium">{d}</span>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

