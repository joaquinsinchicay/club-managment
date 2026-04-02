import { AppHeader } from "@/components/navigation/app-header";
import { ClubSettingsCard } from "@/components/settings/club-settings-card";
import { ClubSettingsForbiddenCard } from "@/components/settings/club-settings-forbidden-card";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { redirect } from "next/navigation";

export default async function ClubSettingsPage() {
  const context = await getAuthenticatedSessionContext();

  if (!context) {
    redirect("/login");
  }

  if (!context.activeClub || !context.activeMembership) {
    redirect("/pending-approval");
  }

  if (context.activeMembership.role !== "admin") {
    return (
      <div className="min-h-screen">
        <AppHeader context={context} />
        <ClubSettingsForbiddenCard />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader context={context} />
      <ClubSettingsCard context={context} />
    </div>
  );
}
