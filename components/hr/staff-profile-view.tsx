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
import { LinkButton } from "@/components/ui/link-button";
import { Modal } from "@/components/ui/modal";
import { ModalFooter } from "@/components/ui/modal-footer";
import { FormBanner } from "@/components/ui/modal-form";
import { StaffMemberFormFields } from "@/components/hr/staff-member-form-fields";
import { StatusBadge } from "@/components/ui/status-badge";
import { triggerClientFeedback } from "@/lib/client-feedback";
import {
  formatPeriodLabel,
  type PayrollSettlementStatus,
} from "@/lib/domain/payroll-settlement";
import type { StaffProfile } from "@/lib/services/hr-staff-profile-service";
import { texts } from "@/lib/texts";

const profileTexts = texts.rrhh.staff_profile;
const smTexts = texts.rrhh.staff_members;
const scTexts = texts.rrhh.staff_contracts;
const settlementTexts = texts.rrhh.settlements;

type StaffProfileViewProps = {
  profile: StaffProfile;
  clubCurrencyCode: string;
  canMutate: boolean;
  updateAction: (formData: FormData) => Promise<RrhhActionResult>;
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
  if (status === "confirmada") return "accent" as const;
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

export function StaffProfileView({
  profile,
  clubCurrencyCode,
  canMutate,
  updateAction,
}: StaffProfileViewProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [editPending, setEditPending] = useState(false);

  const member = profile.member;
  const fullName = `${member.firstName} ${member.lastName}`.trim();
  const tenureLabel = formatTenure(member.hireDate);
  const hireLabel = profileTexts.tenure_since_template.replace(
    "{date}",
    formatIsoDate(member.hireDate),
  );
  const headerAltaLabel = profileTexts.header_alta_template.replace(
    "{date}",
    formatIsoDate(member.hireDate),
  );

  async function handleEditSubmit(formData: FormData) {
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

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
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
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {headerAltaLabel}
              </p>
              <h1 className="break-words text-h2 font-bold text-foreground">{fullName}</h1>
              <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
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
                <StatusBadge
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
          <div className="flex flex-wrap items-center gap-2">
            <LinkButton href="/rrhh/contracts" variant="accent-rrhh" size="md">
              {profileTexts.new_contract_cta}
            </LinkButton>
            {canMutate ? (
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className={buttonClass({ variant: "secondary", size: "md" })}
              >
                {profileTexts.edit_cta}
              </button>
            ) : null}
          </div>
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
              divider
            />
            <CardBody>
              <dl className="grid gap-x-6 gap-y-4 text-sm grid-cols-2 lg:grid-cols-3">
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
              divider
            />
            <CardBody>
              <dl className="grid gap-x-6 gap-y-4 text-sm grid-cols-1 sm:grid-cols-2">
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
              divider
            />
            <CardBody>
              <dl className="grid gap-x-6 gap-y-4 text-sm grid-cols-1">
                <InfoItem label={profileTexts.bank_cbu_label} value={member.cbuAlias} />
              </dl>
            </CardBody>
          </Card>

          {/* Contratos */}
          <Card padding="comfortable">
            <CardHeader title={profileTexts.contracts_title} divider />
            <CardBody>
              {profile.contracts.length === 0 ? (
                <DataTableEmpty
                  title={profileTexts.contracts_empty_title}
                  description={profileTexts.contracts_empty_description}
                />
              ) : (
                <DataTable
                  density="compact"
                  gridColumns="minmax(0,1.4fr) 110px 110px 130px 120px"
                >
                  <DataTableHeader>
                    <DataTableHeadCell>{profileTexts.contracts_col_structure}</DataTableHeadCell>
                    <DataTableHeadCell>{profileTexts.contracts_col_start}</DataTableHeadCell>
                    <DataTableHeadCell>{profileTexts.contracts_col_end}</DataTableHeadCell>
                    <DataTableHeadCell align="right">
                      {profileTexts.contracts_col_amount}
                    </DataTableHeadCell>
                    <DataTableHeadCell>{profileTexts.contracts_col_status}</DataTableHeadCell>
                  </DataTableHeader>
                  <DataTableBody>
                    {profile.contracts.map((c) => (
                      <DataTableRow key={c.id} density="compact">
                        <DataTableCell>
                          <Link
                            href={`/rrhh/contracts/${c.id}`}
                            className="break-words font-medium text-foreground hover:underline"
                          >
                            {c.salaryStructureName ?? "—"}
                          </Link>
                        </DataTableCell>
                        <DataTableCell>{formatIsoDate(c.startDate)}</DataTableCell>
                        <DataTableCell>{formatIsoDate(c.endDate)}</DataTableCell>
                        <DataTableCell align="right">
                          <span className="shrink-0 font-semibold tabular-nums">
                            {formatAmount(c.currentAmount, clubCurrencyCode)}
                          </span>
                        </DataTableCell>
                        <DataTableCell>
                          <StatusBadge
                            tone={c.status === "vigente" ? "success" : "neutral"}
                            label={scTexts.status_options[c.status]}
                          />
                        </DataTableCell>
                      </DataTableRow>
                    ))}
                  </DataTableBody>
                </DataTable>
              )}
            </CardBody>
          </Card>

          {/* Liquidaciones */}
          <Card padding="comfortable">
            <CardHeader title={profileTexts.settlements_title} divider />
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
                          <StatusBadge
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
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ds-pink-700">
                {profileTexts.tenure_eyebrow}
              </p>
              <p className="break-words text-2xl font-bold text-foreground sm:text-h1">
                {tenureLabel}
              </p>
              <p className="text-sm text-muted-foreground">{hireLabel}</p>
            </div>
          </Card>

          {/* Totales */}
          <Card padding="comfortable">
            <CardHeader
              eyebrow={profileTexts.totals_eyebrow}
              title={profileTexts.totals_year_title}
            />
            <CardBody>
              <span className="break-words text-2xl font-bold tabular-nums text-foreground sm:text-h1">
                {formatAmount(profile.totals.yearToDate, clubCurrencyCode)}
              </span>
            </CardBody>
          </Card>

          <Card padding="comfortable">
            <CardHeader
              eyebrow={profileTexts.totals_eyebrow}
              title={profileTexts.totals_month_title}
            />
            <CardBody>
              <span className="break-words text-2xl font-bold tabular-nums text-foreground sm:text-h1">
                {formatAmount(profile.totals.currentMonth, clubCurrencyCode)}
              </span>
            </CardBody>
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
      <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </dt>
      <dd className="break-words text-sm text-foreground">
        {value && value.length > 0 ? value : profileTexts.info_value_fallback}
      </dd>
    </div>
  );
}
