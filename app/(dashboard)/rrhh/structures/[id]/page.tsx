import { notFound, redirect } from "next/navigation";

import {
  createStaffContractAction,
  updateSalaryStructureAction,
} from "@/app/(dashboard)/settings/rrhh/actions";
import { ActivityDetailView } from "@/components/hr/activity-detail-view";
import { RrhhModuleNav } from "@/components/hr/rrhh-module-nav";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canAccessHrMasters, canMutateHrMasters } from "@/lib/domain/authorization";
import { staffMemberRepository } from "@/lib/repositories/staff-member-repository";
import { getActivityDetail } from "@/lib/services/hr-activity-detail-service";

export default async function ActivityDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const context = await getAuthenticatedSessionContext();
  if (!context) redirect("/login");
  if (!context.activeClub || !context.activeMembership) redirect("/pending-approval");
  if (!canAccessHrMasters(context.activeMembership)) redirect("/dashboard");

  const clubCurrencyCode = context.activeClub.currencyCode;
  const canMutate = canMutateHrMasters(context.activeMembership);

  // Paralelizar getActivityDetail y staffMember.listForClub: son
  // independientes (staffMembers se necesita para el form de "asignar
  // contrato" en el detail view). Antes eran 2 RTTs secuenciales.
  const [result, staffMembers] = await Promise.all([
    getActivityDetail(params.id),
    staffMemberRepository.listForClub(context.activeClub.id, {}),
  ]);
  if (!result.ok) {
    if (result.code === "activity_not_found") notFound();
    redirect("/rrhh/structures");
  }

  return (
    <>
      <RrhhModuleNav activeTab="structures" />
      <ActivityDetailView
        detail={result.detail}
        clubCurrencyCode={clubCurrencyCode}
        canMutate={canMutate}
        staffMembers={staffMembers}
        updateStructureAction={updateSalaryStructureAction}
        createContractAction={createStaffContractAction}
      />
    </>
  );
}
