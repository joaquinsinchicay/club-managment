import { redirect } from "next/navigation";

import { PendingApprovalCard } from "@/components/auth/pending-approval-card";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";

export default async function PendingApprovalPage() {
  const context = await getAuthenticatedSessionContext();

  if (!context) {
    redirect("/login");
  }

  if (context.activeMemberships.length > 0) {
    redirect("/dashboard");
  }

  return <PendingApprovalCard context={context} />;
}
