"use client";

import { useCallback, useMemo, useState } from "react";

import Link from "next/link";

import type { RrhhActionResult } from "@/app/(dashboard)/settings/rrhh/actions";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { ChipButton } from "@/components/ui/chip";
import { ViewIconLink } from "@/components/ui/view-icon-link";
import {
  DataTable,
  DataTableActions,
  DataTableBody,
  DataTableCell,
  DataTableChip,
  DataTableEmpty,
  DataTableHeadCell,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { ModalFooter } from "@/components/ui/modal-footer";
import { FormBanner } from "@/components/ui/modal-form";
import { StaffMemberFormFields } from "@/components/hr/staff-member-form-fields";
import {
  STAFF_VINCULO_TYPES,
  type StaffMember,
  type StaffVinculoType,
} from "@/lib/domain/staff-member";
import { useFilteredList } from "@/lib/hooks/use-filtered-list";
import { useServerAction } from "@/lib/hooks/use-server-action";
import { texts } from "@/lib/texts";

type ContractFilter = "with_active" | "all" | "without_active";

type StaffMembersTabProps = {
  members: StaffMember[];
  canMutate: boolean;
  createAction: (formData: FormData) => Promise<RrhhActionResult>;
  /**
   * US-37 Scenario 4 — permite que la card "Alertas" del dashboard
   * (link `/rrhh/staff?contract=without_active`) abra el listado ya
   * filtrado a colaboradores sin contratos vigentes. Default: "with_active".
   */
  initialContractFilter?: ContractFilter;
};

type VinculoFilter = "all" | StaffVinculoType;

const smTexts = texts.rrhh.staff_members;

const CONTRACT_FILTERS: { value: ContractFilter; label: string }[] = [
  { value: "with_active", label: smTexts.filter_with_active },
  { value: "all", label: smTexts.filter_all },
  { value: "without_active", label: smTexts.filter_without_active },
];

/**
 * US-37 helper: un colaborador está "en alerta" cuando no tiene contratos
 * vigentes. Usado por el banner de conteo.
 */
function isMemberInAlert(m: StaffMember): boolean {
  return !m.hasActiveContract;
}

export function StaffMembersTab({
  members,
  canMutate,
  createAction,
  initialContractFilter = "with_active",
}: StaffMembersTabProps) {
  const [vinculoFilter, setVinculoFilter] = useState<VinculoFilter>("all");
  const [contractFilter, setContractFilter] = useState<ContractFilter>(initialContractFilter);

  const [createOpen, setCreateOpen] = useState(false);

  const { isPending: createPending, runAction } = useServerAction<RrhhActionResult>("settings");

  const alertsCount = useMemo(
    () => members.filter(isMemberInAlert).length,
    [members],
  );
  const withActiveCount = members.length - alertsCount;

  const filterPredicate = useCallback(
    (m: StaffMember) => {
      if (vinculoFilter !== "all" && m.vinculoType !== vinculoFilter) return false;
      if (contractFilter === "with_active" && !m.hasActiveContract) return false;
      if (contractFilter === "without_active" && m.hasActiveContract) return false;
      return true;
    },
    [vinculoFilter, contractFilter],
  );
  const searchPredicate = useCallback(
    (m: StaffMember, q: string) =>
      m.firstName.toLowerCase().includes(q) ||
      m.lastName.toLowerCase().includes(q) ||
      m.dni.includes(q) ||
      (m.cuitCuil?.includes(q) ?? false),
    [],
  );
  const { search, setSearch, filtered } = useFilteredList({
    items: members,
    searchPredicate,
    filterPredicate,
  });

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-h2 text-foreground">{smTexts.section_title}</h2>
        <p className="text-body text-muted-foreground">{smTexts.section_description}</p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-body text-muted-foreground">
          {smTexts.subtitle_counts.replace("{total}", String(members.length))}
        </p>
        {canMutate ? (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className={buttonClass({ variant: "primary", size: "sm" })}
          >
            {smTexts.create_cta}
          </button>
        ) : null}
      </div>

      {alertsCount > 0 ? (
        <FormBanner
          variant="warning"
          action={
            <ChipButton
              active={contractFilter === "without_active"}
              onClick={() =>
                setContractFilter((v) =>
                  v === "without_active" ? "with_active" : "without_active",
                )
              }
            >
              {contractFilter === "without_active"
                ? smTexts.alert_banner_cta_all
                : smTexts.alert_banner_cta_only}
            </ChipButton>
          }
        >
          <strong>{alertsCount}</strong>{" "}
          {alertsCount === 1 ? smTexts.alert_banner_singular : smTexts.alert_banner_plural}
        </FormBanner>
      ) : null}

      <div className="flex flex-col gap-3">
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          {/* eslint-disable-next-line no-restricted-syntax -- Search input con icono leading: el wrapping requiere un input crudo, FormInput no soporta slot leading. */}
          <input
            type="search"
            placeholder={smTexts.search_placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-card border border-border bg-card py-3 pl-10 pr-4 text-body text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/10"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {CONTRACT_FILTERS.map((f) => {
              const count =
                f.value === "all"
                  ? members.length
                  : f.value === "with_active"
                  ? withActiveCount
                  : alertsCount;
              return (
                <ChipButton
                  key={f.value}
                  active={contractFilter === f.value}
                  onClick={() => setContractFilter(f.value)}
                >
                  {f.label} · {count}
                </ChipButton>
              );
            })}
          </div>
          {/* eslint-disable-next-line no-restricted-syntax -- Dropdown-chip (inline con ChipButtons): no existe primitivo dropdown-chip. */}
          <select
            value={vinculoFilter}
            onChange={(e) => setVinculoFilter(e.target.value as VinculoFilter)}
            className="inline-flex items-center rounded-chip border border-border bg-card px-3 py-1 text-small font-semibold text-foreground hover:bg-secondary"
          >
            <option value="all">{smTexts.filter_vinculo_all}</option>
            {STAFF_VINCULO_TYPES.map((v) => (
              <option key={v} value={v}>
                {smTexts.vinculo_options[v]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <DataTableEmpty
          title={members.length === 0 ? smTexts.empty_title : smTexts.empty_filter_title}
          description={
            members.length === 0 ? smTexts.empty_description : smTexts.empty_filter_description
          }
          action={
            canMutate && members.length === 0 ? (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className={buttonClass({ variant: "primary", size: "sm" })}
              >
                {smTexts.empty_cta}
              </button>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          density="comfortable"
          gridColumns="minmax(0,1.8fr) 130px 150px 160px 100px 44px"
        >
          <DataTableHeader>
            <DataTableHeadCell>{smTexts.col_name}</DataTableHeadCell>
            <DataTableHeadCell>{smTexts.col_dni}</DataTableHeadCell>
            <DataTableHeadCell>{smTexts.col_cuit}</DataTableHeadCell>
            <DataTableHeadCell>{smTexts.col_vinculo}</DataTableHeadCell>
            <DataTableHeadCell align="center">{smTexts.col_contracts}</DataTableHeadCell>
            <DataTableHeadCell />
          </DataTableHeader>
          <DataTableBody>
            {filtered.map((m) => (
              <DataTableRow key={m.id} density="comfortable" hoverReveal>
                <DataTableCell>
                  <Link
                    href={`/rrhh/staff/${m.id}`}
                    className="flex items-center gap-2 hover:underline"
                  >
                    <Avatar
                      name={`${m.firstName} ${m.lastName}`}
                      size="sm"
                      tone="neutral"
                    />
                    <span className="font-medium text-foreground">
                      {m.firstName} {m.lastName}
                    </span>
                  </Link>
                </DataTableCell>
                <DataTableCell>
                  <span className="font-mono text-small">{m.dni}</span>
                </DataTableCell>
                <DataTableCell>
                  {m.cuitCuil ? (
                    <span className="font-mono text-small">{m.cuitCuil}</span>
                  ) : (
                    <span className="text-small text-muted-foreground">—</span>
                  )}
                </DataTableCell>
                <DataTableCell>
                  <DataTableChip tone="neutral">
                    {smTexts.vinculo_options[m.vinculoType]}
                  </DataTableChip>
                </DataTableCell>
                <DataTableCell align="center">
                  <span
                    className={
                      m.activeContractCount > 0
                        ? "text-body font-semibold text-foreground"
                        : "text-body text-muted-foreground"
                    }
                  >
                    {m.activeContractCount}
                  </span>
                </DataTableCell>
                <DataTableCell align="right">
                  <DataTableActions>
                    <ViewIconLink
                      href={`/rrhh/staff/${m.id}`}
                      label={smTexts.action_view_detail}
                    />
                  </DataTableActions>
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}

      {/* Create */}
      <Modal
        open={createOpen}
        onClose={() => !createPending && setCreateOpen(false)}
        title={smTexts.create_modal_title}
        description={smTexts.create_modal_description}
        size="md"
        closeDisabled={createPending}
      >
        <form
          action={async (fd) => {
            await runAction(createAction, fd, () => setCreateOpen(false));
          }}
          className="grid gap-4"
        >
          <StaffMemberFormFields />
          <ModalFooter
            onCancel={() => setCreateOpen(false)}
            cancelLabel={smTexts.cancel_cta}
            submitLabel={smTexts.create_submit_cta}
            pendingLabel={smTexts.submit_pending}
          />
        </form>
      </Modal>

    </div>
  );
}

