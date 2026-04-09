"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ActiveClubSelector } from "@/components/dashboard/active-club-selector";
import { AvatarSessionMenu } from "@/components/navigation/avatar-session-menu";
import type { SessionContext } from "@/lib/auth/service";
import {
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

function replaceTemplate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replace(`{${key}}`, value),
    template
  );
}

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
  const canOperateSecretariaRole = canOperateSecretaria(context.activeMembership);
  const canOperateTesoreriaRole = canOperateTesoreria(context.activeMembership);
  const canAccessSettings = canAccessClubSettingsNavigation(context.activeMembership);
  const activeSection = getActiveSection(pathname);
  const welcomeMessage = context.activeMembership
    ? replaceTemplate(
        context.activeMembership.roles.length > 1
          ? texts.header.welcome_message_multiple
          : texts.header.welcome_message_single,
        {
        name: context.user.fullName,
        role: roleLabel
        }
      )
    : null;

  const navigationItems: HeaderNavigationItem[] = [
    {
      key: "dashboard",
      href: "/dashboard",
      label: texts.header.navigation.dashboard
    },
    ...(canOperateSecretariaRole
      ? [
          {
            key: "secretaria" as const,
            href: "/dashboard/secretaria",
            label: texts.header.navigation.secretaria
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
    <header className="sticky top-0 z-40 border-b border-border bg-card/98 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-4">
        <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="space-y-1">
              <p className="truncate text-lg font-semibold tracking-tight text-foreground">{clubLabel}</p>
              {welcomeMessage ? (
                <p className="truncate text-sm text-muted-foreground">{welcomeMessage}</p>
              ) : (
                <p className="truncate text-sm text-muted-foreground">{context.user.fullName}</p>
              )}
            </div>

            {setActiveClubAction && context.availableClubs.length > 1 ? (
              <div className="max-w-xs">
                <ActiveClubSelector
                  clubs={context.availableClubs}
                  activeClubId={context.activeClub?.id ?? context.availableClubs[0]?.id ?? ""}
                  setActiveClubAction={setActiveClubAction}
                  inline
                />
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-semibold text-foreground">{context.user.fullName}</p>
              <p className="truncate text-xs uppercase tracking-[0.18em] text-muted-foreground">{roleLabel}</p>
            </div>

            <AvatarSessionMenu
              fullName={context.user.fullName}
              email={context.user.email}
              avatarUrl={context.user.avatarUrl}
              canAccessClubSettings={canAccessSettings}
            />
          </div>
        </div>

        {navigationItems.length > 0 ? (
          <nav
            aria-label={texts.header.navigation.aria_label}
            className="flex gap-1 overflow-x-auto border-t border-border/80 py-2"
          >
            {navigationItems.map((item) => {
              const isActive = item.key === activeSection;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
                    isActive
                      ? "border-foreground bg-foreground text-primary-foreground"
                      : "border-transparent text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground"
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
