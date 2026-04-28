"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import type { RrhhActionResult } from "@/app/(dashboard)/settings/rrhh/actions";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DataTableChip } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { CreateContractForm } from "@/components/hr/create-contract-form";
import { StructureEditModal } from "@/components/hr/structure-edit-modal";
import { triggerClientFeedback } from "@/lib/client-feedback";
import type { SalaryStructure } from "@/lib/domain/salary-structure";
import type { StaffMember } from "@/lib/domain/staff-member";
import { texts } from "@/lib/texts";
import type {
  ActivityCollaborator,
  ActivityCostPoint,
  ActivityDetail,
} from "@/lib/services/hr-activity-detail-service";

const adTexts = texts.rrhh.activity_detail;
const ssTexts = texts.rrhh.salary_structures;
const scTexts = texts.rrhh.staff_contracts;
const monthLabels = adTexts.month_short_labels as Record<string, string>;

type ActivityDetailViewProps = {
  detail: ActivityDetail;
  clubCurrencyCode: string;
  canMutate: boolean;
  staffMembers: StaffMember[];
  updateStructureAction: (formData: FormData) => Promise<RrhhActionResult>;
  createContractAction: (formData: FormData) => Promise<RrhhActionResult>;
};

function formatAmount(amount: number, currencyCode: string): string {
  if (amount === 0) return "—";
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(0)}`;
  }
}

function formatAmountFull(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(0)}`;
  }
}

function monthShort(year: number, month: number): string {
  return monthLabels[String(month)] ?? "";
}

function buildDelta(current: number, previous: number): {
  sign: "+" | "−";
  percent: string;
  prevMonth: string;
} | null {
  if (previous <= 0 || current <= 0) return null;
  const diff = ((current - previous) / previous) * 100;
  const sign: "+" | "−" = diff >= 0 ? "+" : "−";
  return {
    sign,
    percent: Math.abs(diff).toFixed(1).replace(".", ","),
    prevMonth: "mes anterior",
  };
}

export function ActivityDetailView({
  detail,
  clubCurrencyCode,
  canMutate,
  staffMembers,
  updateStructureAction,
  createContractAction,
}: ActivityDetailViewProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { activity, structures, divisions, collaborators, totals, costEvolution } = detail;

  const groups = useMemo(() => groupByDivision(collaborators), [collaborators]);
  const headerEyebrow = adTexts.header_eyebrow_template
    .replace("{collaborators}", String(totals.collaboratorCount))
    .replace("{divisions}", String(divisions.length));

  const coordinator = useMemo(() => findCoordinator(collaborators), [collaborators]);

  const [editingStructure, setEditingStructure] = useState<SalaryStructure | null>(null);
  const [editPickerOpen, setEditPickerOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignPending, setAssignPending] = useState(false);

  const availableStructures = useMemo(
    () => structures.filter((s) => s.status === "activa" && !s.hasActiveContract),
    [structures],
  );

  const delta = buildDelta(totals.monthlyCost, totals.monthlyCostPrevious);

  function handleEditClick() {
    if (structures.length === 0) return;
    if (structures.length === 1) {
      setEditingStructure(structures[0]);
      return;
    }
    setEditPickerOpen(true);
  }

  async function handleCreateContract(formData: FormData) {
    setAssignPending(true);
    try {
      const result = await createContractAction(formData);
      triggerClientFeedback("settings", result.code);
      if (result.ok) {
        setAssignOpen(false);
        startTransition(() => router.refresh());
      }
    } finally {
      setAssignPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-eyebrow uppercase tracking-card-eyebrow text-muted-foreground">
        <Link href="/rrhh/structures" className="hover:text-foreground">
          {adTexts.breadcrumb_root}
        </Link>
        <span aria-hidden="true">·</span>
        <span className="break-words text-foreground">{activity.name}</span>
      </nav>

      {/* Header card */}
      <Card padding="comfortable">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-eyebrow uppercase tracking-card-eyebrow text-muted-foreground">
              {headerEyebrow}
            </p>
            <h1 className="break-words text-h1 text-foreground">{activity.name}</h1>
            {coordinator ? (
              <p className="text-body text-muted-foreground">
                {adTexts.header_coordinator_subtitle_template
                  .split("{name}")[0]}
                <Link
                  href={`/rrhh/staff/${coordinator.staffMemberId}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {coordinator.staffMemberName}
                </Link>
              </p>
            ) : null}
            {divisions.length > 0 ? (
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {divisions.map((d) => (
                  <DataTableChip key={d} tone="neutral">
                    {d}
                  </DataTableChip>
                ))}
              </div>
            ) : null}
          </div>
          {canMutate && structures.length > 0 ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button variant="secondary" size="md" onClick={handleEditClick}>
                {adTexts.cta_edit_structure}
              </Button>
              <Button
                variant="accent-rrhh"
                size="md"
                onClick={() => setAssignOpen(true)}
              >
                {adTexts.cta_new_contract}
              </Button>
            </div>
          ) : null}
        </div>
      </Card>

      {/* Stats — 3 cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card padding="comfortable">
          <CardHeader eyebrow={adTexts.stats_cost_eyebrow} title={formatAmountFull(totals.monthlyCost, clubCurrencyCode)} />
          <CardBody>
            <p className="text-small text-muted-foreground">
              {delta
                ? adTexts.stats_cost_delta_template
                    .replace("{sign}", delta.sign)
                    .replace("{percent}", delta.percent)
                    .replace("{prevMonth}", delta.prevMonth)
                : adTexts.stats_cost_no_delta}
            </p>
          </CardBody>
        </Card>

        <Card padding="comfortable">
          <CardHeader
            eyebrow={adTexts.stats_collaborators_eyebrow}
            title={String(totals.collaboratorCount)}
          />
          <CardBody>
            <p className="text-small text-muted-foreground">
              {adTexts.stats_collaborators_subtitle_template
                .replace("{mensual}", String(totals.countByRemuneration.mensual_fijo))
                .replace("{porHora}", String(totals.countByRemuneration.por_hora))
                .replace("{porClase}", String(totals.countByRemuneration.por_clase))}
            </p>
          </CardBody>
        </Card>

        <Card padding="comfortable">
          <CardHeader
            eyebrow={adTexts.stats_share_eyebrow}
            title={`${totals.rrhhSharePercentage.toFixed(1).replace(".", ",")}%`}
          />
          <CardBody>
            <ShareBar percentage={totals.rrhhSharePercentage} />
          </CardBody>
        </Card>
      </div>

      {/* Colaboradores agrupados */}
      <Card padding="comfortable">
        <CardHeader
          title={adTexts.collaborators_card_title_template.replace("{activity}", activity.name)}
          description={adTexts.collaborators_card_subtitle}
        />
        <CardBody>
          {collaborators.length === 0 ? (
            <EmptyState
              title={adTexts.empty_collaborators_title}
              description={adTexts.empty_collaborators_description}
              variant="dashed"
            />
          ) : (
            <div className="flex flex-col gap-6">
              {groups.map((g) => (
                <CollaboratorGroup
                  key={g.key}
                  groupKey={g.key}
                  label={g.label}
                  items={g.items}
                  currencyCode={clubCurrencyCode}
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Cost evolution */}
      <Card padding="comfortable">
        <CardHeader
          title={adTexts.cost_evolution_title}
          description={adTexts.cost_evolution_subtitle}
        />
        <CardBody>
          {costEvolution.every((p) => p.total === 0) ? (
            <p className="text-body text-muted-foreground">{adTexts.cost_evolution_no_data}</p>
          ) : (
            <CostEvolutionChart points={costEvolution} currencyCode={clubCurrencyCode} />
          )}
        </CardBody>
      </Card>

      {/* Edit picker modal — solo cuando N>1 estructuras */}
      <Modal
        open={editPickerOpen}
        onClose={() => setEditPickerOpen(false)}
        title={adTexts.edit_picker_modal_title}
        description={adTexts.edit_picker_modal_description}
        size="md"
      >
        <ul className="flex flex-col gap-2">
          {structures.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  setEditPickerOpen(false);
                  setEditingStructure(s);
                }}
                className="flex w-full flex-col items-start gap-0.5 rounded-card border border-border bg-card px-4 py-3 text-left text-body text-foreground transition hover:bg-secondary"
              >
                <span className="font-medium">{s.functionalRole}</span>
                <span className="text-small text-muted-foreground">
                  {s.divisions.length === 0
                    ? adTexts.edit_picker_no_divisions_label
                    : s.divisions.join(" / ")}
                  {" · "}
                  {ssTexts.remuneration_type_options[s.remunerationType]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Modal>

      {editingStructure ? (
        <StructureEditModal
          structure={editingStructure}
          open={editingStructure !== null}
          onClose={() => setEditingStructure(null)}
          updateAction={updateStructureAction}
        />
      ) : null}

      <Modal
        open={assignOpen}
        onClose={() => !assignPending && setAssignOpen(false)}
        title={scTexts.create_modal_title}
        description={scTexts.create_modal_description}
        size="md"
        closeDisabled={assignPending}
      >
        <CreateContractForm
          members={staffMembers}
          structures={availableStructures}
          clubCurrencyCode={clubCurrencyCode}
          onCancel={() => setAssignOpen(false)}
          onSubmit={handleCreateContract}
        />
      </Modal>
    </div>
  );
}

function findCoordinator(
  collaborators: ActivityCollaborator[],
): ActivityCollaborator | null {
  for (const c of collaborators) {
    if (/^coordinador/i.test(c.functionalRole.trim())) return c;
  }
  return null;
}

// ---------------------------------------------------------------------------
// CollaboratorGroup — sección por división con header y filas
// ---------------------------------------------------------------------------

type CollaboratorGroupProps = {
  groupKey: string;
  label: string;
  items: ActivityCollaborator[];
  currencyCode: string;
};

function CollaboratorGroup({ label, items, currencyCode }: CollaboratorGroupProps) {
  const total = items.reduce((acc, it) => acc + it.monthlyAmount, 0);

  return (
    <section className="flex flex-col gap-2">
      <header className="flex items-center justify-between gap-3">
        <p className="text-eyebrow uppercase tracking-card-eyebrow text-muted-foreground">
          {adTexts.collaborators_group_header_template
            .replace("{division}", label)
            .replace("{count}", String(items.length))}
        </p>
        <p className="text-eyebrow uppercase tracking-card-eyebrow text-muted-foreground">
          {adTexts.collaborators_group_amount_template.replace(
            "{amount}",
            formatAmountFull(total, currencyCode).replace(/^\D+/, ""),
          )}
        </p>
      </header>
      <ul className="flex flex-col gap-2">
        {items.map((it) => (
          <li
            key={it.contractId}
            className="flex items-center justify-between gap-3 rounded-card border border-border bg-card px-4 py-3"
          >
            <Link
              href={`/rrhh/staff/${it.staffMemberId}`}
              className="flex min-w-0 flex-1 items-center gap-3 hover:underline"
            >
              <Avatar name={it.staffMemberName} size="sm" tone="neutral" />
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-body font-medium text-foreground">
                  {it.staffMemberName}
                </span>
                <span className="truncate text-small text-muted-foreground">
                  {it.functionalRole}
                  {it.primaryDivision ? ` · ${it.primaryDivision}` : ""}
                </span>
              </span>
            </Link>
            <span className="shrink-0 text-body font-semibold tabular-nums text-foreground">
              {formatAmount(it.monthlyAmount, currencyCode)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// ShareBar — progress bar para % del total RRHH
// ---------------------------------------------------------------------------

function ShareBar({ percentage }: { percentage: number }) {
  const clamped = Math.max(0, Math.min(100, percentage));
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-ds-pink-600 transition-all"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// CostEvolutionChart — bar chart simple con divs CSS
// ---------------------------------------------------------------------------

type CostEvolutionChartProps = {
  points: ActivityCostPoint[];
  currencyCode: string;
};

function CostEvolutionChart({ points, currencyCode }: CostEvolutionChartProps) {
  const max = Math.max(...points.map((p) => p.total), 1);
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const variation = prev && prev.total > 0 ? ((last.total - prev.total) / prev.total) * 100 : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-44 items-end gap-3">
        {points.map((p, idx) => {
          const isLast = idx === points.length - 1;
          const heightPct = (p.total / max) * 100;
          return (
            <div key={`${p.year}-${p.month}`} className="flex flex-1 flex-col items-center gap-2">
              <div
                className={`w-full rounded-t-sm ${isLast ? "bg-ds-pink-600" : "bg-secondary"}`}
                style={{ height: `${Math.max(heightPct, 4)}%` }}
                aria-hidden="true"
              />
              <span className="text-eyebrow uppercase tracking-card-eyebrow text-muted-foreground">
                {monthShort(p.year, p.month)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-end justify-between gap-3 border-t border-border pt-3">
        <div className="flex flex-col gap-1">
          <span className="text-eyebrow uppercase tracking-card-eyebrow text-muted-foreground">
            {adTexts.month_short_template
              .replace("{label}", monthShort(last.year, last.month))
              .replace("{year}", String(last.year))}
          </span>
          <span className="text-h2 text-foreground">
            {formatAmountFull(last.total, currencyCode)}
          </span>
        </div>
        {variation !== null ? (
          <div className="flex flex-col items-end gap-1">
            <span className="text-eyebrow uppercase tracking-card-eyebrow text-muted-foreground">
              {adTexts.cost_evolution_variation_label}
            </span>
            <span
              className={
                variation >= 0
                  ? "text-h2 text-ds-pink-600"
                  : "text-h2 text-ds-green-700"
              }
            >
              {variation >= 0 ? "+" : "−"}
              {Math.abs(variation).toFixed(1).replace(".", ",")}%
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

type Group = {
  key: string;
  label: string;
  items: ActivityCollaborator[];
};

function groupByDivision(items: ActivityCollaborator[]): Group[] {
  const map = new Map<string, Group>();
  for (const it of items) {
    const key = it.primaryDivision ?? "__none__";
    const label = it.primaryDivision ?? adTexts.collaborators_no_division_label;
    if (!map.has(key)) {
      map.set(key, { key, label, items: [] });
    }
    map.get(key)!.items.push(it);
  }
  return [...map.values()];
}
