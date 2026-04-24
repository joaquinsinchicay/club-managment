"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

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
import { texts } from "@/lib/texts";
import { cn } from "@/lib/utils";

type AppHeaderProps = {
  context: SessionContext;
  setActiveClubAction?: (formData: FormData) => Promise<void>;
};

type TabKey = "dashboard" | "secretaria" | "tesoreria" | "rrhh" | "settings" | "modules";

const TAB_COLOR_CLASS: Record<TabKey, string> = {
  dashboard:  "text-ds-green-700",
  secretaria: "text-ds-green-700",
  tesoreria:  "text-ds-blue-700",
  rrhh:       "text-ds-pink-700",
  settings:   "text-ds-indigo-700",
  modules:    "text-ds-indigo-700",
};

const TAB_UNDERLINE_CLASS: Record<TabKey, string> = {
  dashboard:  "bg-ds-green",
  secretaria: "bg-ds-green",
  tesoreria:  "bg-ds-blue",
  rrhh:       "bg-ds-pink",
  settings:   "bg-ds-indigo",
  modules:    "bg-ds-indigo",
};

function getActiveTab(pathname: string): TabKey {
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/modules")) return "modules";
  if (pathname.startsWith("/treasury")) return "tesoreria";
  if (pathname.startsWith("/secretary")) return "secretaria";
  if (pathname.startsWith("/rrhh")) return "rrhh";
  return "dashboard";
}

export function AppHeader({ context }: AppHeaderProps) {
  const pathname = usePathname();
  const activeTab = getActiveTab(pathname);

  const roleLabel = context.activeMembership
    ? formatMembershipRoles(context.activeMembership.roles)
    : texts.dashboard.role_pending;
  const clubLabel = context.activeClub?.name ?? texts.header.pending_club_label;
  const clubInitials = getInitials(clubLabel);
  const clubLogoUrl = context.activeClub?.logoUrl ?? null;
  const clubPrimaryColor = context.activeClub?.colorPrimary ?? null;

  const canDashboard  = canAccessDashboardSummary(context.activeMembership);
  const canSecretaria = canOperateSecretaria(context.activeMembership);
  const canTesoreria  = canOperateTesoreria(context.activeMembership);
  const canRrhh       = canAccessHrModule(context.activeMembership);
  const canSettings   = canAccessClubSettingsNavigation(context.activeMembership);

  useEffect(() => {
    try { localStorage.setItem("cm.activeTab", activeTab); } catch (_) {}
  }, [activeTab]);

  const tabs = [
    canDashboard  && { key: "dashboard"  as TabKey, href: "/dashboard",  label: texts.header.navigation.dashboard },
    canSecretaria && { key: "secretaria" as TabKey, href: "/secretary",  label: texts.header.navigation.secretaria },
    canTesoreria  && { key: "tesoreria"  as TabKey, href: "/treasury",   label: texts.header.navigation.tesoreria },
    canRrhh       && { key: "rrhh"       as TabKey, href: "/rrhh",       label: texts.header.navigation.rrhh },
    canSettings   && { key: "settings"   as TabKey, href: "/settings",   label: texts.header.navigation.settings },
    { key: "modules" as TabKey, href: "/modules", label: texts.header.navigation.modules },
  ].filter(Boolean) as { key: TabKey; href: string; label: string }[];

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
              // eslint-disable-next-line @next/next/no-img-element
              <img src={clubLogoUrl} alt={clubLabel} className="h-full w-full object-cover" />
            ) : (
              clubInitials
            )}
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="text-eyebrow uppercase text-muted-foreground">
              {texts.header.active_club_label}
            </span>
            <span className="truncate text-body font-semibold leading-tight tracking-tight text-foreground">
              {clubLabel}
            </span>
          </div>
        </div>

        {/* Identity */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex flex-col items-end leading-tight">
            <span className="text-eyebrow uppercase text-muted-foreground">
              {texts.header.role_label}
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

      {/* App tabs */}
      {tabs.length > 0 && (
        <nav
          aria-label={texts.header.navigation.aria_label}
          className="flex gap-1 overflow-x-auto px-1.5 [scrollbar-width:none]"
        >
          {tabs.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <Link
                key={tab.key}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative inline-flex min-h-11 items-center whitespace-nowrap bg-transparent px-2.5 py-3 text-mono transition-colors",
                  isActive
                    ? cn("font-semibold", TAB_COLOR_CLASS[tab.key])
                    : "font-medium text-ds-slate-500",
                )}
              >
                {tab.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-x-2 bottom-0 h-0.5 rounded-t-[2px]",
                      TAB_UNDERLINE_CLASS[tab.key],
                    )}
                  />
                )}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
