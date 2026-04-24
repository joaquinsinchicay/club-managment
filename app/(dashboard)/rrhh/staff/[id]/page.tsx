import { notFound, redirect } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
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
import { FormBanner } from "@/components/ui/modal-form";
import { LinkButton } from "@/components/ui/link-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canAccessHrModule } from "@/lib/domain/authorization";
import { formatPeriodLabel, type PayrollSettlementStatus } from "@/lib/domain/payroll-settlement";
import { getStaffProfile } from "@/lib/services/hr-staff-profile-service";
import { texts } from "@/lib/texts";

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

function settlementStatusTone(status: PayrollSettlementStatus) {
  if (status === "generada") return "warning" as const;
  if (status === "confirmada") return "accent" as const;
  if (status === "pagada") return "success" as const;
  return "neutral" as const;
}

export default async function StaffProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const context = await getAuthenticatedSessionContext();
  if (!context) redirect("/login");
  if (!context.activeClub || !context.activeMembership) redirect("/pending-approval");
  if (!canAccessHrModule(context.activeMembership)) redirect("/dashboard");

  const clubCurrencyCode = context.activeClub.currencyCode;
  const result = await getStaffProfile(params.id);
  if (!result.ok) {
    if (result.code === "member_not_found") notFound();
    redirect("/dashboard");
  }

  const { profile } = result;
  const profileTexts = texts.rrhh.staff_profile;
  const fullName = `${profile.member.firstName} ${profile.member.lastName}`.trim();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      <header className="flex flex-wrap items-start gap-4">
        <Avatar name={fullName} size="lg" tone="neutral" />
        <div className="grid gap-1">
          <span className="text-eyebrow uppercase text-muted-foreground">
            {profileTexts.eyebrow}
          </span>
          <h1 className="text-h2 font-semibold tracking-tight text-foreground">
            {fullName}
          </h1>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>DNI {profile.member.dni}</span>
            {profile.member.cuitCuil ? (
              <>
                <span>·</span>
                <span>CUIT {profile.member.cuitCuil}</span>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {!profile.hasActiveContract ? (
        <FormBanner variant="warning">{profileTexts.alert_no_active_contracts}</FormBanner>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2">
        <Card padding="comfortable">
          <CardHeader
            eyebrow={profileTexts.totals_eyebrow}
            title={profileTexts.totals_year_title}
          />
          <CardBody>
            <span className="text-h2 font-semibold text-foreground">
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
            <span className="text-h2 font-semibold text-foreground">
              {formatAmount(profile.totals.currentMonth, clubCurrencyCode)}
            </span>
          </CardBody>
        </Card>
      </section>

      <Card padding="none">
        <CardHeader
          eyebrow={profileTexts.personal_eyebrow}
          title={profileTexts.personal_title}
        />
        <CardBody>
          <dl className="grid gap-2 px-5 py-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">{profileTexts.personal_email}</dt>
              <dd className="text-foreground">{profile.member.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{profileTexts.personal_phone}</dt>
              <dd className="text-foreground">{profile.member.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{profileTexts.personal_vinculo}</dt>
              <dd className="text-foreground">
                {texts.rrhh.staff_members.vinculo_options[profile.member.vinculoType]}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{profileTexts.personal_cbu}</dt>
              <dd className="text-foreground">{profile.member.cbuAlias ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{profileTexts.personal_hire_date}</dt>
              <dd className="text-foreground">{profile.member.hireDate}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <section className="grid gap-2">
        <h2 className="text-lg font-semibold text-foreground">
          {profileTexts.contracts_title}
        </h2>
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
                    <span className="grid leading-tight">
                      <span className="text-foreground">{c.salaryStructureName ?? "—"}</span>
                      <span className="text-xs text-muted-foreground">
                        {c.salaryStructureRole ?? ""}
                        {c.salaryStructureActivityName
                          ? ` · ${c.salaryStructureActivityName}`
                          : ""}
                      </span>
                    </span>
                  </DataTableCell>
                  <DataTableCell>{c.startDate}</DataTableCell>
                  <DataTableCell>{c.endDate ?? "—"}</DataTableCell>
                  <DataTableCell align="right">
                    {formatAmount(c.effectiveAmount, clubCurrencyCode)}
                  </DataTableCell>
                  <DataTableCell>
                    <StatusBadge
                      tone={c.status === "vigente" ? "success" : "neutral"}
                      label={texts.rrhh.staff_contracts.status_options[c.status]}
                    />
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </section>

      <section className="grid gap-2">
        <h2 className="text-lg font-semibold text-foreground">
          {profileTexts.settlements_title}
        </h2>
        {profile.settlements.length === 0 ? (
          <DataTableEmpty
            title={profileTexts.settlements_empty_title}
            description={profileTexts.settlements_empty_description}
          />
        ) : (
          <DataTable
            density="compact"
            gridColumns="90px minmax(0,1fr) 110px 120px 120px"
          >
            <DataTableHeader>
              <DataTableHeadCell>{profileTexts.settlements_col_period}</DataTableHeadCell>
              <DataTableHeadCell>{profileTexts.settlements_col_structure}</DataTableHeadCell>
              <DataTableHeadCell align="right">
                {profileTexts.settlements_col_total}
              </DataTableHeadCell>
              <DataTableHeadCell>{profileTexts.settlements_col_status}</DataTableHeadCell>
              <DataTableHeadCell>{profileTexts.settlements_col_paid_at}</DataTableHeadCell>
            </DataTableHeader>
            <DataTableBody>
              {profile.settlements.map((s) => (
                <DataTableRow key={s.id} density="compact">
                  <DataTableCell>
                    <span className="font-mono text-xs">
                      {formatPeriodLabel(s.periodYear, s.periodMonth)}
                    </span>
                  </DataTableCell>
                  <DataTableCell>{s.salaryStructureName ?? "—"}</DataTableCell>
                  <DataTableCell align="right">
                    {formatAmount(s.totalAmount, clubCurrencyCode)}
                  </DataTableCell>
                  <DataTableCell>
                    <StatusBadge
                      tone={settlementStatusTone(s.status)}
                      label={texts.rrhh.settlements.status_options[s.status]}
                    />
                  </DataTableCell>
                  <DataTableCell>
                    {s.paidAt ? s.paidAt.slice(0, 10) : "—"}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </section>

      <section className="grid gap-2">
        <h2 className="text-lg font-semibold text-foreground">
          {profileTexts.payments_title}
        </h2>
        {profile.payments.length === 0 ? (
          <DataTableEmpty
            title={profileTexts.payments_empty_title}
            description={profileTexts.payments_empty_description}
          />
        ) : (
          <DataTable
            density="compact"
            gridColumns="120px 140px minmax(0,1fr) 120px"
          >
            <DataTableHeader>
              <DataTableHeadCell>{profileTexts.payments_col_date}</DataTableHeadCell>
              <DataTableHeadCell>{profileTexts.payments_col_movement}</DataTableHeadCell>
              <DataTableHeadCell>{profileTexts.payments_col_account}</DataTableHeadCell>
              <DataTableHeadCell align="right">
                {profileTexts.payments_col_amount}
              </DataTableHeadCell>
            </DataTableHeader>
            <DataTableBody>
              {profile.payments.map((p) => (
                <DataTableRow key={p.movementId} density="compact">
                  <DataTableCell>{p.movementDate}</DataTableCell>
                  <DataTableCell>
                    <DataTableChip tone="neutral">{p.movementDisplayId}</DataTableChip>
                  </DataTableCell>
                  <DataTableCell>{p.accountName ?? "—"}</DataTableCell>
                  <DataTableCell align="right">
                    {formatAmount(p.amount, p.currencyCode)}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </section>

      <div className="flex justify-end">
        <LinkButton href="/settings?tab=rrhh" variant="secondary">
          {profileTexts.back_to_masters}
        </LinkButton>
      </div>
    </main>
  );
}
