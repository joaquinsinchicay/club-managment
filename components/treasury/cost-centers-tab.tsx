"use client";

/**
 * Centros de Costo tab (US-52).
 *
 * Renders the cost-centers sub-tab of the Tesorería module:
 *   - KPI header (activos / presupuesto comprometido / deudas pendientes).
 *   - Search + type/status filter pills.
 *   - List of CC cards with progress bar, badges and responsible avatar.
 *   - Create/edit modal with full validation surface.
 *
 * All mutations go through server actions (see
 * `app/(dashboard)/treasury/cost-centers/actions.ts`).
 */

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  COST_CENTER_PERIODICITIES,
  COST_CENTER_STATUSES,
  COST_CENTER_TYPES,
  type CostCenter,
  type CostCenterAggregates,
  type CostCenterBadge,
  type CostCenterPeriodicity,
  type CostCenterStatus,
  type CostCenterType,
  requiresAmount,
  requiresCurrency,
  requiresResponsible,
  supportsPeriodicity
} from "@/lib/domain/cost-center";
import type { ClubMember } from "@/lib/domain/access";
import {
  formatLocalizedAmount,
  formatLocalizedAmountInputOnBlur,
  formatLocalizedAmountInputOnFocus,
  sanitizeLocalizedAmountInput
} from "@/lib/amounts";
import { triggerClientFeedback } from "@/lib/client-feedback";
import { texts } from "@/lib/texts";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { buttonClass } from "@/components/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableChip,
  DataTableEmpty,
  DataTableRow,
} from "@/components/ui/data-table";
import { ModalFooter } from "@/components/ui/modal-footer";
import {
  FORM_GRID_CLASSNAME,
  FormField,
  FormFieldLabel,
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/ui/modal-form";
import { PendingFieldset } from "@/components/ui/pending-form";

type CostCenterActionResult = { ok: boolean; code: string };

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------

type TypeFilter = CostCenterType | "all";
type StatusFilter = CostCenterStatus | "all";

type CostCentersTabProps = {
  costCenters: CostCenter[];
  aggregates: Record<string, CostCenterAggregates>;
  badges: Record<string, CostCenterBadge[]>;
  members: ClubMember[];
  availableCurrencies: string[];
  createCostCenterAction: (formData: FormData) => Promise<CostCenterActionResult>;
  updateCostCenterAction: (formData: FormData) => Promise<CostCenterActionResult>;
};

// -------------------------------------------------------------------------
// Intl helpers
// -------------------------------------------------------------------------

const tCC = texts.dashboard.treasury_role.cost_centers;

const TYPE_LABEL: Record<CostCenterType, string> = {
  deuda: tCC.type_debt,
  evento: tCC.type_event,
  jornada: tCC.type_workday,
  presupuesto: tCC.type_budget,
  publicidad: tCC.type_advertising,
  sponsor: tCC.type_sponsor
};

const STATUS_LABEL: Record<CostCenterStatus, string> = {
  activo: tCC.status_active,
  inactivo: tCC.status_inactive
};

const PERIODICITY_LABEL: Record<CostCenterPeriodicity, string> = {
  unico: tCC.periodicity_unique,
  mensual: tCC.periodicity_monthly,
  trimestral: tCC.periodicity_quarterly,
  semestral: tCC.periodicity_biannual,
  anual: tCC.periodicity_annual
};

const TYPE_FILTER_ORDER: Array<{ value: TypeFilter; label: string }> = [
  { value: "all", label: tCC.filter_all },
  { value: "deuda", label: tCC.filter_type_debt },
  { value: "presupuesto", label: tCC.filter_type_budget },
  { value: "evento", label: tCC.filter_type_event },
  { value: "sponsor", label: tCC.filter_type_sponsor },
  { value: "publicidad", label: tCC.filter_type_advertising },
  { value: "jornada", label: tCC.filter_type_workday }
];

const STATUS_FILTER_ORDER: Array<{ value: CostCenterStatus; label: string }> = [
  { value: "activo", label: tCC.filter_status_active },
  { value: "inactivo", label: tCC.filter_status_inactive }
];

const BADGE_LABEL: Record<CostCenterBadge["kind"], string> = {
  debt_settled: tCC.badge_debt_settled,
  budget_near_limit: tCC.badge_budget_near_limit,
  budget_exceeded: tCC.badge_budget_exceeded,
  goal_met: tCC.badge_goal_met,
  overdue: tCC.badge_overdue
};

const BADGE_COLORS: Record<CostCenterBadge["kind"], string> = {
  debt_settled: "bg-emerald-50 text-emerald-700 border-emerald-200",
  budget_near_limit: "bg-amber-50 text-amber-700 border-amber-200",
  budget_exceeded: "bg-rose-50 text-rose-700 border-rose-200",
  goal_met: "bg-emerald-50 text-emerald-700 border-emerald-200",
  overdue: "bg-rose-50 text-rose-700 border-rose-200"
};

function formatCurrency(amount: number | null, currencyCode: string): string {
  if (amount === null || Number.isNaN(amount)) return "—";
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toLocaleString("es-AR")}`;
  }
}

function formatDateRange(startDate: string, endDate: string | null): string {
  const start = new Date(`${startDate}T00:00:00`);
  const startStr = Number.isNaN(start.getTime())
    ? startDate
    : new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" }).format(
        start
      );

  if (!endDate) return `${startStr} · Sin cierre`;

  const end = new Date(`${endDate}T00:00:00`);
  const endStr = Number.isNaN(end.getTime())
    ? endDate
    : new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" }).format(
        end
      );

  return `${startStr} → ${endStr}`;
}

function progressPercent(cc: CostCenter, agg: CostCenterAggregates): number {
  if (!cc.amount || cc.amount === 0) return 0;
  const value = cc.type === "sponsor" || cc.type === "publicidad" ? agg.totalIngreso : agg.totalEgreso;
  return Math.round((value / cc.amount) * 100);
}

function progressBarColor(cc: CostCenter, agg: CostCenterAggregates): string {
  const pct = progressPercent(cc, agg);
  if (cc.type === "deuda" && cc.amount && agg.totalEgreso >= cc.amount) return "bg-emerald-500";
  if (cc.type === "presupuesto" && pct >= 100) return "bg-rose-500";
  if (cc.type === "presupuesto" && pct >= 80) return "bg-amber-500";
  if ((cc.type === "sponsor" || cc.type === "publicidad") && cc.amount && agg.totalIngreso >= cc.amount)
    return "bg-emerald-500";
  return "bg-slate-400";
}

function initialsFromMember(member: ClubMember | undefined): string {
  if (!member) return "?";
  const parts = member.fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return `${first}${second}`.toUpperCase() || "?";
}

function shortNameFromMember(member: ClubMember | undefined): string {
  if (!member) return "—";
  const parts = member.fullName.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] ?? "—";
  return `${parts[0]?.[0] ?? ""}. ${parts[parts.length - 1]}`;
}

// -------------------------------------------------------------------------
// KPI grid
// -------------------------------------------------------------------------

function KpiGrid({
  costCenters,
  aggregates,
  badges
}: {
  costCenters: CostCenter[];
  aggregates: Record<string, CostCenterAggregates>;
  badges: Record<string, CostCenterBadge[]>;
}) {
  const activeCount = costCenters.filter((cc) => cc.status === "activo").length;
  const overdueCount = costCenters.filter((cc) => (badges[cc.id] ?? []).some((b) => b.kind === "overdue"))
    .length;

  const budgetCC = costCenters.filter((cc) => cc.type === "presupuesto" && cc.amount);
  const budgetTotal = budgetCC.reduce((sum, cc) => sum + (cc.amount ?? 0), 0);
  const budgetExecuted = budgetCC.reduce(
    (sum, cc) => sum + (aggregates[cc.id]?.totalEgreso ?? 0),
    0
  );
  const budgetPercent = budgetTotal > 0 ? Math.round((budgetExecuted / budgetTotal) * 100) : 0;

  const debtCC = costCenters.filter(
    (cc) => cc.type === "deuda" && cc.status === "activo" && cc.amount
  );
  const debtByCurrency = new Map<string, number>();
  let debtCount = 0;
  for (const cc of debtCC) {
    const executed = aggregates[cc.id]?.totalEgreso ?? 0;
    const remaining = (cc.amount ?? 0) - executed;
    if (remaining <= 0) continue;
    debtCount += 1;
    debtByCurrency.set(
      cc.currencyCode,
      (debtByCurrency.get(cc.currencyCode) ?? 0) + remaining
    );
  }
  const debtCurrenciesLabel = [...debtByCurrency.keys()].map((c) => `1 ${c}`).join(" · ") || "—";

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-card border border-border bg-card px-4 py-3">
        <p className="text-eyebrow font-semibold uppercase text-muted-foreground">
          {tCC.kpi_active_title}
        </p>
        <p className="mt-2 text-h2 font-bold tabular-nums">{activeCount}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {tCC.kpi_active_meta.replace("{overdue}", String(overdueCount))}
        </p>
      </div>
      <div className="rounded-card border border-border bg-card px-4 py-3">
        <p className="text-eyebrow font-semibold uppercase text-muted-foreground">
          {tCC.kpi_budget_title}
        </p>
        <p className="mt-2 text-h2 font-bold tabular-nums">{budgetPercent}%</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatCurrency(budgetExecuted, "ARS")} / {formatCurrency(budgetTotal, "ARS")}
        </p>
      </div>
      <div className="rounded-card border border-border bg-card px-4 py-3">
        <p className="text-eyebrow font-semibold uppercase text-muted-foreground">
          {tCC.kpi_debts_title}
        </p>
        <div className="mt-2 flex flex-col gap-0.5">
          {[...debtByCurrency.entries()].length === 0 ? (
            <p className="text-h2 font-bold tabular-nums">—</p>
          ) : (
            [...debtByCurrency.entries()].map(([code, value]) => (
              <p key={code} className="text-sm font-semibold tabular-nums text-rose-600">
                {formatCurrency(value, code)}
              </p>
            ))
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {tCC.kpi_debts_meta
            .replace("{count}", String(debtCount))
            .replace("{currencies}", debtCurrenciesLabel)}
        </p>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// Card
// -------------------------------------------------------------------------

function CostCenterCard({
  cc,
  aggregate,
  badgeList,
  responsible,
  onEdit
}: {
  cc: CostCenter;
  aggregate: CostCenterAggregates;
  badgeList: CostCenterBadge[];
  responsible: ClubMember | undefined;
  onEdit: () => void;
}) {
  const pct = progressPercent(cc, aggregate);
  const executed =
    cc.type === "sponsor" || cc.type === "publicidad" ? aggregate.totalIngreso : aggregate.totalEgreso;

  return (
    <DataTableRow density="comfortable" useGrid={false}>
      <div className="flex w-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">{cc.name}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <DataTableChip className="uppercase">
                {TYPE_LABEL[cc.type]}
              </DataTableChip>
              {cc.periodicity && (
                <span className="text-xs text-muted-foreground">
                  {PERIODICITY_LABEL[cc.periodicity]}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {formatDateRange(cc.startDate, cc.endDate)}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-semibold",
                  cc.status === "activo" ? "text-ds-green-700" : "text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "inline-block size-1.5 rounded-full",
                    cc.status === "activo" ? "bg-ds-green" : "bg-ds-slate-400"
                  )}
                />
                {STATUS_LABEL[cc.status]}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-eyebrow font-semibold uppercase text-muted-foreground">
              {cc.currencyCode}
            </p>
            <p className="text-h3 font-bold tabular-nums">{formatCurrency(cc.amount, cc.currencyCode)}</p>
            <p className="text-xs text-muted-foreground">
              {tCC.progress_executed_meta
                .replace("{executed}", formatCurrency(executed, cc.currencyCode))
                .replace("{percent}", String(pct))}
            </p>
          </div>
        </div>

        {cc.amount ? (
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary/60">
            <div
              className={cn("h-full rounded-full", progressBarColor(cc, aggregate))}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {badgeList.map((badge) => (
              <span
                key={badge.kind}
                className={cn(
                  "inline-flex items-center rounded-chip border px-2 py-0.5 text-xs font-medium",
                  BADGE_COLORS[badge.kind]
                )}
              >
                {BADGE_LABEL[badge.kind]}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-eyebrow font-bold text-foreground">
              {initialsFromMember(responsible)}
            </div>
            <span className="text-xs text-muted-foreground">{shortNameFromMember(responsible)}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
          <a
            href={`/treasury/cost-centers/${cc.id}`}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Ver movimientos →
          </a>
          <button
            type="button"
            onClick={onEdit}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Editar
          </button>
        </div>
      </div>
    </DataTableRow>
  );
}

// -------------------------------------------------------------------------
// Form (create/edit)
// -------------------------------------------------------------------------

function CostCenterForm({
  costCenter,
  availableCurrencies,
  members,
  hasLinks,
  submitAction,
  onCancel
}: {
  costCenter: CostCenter | null;
  availableCurrencies: string[];
  members: ClubMember[];
  hasLinks: boolean;
  submitAction: (formData: FormData) => void | Promise<void>;
  onCancel: () => void;
}) {
  const isEdit = Boolean(costCenter);
  const [type, setType] = useState<CostCenterType>(costCenter?.type ?? "presupuesto");
  const [amountInput, setAmountInput] = useState<string>(() =>
    costCenter?.amount != null ? formatLocalizedAmount(costCenter.amount) : ""
  );
  const lockedByLinks = isEdit && hasLinks;

  const showCurrency = requiresCurrency(type);
  const showAmount = requiresAmount(type);
  const showResponsible = requiresResponsible(type);
  const showPeriodicity = supportsPeriodicity(type);

  // En edición, tipo/moneda/monto son inmutables para no romper reportes ya
  // emitidos sobre el CC. Start_date sigue la regla legacy (solo con links).
  const lockedInEdit = isEdit;
  const editLockHint = tCC.form_locked_in_edit_hint;

  // Preserve legacy values when the form omits the field for the new type.
  const legacyCurrencyCode = costCenter?.currencyCode ?? null;
  const legacyResponsibleUserId = costCenter?.responsibleUserId ?? null;

  return (
    <form action={submitAction} className="flex flex-col">
      <PendingFieldset className={FORM_GRID_CLASSNAME}>
        {isEdit && costCenter && (
          <input type="hidden" name="cost_center_id" value={costCenter.id} />
        )}

        <FormField fullWidth>
          <FormFieldLabel required>{tCC.form_name_label}</FormFieldLabel>
          <FormInput
            type="text"
            name="name"
            required
            defaultValue={costCenter?.name ?? ""}
            placeholder={tCC.form_name_placeholder}
          />
        </FormField>

        <FormField fullWidth>
          <FormFieldLabel>{tCC.form_description_label}</FormFieldLabel>
          <FormTextarea
            name="description"
            defaultValue={costCenter?.description ?? ""}
            rows={2}
            placeholder={tCC.form_description_placeholder}
          />
        </FormField>

        <FormField>
          <FormFieldLabel required>{tCC.form_type_label}</FormFieldLabel>
          <FormSelect
            name="type"
            required
            defaultValue={costCenter?.type ?? "presupuesto"}
            disabled={lockedInEdit}
            onChange={(e) => setType(e.target.value as CostCenterType)}
            title={lockedInEdit ? editLockHint : undefined}
          >
            {COST_CENTER_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </FormSelect>
        </FormField>

        <FormField>
          <FormFieldLabel>{tCC.form_status_label}</FormFieldLabel>
          <FormSelect
            name="status"
            defaultValue={costCenter?.status ?? "activo"}
          >
            {COST_CENTER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </FormSelect>
        </FormField>

        <FormField>
          <FormFieldLabel required>{tCC.form_start_date_label}</FormFieldLabel>
          <FormInput
            type="date"
            name="start_date"
            required
            defaultValue={costCenter?.startDate ?? ""}
            disabled={lockedByLinks}
            title={lockedByLinks ? tCC.form_disabled_hint : undefined}
          />
        </FormField>

        <FormField>
          <FormFieldLabel>{tCC.form_end_date_label}</FormFieldLabel>
          <FormInput
            type="date"
            name="end_date"
            defaultValue={costCenter?.endDate ?? ""}
          />
        </FormField>

        {showCurrency ? (
          <FormField>
            <FormFieldLabel required>{tCC.form_currency_label}</FormFieldLabel>
            <FormSelect
              name="currency_code"
              required
              defaultValue={costCenter?.currencyCode ?? availableCurrencies[0] ?? ""}
              disabled={lockedInEdit}
              title={lockedInEdit ? editLockHint : undefined}
            >
              {availableCurrencies.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </FormSelect>
          </FormField>
        ) : legacyCurrencyCode ? (
          <input type="hidden" name="currency_code" value={legacyCurrencyCode} />
        ) : null}

        {showAmount ? (
          <FormField>
            <FormFieldLabel required>{tCC.form_amount_label}</FormFieldLabel>
            <FormInput
              type="text"
              name="amount"
              inputMode="decimal"
              required
              value={amountInput}
              disabled={lockedInEdit}
              title={lockedInEdit ? editLockHint : undefined}
              onChange={(e) => setAmountInput(sanitizeLocalizedAmountInput(e.target.value))}
              onBlur={(e) => setAmountInput(formatLocalizedAmountInputOnBlur(e.target.value))}
              onFocus={(e) => setAmountInput(formatLocalizedAmountInputOnFocus(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "-") e.preventDefault();
              }}
              className="tabular-nums"
            />
          </FormField>
        ) : null}

        {showPeriodicity && (
          <FormField>
            <FormFieldLabel>{tCC.form_periodicity_label}</FormFieldLabel>
            <FormSelect
              name="periodicity"
              defaultValue={costCenter?.periodicity ?? "unico"}
            >
              {COST_CENTER_PERIODICITIES.map((p) => (
                <option key={p} value={p}>
                  {PERIODICITY_LABEL[p]}
                </option>
              ))}
            </FormSelect>
          </FormField>
        )}

        {showResponsible ? (
          <FormField fullWidth>
            <FormFieldLabel required>{tCC.form_responsible_label}</FormFieldLabel>
            <FormSelect
              name="responsible_user_id"
              required
              defaultValue={costCenter?.responsibleUserId ?? ""}
            >
              <option value="" disabled>
                —
              </option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.fullName}
                </option>
              ))}
            </FormSelect>
          </FormField>
        ) : legacyResponsibleUserId ? (
          <input type="hidden" name="responsible_user_id" value={legacyResponsibleUserId} />
        ) : null}
      </PendingFieldset>

      <ModalFooter
        align="end"
        onCancel={onCancel}
        cancelLabel={tCC.form_cancel_cta}
        submitLabel={tCC.form_submit_cta}
        pendingLabel={isEdit ? tCC.update_loading : tCC.save_loading}
      />
    </form>
  );
}

// -------------------------------------------------------------------------
// Main component
// -------------------------------------------------------------------------

export function CostCentersTab({
  costCenters,
  aggregates,
  badges,
  members,
  availableCurrencies,
  createCostCenterAction,
  updateCostCenterAction
}: CostCentersTabProps) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("activo");
  const [search, setSearch] = useState("");
  const [modalState, setModalState] = useState<
    { mode: "create" } | { mode: "edit"; cc: CostCenter; hasLinks: boolean } | null
  >(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    const isEdit = modalState?.mode === "edit";
    setModalState(null);
    const result = isEdit
      ? await updateCostCenterAction(formData)
      : await createCostCenterAction(formData);
    triggerClientFeedback("dashboard", result.code);
    if (result.ok) {
      startTransition(() => router.refresh());
    }
  }

  const memberByUserId = useMemo(() => {
    const map = new Map<string, ClubMember>();
    for (const m of members) map.set(m.userId, m);
    return map;
  }, [members]);

  const countsByType = useMemo(() => {
    const out = new Map<CostCenterType, number>();
    for (const cc of costCenters) {
      out.set(cc.type, (out.get(cc.type) ?? 0) + 1);
    }
    return out;
  }, [costCenters]);

  const countsByStatus = useMemo(() => {
    const out = new Map<CostCenterStatus, number>();
    for (const cc of costCenters) {
      out.set(cc.status, (out.get(cc.status) ?? 0) + 1);
    }
    return out;
  }, [costCenters]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("es-AR");
    return costCenters.filter((cc) => {
      if (typeFilter !== "all" && cc.type !== typeFilter) return false;
      if (statusFilter !== "all" && cc.status !== statusFilter) return false;
      if (q && !cc.name.toLocaleLowerCase("es-AR").includes(q)) return false;
      return true;
    });
  }, [costCenters, typeFilter, statusFilter, search]);

  const activeCount = countsByStatus.get("activo") ?? 0;
  const inactiveCount = countsByStatus.get("inactivo") ?? 0;

  // NOTE: aggregated links-count per CC is not cheap to resolve client-side,
  // so the form relies on a conservative flag coming from the aggregates:
  // any CC with at least one linked movement sets `hasLinkedMovementCount > 0`.
  function resolveHasLinks(cc: CostCenter): boolean {
    return (aggregates[cc.id]?.linkedMovementCount ?? 0) > 0;
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-h2 font-bold text-foreground">{tCC.section_title}</h2>
        <p className="text-sm text-muted-foreground">{tCC.section_description}</p>
      </header>

      <KpiGrid costCenters={costCenters} aggregates={aggregates} badges={badges} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {tCC.subtitle_counts
            .replace("{active}", String(activeCount))
            .replace("{inactive}", String(inactiveCount))}
        </p>
        <button
          type="button"
          onClick={() => setModalState({ mode: "create" })}
          className={buttonClass({ variant: "primary", size: "sm" })}
        >
          {tCC.create_cta}
        </button>
      </div>

      <div className="rounded-card border border-border bg-card px-4 py-3">
        <input
          type="search"
          placeholder={tCC.search_placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-btn border border-border bg-background px-3 py-2 text-sm"
        />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {TYPE_FILTER_ORDER.map((opt) => {
            const count =
              opt.value === "all" ? costCenters.length : countsByType.get(opt.value) ?? 0;
            const active = typeFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTypeFilter(opt.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-foreground hover:bg-secondary/40"
                )}
              >
                {opt.label} · {count}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {STATUS_FILTER_ORDER.map((opt) => {
            const count = countsByStatus.get(opt.value) ?? 0;
            const active = statusFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatusFilter(opt.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-foreground hover:bg-secondary/40"
                )}
              >
                {opt.label} · {count}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <DataTableEmpty
          title={tCC.empty_title}
          description={tCC.empty_description}
          action={
            <button
              type="button"
              onClick={() => setModalState({ mode: "create" })}
              className={buttonClass({ variant: "primary", size: "sm" })}
            >
              {tCC.create_full_cta}
            </button>
          }
        />
      ) : (
        <DataTable density="comfortable">
          <DataTableBody>
            {filtered.map((cc) => (
              <CostCenterCard
                key={cc.id}
                cc={cc}
                aggregate={
                  aggregates[cc.id] ?? {
                    costCenterId: cc.id,
                    totalIngreso: 0,
                    totalEgreso: 0,
                    linkedMovementCount: 0
                  }
                }
                badgeList={badges[cc.id] ?? []}
                responsible={cc.responsibleUserId ? memberByUserId.get(cc.responsibleUserId) : undefined}
                onEdit={() => setModalState({ mode: "edit", cc, hasLinks: resolveHasLinks(cc) })}
              />
            ))}
          </DataTableBody>
        </DataTable>
      )}

      <Modal
        open={modalState !== null}
        onClose={() => setModalState(null)}
        title={modalState?.mode === "edit" ? tCC.form_edit_title : tCC.form_create_title}
        hideCloseButton
      >
        {modalState && (
          <CostCenterForm
            costCenter={modalState.mode === "edit" ? modalState.cc : null}
            availableCurrencies={availableCurrencies}
            members={members}
            hasLinks={modalState.mode === "edit" ? modalState.hasLinks : false}
            submitAction={handleSubmit}
            onCancel={() => setModalState(null)}
          />
        )}
      </Modal>
    </div>
  );
}
