import { redirect } from "next/navigation";

import { setActiveClubAction } from "@/app/(dashboard)/dashboard/actions";
import { AppHeader } from "@/components/navigation/app-header";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";

type DashboardLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

/**
 * Guard de jornada (`ensureStaleDailyCashSessionAutoClosedForActiveClub`)
 * solía ejecutarse aquí en cada navegación, pero solo es relevante para
 * las pages que muestran datos de tesorería con jornada
 * (/dashboard, /secretary, /treasury). En /rrhh, /settings, /modules era
 * 1 RTT gratis. Ahora cada page que lo necesita lo invoca explícitamente
 * vía `ensureDailyCashSessionGuardForActiveClub()`.
 */
export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const context = await getAuthenticatedSessionContext();

  if (!context) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader context={context} setActiveClubAction={setActiveClubAction} />
      {children}
    </div>
  );
}
