import { SegmentedNav, type SegmentedNavItem } from "@/components/ui/segmented-nav";
import { texts } from "@/lib/texts";
import type { SubTab } from "@/lib/treasury-role-helpers";

export function SubTabNav({
  active,
  onChange,
  showPayroll,
  payrollCount,
}: {
  active: SubTab;
  onChange: (tab: SubTab) => void;
  showPayroll: boolean;
  payrollCount: number;
}) {
  const t = texts.dashboard.treasury_role;
  const items: SegmentedNavItem[] = [
    { id: "resumen", label: t.tab_resumen, onClick: () => onChange("resumen") },
  ];
  if (showPayroll) {
    const label =
      payrollCount > 0
        ? t.tab_payroll_count_template.replace("{count}", String(payrollCount))
        : t.tab_payroll;
    items.push({ id: "payroll", label, onClick: () => onChange("payroll") });
  }
  items.push(
    { id: "cuentas", label: t.tab_cuentas, onClick: () => onChange("cuentas") },
    { id: "movimientos", label: t.tab_movimientos, onClick: () => onChange("movimientos") },
    { id: "conciliacion", label: t.tab_conciliacion, onClick: () => onChange("conciliacion") },
    { id: "cost_centers", label: t.tab_cost_centers, onClick: () => onChange("cost_centers") }
  );

  return <SegmentedNav items={items} activeId={active} ariaLabel={t.sub_tab_nav_aria_label} />;
}
