"use client";

import Image from "next/image";

import { ActiveClubSelector } from "@/components/dashboard/active-club-selector";
import { AppHeaderTabs, type AppHeaderTab } from "@/components/navigation/app-header-tabs";
import { AvatarSessionMenu } from "@/components/navigation/avatar-session-menu";
import { getInitials } from "@/components/ui/avatar";
import type { SessionContext } from "@/lib/auth/service";
import {
  canAccessDashboardSummary,
  canAccessClubSettingsNavigation,
  canAccessHrModule,
  canOperateSecretaria,
  canOperateTesoreria
} from "@/lib/domain/authorization";
import { formatMembershipRoles } from "@/lib/domain/membership-roles";
import { dashboard as txtDashboard, header as txtHeader } from "@/lib/texts";

type AppHeaderProps = {
  context: SessionContext;
  setActiveClubAction?: (formData: FormData) => Promise<void>;
};

export function AppHeader({ context, setActiveClubAction }: AppHeaderProps) {
  const roleLabel = context.activeMembership
    ? formatMembershipRoles(context.activeMembership.roles)
    : txtDashboard.role_pending;
  const clubLabel = context.activeClub?.name ?? txtHeader.pending_club_label;
  const clubInitials = getInitials(clubLabel);
  const clubLogoUrl = context.activeClub?.logoUrl ?? null;
  const clubPrimaryColor = context.activeClub?.colorPrimary ?? null;
  const showClubSwitcher =
    !!setActiveClubAction && context.availableClubs.length > 1 && !!context.activeClub;

  const canDashboard  = canAccessDashboardSummary(context.activeMembership);
  const canSecretaria = canOperateSecretaria(context.activeMembership);
  const canTesoreria  = canOperateTesoreria(context.activeMembership);
  const canRrhh       = canAccessHrModule(context.activeMembership);
  const canSettings   = canAccessClubSettingsNavigation(context.activeMembership);

  const tabs = [
    canDashboard  && { key: "dashboard"  as const, href: "/dashboard",  label: txtHeader.navigation.dashboard },
    canSecretaria && { key: "secretaria" as const, href: "/secretary",  label: txtHeader.navigation.secretaria },
    canTesoreria  && { key: "tesoreria"  as const, href: "/treasury",   label: txtHeader.navigation.tesoreria },
    canRrhh       && { key: "rrhh"       as const, href: "/rrhh",       label: txtHeader.navigation.rrhh },
    canSettings   && { key: "settings"   as const, href: "/settings",   label: txtHeader.navigation.settings },
    { key: "modules" as const, href: "/modules", label: txtHeader.navigation.modules },
  ].filter(Boolean) as AppHeaderTab[];

  return (
    <header className="sticky top-0 z-40 bg-surface border-b border-border">
      {/* Brand + Identity */}
      <div className="flex items-center justify-between gap-3 px-3.5 pt-3 pb-2.5">
        {/* Brand */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-btn bg-ds-slate-900 text-mono font-bold tracking-tight text-white"
            style={clubPrimaryColor ? { backgroundColor: clubPrimaryColor } : undefined}
          >
            {clubLogoUrl ? (
              <Image
                src={clubLogoUrl}
                alt={clubLabel}
                width={32}
                height={32}
                className="h-full w-full object-cover"
                sizes="32px"
              />
            ) : (
              clubInitials
            )}
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="text-eyebrow uppercase text-muted-foreground">
              {txtHeader.active_club_label}
            </span>
            {showClubSwitcher ? (
              <ActiveClubSelector
                clubs={context.availableClubs}
                activeClubId={context.activeClub!.id}
                setActiveClubAction={setActiveClubAction!}
                inline
              />
            ) : (
              <span className="truncate text-body font-semibold leading-tight tracking-tight text-foreground">
                {clubLabel}
              </span>
            )}
          </div>
        </div>

        {/* Identity */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex flex-col items-end leading-tight">
            <span className="text-eyebrow uppercase text-muted-foreground">
              {txtHeader.role_label}
            </span>
            <span className="text-small font-semibold text-ds-slate-700">
              {roleLabel}
            </span>
          </div>
          <AvatarSessionMenu
            fullName={context.user.fullName}
            email={context.user.email}
            avatarUrl={context.user.avatarUrl}
          />
        </div>
      </div>

      {/* App tabs (sub-componente client aislado: usePathname vive aquí
          para que el shell del header no re-renderice en cada
          navegación) */}
      <AppHeaderTabs tabs={tabs} ariaLabel={txtHeader.navigation.aria_label} />
    </header>
  );
}
