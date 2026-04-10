"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ActiveClubSelector } from "@/components/dashboard/active-club-selector";
import { AvatarSessionMenu } from "@/components/navigation/avatar-session-menu";
import { ClubMark } from "@/components/ui/club-mark";
import type { SessionContext } from "@/lib/auth/service";
import {
  canAccessDashboardSummary,
  canAccessClubSettingsNavigation,
  canOperateSecretaria,
  canOperateTesoreria
} from "@/lib/domain/authorization";
import { formatMembershipRoles } from "@/lib/domain/membership-roles";
import { texts } from "@/lib/texts";
import { cn } from "@/lib/utils";

type AppHeaderProps = {
  context: SessionContext;
  setActiveClubAction?: (formData: FormData) => Promise<void>;
};

type HeaderNavigationItem = {
  key: "dashboard" | "secretaria" | "tesoreria" | "settings";
  href: string;
  label: string;
};

function getActiveSection(pathname: string) {
  if (pathname.startsWith("/settings/club")) {
    return "settings";
  }

  if (pathname.startsWith("/dashboard/treasury")) {
    return "tesoreria";
  }

  if (
    pathname.startsWith("/dashboard/secretaria") ||
    pathname.startsWith("/dashboard/accounts") ||
    pathname.startsWith("/dashboard/session")
  ) {
    return "secretaria";
  }

  return "dashboard";
}

export function AppHeader({ context, setActiveClubAction }: AppHeaderProps) {
  const pathname = usePathname();
  const roleLabel = context.activeMembership
    ? formatMembershipRoles(context.activeMembership.roles)
    : texts.dashboard.role_pending;
  const clubLabel = context.activeClub?.name ?? texts.header.pending_club_label;
  const canAccessDashboardRole = canAccessDashboardSummary(context.activeMembership);
  const canOperateSecretariaRole = canOperateSecretaria(context.activeMembership);
  const canOperateTesoreriaRole = canOperateTesoreria(context.activeMembership);
  const canAccessSettings = canAccessClubSettingsNavigation(context.activeMembership);
  const activeSection = getActiveSection(pathname);
  const showClubSwitcher = Boolean(setActiveClubAction && context.availableClubs.length > 1);

  const navigationItems: HeaderNavigationItem[] = [
    ...(canAccessDashboardRole
      ? [
          {
            key: "dashboard" as const,
            href: "/dashboard",
            label: texts.header.navigation.dashboard
          }
        ]
      : []),
    ...(canOperateTesoreriaRole
      ? [
          {
            key: "tesoreria" as const,
            href: "/dashboard/treasury",
            label: texts.header.navigation.tesoreria
          }
        ]
      : []),
    ...(canOperateSecretariaRole
      ? [
          {
            key: "secretaria" as const,
            href: "/dashboard/secretaria",
            label: texts.header.navigation.secretaria
          }
        ]
      : []),
    ...(canAccessSettings
      ? [
          {
            key: "settings" as const,
            href: "/settings/club",
            label: texts.header.navigation.settings
          }
        ]
      : [])
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/90 bg-card">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-4">
        <div className="flex items-center justify-between gap-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <ClubMark clubName={clubLabel} />

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                {showClubSwitcher ? (
                  <ActiveClubSelector
                    clubs={context.availableClubs}
                    activeClubId={context.activeClub?.id ?? context.availableClubs[0]?.id ?? ""}
                    setActiveClubAction={setActiveClubAction!}
                    inline
                  />
                ) : (
                  <p className="truncate text-[15px] font-semibold tracking-tight text-foreground">
                    {clubLabel}
                  </p>
                )}

                {showClubSwitcher ? (
                  <span className="text-xs text-muted-foreground" aria-hidden="true">
                    {texts.header.club_switcher_chevron}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-semibold text-foreground">{clubLabel}</p>
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                {roleLabel}
              </p>
            </div>

            <AvatarSessionMenu
              fullName={context.user.fullName}
              email={context.user.email}
              avatarUrl={context.user.avatarUrl}
            />
          </div>
        </div>

        {navigationItems.length > 0 ? (
          <nav
            aria-label={texts.header.navigation.aria_label}
            className="flex gap-6 overflow-x-auto border-t border-border/80 pt-1"
          >
            {navigationItems.map((item) => {
              const isActive = item.key === activeSection;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    "inline-flex min-h-11 items-center justify-center whitespace-nowrap border-b-2 px-0 py-3 text-xs font-semibold uppercase tracking-[0.14em] transition",
                    isActive
                      ? "border-success text-success"
                      : "border-transparent text-slate-400 hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </div>
    </header>
  );
}
