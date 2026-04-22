"use client";

import { useState } from "react";

import type { RrhhActionResult } from "@/app/(dashboard)/settings/rrhh/actions";
import { SalaryStructuresTab } from "@/components/hr/salary-structures-tab";
import { StaffContractsTab } from "@/components/hr/staff-contracts-tab";
import { StaffMembersTab } from "@/components/hr/staff-members-tab";
import type { ClubActivity } from "@/lib/domain/access";
import type {
  SalaryStructure,
  SalaryStructureVersion,
} from "@/lib/domain/salary-structure";
import type { StaffContract } from "@/lib/domain/staff-contract";
import type { StaffMember } from "@/lib/domain/staff-member";
import { texts } from "@/lib/texts";

type RrhhTabProps = {
  canMutate: boolean;
  clubCurrencyCode: string;
  activities: ClubActivity[];
  salaryStructures: SalaryStructure[];
  salaryStructureVersionsByStructureId: Record<string, SalaryStructureVersion[]>;
  staffMembers: StaffMember[];
  staffContracts: StaffContract[];
  createSalaryStructureAction: (formData: FormData) => Promise<RrhhActionResult>;
  updateSalaryStructureAction: (formData: FormData) => Promise<RrhhActionResult>;
  updateSalaryStructureAmountAction: (formData: FormData) => Promise<RrhhActionResult>;
  createStaffMemberAction: (formData: FormData) => Promise<RrhhActionResult>;
  updateStaffMemberAction: (formData: FormData) => Promise<RrhhActionResult>;
  setStaffMemberStatusAction: (formData: FormData) => Promise<RrhhActionResult>;
  createStaffContractAction: (formData: FormData) => Promise<RrhhActionResult>;
  updateStaffContractAction: (formData: FormData) => Promise<RrhhActionResult>;
  finalizeStaffContractAction: (formData: FormData) => Promise<RrhhActionResult>;
};

type SubTab = "structures" | "members" | "contracts";

export function RrhhTab(props: RrhhTabProps) {
  const [subTab, setSubTab] = useState<SubTab>("structures");

  const tabs: { id: SubTab; label: string; count: number }[] = [
    {
      id: "structures",
      label: texts.rrhh.tab_nav.structures,
      count: props.salaryStructures.length,
    },
    {
      id: "members",
      label: texts.rrhh.tab_nav.members,
      count: props.staffMembers.length,
    },
    {
      id: "contracts",
      label: texts.rrhh.tab_nav.contracts,
      count: props.staffContracts.length,
    },
  ];

  return (
    <div className="grid gap-6">
      <nav className="flex flex-wrap gap-2" aria-label={texts.rrhh.tab_nav.aria_label}>
        {tabs.map((t) => {
          const isActive = t.id === subTab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              aria-pressed={isActive}
              className={
                isActive
                  ? "inline-flex min-h-10 items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background"
                  : "inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary/40"
              }
            >
              {t.label}
              <span
                className={
                  isActive
                    ? "inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-background/20 px-2 text-xs font-semibold"
                    : "inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-secondary px-2 text-xs font-semibold text-muted-foreground"
                }
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </nav>

      {subTab === "structures" ? (
        <SalaryStructuresTab
          structures={props.salaryStructures}
          versionsByStructureId={props.salaryStructureVersionsByStructureId}
          activities={props.activities}
          clubCurrencyCode={props.clubCurrencyCode}
          canMutate={props.canMutate}
          createAction={props.createSalaryStructureAction}
          updateAction={props.updateSalaryStructureAction}
          updateAmountAction={props.updateSalaryStructureAmountAction}
        />
      ) : null}

      {subTab === "members" ? (
        <StaffMembersTab
          members={props.staffMembers}
          canMutate={props.canMutate}
          createAction={props.createStaffMemberAction}
          updateAction={props.updateStaffMemberAction}
          setStatusAction={props.setStaffMemberStatusAction}
        />
      ) : null}

      {subTab === "contracts" ? (
        <StaffContractsTab
          contracts={props.staffContracts}
          members={props.staffMembers}
          structures={props.salaryStructures}
          clubCurrencyCode={props.clubCurrencyCode}
          canMutate={props.canMutate}
          createAction={props.createStaffContractAction}
          updateAction={props.updateStaffContractAction}
          finalizeAction={props.finalizeStaffContractAction}
        />
      ) : null}
    </div>
  );
}
