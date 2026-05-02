"use client";

import { SegmentedNav, type SegmentedNavItem } from "@/components/ui/segmented-nav";
import { rrhh as txtRrhh } from "@/lib/texts";

export type RrhhModuleTab =
  | "resumen"
  | "settlements"
  | "contracts"
  | "staff"
  | "structures";

type RrhhModuleNavProps = {
  activeTab: RrhhModuleTab;
};

export function RrhhModuleNav({ activeTab }: RrhhModuleNavProps) {
  const items: SegmentedNavItem[] = [
    { id: "resumen", href: "/rrhh", label: txtRrhh.module_nav.resumen },
    {
      id: "settlements",
      href: "/rrhh/settlements",
      label: txtRrhh.module_nav.settlements,
    },
    { id: "contracts", href: "/rrhh/contracts", label: txtRrhh.module_nav.contracts },
    { id: "staff", href: "/rrhh/staff", label: txtRrhh.module_nav.staff },
    { id: "structures", href: "/rrhh/structures", label: txtRrhh.module_nav.structures },
  ];

  return (
    <SegmentedNav
      items={items}
      activeId={activeTab}
      ariaLabel={txtRrhh.module_nav.aria_label}
    />
  );
}
