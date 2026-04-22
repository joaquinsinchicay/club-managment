"use client";

import Link from "next/link";

import { texts } from "@/lib/texts";
import { cn } from "@/lib/utils";

export type RrhhModuleTab = "resumen" | "contracts" | "staff" | "structures";

type RrhhModuleNavProps = {
  activeTab: RrhhModuleTab;
};

const TAB_ORDER: {
  id: RrhhModuleTab;
  href: string;
  labelKey: "resumen" | "contracts" | "staff" | "structures";
}[] = [
  { id: "resumen", href: "/rrhh", labelKey: "resumen" },
  { id: "contracts", href: "/rrhh/contracts", labelKey: "contracts" },
  { id: "staff", href: "/rrhh/staff", labelKey: "staff" },
  { id: "structures", href: "/rrhh/structures", labelKey: "structures" },
];

export function RrhhModuleNav({ activeTab }: RrhhModuleNavProps) {
  return (
    <nav
      aria-label={texts.rrhh.module_nav.aria_label}
      className="flex flex-wrap gap-2"
    >
      {TAB_ORDER.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 items-center rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              isActive
                ? "bg-foreground text-background"
                : "border border-border bg-card text-foreground hover:bg-secondary/40",
            )}
          >
            {texts.rrhh.module_nav[tab.labelKey]}
          </Link>
        );
      })}
    </nav>
  );
}
