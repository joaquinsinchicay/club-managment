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

export function SettingsPageLayout({ tabs, defaultTabId }: SettingsPageLayoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTabId = searchParams.get("tab") ?? defaultTabId ?? tabs[0]?.id;
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];

  function handleTabChange(tabId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    params.delete("feedback");
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab?.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "px-4 py-3 text-sm font-semibold transition whitespace-nowrap border-b-2",
                  isActive
                    ? "border-success text-success"
                    : "border-transparent text-slate-400 hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>{activeTab?.content}</div>
    </div>
  );
}
