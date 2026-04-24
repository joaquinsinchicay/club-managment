"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import Link from "next/link";

import type { RrhhActionResult } from "@/app/(dashboard)/settings/rrhh/actions";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { ChipButton } from "@/components/ui/chip";
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
import { triggerClientFeedback } from "@/lib/client-feedback";
import {
  STAFF_VINCULO_TYPES,
  type StaffMember,
  type StaffVinculoType,
} from "@/lib/domain/staff-member";
import { texts } from "@/lib/texts";

type StaffMembersTabProps = {
  members: StaffMember[];
  canMutate: boolean;
  createAction: (formData: FormData) => Promise<RrhhActionResult>;
};

type VinculoFilter = "all" | StaffVinculoType;
type ContractFilter = "with_active" | "all" | "without_active";

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
}: StaffMembersTabProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [vinculoFilter, setVinculoFilter] = useState<VinculoFilter>("all");
  const [contractFilter, setContractFilter] = useState<ContractFilter>("with_active");

  const [createOpen, setCreateOpen] = useState(false);
  const [createPending, setCreatePending] = useState(false);

  const alertsCount = useMemo(
    () => members.filter(isMemberInAlert).length,
    [members],
  );
  const withActiveCount = members.length - alertsCount;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (vinculoFilter !== "all" && m.vinculoType !== vinculoFilter) return false;
      if (contractFilter === "with_active" && !m.hasActiveContract) return false;
      if (contractFilter === "without_active" && m.hasActiveContract) return false;
      if (!q) return true;
      return (
        m.firstName.toLowerCase().includes(q) ||
        m.lastName.toLowerCase().includes(q) ||
        m.dni.includes(q) ||
        (m.cuitCuil?.includes(q) ?? false)
      );
    });
  }, [members, search, vinculoFilter, contractFilter]);

  async function runAction(
    action: (fd: FormData) => Promise<RrhhActionResult>,
    formData: FormData,
    onSuccess: () => void,
    setPending: (v: boolean) => void,
  ) {
    setPending(true);
    try {
      const result = await action(formData);
      triggerClientFeedback("settings", result.code);
      if (result.ok) {
        onSuccess();
        startTransition(() => router.refresh());
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-h2 font-bold text-foreground">{smTexts.section_title}</h2>
        <p className="text-sm text-muted-foreground">{smTexts.section_description}</p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
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

      <div className="rounded-card border border-border bg-card px-4 py-3">
        <input
          type="search"
          placeholder={smTexts.search_placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-btn border border-border bg-background px-3 py-2 text-sm"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
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
            className="inline-flex items-center rounded-chip border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground hover:bg-secondary"
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
                    <span className="grid leading-tight">
                      <span className="font-medium text-foreground">
                        {m.firstName} {m.lastName}
                      </span>
                      {!m.hasActiveContract ? (
                        <span className="text-xs text-ds-amber-700">
                          {smTexts.alert_no_active_contracts}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </DataTableCell>
                <DataTableCell>
                  <span className="font-mono text-xs">{m.dni}</span>
                </DataTableCell>
                <DataTableCell>
                  {m.cuitCuil ? (
                    <span className="font-mono text-xs">{m.cuitCuil}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </DataTableCell>
                <DataTableCell>
                  <DataTableChip tone="neutral">
                    {smTexts.vinculo_options[m.vinculoType]}
                  </DataTableChip>
                </DataTableCell>
                <DataTableCell align="center">
                  <span className="text-sm font-medium text-foreground">
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
          action={(fd) =>
            runAction(createAction, fd, () => setCreateOpen(false), setCreatePending)
          }
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

// ---------------------------------------------------------------------------
// ViewIconLink — link a la ficha del colaborador
// ---------------------------------------------------------------------------

type ViewIconLinkProps = {
  href: string;
  label: string;
};

function ViewIconLink({ href, label }: ViewIconLinkProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="inline-flex size-8 items-center justify-center rounded-btn border border-border bg-card text-muted-foreground transition hover:bg-secondary hover:text-foreground"
    >
      <svg
        className="size-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z"
        />
        <circle cx="12" cy="12" r="3" strokeWidth={2} />
      </svg>
    </Link>
  );
}
