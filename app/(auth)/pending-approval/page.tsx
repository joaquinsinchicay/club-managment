import { redirect } from "next/navigation";

import { PendingApprovalCard } from "@/components/auth/pending-approval-card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/service";
import { appConfig } from "@/lib/config";

export default async function PendingApprovalPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = appConfig.authProviderMode === "mock"
    ? { data: { user: null } }
    : await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const context = await getSessionContext(user.id);

  if (context.activeMemberships.length > 0) {
    redirect("/dashboard");
  }

  return <PendingApprovalCard user={context.user} />;
}
