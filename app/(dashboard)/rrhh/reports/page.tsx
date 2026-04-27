import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageContentHeader } from "@/components/ui/page-content-header";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHeadCell,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
import {
  FormBanner,
  FormField,
  FormFieldLabel,
  FormInput,
  FormSelect,
} from "@/components/ui/modal-form";
import { LinkButton } from "@/components/ui/link-button";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canAccessHrModule } from "@/lib/domain/authorization";
import type { ClubActivity } from "@/lib/domain/access";
import type { SalaryStructure } from "@/lib/domain/salary-structure";
import type { StaffMember } from "@/lib/domain/staff-member";
import { accessRepository } from "@/lib/repositories/access-repository";
import { salaryStructureRepository } from "@/lib/repositories/salary-structure-repository";
import { staffMemberRepository } from "@/lib/repositories/staff-member-repository";
import { getHrReport, type HrReportGrouping } from "@/lib/services/hr-reports-service";
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

function parseGrouping(raw: string | undefined): HrReportGrouping {
  if (raw === "period" || raw === "staff" || raw === "activity" || raw === "projected_vs_executed") {
    return raw;
  }
  return "period";
}

export default async function RrhhReportsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const context = await getAuthenticatedSessionContext();
  if (!context) redirect("/login");
  if (!context.activeClub || !context.activeMembership) redirect("/pending-approval");
  if (!canAccessHrModule(context.activeMembership)) redirect("/dashboard");

  const clubId = context.activeClub.id;
  const clubCurrencyCode = context.activeClub.currencyCode;
  const reportTexts = texts.rrhh.reports;

  const toString = (v: string | string[] | undefined): string =>
    Array.isArray(v) ? v[0] ?? "" : v ?? "";

  const grouping = parseGrouping(toString(searchParams?.grouping));
  const from = toString(searchParams?.from) || null;
  const to = toString(searchParams?.to) || null;
  const staffMemberIdFilter = toString(searchParams?.staff_member_id) || null;
  const salaryStructureIdFilter = toString(searchParams?.salary_structure_id) || null;
  const activityIdFilter = toString(searchParams?.activity_id) || null;

  const [members, structures, activities, reportResult] = await Promise.all([
    staffMemberRepository.listForClub(clubId),
    salaryStructureRepository.listForClub(clubId),
    accessRepository.listClubActivitiesForClub(clubId),
    getHrReport(grouping, {
      from,
      to,
      staffMemberId: staffMemberIdFilter,
      salaryStructureId: salaryStructureIdFilter,
      activityId: activityIdFilter,
    }),
  ]);

  const rows = reportResult.ok ? reportResult.rows : [];
  const totalSum = reportResult.ok ? reportResult.totalSum : 0;
  const rangeTooLarge = !reportResult.ok && reportResult.code === "range_too_large";

  const groupingOptions: { value: HrReportGrouping; label: string }[] = [
    { value: "period", label: reportTexts.grouping_period },
    { value: "staff", label: reportTexts.grouping_staff },
    { value: "activity", label: reportTexts.grouping_activity },
    { value: "projected_vs_executed", label: reportTexts.grouping_projected_executed },
  ];

  return (
    <>
      <PageContentHeader
        eyebrow={reportTexts.page_eyebrow}
        title={reportTexts.page_title}
        description={reportTexts.page_description}
        actions={
          <LinkButton href="/rrhh" variant="secondary" size="sm">
            {reportTexts.back_cta}
          </LinkButton>
        }
      />

      <form method="get" className="grid gap-3">
        <Card padding="comfortable">
          <CardHeader
            eyebrow={reportTexts.filters_eyebrow}
            title={reportTexts.filters_title}
          />
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <FormField>
                <FormFieldLabel>{reportTexts.filter_grouping_label}</FormFieldLabel>
                <FormSelect name="grouping" defaultValue={grouping}>
                  {groupingOptions.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </FormSelect>
              </FormField>
              <FormField>
                <FormFieldLabel>{reportTexts.filter_from_label}</FormFieldLabel>
                <FormInput type="date" name="from" defaultValue={from ?? ""} />
              </FormField>
              <FormField>
                <FormFieldLabel>{reportTexts.filter_to_label}</FormFieldLabel>
                <FormInput type="date" name="to" defaultValue={to ?? ""} />
              </FormField>
              <FormField>
                <FormFieldLabel>{reportTexts.filter_staff_label}</FormFieldLabel>
                <FormSelect name="staff_member_id" defaultValue={staffMemberIdFilter ?? ""}>
                  <option value="">{reportTexts.filter_any}</option>
                  {members.map((m: StaffMember) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName}
                    </option>
                  ))}
                </FormSelect>
              </FormField>
              <FormField>
                <FormFieldLabel>{reportTexts.filter_structure_label}</FormFieldLabel>
                <FormSelect
                  name="salary_structure_id"
                  defaultValue={salaryStructureIdFilter ?? ""}
                >
                  <option value="">{reportTexts.filter_any}</option>
                  {structures.map((s: SalaryStructure) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </FormSelect>
              </FormField>
              <FormField>
                <FormFieldLabel>{reportTexts.filter_activity_label}</FormFieldLabel>
                <FormSelect name="activity_id" defaultValue={activityIdFilter ?? ""}>
                  <option value="">{reportTexts.filter_any}</option>
                  {activities.map((a: ClubActivity) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </FormSelect>
              </FormField>
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button type="submit" variant="primary">
                {reportTexts.apply_cta}
              </Button>
              <LinkButton href="/rrhh/reports" variant="secondary">
                {reportTexts.reset_cta}
              </LinkButton>
            </div>
          </CardBody>
        </Card>
      </form>

      {rangeTooLarge ? (
        <FormBanner variant="warning">{reportTexts.range_too_large}</FormBanner>
      ) : null}

      <Card padding="none">
        <CardHeader
          eyebrow={reportTexts.result_eyebrow}
          title={reportTexts.result_title}
          description={
            grouping === "projected_vs_executed"
              ? reportTexts.result_projected_note
              : reportTexts.result_paid_note
          }
          action={
            <form
              method="post"
              action="/api/rrhh/reports/export"
              className="inline"
            >
              <input type="hidden" name="grouping" value={grouping} />
              <input type="hidden" name="from" value={from ?? ""} />
              <input type="hidden" name="to" value={to ?? ""} />
              <input
                type="hidden"
                name="staff_member_id"
                value={staffMemberIdFilter ?? ""}
              />
              <input
                type="hidden"
                name="salary_structure_id"
                value={salaryStructureIdFilter ?? ""}
              />
              <input type="hidden" name="activity_id" value={activityIdFilter ?? ""} />
              <Button type="submit" variant="secondary">
                {reportTexts.export_csv_cta}
              </Button>
            </form>
          }
          divider
        />
        <CardBody>
          <div className="mb-3 text-sm text-muted-foreground">
            <strong>{reportTexts.total_label}:</strong>{" "}
            {formatAmount(totalSum, clubCurrencyCode)}
          </div>

          {rows.length === 0 ? (
            <DataTableEmpty
              title={reportTexts.empty_title}
              description={reportTexts.empty_description}
            />
          ) : grouping === "projected_vs_executed" ? (
            <DataTable
              density="compact"
              gridColumns="100px 130px 130px 130px 100px"
            >
              <DataTableHeader>
                <DataTableHeadCell>{reportTexts.col_period}</DataTableHeadCell>
                <DataTableHeadCell align="right">
                  {reportTexts.col_projected}
                </DataTableHeadCell>
                <DataTableHeadCell align="right">
                  {reportTexts.col_executed}
                </DataTableHeadCell>
                <DataTableHeadCell align="right">
                  {reportTexts.col_diff}
                </DataTableHeadCell>
                <DataTableHeadCell align="right">
                  {reportTexts.col_diff_pct}
                </DataTableHeadCell>
              </DataTableHeader>
              <DataTableBody>
                {rows.map((row) => (
                  <DataTableRow key={row.key} density="compact">
                    <DataTableCell>{row.label}</DataTableCell>
                    <DataTableCell align="right">
                      {formatAmount(row.total, clubCurrencyCode)}
                    </DataTableCell>
                    <DataTableCell align="right">
                      {formatAmount(row.secondary ?? 0, clubCurrencyCode)}
                    </DataTableCell>
                    <DataTableCell align="right">
                      <span
                        className={
                          (row.diff ?? 0) < 0
                            ? "text-destructive font-semibold"
                            : "text-foreground font-semibold"
                        }
                      >
                        {formatAmount(row.diff ?? 0, clubCurrencyCode)}
                      </span>
                    </DataTableCell>
                    <DataTableCell align="right">
                      {row.diffPct === null || row.diffPct === undefined
                        ? "—"
                        : `${row.diffPct.toFixed(1)}%`}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          ) : (
            <DataTable density="compact" gridColumns="minmax(0,1fr) 180px">
              <DataTableHeader>
                <DataTableHeadCell>
                  {grouping === "period"
                    ? reportTexts.col_period
                    : grouping === "staff"
                    ? reportTexts.col_staff
                    : reportTexts.col_activity}
                </DataTableHeadCell>
                <DataTableHeadCell align="right">
                  {reportTexts.col_total}
                </DataTableHeadCell>
              </DataTableHeader>
              <DataTableBody>
                {rows.map((row) => (
                  <DataTableRow key={row.key} density="compact">
                    <DataTableCell>{row.label}</DataTableCell>
                    <DataTableCell align="right">
                      <span className="font-semibold text-foreground">
                        {formatAmount(row.total, clubCurrencyCode)}
                      </span>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}
        </CardBody>
      </Card>
    </>
  );
}
