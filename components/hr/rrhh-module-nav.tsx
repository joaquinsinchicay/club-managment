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
      className="flex gap-0.5 rounded-card bg-slate-100 p-0.75"
    >
      {TAB_ORDER.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex-1 rounded-[7px] px-2.5 py-2 text-center text-xs font-semibold tracking-tight transition whitespace-nowrap",
              isActive
                ? "bg-white text-foreground shadow-sm"
                : "text-slate-600 hover:text-foreground",
            )}
          >
            {texts.rrhh.module_nav[tab.labelKey]}
          </Link>
        );
      })}
    </nav>
  );
}
