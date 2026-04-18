"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { AvatarSessionMenu } from "@/components/navigation/avatar-session-menu";
import type { SessionContext } from "@/lib/auth/service";
import {
  canAccessDashboardSummary,
  canAccessClubSettingsNavigation,
  canOperateSecretaria,
  canOperateTesoreria
} from "@/lib/domain/authorization";
import { formatMembershipRoles } from "@/lib/domain/membership-roles";
import { texts } from "@/lib/texts";

type AppHeaderProps = {
  context: SessionContext;
  setActiveClubAction?: (formData: FormData) => Promise<void>;
};

type TabKey = "dashboard" | "secretaria" | "tesoreria" | "settings" | "modules";

const TAB_ACCENT: Record<TabKey, { color: string; underline: string }> = {
  dashboard:  { color: "var(--green-700)",  underline: "var(--green)" },
  secretaria: { color: "var(--green-700)",  underline: "var(--green)" },
  tesoreria:  { color: "#3B82F6",            underline: "#3B82F6" },
  settings:   { color: "var(--indigo-700)", underline: "var(--indigo)" },
  modules:    { color: "var(--indigo-700)", underline: "var(--indigo)" },
};

function getActiveTab(pathname: string): TabKey {
  if (pathname.startsWith("/settings/club")) return "settings";
  if (pathname.startsWith("/modules")) return "modules";
  if (pathname.startsWith("/dashboard/treasury")) return "tesoreria";
  if (
    pathname.startsWith("/dashboard/secretaria") ||
    pathname.startsWith("/dashboard/accounts") ||
    pathname.startsWith("/dashboard/session")
  ) return "secretaria";
  return "dashboard";
}

function getClubInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function AppHeader({ context }: AppHeaderProps) {
  const pathname = usePathname();
  const activeTab = getActiveTab(pathname);

  const roleLabel = context.activeMembership
    ? formatMembershipRoles(context.activeMembership.roles)
    : texts.dashboard.role_pending;
  const clubLabel = context.activeClub?.name ?? texts.header.pending_club_label;
  const clubInitials = getClubInitials(clubLabel);

  const canDashboard  = canAccessDashboardSummary(context.activeMembership);
  const canSecretaria = canOperateSecretaria(context.activeMembership);
  const canTesoreria  = canOperateTesoreria(context.activeMembership);
  const canSettings   = canAccessClubSettingsNavigation(context.activeMembership);

  useEffect(() => {
    try { localStorage.setItem("cm.activeTab", activeTab); } catch (_) {}
  }, [activeTab]);

  const tabs = [
    canDashboard  && { key: "dashboard"  as TabKey, href: "/dashboard",          label: texts.header.navigation.dashboard },
    canSecretaria && { key: "secretaria" as TabKey, href: "/dashboard/secretaria", label: texts.header.navigation.secretaria },
    canTesoreria  && { key: "tesoreria"  as TabKey, href: "/dashboard/treasury",   label: texts.header.navigation.tesoreria },
    canSettings   && { key: "settings"   as TabKey, href: "/settings/club",        label: texts.header.navigation.settings },
    { key: "modules" as TabKey, href: "/modules", label: "Módulos" },
  ].filter(Boolean) as { key: TabKey; href: string; label: string }[];

  return (
    <header style={{
      position: "sticky",
      top: 0,
      zIndex: 40,
      background: "var(--surface)",
      borderBottom: "1px solid var(--cm-border)",
    }}>
      {/* Brand + Identity */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 14px 10px",
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
          <div
            aria-hidden="true"
            style={{
              width: 32,
              height: 32,
              borderRadius: "var(--radius)",
              background: "var(--slate-900)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: "-0.02em",
              flexShrink: 0,
            }}
          >
            {clubInitials}
          </div>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0, lineHeight: 1.15 }}>
            <span
              className="text-eyebrow uppercase"
              style={{ color: "var(--ink-muted)" }}
            >
              Club activo
            </span>
            <span style={{
              fontWeight: 600,
              fontSize: 14,
              color: "var(--ink)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              letterSpacing: "-0.01em",
            }}>
              {clubLabel}
            </span>
          </div>
        </div>

        {/* Identity */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            lineHeight: 1.15,
          }}>
            <span
              className="text-eyebrow uppercase"
              style={{ color: "var(--ink-muted)" }}
            >
              Rol
            </span>
            <span
              className="text-small font-semibold"
              style={{ color: "var(--slate-700)" }}
            >
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
          style={{
            display: "flex",
            gap: 4,
            padding: "0 6px",
            overflowX: "auto",
            scrollbarWidth: "none",
          }}
        >
          {tabs.map((tab) => {
            const isActive = tab.key === activeTab;
            const accent = TAB_ACCENT[tab.key];
            return (
              <Link
                key={tab.key}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                style={{
                  position: "relative",
                  padding: "12px 10px",
                  minHeight: "var(--touch)",
                  display: "inline-flex",
                  alignItems: "center",
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? accent.color : "var(--slate-500)",
                  background: "transparent",
                  whiteSpace: "nowrap",
                  textDecoration: "none",
                  transition: "color 0.12s",
                }}
              >
                {tab.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: 8,
                      right: 8,
                      bottom: 0,
                      height: 2,
                      background: accent.underline,
                      borderRadius: "2px 2px 0 0",
                    }}
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
