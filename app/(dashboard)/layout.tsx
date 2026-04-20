import { redirect } from "next/navigation";

import { setActiveClubAction } from "@/app/(dashboard)/dashboard/actions";
import { AppHeader } from "@/components/navigation/app-header";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { ensureStaleDailyCashSessionAutoClosedForActiveClub } from "@/lib/services/treasury-service";

type DashboardLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const context = await getAuthenticatedSessionContext();

  if (!context) {
    redirect("/login");
  }

  if (context.activeClub) {
    try {
      await ensureStaleDailyCashSessionAutoClosedForActiveClub({
        activeClub: { id: context.activeClub.id },
        user: { id: context.user.id }
      });
    } catch (error) {
      console.warn("[daily-session-guard-failed]", {
        clubId: context.activeClub.id,
        userId: context.user.id,
        error
      });
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader context={context} setActiveClubAction={setActiveClubAction} />
      {children}
    </div>
  );
}
