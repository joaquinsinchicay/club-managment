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
import { EditIconButton } from "@/components/ui/edit-icon-button";
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
  updateAction: (formData: FormData) => Promise<RrhhActionResult>;
};

type VinculoFilter = "all" | StaffVinculoType;
type AlertFilter = "all" | "alerts_only";

const smTexts = texts.rrhh.staff_members;

/**
 * US-60 helper: un colaborador está "en alerta" cuando no tiene contratos
 * vigentes. Usado por el filtro de alertas y el banner de conteo.
 */
function isMemberInAlert(m: StaffMember): boolean {
  return !m.hasActiveContract;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function StaffMembersTab({
  members,
  canMutate,
  createAction,
  updateAction,
}: StaffMembersTabProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [vinculoFilter, setVinculoFilter] = useState<VinculoFilter>("all");
  const [alertFilter, setAlertFilter] = useState<AlertFilter>("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);

  const [createPending, setCreatePending] = useState(false);
  const [editPending, setEditPending] = useState(false);

  const alertsCount = useMemo(
    () => members.filter(isMemberInAlert).length,
    [members],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (vinculoFilter !== "all" && m.vinculoType !== vinculoFilter) return false;
      if (alertFilter === "alerts_only" && !isMemberInAlert(m)) return false;
      if (!q) return true;
      return (
        m.firstName.toLowerCase().includes(q) ||
        m.lastName.toLowerCase().includes(q) ||
        m.dni.includes(q) ||
        (m.cuitCuil?.includes(q) ?? false)
      );
    });
  }, [members, search, vinculoFilter, alertFilter]);

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

      <div className="rounded-card border border-border bg-card px-4 py-3">
        <input
          type="search"
          placeholder={smTexts.search_placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-btn border border-border bg-background px-3 py-2 text-sm"
        />
        <div className="mt-3 flex flex-wrap gap-1.5">
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
                  {canMutate ? (
                    <DataTableActions>
                      <EditIconButton
                        label={smTexts.action_edit}
                        onClick={() => setEditing(m)}
                      />
                    </DataTableActions>
                  ) : null}
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

    </div>
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
            pattern="\d{7,8}"
            minLength={7}
            maxLength={8}
            defaultValue={member?.dni ?? ""}
            required
          />
          <FormHelpText>{smTexts.form_dni_helper}</FormHelpText>
        </FormField>
        <FormField>
          <FormFieldLabel>{smTexts.form_cuit_label}</FormFieldLabel>
          <FormInput
            type="text"
            name="cuit_cuil"
            inputMode="numeric"
            defaultValue={member?.cuitCuil ?? ""}
            placeholder={smTexts.form_cuit_placeholder}
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
