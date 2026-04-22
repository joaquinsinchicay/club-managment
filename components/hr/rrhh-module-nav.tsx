"use client";

import { SegmentedNav, type SegmentedNavItem } from "@/components/ui/segmented-nav";
import { texts } from "@/lib/texts";

export type RrhhModuleTab = "resumen" | "contracts" | "staff" | "structures";

type RrhhModuleNavProps = {
  activeTab: RrhhModuleTab;
};

export function RrhhModuleNav({ activeTab }: RrhhModuleNavProps) {
  const items: SegmentedNavItem[] = [
    { id: "resumen", href: "/rrhh", label: texts.rrhh.module_nav.resumen },
    { id: "contracts", href: "/rrhh/contracts", label: texts.rrhh.module_nav.contracts },
    { id: "staff", href: "/rrhh/staff", label: texts.rrhh.module_nav.staff },
    { id: "structures", href: "/rrhh/structures", label: texts.rrhh.module_nav.structures },
  ];

  return (
    <SegmentedNav
      items={items}
      activeId={activeTab}
      ariaLabel={texts.rrhh.module_nav.aria_label}
    />
  );
}
