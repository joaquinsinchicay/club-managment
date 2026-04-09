import { redirect } from "next/navigation";

import { setActiveClubAction } from "@/app/(dashboard)/dashboard/actions";
import { AppHeader } from "@/components/navigation/app-header";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";

type DashboardLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

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
