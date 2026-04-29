import { notFound, redirect } from "next/navigation";

import { StaffProfileView } from "@/components/hr/staff-profile-view";
import { LinkButton } from "@/components/ui/link-button";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canAccessTreasuryStaffProfile } from "@/lib/domain/authorization";
import { getStaffProfile } from "@/lib/services/hr-staff-profile-service";
import { texts } from "@/lib/texts";

/**
 * US-46 · Mirror read-only de la ficha de colaborador para rol Tesorería.
 *
 * Reusa <StaffProfileView> con `canMutate=false` y sin pasar
 * `updateAction`/`createContractAction` — el componente oculta los CTAs
 * de edición y "Nuevo contrato" cuando `canMutate` es false. La data
 * (datos personales, contratos, liquidaciones, pagos) se sirve desde el
 * mismo `getStaffProfile` que /rrhh/staff/[id], gateado por el guard
 * permisivo `canViewStaffProfile` (rol RRHH o Tesorería).
 *
 * El módulo /rrhh sigue siendo exclusivo de rol RRHH (CLAUDE.md). Esto
 * es solo el mirror para que Tesorería pueda consultar el histórico de
 * un colaborador antes/después de pagar.
 */
export default async function TreasuryStaffProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const context = await getAuthenticatedSessionContext();
  if (!context) redirect("/login");
  if (!context.activeClub || !context.activeMembership) redirect("/pending-approval");
  if (!canAccessTreasuryStaffProfile(context.activeMembership)) redirect("/treasury");

  const clubCurrencyCode = context.activeClub.currencyCode;
  const profileResult = await getStaffProfile(params.id);

  if (!profileResult.ok) {
    if (profileResult.code === "member_not_found") notFound();
    redirect("/treasury");
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      <nav className="flex items-center gap-2 text-xs font-semibold uppercase tracking-card-eyebrow text-muted-foreground">
        <LinkButton href="/treasury?tab=payroll" variant="secondary" size="sm">
          {texts.dashboard.treasury.payroll.page_title}
        </LinkButton>
      </nav>
      <StaffProfileView
        profile={profileResult.profile}
        structures={[]}
        clubCurrencyCode={clubCurrencyCode}
        canMutate={false}
      />
    </main>
  );
}
