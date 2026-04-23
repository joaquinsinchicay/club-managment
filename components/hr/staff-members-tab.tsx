"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import Link from "next/link";

import type { RrhhActionResult } from "@/app/(dashboard)/settings/rrhh/actions";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonClass } from "@/components/ui/button";
import { ChipButton } from "@/components/ui/chip";
import {
  DataTable,
  DataTableActions,
  DataTableBody,
  DataTableCell,
  DataTableChip,
  DataTableHeadCell,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { ModalFooter } from "@/components/ui/modal-footer";
import {
  FormBanner,
  FormField,
  FormFieldLabel,
  FormHelpText,
  FormInput,
  FormSelect,
} from "@/components/ui/modal-form";
import { SettingsTabShell } from "@/components/settings/settings-tab-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { triggerClientFeedback } from "@/lib/client-feedback";
import {
  STAFF_VINCULO_TYPES,
  type StaffMember,
  type StaffMemberStatus,
  type StaffVinculoType,
} from "@/lib/domain/staff-member";
import { texts } from "@/lib/texts";

type StaffMembersTabProps = {
  members: StaffMember[];
  canMutate: boolean;
  createAction: (formData: FormData) => Promise<RrhhActionResult>;
  updateAction: (formData: FormData) => Promise<RrhhActionResult>;
  setStatusAction: (formData: FormData) => Promise<RrhhActionResult>;
};

type StatusFilter = "all" | StaffMemberStatus;
type VinculoFilter = "all" | StaffVinculoType;
type AlertFilter = "all" | "alerts_only";

const smTexts = texts.rrhh.staff_members;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: smTexts.filter_all },
  { value: "activo", label: smTexts.filter_active },
  { value: "inactivo", label: smTexts.filter_inactive },
];

/**
 * US-60 helper: a member is in "alert" state when active but has no active
 * contracts. Used by the filter and by the header counter.
 */
function isMemberInAlert(m: StaffMember): boolean {
  return m.status === "activo" && !m.hasActiveContract;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function StaffMembersTab({
  members,
  canMutate,
  createAction,
  updateAction,
  setStatusAction,
}: StaffMembersTabProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [vinculoFilter, setVinculoFilter] = useState<VinculoFilter>("all");
  const [alertFilter, setAlertFilter] = useState<AlertFilter>("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [confirmingStatus, setConfirmingStatus] = useState<{
    member: StaffMember;
    nextStatus: StaffMemberStatus;
  } | null>(null);

  const [createPending, setCreatePending] = useState(false);
  const [editPending, setEditPending] = useState(false);
  const [statusPending, setStatusPending] = useState(false);

  const alertsCount = useMemo(
    () => members.filter(isMemberInAlert).length,
    [members],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (vinculoFilter !== "all" && m.vinculoType !== vinculoFilter) return false;
      if (alertFilter === "alerts_only" && !isMemberInAlert(m)) return false;
      if (!q) return true;
      return (
        m.firstName.toLowerCase().includes(q) ||
        m.lastName.toLowerCase().includes(q) ||
        m.dni.includes(q) ||
        m.cuitCuil.includes(q)
      );
    });
  }, [members, search, statusFilter, vinculoFilter, alertFilter]);

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
    <SettingsTabShell
      searchPlaceholder={smTexts.search_placeholder}
      searchValue={search}
      onSearch={setSearch}
      ctaLabel={canMutate ? smTexts.create_cta : undefined}
      onCta={canMutate ? () => setCreateOpen(true) : undefined}
    >
      <section className="grid gap-3">
        <header className="grid gap-1">
          <h2 className="text-lg font-semibold text-foreground">{smTexts.section_title}</h2>
          <p className="text-sm text-muted-foreground">{smTexts.section_description}</p>
        </header>

        {alertsCount > 0 ? (
          <FormBanner
            variant="warning"
            action={
              <ChipButton
                active={alertFilter === "alerts_only"}
                onClick={() =>
                  setAlertFilter((v) => (v === "alerts_only" ? "all" : "alerts_only"))
                }
              >
                {alertFilter === "alerts_only"
                  ? smTexts.alert_banner_cta_all
                  : smTexts.alert_banner_cta_only}
              </ChipButton>
            }
          >
            <strong>{alertsCount}</strong>{" "}
            {alertsCount === 1 ? smTexts.alert_banner_singular : smTexts.alert_banner_plural}
          </FormBanner>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <ChipButton
              key={f.value}
              active={statusFilter === f.value}
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </ChipButton>
          ))}
          {/* eslint-disable-next-line no-restricted-syntax -- Dropdown-chip (inline con ChipButtons): no existe primitivo dropdown-chip. Usa tokens canonicos rounded-chip + estilo inactive de ChipButton. */}
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

        {filtered.length === 0 ? (
          members.length === 0 ? (
            <EmptyState
              variant="dashed"
              title={smTexts.empty_title}
              description={smTexts.empty_description}
              action={
                canMutate ? (
                  <Button variant="primary" onClick={() => setCreateOpen(true)}>
                    {smTexts.empty_cta}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <EmptyState
              variant="dashed"
              title={smTexts.empty_filter_title}
              description={smTexts.empty_filter_description}
            />
          )
        ) : (
          <DataTable
            density="comfortable"
            gridColumns="minmax(0,1.5fr) 130px 150px 140px 120px 120px 80px"
          >
            <DataTableHeader>
              <DataTableHeadCell>{smTexts.col_name}</DataTableHeadCell>
              <DataTableHeadCell>{smTexts.col_dni}</DataTableHeadCell>
              <DataTableHeadCell>{smTexts.col_cuit}</DataTableHeadCell>
              <DataTableHeadCell>{smTexts.col_vinculo}</DataTableHeadCell>
              <DataTableHeadCell align="center">{smTexts.col_contracts}</DataTableHeadCell>
              <DataTableHeadCell>{smTexts.col_status}</DataTableHeadCell>
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
                        {m.status === "activo" && !m.hasActiveContract ? (
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
                    <span className="font-mono text-xs">{m.cuitCuil}</span>
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
                  <DataTableCell>
                    <StatusBadge
                      tone={m.status === "activo" ? "success" : "neutral"}
                      label={smTexts.status_options[m.status]}
                    />
                  </DataTableCell>
                  <DataTableCell align="right">
                    {canMutate ? (
                      <DataTableActions>
                        <button
                          type="button"
                          onClick={() => setEditing(m)}
                          className={buttonClass({ variant: "secondary", size: "sm" })}
                        >
                          {smTexts.action_edit}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmingStatus({
                              member: m,
                              nextStatus: m.status === "activo" ? "inactivo" : "activo",
                            })
                          }
                          className={buttonClass({
                            variant: m.status === "activo" ? "destructive" : "secondary",
                            size: "sm",
                          })}
                        >
                          {m.status === "activo"
                            ? smTexts.action_deactivate
                            : smTexts.action_reactivate}
                        </button>
                      </DataTableActions>
                    ) : null}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </section>

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

      {/* Edit */}
      <Modal
        open={editing !== null}
        onClose={() => !editPending && setEditing(null)}
        title={smTexts.edit_modal_title}
        description={smTexts.edit_modal_description}
        size="md"
        closeDisabled={editPending}
      >
        {editing ? (
          <form
            action={(fd) =>
              runAction(updateAction, fd, () => setEditing(null), setEditPending)
            }
            className="grid gap-4"
          >
            <input type="hidden" name="staff_member_id" value={editing.id} />
            <StaffMemberFormFields member={editing} />
            <ModalFooter
              onCancel={() => setEditing(null)}
              cancelLabel={smTexts.cancel_cta}
              submitLabel={smTexts.edit_submit_cta}
              pendingLabel={smTexts.submit_pending}
            />
          </form>
        ) : null}
      </Modal>

      {/* Confirm status change */}
      <Modal
        open={confirmingStatus !== null}
        onClose={() => !statusPending && setConfirmingStatus(null)}
        title={
          confirmingStatus?.nextStatus === "inactivo"
            ? smTexts.deactivate_modal_title
            : smTexts.reactivate_modal_title
        }
        size="sm"
        closeDisabled={statusPending}
      >
        {confirmingStatus ? (
          <form
            action={(fd) =>
              runAction(
                setStatusAction,
                fd,
                () => setConfirmingStatus(null),
                setStatusPending,
              )
            }
            className="grid gap-4"
          >
            <input type="hidden" name="staff_member_id" value={confirmingStatus.member.id} />
            <input type="hidden" name="status" value={confirmingStatus.nextStatus} />
            <FormBanner
              variant={confirmingStatus.nextStatus === "inactivo" ? "destructive" : "info"}
            >
              {confirmingStatus.nextStatus === "inactivo"
                ? smTexts.deactivate_warning
                : smTexts.reactivate_warning}
            </FormBanner>
            <p className="text-sm text-foreground">
              {confirmingStatus.member.firstName} {confirmingStatus.member.lastName}
              {" · "}
              <span className="text-muted-foreground">
                DNI {confirmingStatus.member.dni}
              </span>
            </p>
            <ModalFooter
              onCancel={() => setConfirmingStatus(null)}
              cancelLabel={smTexts.cancel_cta}
              submitLabel={
                confirmingStatus.nextStatus === "inactivo"
                  ? smTexts.deactivate_submit_cta
                  : smTexts.reactivate_submit_cta
              }
              pendingLabel={smTexts.submit_pending}
              submitVariant={
                confirmingStatus.nextStatus === "inactivo" ? "destructive" : "primary"
              }
            />
          </form>
        ) : null}
      </Modal>
    </SettingsTabShell>
  );
}

type StaffMemberFormFieldsProps = { member?: StaffMember };

function StaffMemberFormFields({ member }: StaffMemberFormFieldsProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField>
          <FormFieldLabel required>{smTexts.form_first_name_label}</FormFieldLabel>
          <FormInput
            type="text"
            name="first_name"
            defaultValue={member?.firstName ?? ""}
            minLength={1}
            maxLength={80}
            required
          />
        </FormField>
        <FormField>
          <FormFieldLabel required>{smTexts.form_last_name_label}</FormFieldLabel>
          <FormInput
            type="text"
            name="last_name"
            defaultValue={member?.lastName ?? ""}
            minLength={1}
            maxLength={80}
            required
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField>
          <FormFieldLabel required>{smTexts.form_dni_label}</FormFieldLabel>
          <FormInput
            type="text"
            name="dni"
            inputMode="numeric"
            defaultValue={member?.dni ?? ""}
            required
          />
          <FormHelpText>{smTexts.form_dni_helper}</FormHelpText>
        </FormField>
        <FormField>
          <FormFieldLabel required>{smTexts.form_cuit_label}</FormFieldLabel>
          <FormInput
            type="text"
            name="cuit_cuil"
            inputMode="numeric"
            defaultValue={member?.cuitCuil ?? ""}
            placeholder={smTexts.form_cuit_placeholder}
            required
          />
          <FormHelpText>{smTexts.form_cuit_helper}</FormHelpText>
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField>
          <FormFieldLabel>{smTexts.form_email_label}</FormFieldLabel>
          <FormInput
            type="email"
            name="email"
            autoComplete="email"
            defaultValue={member?.email ?? ""}
            placeholder={smTexts.form_email_placeholder}
          />
        </FormField>
        <FormField>
          <FormFieldLabel>{smTexts.form_phone_label}</FormFieldLabel>
          <FormInput
            type="tel"
            name="phone"
            inputMode="tel"
            defaultValue={member?.phone ?? ""}
            placeholder={smTexts.form_phone_placeholder}
          />
          <FormHelpText>{smTexts.form_phone_helper}</FormHelpText>
        </FormField>
      </div>

      <FormField>
        <FormFieldLabel required>{smTexts.form_vinculo_label}</FormFieldLabel>
        <FormSelect
          name="vinculo_type"
          defaultValue={member?.vinculoType ?? ""}
          required
        >
          <option value="" disabled>
            {smTexts.form_vinculo_placeholder}
          </option>
          {STAFF_VINCULO_TYPES.map((v) => (
            <option key={v} value={v}>
              {smTexts.vinculo_options[v]}
            </option>
          ))}
        </FormSelect>
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField>
          <FormFieldLabel>{smTexts.form_cbu_label}</FormFieldLabel>
          <FormInput
            type="text"
            name="cbu_alias"
            defaultValue={member?.cbuAlias ?? ""}
            placeholder={smTexts.form_cbu_placeholder}
            maxLength={50}
          />
        </FormField>
        <FormField>
          <FormFieldLabel required>{smTexts.form_hire_date_label}</FormFieldLabel>
          <FormInput
            type="date"
            name="hire_date"
            defaultValue={member?.hireDate ?? todayIso()}
            required
          />
        </FormField>
      </div>
    </>
  );
}
