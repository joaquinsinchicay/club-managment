import { redirect } from "next/navigation";

import { createStaffMemberAction } from "@/app/(dashboard)/settings/rrhh/actions";
import { RrhhModuleNav } from "@/components/hr/rrhh-module-nav";
import { StaffMembersTab } from "@/components/hr/staff-members-tab";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canAccessHrMasters, canMutateHrMasters } from "@/lib/domain/authorization";
import { listStaffMembersForActiveClub } from "@/lib/services/staff-member-service";

type SearchParamValue = string | string[] | undefined;

/**
 * US-37 Scenario 4: la card "Alertas" del dashboard /rrhh linkea aquí
 * con `?contract=without_active` para mostrar solo colaboradores sin
 * contratos vigentes. El componente lee este filtro inicial.
 */
function parseContractFilter(raw: SearchParamValue): "with_active" | "all" | "without_active" {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "without_active" || value === "all" || value === "with_active") {
    return value;
  }
  return "with_active";
}

export default async function RrhhStaffPage({
  searchParams,
}: {
  searchParams?: Record<string, SearchParamValue>;
}) {
  const context = await getAuthenticatedSessionContext();
  if (!context) redirect("/login");
  if (!context.activeClub || !context.activeMembership) redirect("/pending-approval");
  if (!canAccessHrMasters(context.activeMembership)) redirect("/dashboard");

  const canMutate = canMutateHrMasters(context.activeMembership);
  const initialContractFilter = parseContractFilter(searchParams?.contract);
  const membersData = await listStaffMembersForActiveClub();
  const members = membersData.ok ? membersData.members : [];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      <RrhhModuleNav activeTab="staff" />
      <StaffMembersTab
        members={members}
        canMutate={canMutate}
        createAction={createStaffMemberAction}
        initialContractFilter={initialContractFilter}
      />
    </main>
  );
}
