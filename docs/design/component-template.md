# Plantilla de componente · design system

> Esqueleto listo-para-copiar para crear un componente client-side que respete el design system.
> Referencia canónica antes de escribir una sola línea. Si al terminar todavía tenés clases
> hardcodeadas que el primitivo podría haber resuelto, el componente está mal.
>
> **Recordá**: `npm run check:primitives` debe pasar antes de commitear.

---

## 1 · Escenario: tab con listado + modal de alta/edición

Este es el patrón más frecuente (maestros como Estructuras, Colaboradores, Contratos, Cost Centers).

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// ── Primitivos del design system (import siempre desde aquí) ──
import { Modal } from "@/components/ui/modal";
import { ModalFooter } from "@/components/ui/modal-footer";
import {
  FormField,
  FormFieldLabel,
  FormInput,
  FormSelect,
  FormTextarea,
  FormReadonly,
  FormCheckboxCard,
  FormBanner,
  FormSection,
  FormHelpText,
  FormError,
} from "@/components/ui/modal-form";
import {
  DataTable,
  DataTableHeader,
  DataTableHeadCell,
  DataTableBody,
  DataTableRow,
  DataTableCell,
  DataTableChip,
  DataTableAmount,
  DataTableActions,
  DataTableEmpty,
} from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { ChipButton, ChipLink, Chip } from "@/components/ui/chip";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, getInitials } from "@/components/ui/avatar";
import { MetaPill } from "@/components/ui/meta-pill";

// ── Helpers del repo ──
import { texts } from "@/lib/texts";                      // TODO string visible sale de acá
import { triggerClientFeedback } from "@/lib/toast";       // feedback post-acción
import { cn } from "@/lib/utils";

type Filter = "all" | "active" | "inactive";

type Props = {
  items: Item[];
  // ...props del server
};

export function MyFeatureTab({ items }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [filter, setFilter] = useState<Filter>("all");
  const [modalOpen, setModalOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    setModalOpen(false);                                   // 1. cerrar modal
    const result = await createItemAction(formData);       // 2. await server
    triggerClientFeedback("my_domain", result.code);       // 3. toast cliente
    if (result.ok) {
      startTransition(() => router.refresh());             // 4. refrescar
    }
  }

  return (
    <Card padding="none">
      <CardHeader
        eyebrow={texts.myFeature.eyebrow}
        title={texts.myFeature.title}
        description={texts.myFeature.description}
        action={
          <Button onClick={() => setModalOpen(true)}>
            {texts.myFeature.create_cta}
          </Button>
        }
        divider
      />

      {/* Filtros con ChipButton — NO `<button className="rounded-full bg-foreground ...">` */}
      <div className="flex flex-wrap gap-2 px-5 py-3">
        {(["all", "active", "inactive"] as const).map((f) => (
          <ChipButton
            key={f}
            active={filter === f}
            onClick={() => setFilter(f)}
          >
            {texts.myFeature.filters[f]}
          </ChipButton>
        ))}
      </div>

      {/* Listado con DataTable — NO `<div className="rounded-[18px] border ...">` */}
      {items.length === 0 ? (
        <DataTableEmpty
          title={texts.myFeature.empty_title}
          description={texts.myFeature.empty_description}
        />
      ) : (
        <DataTable density="comfortable" gridColumns="minmax(0,1.7fr) 180px 120px 88px">
          <DataTableHeader>
            <DataTableHeadCell>{texts.myFeature.col_name}</DataTableHeadCell>
            <DataTableHeadCell>{texts.myFeature.col_activity}</DataTableHeadCell>
            <DataTableHeadCell align="right">{texts.myFeature.col_amount}</DataTableHeadCell>
            <DataTableHeadCell align="right">{/* acciones */}</DataTableHeadCell>
          </DataTableHeader>
          <DataTableBody>
            {items.map((item) => (
              <DataTableRow key={item.id} hoverReveal>
                <DataTableCell>
                  <div className="flex items-center gap-3">
                    <Avatar name={item.name} size="sm" />
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-meta text-muted-foreground">{item.dni}</p>
                    </div>
                  </div>
                </DataTableCell>
                <DataTableCell>
                  <DataTableChip tone="neutral">{item.activity}</DataTableChip>
                </DataTableCell>
                <DataTableCell align="right">
                  <DataTableAmount type="neutral" amount={item.amount} currencyCode="ARS" />
                </DataTableCell>
                <DataTableCell align="right">
                  <DataTableActions reveal>
                    <Button variant="secondary" size="sm">
                      {texts.common.edit}
                    </Button>
                  </DataTableActions>
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}

      {/* Modal con Modal + ModalFooter + FormField/FormInput — NADA a mano */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={texts.myFeature.modal_title}
        description={texts.myFeature.modal_description}
        size="md"
      >
        <form action={handleSubmit} className="grid gap-4 p-5 sm:grid-cols-2">
          <FormField fullWidth>
            <FormFieldLabel required>{texts.myFeature.form.name}</FormFieldLabel>
            <FormInput name="name" required />
          </FormField>

          <FormField>
            <FormFieldLabel required>{texts.myFeature.form.type}</FormFieldLabel>
            <FormSelect name="type" required>
              <option value="">{texts.common.select_placeholder}</option>
              <option value="a">{texts.myFeature.types.a}</option>
              <option value="b">{texts.myFeature.types.b}</option>
            </FormSelect>
          </FormField>

          <FormField>
            <FormFieldLabel>{texts.myFeature.form.hours}</FormFieldLabel>
            <FormInput name="hours" type="number" min={0} />
            <FormHelpText>{texts.myFeature.form.hours_hint}</FormHelpText>
          </FormField>

          <FormBanner variant="info" className="sm:col-span-2">
            {texts.myFeature.modal_info}
          </FormBanner>

          <ModalFooter
            className="sm:col-span-2"
            onCancel={() => setModalOpen(false)}
            cancelLabel={texts.common.cancel}
            submitLabel={texts.myFeature.submit}
            pendingLabel={texts.myFeature.submitting}
          />
        </form>
      </Modal>
    </Card>
  );
}
```

---

## 2 · Anti-patrones prohibidos (los que rompen `check:primitives`)

```tsx
// ❌ Filter pill hardcoded
<button className="rounded-full bg-foreground px-3 py-1.5 text-xs text-white">Todas</button>
// ✓ Primitivo
<ChipButton active>Todas</ChipButton>

// ❌ Footer de modal a mano
<div className="flex gap-2 border-t pt-4">
  <button>Cancelar</button>
  <PendingSubmitButton />
</div>
// ✓ Primitivo
<ModalFooter onCancel={...} cancelLabel={...} submitLabel={...} pendingLabel={...} />

// ❌ Banner amarillo ad-hoc
<div className="rounded-card border border-amber-200 bg-amber-50 p-3 text-sm">
  No hay contratos vigentes
</div>
// ✓ Primitivo
<FormBanner variant="warning">No hay contratos vigentes</FormBanner>

// ❌ Input crudo
<input className="min-h-11 rounded-card border border-border bg-card px-4 py-3 ..." />
// ✓ Primitivo
<FormInput name="..." />

// ❌ Empty state border-dashed manual
<div className="rounded-xl border border-dashed border-border bg-secondary/30 p-4">...</div>
// ✓ Primitivo
<EmptyState title="..." description="..." variant="dashed" />

// ❌ Card shell manual
<section className="rounded-[26px] border border-border bg-card p-5">...</section>
// ✓ Primitivo
<Card><CardHeader title={...} /><CardBody>...</CardBody></Card>

// ❌ Texto hardcoded
<Button>Guardar</Button>
// ✓ Textos centralizados
<Button>{texts.common.save}</Button>
```

---

## 3 · Checklist antes de commitear un componente nuevo

- [ ] Todos los imports de primitivos vienen de `@/components/ui/*`.
- [ ] No hay `<input>/<select>/<textarea>` crudos (salvo `type="checkbox|radio|hidden|file|search"` bien justificados).
- [ ] No hay `<button className="rounded-... bg-foreground ...">`, usé `<Button>` o `<ChipButton>`.
- [ ] No hay `rounded-full bg-foreground`, `rounded-[18px]`, `rounded-[26px]`, `bg-amber-50` manual.
- [ ] Todos los textos visibles salen de `texts.*`.
- [ ] El feedback post-acción es por toast (`triggerClientFeedback` / `flashToast`), no inline.
- [ ] Modal con `size` explícito + `<ModalFooter>`.
- [ ] Empty state con `<DataTableEmpty>` o `<EmptyState>`.
- [ ] `npm run check:primitives` pasa en verde.
- [ ] `npm run lint` sin errores nuevos.
- [ ] `npm run typecheck` en verde.

---

## 4 · Referencias canónicas en el repo

| Patrón | Archivo a leer |
|---|---|
| Modal + form + server action (Patrón A) | `components/dashboard/treasury-card.tsx` (`handleCreateTreasuryMovement`) |
| Modal + form con `<FormReadonly>` + banner | `components/dashboard/open-session-modal-form.tsx` |
| Modal + `<FormCheckboxCard>` + validación inline | `components/settings/tabs/category-form.tsx` |
| DataTable con grid desktop + header | `components/dashboard/movement-list.tsx` |
| DataTable flex (`useGrid={false}`) + hover-reveal | `components/dashboard/secretaria-movement-list.tsx` |
| Segmented nav / sub-tabs | `components/dashboard/treasury-role-card.tsx` (`SubTabNav`) + `components/hr/rrhh-module-nav.tsx` |
| Card operativa dashboard | `app/(dashboard)/dashboard/page.tsx` |
| Avatar de cuenta tesorería | `components/dashboard/treasury-role-card.tsx` (`AccountAvatar`) |
| SettingsTabShell | `components/settings/tabs/members-tab.tsx` |
