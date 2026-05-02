"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { RrhhActionResult } from "@/app/(dashboard)/settings/rrhh/actions";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  DataTable,
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
import { FormBanner } from "@/components/ui/modal-form";
import { CreateContractForm } from "@/components/hr/create-contract-form";
import { StaffMemberFormFields } from "@/components/hr/staff-member-form-fields";
import { Badge } from "@/components/ui/badge";
import { triggerClientFeedback } from "@/lib/client-feedback";
import {
  formatPeriodLabel,
  type PayrollSettlementStatus,
} from "@/lib/domain/payroll-settlement";
import type { SalaryStructure } from "@/lib/domain/salary-structure";
import {
  formatContractCode,
  type StaffContract,
} from "@/lib/domain/staff-contract";
import type {
  StaffActivityEntry,
  StaffProfile,
} from "@/lib/services/hr-staff-profile-service";
import { rrhh as txtRrhh } from "@/lib/texts";

const profileTexts = txtRrhh.staff_profile;
const smTexts = txtRrhh.staff_members;
const scTexts = txtRrhh.staff_contracts;
const ssTexts = txtRrhh.salary_structures;
const settlementTexts = txtRrhh.settlements;

function resolveRemunerationTypeLabel(raw: string | null): string | null {
  if (!raw) return null;
  const opts = ssTexts.remuneration_type_options as Record<string, string>;
  return opts[raw] ?? raw;
}

type StaffProfileViewProps = {
  profile: StaffProfile;
  structures: SalaryStructure[];
  clubCurrencyCode: string;
  /**
   * Cuando es false, la ficha es read-only (mirror para rol Tesorería en
   * /treasury/staff/[id], US-46). Los CTAs de "Nuevo contrato" y "Editar"
   * se ocultan y las actions correspondientes son opcionales.
   */
  canMutate: boolean;
  updateAction?: (formData: FormData) => Promise<RrhhActionResult>;
  createContractAction?: (formData: FormData) => Promise<RrhhActionResult>;
};

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

function formatIsoDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function settlementStatusTone(status: PayrollSettlementStatus) {
  if (status === "generada") return "warning" as const;
  if (status === "aprobada_rrhh") return "accent" as const;
  if (status === "pagada") return "success" as const;
  return "neutral" as const;
}

function formatTenure(hireDateIso: string | null | undefined): string {
  if (!hireDateIso) return profileTexts.tenure_zero;
  const hire = new Date(`${hireDateIso.slice(0, 10)}T00:00:00Z`);
  const now = new Date();
  if (Number.isNaN(hire.getTime()) || now < hire) return profileTexts.tenure_zero;
  let years = now.getUTCFullYear() - hire.getUTCFullYear();
  let months = now.getUTCMonth() - hire.getUTCMonth();
  if (now.getUTCDate() < hire.getUTCDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years <= 0 && months <= 0) return profileTexts.tenure_zero;
  const parts: string[] = [];
  if (years > 0) {
    parts.push(
      `${years} ${years === 1 ? profileTexts.tenure_years_singular : profileTexts.tenure_years_plural}`,
    );
  }
  if (months > 0) {
    parts.push(
      `${months} ${months === 1 ? profileTexts.tenure_months_singular : profileTexts.tenure_months_plural}`,
    );
  }
  return parts.join(" · ");
}

function contractAmountUnit(remunerationType: string | null): string | null {
  if (!remunerationType) return null;
  if (remunerationType === "mensual_fijo") return profileTexts.contracts_amount_unit_mensual_fijo;
  if (remunerationType === "por_hora") return profileTexts.contracts_amount_unit_por_hora;
  if (remunerationType === "por_clase") return profileTexts.contracts_amount_unit_por_clase;
  return null;
}

function contractItemTitle(c: StaffContract): string {
  return profileTexts.contracts_item_title_template
    .replace("{code}", formatContractCode(c.id))
    .replace("{role}", c.salaryStructureRole ?? profileTexts.contracts_item_role_fallback)
    .replace("{structure}", c.salaryStructureName ?? profileTexts.contracts_item_structure_fallback);
}

export function StaffProfileView({
  profile,
  structures,
  clubCurrencyCode,
  canMutate,
  updateAction,
  createContractAction,
}: StaffProfileViewProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [editPending, setEditPending] = useState(false);
  const [newContractOpen, setNewContractOpen] = useState(false);
  const [newContractPending, setNewContractPending] = useState(false);

  const member = profile.member;
  const fullName = `${member.firstName} ${member.lastName}`.trim();
  const canShowMutationCTAs = canMutate;

  const tenureLabel = formatTenure(member.hireDate);
  const hireLabel = profileTexts.tenure_since_template.replace(
    "{date}",
    formatIsoDate(member.hireDate),
  );
  const headerAltaLabel = profileTexts.header_alta_template.replace(
    "{date}",
    formatIsoDate(member.hireDate),
  );

  const availableStructures = structures.filter(
    (s) => s.status === "activa" && !s.hasActiveContract,
  );

  async function handleEditSubmit(formData: FormData) {
    if (!updateAction) return;
    setEditPending(true);
    try {
      const result = await updateAction(formData);
      triggerClientFeedback("settings", result.code);
      if (result.ok) {
        setEditOpen(false);
        startTransition(() => router.refresh());
      }
    } finally {
      setEditPending(false);
    }
  }

  async function handleCreateContractSubmit(formData: FormData) {
    if (!createContractAction) return;
    setNewContractPending(true);
    try {
      const result = await createContractAction(formData);
      triggerClientFeedback("settings", result.code);
      if (result.ok) {
        setNewContractOpen(false);
        startTransition(() => router.refresh());
      }
    } finally {
      setNewContractPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-eyebrow uppercase tracking-card-eyebrow text-muted-foreground">
        <Link href="/rrhh/staff" className="hover:text-foreground">
          {profileTexts.breadcrumb_root}
        </Link>
        <span aria-hidden="true">·</span>
        <span className="break-words text-foreground">{fullName}</span>
      </nav>

      {/* Header card */}
      <Card padding="comfortable">
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <Avatar name={fullName} size="lg" tone="neutral" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-eyebrow uppercase tracking-card-eyebrow text-muted-foreground">
                {headerAltaLabel}
              </p>
              <h1 className="break-words text-h1 text-foreground">{fullName}</h1>
              <div className="flex flex-wrap items-center gap-1.5 text-body text-muted-foreground">
                <span>DNI {member.dni}</span>
                {member.cuitCuil ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>CUIT {member.cuitCuil}</span>
                  </>
                ) : null}
                {member.email ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="break-all">{member.email}</span>
                  </>
                ) : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge
                  tone={profile.hasActiveContract ? "success" : "neutral"}
                  label={
                    profile.hasActiveContract
                      ? smTexts.filter_with_active
                      : smTexts.filter_without_active
                  }
                />
                <DataTableChip tone="neutral">
                  {smTexts.vinculo_options[member.vinculoType]}
                </DataTableChip>
              </div>
            </div>
          </div>
          {canShowMutationCTAs ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setNewContractOpen(true)}
                className={buttonClass({ variant: "accent-rrhh", size: "md" })}
              >
                {profileTexts.new_contract_cta}
              </button>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className={buttonClass({ variant: "secondary", size: "md" })}
              >
                {profileTexts.edit_cta}
              </button>
            </div>
          ) : null}
        </div>
      </Card>

      {!profile.hasActiveContract ? (
        <FormBanner variant="warning">{profileTexts.alert_no_active_contracts}</FormBanner>
      ) : null}

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="flex flex-col gap-6">
          {/* Datos personales */}
          <Card padding="comfortable">
            <CardHeader
              title={profileTexts.info_title}
              description={profileTexts.info_description}
            />
            <CardBody>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-3">
                <InfoItem label={profileTexts.info_fullname_label} value={fullName} />
                <InfoItem label={profileTexts.info_dni_label} value={member.dni} />
                <InfoItem label={profileTexts.info_cuil_label} value={member.cuitCuil} />
                <InfoItem
                  label={profileTexts.info_vinculo_label}
                  value={smTexts.vinculo_options[member.vinculoType]}
                />
                <InfoItem
                  label={profileTexts.info_hire_date_label}
                  value={formatIsoDate(member.hireDate)}
                />
              </dl>
            </CardBody>
          </Card>

          {/* Contacto */}
          <Card padding="comfortable">
            <CardHeader
              title={profileTexts.contact_title}
              description={profileTexts.contact_description}
            />
            <CardBody>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <InfoItem label={profileTexts.contact_email_label} value={member.email} />
                <InfoItem label={profileTexts.contact_phone_label} value={member.phone} />
              </dl>
            </CardBody>
          </Card>

          {/* Datos bancarios */}
          <Card padding="comfortable">
            <CardHeader
              title={profileTexts.bank_title}
              description={profileTexts.bank_description}
            />
            <CardBody>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4">
                <InfoItem label={profileTexts.bank_cbu_label} value={member.cbuAlias} />
              </dl>
            </CardBody>
          </Card>

          {/* Contratos — lista tipo card items */}
          <Card padding="comfortable">
            <CardHeader
              title={profileTexts.contracts_title}
              action={
                canShowMutationCTAs ? (
                  <button
                    type="button"
                    onClick={() => setNewContractOpen(true)}
                    className={buttonClass({ variant: "accent-rrhh", size: "sm" })}
                  >
                    {profileTexts.contracts_new_cta}
                  </button>
                ) : undefined
              }
            />
            <CardBody>
              {profile.contracts.length === 0 ? (
                <DataTableEmpty
                  title={profileTexts.contracts_empty_title}
                  description={profileTexts.contracts_empty_description}
                />
              ) : (
                <ul className="grid gap-2">
                  {profile.contracts.map((c) => {
                    const rangeLabel = c.endDate
                      ? profileTexts.contracts_item_range_template
                          .replace("{from}", formatIsoDate(c.startDate))
                          .replace("{to}", formatIsoDate(c.endDate))
                      : profileTexts.contracts_item_since_template.replace(
                          "{from}",
                          formatIsoDate(c.startDate),
                        );
                    const unitLabel = contractAmountUnit(c.salaryStructureRemunerationType);
                    return (
                      <li
                        key={c.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-card px-4 py-3"
                      >
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <Link
                            href={`/rrhh/contracts/${c.id}`}
                            className="break-words text-sm font-semibold text-foreground hover:underline"
                          >
                            {contractItemTitle(c)}
                          </Link>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{rangeLabel}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Badge
                              tone={c.status === "vigente" ? "success" : "neutral"}
                              label={scTexts.status_options[c.status]}
                            />
                            {c.salaryStructureRemunerationType ? (
                              <DataTableChip tone="neutral">
                                {resolveRemunerationTypeLabel(
                                  c.salaryStructureRemunerationType,
                                )}
                              </DataTableChip>
                            ) : null}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="flex items-baseline gap-1">
                            <span className="font-semibold tabular-nums text-foreground">
                              {formatAmount(c.currentAmount, clubCurrencyCode)}
                            </span>
                          </div>
                          {unitLabel ? (
                            <span className="text-xs text-muted-foreground">{unitLabel}</span>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>

          {/* Liquidaciones */}
          <Card padding="comfortable">
            <CardHeader title={profileTexts.settlements_title} />
            <CardBody>
              {profile.settlements.length === 0 ? (
                <DataTableEmpty
                  title={profileTexts.settlements_empty_title}
                  description={profileTexts.settlements_empty_description}
                />
              ) : (
                <DataTable
                  density="compact"
                  gridColumns="100px minmax(0,1fr) 130px 120px"
                >
                  <DataTableHeader>
                    <DataTableHeadCell>{profileTexts.settlements_col_period}</DataTableHeadCell>
                    <DataTableHeadCell>{profileTexts.settlements_col_structure}</DataTableHeadCell>
                    <DataTableHeadCell align="right">
                      {profileTexts.settlements_col_total}
                    </DataTableHeadCell>
                    <DataTableHeadCell>{profileTexts.settlements_col_status}</DataTableHeadCell>
                  </DataTableHeader>
                  <DataTableBody>
                    {profile.settlements.map((s) => (
                      <DataTableRow key={s.id} density="compact">
                        <DataTableCell>
                          <span className="font-mono text-xs">
                            {formatPeriodLabel(s.periodYear, s.periodMonth)}
                          </span>
                        </DataTableCell>
                        <DataTableCell>
                          <span className="break-words">{s.salaryStructureName ?? "—"}</span>
                        </DataTableCell>
                        <DataTableCell align="right">
                          <span className="shrink-0 font-semibold tabular-nums">
                            {formatAmount(s.totalAmount, clubCurrencyCode)}
                          </span>
                        </DataTableCell>
                        <DataTableCell>
                          <Badge
                            tone={settlementStatusTone(s.status)}
                            label={settlementTexts.status_options[s.status]}
                          />
                        </DataTableCell>
                      </DataTableRow>
                    ))}
                  </DataTableBody>
                </DataTable>
              )}
            </CardBody>
          </Card>
        </section>

        <aside className="flex flex-col gap-6">
          {/* Antigüedad (accent-rrhh) */}
          <Card padding="comfortable" tone="accent-rrhh">
            <div className="flex flex-col gap-2">
              <p className="text-eyebrow uppercase tracking-card-eyebrow text-ds-pink-700">
                {profileTexts.tenure_eyebrow}
              </p>
              <p className="break-words text-h1 text-foreground">{tenureLabel}</p>
              <p className="text-body text-muted-foreground">{hireLabel}</p>
            </div>
          </Card>

          {/* Actividad reciente */}
          <Card padding="comfortable">
            <div className="flex flex-col gap-3">
              <p className="text-eyebrow uppercase tracking-card-eyebrow text-muted-foreground">
                {profileTexts.activity_eyebrow}
              </p>
              {profile.recentActivity.length === 0 ? (
                <p className="text-body text-muted-foreground">
                  {profileTexts.activity_empty}
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {profile.recentActivity.map((entry) => (
                    <RecentActivityItem
                      key={entry.id}
                      entry={entry}
                      currencyCode={clubCurrencyCode}
                    />
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </aside>
      </div>

      {/* Edit modal */}
      <Modal
        open={editOpen}
        onClose={() => {
          if (editPending) return;
          setEditOpen(false);
        }}
        title={profileTexts.edit_modal_title}
        description={profileTexts.edit_modal_description}
        size="md"
        closeDisabled={editPending}
      >
        <form action={handleEditSubmit} className="grid gap-4">
          <input type="hidden" name="staff_member_id" value={member.id} />
          <StaffMemberFormFields member={member} />
          <ModalFooter
            onCancel={() => setEditOpen(false)}
            cancelLabel={profileTexts.edit_cancel_cta}
            submitLabel={profileTexts.edit_submit_cta}
            pendingLabel={profileTexts.edit_pending}
          />
        </form>
      </Modal>

      {/* New contract modal */}
      <Modal
        open={newContractOpen}
        onClose={() => {
          if (newContractPending) return;
          setNewContractOpen(false);
        }}
        title={profileTexts.new_contract_modal_title}
        description={profileTexts.new_contract_modal_description}
        size="md"
        closeDisabled={newContractPending}
      >
        <CreateContractForm
          members={[member]}
          structures={availableStructures}
          clubCurrencyCode={clubCurrencyCode}
          onCancel={() => setNewContractOpen(false)}
          onSubmit={handleCreateContractSubmit}
        />
      </Modal>

    </div>
  );
}

// ---------------------------------------------------------------------------
// InfoItem — celda label+value para el dl grid
// ---------------------------------------------------------------------------

type InfoItemProps = {
  label: string;
  value: string | null | undefined;
};

function InfoItem({ label, value }: InfoItemProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-eyebrow uppercase tracking-card-eyebrow text-muted-foreground">
        {label}
      </dt>
      <dd className="break-words text-body text-foreground">
        {value && value.length > 0 ? value : profileTexts.info_value_fallback}
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecentActivityItem — fila del feed de actividad reciente (US-67)
// ---------------------------------------------------------------------------

const activityActionTexts = profileTexts.activity_actions as Record<string, string>;

function activityKey(entry: StaffActivityEntry): string {
  // staff_member updated cuando solo cambian los campos bancarios → label específico
  if (entry.entityType === "staff_member" && entry.action === "updated") {
    const before = entry.payloadBefore ?? {};
    const after = entry.payloadAfter ?? {};
    const changed = new Set<string>();
    for (const k of Object.keys(after)) {
      if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) changed.add(k);
    }
    if (changed.size > 0 && [...changed].every((k) => k === "cbuAlias" || k === "cbu_alias")) {
      return "staff_member_bank_updated";
    }
  }
  return `${entry.entityType}_${entry.action}`;
}

function activityDetail(
  entry: StaffActivityEntry,
  currencyCode: string,
): string {
  const performed = formatIsoDate(entry.performedAt);
  const after = entry.payloadAfter ?? {};
  const parts: string[] = [performed];
  if (entry.entityType === "payroll_settlement") {
    const py = typeof after.periodYear === "number" ? after.periodYear : null;
    const pm = typeof after.periodMonth === "number" ? after.periodMonth : null;
    if (py && pm) parts.push(formatPeriodLabel(py, pm));
    const total = typeof after.totalAmount === "number" ? after.totalAmount : null;
    if (total !== null) parts.push(formatAmount(total, currencyCode));
  } else if (entry.entityType === "staff_contract" && entry.action === "created") {
    const code = typeof after.id === "string" ? formatContractCode(after.id) : null;
    if (code) parts.push(code);
  } else if (entry.entityType === "staff_contract_revision") {
    const amount = typeof after.amount === "number" ? after.amount : null;
    if (amount !== null) parts.push(formatAmount(amount, currencyCode));
  }
  return parts.join(" · ");
}

type RecentActivityItemProps = {
  entry: StaffActivityEntry;
  currencyCode: string;
};

function RecentActivityItem({ entry, currencyCode }: RecentActivityItemProps) {
  const key = activityKey(entry);
  const label = activityActionTexts[key] ?? activityActionTexts.fallback;
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="mt-2 size-1.5 shrink-0 rounded-full bg-ds-pink-600"
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="break-words text-body font-semibold text-foreground">{label}</p>
        <p className="break-words text-small text-muted-foreground">
          {activityDetail(entry, currencyCode)}
        </p>
      </div>
    </li>
  );
}
