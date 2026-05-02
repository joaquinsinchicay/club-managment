"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { cn } from "@/lib/utils";

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

export type AppHeaderTab = { key: TabKey; href: string; label: string };

type AppHeaderTabsProps = {
  tabs: AppHeaderTab[];
  ariaLabel: string;
};

/**
 * Sub-componente client aislado del header que consume `usePathname()`
 * y persiste el tab activo en localStorage. Está separado del shell del
 * header para que cualquier navegación re-renderice solo este nav, no
 * los avatares, selectors ni brand del header (que dependen únicamente
 * de la session y se mantienen estables entre navegaciones).
 */
export function AppHeaderTabs({ tabs, ariaLabel }: AppHeaderTabsProps) {
  const pathname = usePathname();
  const activeTab = getActiveTab(pathname);

  useEffect(() => {
    try { localStorage.setItem("cm.activeTab", activeTab); } catch (_) {}
  }, [activeTab]);

  if (tabs.length === 0) return null;

  return (
    <nav
      aria-label={ariaLabel}
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
  );
}
