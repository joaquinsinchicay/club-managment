import { redirect } from "next/navigation";

import { PageContentHeader } from "@/components/ui/page-content-header";
import { StatusChip } from "@/components/ui/status-chip";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canAccessHrModule } from "@/lib/domain/authorization";
import { texts } from "@/lib/texts";

const DATE_CHIP_WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function formatDateChip(date: Date): string {
  const dow = DATE_CHIP_WEEKDAYS[date.getDay()] ?? "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dow} · ${dd}/${mm}/${yyyy}`;
}

export default async function RrhhLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getAuthenticatedSessionContext();
  if (!context) redirect("/login");
  if (!context.activeClub || !context.activeMembership) redirect("/pending-approval");
  if (!canAccessHrModule(context.activeMembership)) redirect("/dashboard");

  const home = texts.rrhh.home;
  const dateChipLabel = formatDateChip(new Date());

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      <PageContentHeader
        eyebrow={home.eyebrow}
        title={home.title}
        description={home.description}
        actions={
          <StatusChip dot dotClassName="bg-ds-pink">
            {dateChipLabel}
          </StatusChip>
        }
      />
      {children}
    </main>
  );
}
