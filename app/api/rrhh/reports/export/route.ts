import { NextResponse, type NextRequest } from "next/server";

import {
  formatHrReportCsv,
  getHrReport,
  type HrReportGrouping,
} from "@/lib/services/hr-reports-service";

const VALID_GROUPINGS: HrReportGrouping[] = [
  "period",
  "staff",
  "activity",
  "projected_vs_executed",
];

function parseGrouping(raw: string | null): HrReportGrouping {
  if (raw && (VALID_GROUPINGS as string[]).includes(raw)) return raw as HrReportGrouping;
  return "period";
}

export async function POST(request: NextRequest): Promise<Response> {
  const formData = await request.formData();

  const grouping = parseGrouping(String(formData.get("grouping") ?? ""));
  const from = String(formData.get("from") ?? "") || null;
  const to = String(formData.get("to") ?? "") || null;
  const staffMemberId = String(formData.get("staff_member_id") ?? "") || null;
  const salaryStructureId = String(formData.get("salary_structure_id") ?? "") || null;
  const activityId = String(formData.get("activity_id") ?? "") || null;

  const result = await getHrReport(grouping, {
    from,
    to,
    staffMemberId,
    salaryStructureId,
    activityId,
  });

  if (!result.ok) {
    return NextResponse.json({ code: result.code }, { status: 400 });
  }

  const csv = formatHrReportCsv(grouping, result.rows);
  const filename = `rrhh-${grouping}-${from ?? "inicio"}-${to ?? "fin"}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
