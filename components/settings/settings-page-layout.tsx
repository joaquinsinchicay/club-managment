"use client";

import { type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

export type SettingsTab = {
  id: string;
  label: string;
  content: ReactNode;
};

type SettingsPageLayoutProps = {
  tabs: SettingsTab[];
  defaultTabId?: string;
};

const LEGACY_TAB_ALIASES: Record<string, string> = {
  categorias: "categorias-actividades",
  actividades: "categorias-actividades"
};

export function SettingsPageLayout({ tabs, defaultTabId }: SettingsPageLayoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTabId = searchParams.get("tab") ?? defaultTabId ?? tabs[0]?.id;
  const activeTabId = rawTabId ? (LEGACY_TAB_ALIASES[rawTabId] ?? rawTabId) : rawTabId;
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];

  function handleTabChange(tabId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    params.delete("feedback");
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        className="flex flex-wrap gap-0.5 rounded-card bg-slate-100 p-0.75"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab?.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              onClick={() => handleTabChange(tab.id)}
              aria-pressed={isActive}
              className={cn(
                "flex-grow basis-auto rounded-[7px] px-3 py-2 text-xs font-semibold tracking-tight transition whitespace-nowrap",
                isActive
                  ? "bg-white text-foreground shadow-sm"
                  : "text-slate-600 hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div>{activeTab?.content}</div>
    </div>
  );
}
