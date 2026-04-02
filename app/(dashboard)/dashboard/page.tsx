import { redirect } from "next/navigation";

import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { getSessionContext } from "@/lib/auth/service";
import { appConfig } from "@/lib/config";
import { getCurrentActiveClubId } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = appConfig.authProviderMode === "mock"
    ? { data: { user: null } }
    : await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const context = await getSessionContext(user.id, await getCurrentActiveClubId());

  if (context.activeMemberships.length === 0 || !context.activeClub) {
    redirect("/pending-approval");
  }

  return <DashboardCard context={context} />;
}
