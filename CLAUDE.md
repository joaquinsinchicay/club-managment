# CLAUDE.md

## 🧠 Contexto del proyecto

Este repositorio implementa una aplicación web mobile-first para gestión de cenas grupales.

El desarrollo está guiado por:
- User Stories (US)
- Acceptance Criteria (Gherkin)
- PDD por US (/pdd)
- Documentación técnica (/docs)
- Contratos (/docs/contracts)
- Modelo de dominio (/docs/domain)
- Base de datos (/docs/database + schema.sql)
- Textos centralizados (/lib/texts.json)

---

## 📚 Fuentes de verdad (orden de prioridad)

1. User Stories + Acceptance Criteria
2. PDD (/pdd)
3. Contracts (/docs/contracts)
4. Domain Model (/docs/domain/domain-model.md)
5. Database (schema.sql, rls-policies.sql)
6. Architecture (/docs/architecture)
7. texts.json

Si hay conflicto:
- Gherkin manda
- Luego PDD
- Luego contracts/domain

---

## 📍 Ubicación canónica de módulos

- **Configuración (`/settings`)**: ajustes del club (datos, categorías, actividades, usuarios, sistema de socios, etc.). Solo accede el rol `admin`.
- **Módulo RRHH (`/rrhh`)**: todo lo del bounded context RRHH (Resumen, Contratos, Colaboradores, Estructuras, Liquidaciones, Fichas). **Acceso restringido al rol `rrhh` exclusivo** — ni `admin` ni `tesoreria` ni `secretaria` ven el módulo ni pueden invocar sus endpoints. Todos los guards (`canAccessHrModule`, `canAccessHrMasters`, `canMutateHrMasters`, `canOperateHrSettlements`, `canOperateHrPayments`) delegan en el mismo check. **Los maestros (Estructuras, Colaboradores, Contratos) NO viven en `/settings`** — el Coordinador de RRHH los administra directamente desde el módulo.
- **Mirrors Tesorería (`/treasury?tab=payroll`, `/treasury/staff/[id]`)**: vistas espejo del bounded context RRHH expuestas dentro del módulo Tesorería para rol `tesoreria` (E04 · US-71 / US-67). Solo lectura excepto la bandeja `?tab=payroll` (sub-tab de `/treasury`), donde Tesorería puede pagar (US-64/65) o devolver una liquidación a "generada" (US-70). El módulo `/rrhh` sigue cerrado para Tesorería — no hay duplicación de modelo: el service subyacente `getStaffProfile` usa un guard "permisivo" (`canViewStaffProfile`) y los guards de cada página (`canAccessTreasuryStaffProfile`, `canAccessTreasuryPayrollTray`) deciden quién entra a qué ruta. Detalle en `docs/pdd/pdd_us_67_ficha_colaborador.md` § 16 y `pdd_us_68_dashboard_rrhh.md` § 16. Equivalencias Notion ↔ repo en [`docs/pdd/README.md`](docs/pdd/README.md). Notas: (a) la pantalla `/rrhh/reports` y su mirror `/treasury/reports/payroll` (US-69) fueron eliminadas el 2026-04-28; sus comparativas se cubren ahora dentro del Resumen RRHH (US-68). (b) La bandeja de pagos pendientes era una ruta separada `/treasury/payroll` hasta el 2026-04-28; ahora vive como sub-tab `?tab=payroll` dentro del shell de `/treasury`.
- Cualquier nueva entidad operativa de un módulo debe alojarse en la ruta de ese módulo, no en Configuración.

---

## 📐 Convenciones del modelo de datos

### Transferencias entre cuentas (US-25)

Una transferencia entre cuentas del club se modela con **una fila en `account_transfers`** (con `source_account_id`, `target_account_id`, `currency_code`, `amount`, `concept`) y **2 movimientos hijos en `treasury_movements`** que comparten `transfer_group_id = <account_transfers.id>` y tienen `category_id = NULL` y `movement_type` complementario (`egreso` desde la source, `ingreso` hacia el target).

**NUNCA** se crean subcategorías "Egreso e/cuentas" / "Ingreso e/cuentas" — esas existieron en el legacy pre-rediseño y se eliminaron del producto en commit `2a0f53c` (refactor 2026-04-27). El bug se reintrodujo accidentalmente durante el import 2022 (`20260428200000_masters_for_2022_import.sql`) y se corrigió post-mortem con migraciones `20260428250000_fix_transferencias_2022_a_account_transfers.sql` + `20260428260000_drop_legacy_transferencias_subcategories.sql`.

**Para imports históricos**: si el CSV trae filas con columna `Transacción = ID TRX N` (o equivalente), agruparlas por ese ID y crearlas como `account_transfers` + 2 movs hijos. Validación: cada grupo debe tener exactamente 1 egreso + 1 ingreso del mismo monto en cuentas distintas.

---

## ⚠️ Regla crítica: textos

### ❌ PROHIBIDO
- Hardcodear textos
- Strings en componentes
- Mensajes inline

### ✅ OBLIGATORIO
Todos los textos salen de:

/lib/texts.json

Ejemplo:

INCORRECTO:
<Button>Confirmar</Button>

CORRECTO:
<Button>{texts.buttons.confirm}</Button>

---

## 🪟 Regla crítica: modales

### Primitivos obligatorios
- Todo modal usa `@/components/ui/modal`. Prohibido re-implementar overlay/panel con `BlockingOverlay`, `<div fixed>`, portales manuales o wrappers propios.
- El primitivo renderiza un botón de cerrar con icono `X` en el header. **Siempre está visible** — la X es la vía de salida garantizada de cualquier modal.
- **No agregar** botones textuales "Cerrar" dentro del body.
- Todo form dentro de un modal usa `@/components/ui/modal-footer` para los botones de acción. Reimplementar el footer a mano está **prohibido**.

### API canónica: `<Modal>`
```tsx
<Modal
  open={...}
  onClose={...}
  title={...}
  description={...}         // opcional
  size="sm" | "md" | "lg"   // OBLIGATORIO (no hay default — declararlo siempre)
  closeDisabled             // durante submit
>
```

**⚠️ Prohibido `hideCloseButton`**. La prop existe en el primitivo por razones de compatibilidad legacy pero no debe usarse en código nuevo. El gate `check:primitives` (regla `modal-hideclose-forbidden`) lo bloquea. Historia: se invirtió la convención en commit `6178eea` — antes era "ocultá la X si hay Cancelar"; ahora es "siempre X" para que todo modal tenga vía de salida consistente independientemente de si su footer tiene botón Cancelar.
Taxonomía de `size`:
- `sm` → `max-w-md`. Confirmaciones irreversibles, modales de 1 campo (Invitar, Eliminar miembro, Confirmar remoción).
- `md` → `max-w-xl`. **Default**. Form simple de un solo flujo (editar movimiento, crear categoría/actividad, editar cost center).
- `lg` → `max-w-3xl`. Forms multi-columna, listas, tablas embebidas (apertura/cierre de jornada).

No hay escape-hatch de ancho: si la taxonomía no encaja, ampliar la taxonomía en code review.

### API canónica: `<ModalFooter>`
```tsx
<ModalFooter
  onCancel={handleCancel}       // opcional; si se omite, solo Submit (caso "Invitar")
  cancelLabel="Cancelar"
  submitLabel="Guardar"
  pendingLabel="Guardando…"
  submitDisabled={...}
  submitVariant="primary" | "destructive" | "dark"   // default "primary"
  size="sm" | "md"              // default "md"
/>
```

Reglas de uso:
- Layout siempre `grid-cols-2` cuando hay `onCancel`, `grid-cols-1` cuando no. No hay prop `align` — la decisión es uniforme en toda la app.
- **`size="md"` es obligatorio en todos los modales** — la altura/radio de botón debe ser idéntica en toda la app. `size="sm"` existe en la API pero no se usa en modales (reservado para triggers fuera de modal).
- Para modales de **una sola acción** (Invitar), omitir `onCancel`/`cancelLabel`. La X del header sigue siendo vía de salida.
- No hay `className` passthrough — el footer no se overridea.
- `submitVariant="destructive"` en acciones destructivas (cerrar jornada, remover miembro, eliminar recurso).

### Prohibiciones explícitas
```tsx
// ❌ radius hardcoded
<button className="rounded-2xl ..." />
// ❌ altura / padding hardcoded
<button className="min-h-11 py-3 ..." />
// ❌ footer a mano
<div className="flex gap-2 border-t pt-4">
  <button>Cancelar</button>
  <PendingSubmitButton ... />
</div>
// ❌ override de ancho del Modal por className/style — usar size="sm|md|lg"
// ❌ X + botón "Cerrar" textual simultáneos
// ❌ MODAL_FOOTER_CLASSNAME (eliminado)
// ❌ hideCloseButton — prohibido en código nuevo (bloqueado por check:primitives)
// ❌ <Modal> sin prop size — size es obligatorio (bloqueado por check:primitives)
```

### Primitivos de form obligatorios

Todo campo dentro de un modal usa los primitivos de `@/components/ui/modal-form`. Prohibido hardcodear clases de input/select/textarea/readonly/checkbox/banner.

Catálogo (API pública):
- `<FormField>` — wrapper `<label>` con gap y tipografía canónica (usar para agrupar label + control).
- `<FormFieldLabel>` — label de campo individual. Tipografía: `text-xs font-semibold text-foreground` (sentence case, NO uppercase). Prop `required` agrega asterisco.
- `<FormInput>` / `<FormSelect>` / `<FormTextarea>` — reemplazan `<input className={CONTROL_CLASSNAME}>`. Estilo: `min-h-11 rounded-card bg-card border border-border px-4 py-3 text-sm text-foreground focus:ring-foreground/10`.
- `<FormReadonly>` — campo no editable (fecha, hora, saldo previo, tipo inmutable). Estilo: igual que input + `bg-secondary/40 text-muted-foreground`.
- `<FormSection>` — section header uppercase único (`text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground`). Un único estilo en toda la app. Prop `required`.
- `<FormHelpText>` — hint (`text-xs text-muted-foreground`).
- `<FormError>` — error inline (`text-xs font-medium text-destructive`).
- `<FormBanner variant="warning" | "destructive" | "info">` — callout. Reemplaza `<div className="rounded-card border-amber-200 bg-amber-50 …">` y variaciones.
- `<FormCheckboxCard>` — checkbox estilo pill. Reemplaza wrappers hand-rolled con `rounded-2xl bg-secondary/40`.

### Prohibiciones explícitas (form)
```tsx
// ❌ radius fuera de rounded-card en controles/banners/tablas/readonly
<input className="rounded-2xl ..." />
<div className="rounded-lg ...">       // banner, tabla, textarea

// ❌ bg-secondary/40 en inputs editables (solo permitido en FormReadonly)
<input className="bg-secondary/40 ..." />

// ❌ labels uppercase + muted-foreground en campos individuales
<span className="text-meta uppercase tracking-[0.06em] text-muted-foreground">Concepto</span>

// ❌ heights o paddings variables en inputs
<input className="min-h-9 px-3 py-2 text-[13px] ..." />   // usar <FormInput>

// ❌ tracking distinto de 0.14em en section headers uppercase
<p className="tracking-[0.18em] uppercase ...">Roles</p>   // usar <FormSection>

// ❌ focus:ring-foreground/20 (canon es /10)

// ❌ Constantes FORM_* / CONTROL_CLASSNAME / FIELD_LABEL_CLASSNAME redeclaradas localmente
```

### Checklist para modales nuevos o modificados
- [ ] `<Modal>` con `size` explícito apropiado a la taxonomía.
- [ ] `<ModalFooter>` con labels desde `texts.*` (nunca hardcoded).
- [ ] NO usar `hideCloseButton`. La X del header siempre visible.
- [ ] `submitVariant="destructive"` para acciones destructivas.
- [ ] Todos los campos usan `<FormFieldLabel>`, `<FormInput>`, `<FormSelect>`, `<FormTextarea>`, `<FormReadonly>`, `<FormCheckboxCard>`, `<FormSection>`, `<FormBanner>`, `<FormError>`, `<FormHelpText>`. No hay clases hardcodeadas.
- [ ] Si el submit depende de validación client-side, `submitDisabled` conectado.
- [ ] Si usa server action, el handler sigue el patrón `setModalOpen(false) → await action → triggerClientFeedback → router.refresh` (ver sección de feedback).
- [ ] Nada de `rounded-2xl`, `rounded-lg`, `py-3`, `min-h-9/10`, `bg-secondary/40` en inputs editables.

### Referencia canónica
- Wiring Modal + form con handler: `components/dashboard/treasury-role-card.tsx` (bloque `edit_movement`).
- Form con primitivos completos + `<ModalFooter>`: `SecretariaMovementEditForm` en `components/dashboard/treasury-operation-forms.tsx`.
- Form con `<FormReadonly>` y banner: `OpenSessionModalForm` en `components/dashboard/open-session-modal-form.tsx`.
- Form con `<FormCheckboxCard>` + validación inline: `CategoryForm` en `components/settings/tabs/category-form.tsx`.
- Footer sin `onCancel` (acción única): modal "Invitar" en `components/settings/tabs/members-tab.tsx`.

---

## 🧾 Regla crítica: tablas / listas tabulares

### Primitivos obligatorios
- Toda lista tabular (movimientos, miembros, cuentas, cost centers, categorías, conciliación, etc.) usa **`@/components/ui/data-table`**. Prohibido re-implementar el shell con `<div className="rounded-shell border ...">`, headers desktop con `md:grid-cols-[...]` a mano, `divide-y divide-border/60` suelto o `<article>` con padding/hover propio.
- Cualquier chip/pill de metadata dentro de una fila usa **`<DataTableChip>`**. Prohibido declarar objetos `chipStyle` locales, `style={{ background: "var(--slate-...)" }}` inline o `rounded-full px-2` manual.
- Todo monto con signo usa **`<DataTableAmount>`**. Prohibido calcular el signo / color / símbolo de moneda a mano en la fila.
- Acciones hover-reveal van envueltas en **`<DataTableActions>`**. Prohibido replicar `opacity-0 transition group-hover:opacity-100` en cada fila.

### API canónica: `<DataTable>` + subcomponentes
```tsx
<DataTable
  density="compact" | "comfortable"   // default "comfortable"
  gridColumns="minmax(0,1.7fr) 180px 150px 88px"  // opcional; md+ aplica a header y filas
>
  <DataTableHeader>
    <DataTableHeadCell align="left" | "right" | "center">Concepto</DataTableHeadCell>
  </DataTableHeader>

  <DataTableBody>
    <DataTableRow
      as="article" | "div" | "button"         // default "div"
      density={...}                             // hereda si se omite
      useGrid={true | false}                    // default true; false para filas flex (p. ej. Secretaría)
      hoverReveal={true | false}                // activa group para <DataTableActions>
    >
      <DataTableCell align?>...</DataTableCell>
    </DataTableRow>
  </DataTableBody>
</DataTable>

<DataTableChip tone="neutral" | "income" | "expense" | "warning" | "info">{label}</DataTableChip>
<DataTableAmount type="ingreso" | "egreso" | "neutral" currencyCode={...} amount={...} size="inline" | "display" />
<DataTableActions reveal={true}>{actions}</DataTableActions>
<DataTableEmpty title={...} description={...} icon={...} action={...} />
```

Taxonomía de `density`:
- `compact` → `px-4 py-3` + `text-label` (13 px). Úsese en listas densas con muchos items (movimientos, cuentas, conciliación).
- `comfortable` (default) → `px-4 py-4 md:px-5` + `text-body` (14 px). Úsese en miembros, cost centers, categorías.

Reglas de uso:
- **`size="md"` implícito, no hay override**. Padding, radio, tipografía, hover y divider **no se tocan**.
- Si la fila necesita un **layout de grid alineado con el header**, pasar `gridColumns` en `<DataTable>` y usar `<DataTableCell>` como hijos — el grid aplica solo en md+. En mobile los cells se stackean.
- Si la fila es **flex/libre** (layout interno propio, como SecretariaMovementList), pasar `useGrid={false}` a `DataTableRow` y componer adentro con flexbox. No declarar `<DataTableHeader>` en ese caso.
- Para **acciones por fila** (editar/eliminar) usar `hoverReveal` + `<DataTableActions>`. El wrapper ya maneja `focus-within` para accesibilidad por teclado.
- **Empty state**: siempre `<DataTableEmpty>`. Nunca `border-dashed bg-secondary/30 p-6` a mano.

### Prohibiciones explícitas
```tsx
// ❌ shell hardcoded
<div className="rounded-[18px] border border-border bg-card">   // usar <DataTable>
<div className="rounded-shell ..."><div className="divide-y ...">  // idem
// ❌ header desktop a mano
<div className="hidden md:grid md:grid-cols-[...]">                 // usar <DataTableHeader gridColumns>
// ❌ padding / radio / hover / tipografía hardcoded en filas
<article className="p-5 rounded-toast hover:bg-slate-50 ...">       // usar density
<article className="px-4 py-3 hover:bg-slate-100 ...">              // idem
// ❌ chip styles inline
const chipStyle = { background: "var(--slate-100)", borderRadius: 4, ... };  // usar <DataTableChip>
<span style={{ background: "var(--slate-100)" }}>                   // idem
// ❌ color de monto por inline style / var
<span style={{ color: "var(--green-700)" }}>                        // usar <DataTableAmount>
// ❌ hover colors fuera del token
hover:bg-slate-50 | hover:bg-slate-100                              // el primitivo ya resuelve hover
// ❌ acciones hover-reveal ad-hoc
<div className="opacity-0 group-hover:opacity-100 ...">             // usar <DataTableActions>
```

### Checklist para tablas nuevas o modificadas
- [ ] `<DataTable>` con `density` explícito (o default `comfortable`).
- [ ] Si hay columnas alineadas desktop, `gridColumns` + `<DataTableHeader>` + `<DataTableHeadCell>`.
- [ ] Si la fila tiene layout libre (bullet, metadata stack), `useGrid={false}`.
- [ ] Chips de metadata con `<DataTableChip tone>`; acciones con `<DataTableActions>`.
- [ ] Montos con `<DataTableAmount>` (no calcular signo/color a mano).
- [ ] Empty state con `<DataTableEmpty>`, nunca `border-dashed` ad-hoc.
- [ ] Labels (header, empty state, `createdBy`, etc.) desde `texts.*` (nunca hardcoded).
- [ ] Cero clases `rounded-[18px]`, `rounded-2xl`, `rounded-toast`, `hover:bg-slate-*`, `p-5`, `px-4 py-3` en filas fuera del primitivo.

### Referencia canónica
- Fila con grid desktop + header: `MovementList` en `components/dashboard/movement-list.tsx`.
- Fila con layout flex (`useGrid={false}`) + hover-reveal: `SecretariaMovementList` en `components/dashboard/secretaria-movement-list.tsx`.

---

## 🔗 Regla crítica: botones y link-buttons

### Primitivos obligatorios
- Todo `<button>` con estilo visible usa **`@/components/ui/button`** (`<Button>` o `buttonClass()`). Prohibido reimplementar `inline-flex rounded-xl bg-foreground px-4 py-3 text-sm font-semibold ...` a mano.
- Todo `<Link>` de `next/link` estilado como botón usa **`@/components/ui/link-button`** (`<LinkButton>`).
- `NavigationLinkWithLoader` y `PendingSubmitButton` reciben className vía `buttonClass({...})`, nunca string hardcoded.

### API canónica
```tsx
<Button variant="primary" | "secondary" | "destructive" | "dark" size="sm" | "md" radius="btn" | "xl" fullWidth />

<LinkButton href="/secretary" variant="secondary" size="md" fullWidth external>
  {texts.dashboard.overview.open_module_cta}
</LinkButton>
```

Defaults: `Button` → `primary/md/xl`; `LinkButton` → `secondary/md/xl`. Usar `variant="primary"` para CTA principal, `variant="secondary"` para back/cancel, `variant="destructive"` para destructivas.

### Prohibiciones
```tsx
// ❌
<Link href="..." className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-4 py-3 ..." />
<button className="rounded-2xl bg-foreground px-4 py-3 ..." />
```

### Referencia canónica
- Back button: `PageContentHeader` en `components/ui/page-content-header.tsx`.
- CTA fullWidth: dashboard overview en `app/(dashboard)/dashboard/page.tsx`.

---

## 👤 Regla crítica: avatares y iniciales

### Primitivos obligatorios
- Todo avatar con iniciales usa **`@/components/ui/avatar`** (`<Avatar>`).
- Utilidad única de iniciales: **`getInitials(name, fallback?)`** desde el mismo módulo. Prohibido replicar `name.split(/\s+/).filter(Boolean).slice(0, 2).map(...).join("")`.
- `ClubMark` (branding) queda como excepción gráfica pero usa internamente `getInitials()`.

### API canónica
```tsx
<Avatar
  name="Juan Pérez"
  email="juan@ejemplo.com"
  size="xs" | "sm" | "md" | "lg"
  tone="neutral" | "bancaria" | "virtual" | "efectivo" | "accent"
  shape="circle" | "square"
/>
```

Regla de `tone`: `neutral` → usuarios; `bancaria/virtual/efectivo` → cuentas tesoreria según `accountType`; `accent` → estados activos.

### Referencia canónica
- Avatar de miembro: `MembersTab` en `components/settings/tabs/members-tab.tsx`.
- Avatar de cuenta tesorería: `AccountAvatar` en `components/dashboard/treasury-role-card.tsx`.

---

## 🏷️ Regla crítica: chips, badges y pills

### Primitivos obligatorios
- **Chip estático** (metadata, rol, etiqueta) → **`<Chip tone size>`**.
- **Chip clickable** (filtros, toggle) → **`<ChipButton active onClick>`** (incluye `aria-pressed`).
- **Chip link** (filtro navegable) → **`<ChipLink href active>`** (incluye `aria-current`).
- **Status semántico uppercase** (Aprobado, Pendiente, Vencido, Current user) → **`<StatusBadge tone>`**.
- **Chip dentro de fila de `DataTable`** → `<DataTableChip>` por coherencia tipográfica.
- **Pair label-value** (visibilidad, rol, moneda) → **`<MetaPill label value>`** desde `@/components/ui/meta-pill`.

### Prohibiciones
```tsx
// ❌ pill a mano
<span className="rounded-full border px-3 py-1 ..." />
<button className={`rounded-full ... ${active ? "bg-foreground ..." : "bg-card ..."}`} />
// ❌ MemberMetaPill o variantes locales (usar MetaPill)
```

### Referencia canónica
- Filter pills: `TreasuryConciliacionTab` y `CategoriesActivitiesTab`.
- MetaPill: `MembersTab`, `MembershipSystemsTab`.
- StatusBadge accent: `MembersTab` (`current_user_badge`).

---

## 🗒️ Regla crítica: empty states

### Primitivos obligatorios
- Empty state **dentro de `DataTable`** → **`<DataTableEmpty>`**.
- Empty state **standalone** → **`<EmptyState variant="card"|"dashed"|"inline">`** desde `@/components/ui/empty-state`.

### API canónica
```tsx
<EmptyState
  title={texts.dashboard.treasury.detail_empty_title}
  description={texts.dashboard.treasury.detail_empty_description}
  icon={<IconInbox />}
  action={<LinkButton href="/secretary">Volver</LinkButton>}
  variant="dashed"
/>
```

### Prohibiciones
```tsx
// ❌ empty state hardcoded
<div className="rounded-xl border border-dashed border-border bg-secondary/30 p-4 text-sm text-muted-foreground">...</div>
<div className="rounded-[24px] border border-dashed ..." />
```

### Referencia canónica
- Empty standalone: `DailySessionBalanceCard`, `CategoriesActivitiesTab`, `ClubTreasurySettingsManager`.

---

## 🃏 Regla crítica: cards

### Primitivos obligatorios
- Todo contenedor con radio + borde + fondo propio (fuera de tablas y modales) usa **`<Card>`** desde `@/components/ui/card`.
- Headers de card con título + descripción + acción opcional usan **`<CardHeader>`**.
- `<CardShell>` queda reservado para auth pages.

### API canónica
```tsx
<Card as="article" padding="none" | "compact" | "comfortable" tone="default" | "muted">
  <CardHeader
    eyebrow={texts.dashboard.overview.treasury_eyebrow}
    title={texts.dashboard.overview.tesoreria_title}
    description={texts.dashboard.overview.tesoreria_description}
    action={<LinkButton href="/treasury">Abrir</LinkButton>}
    divider
  />
  <CardBody>...</CardBody>
  <CardFooter>...</CardFooter>
</Card>
```

Defaults: `padding="comfortable"`. Usar `padding="none"` si la card contiene `DataTable` u otro con padding propio. `tone="muted"` para secciones secundarias.

### Prohibiciones
```tsx
// ❌
<article className="rounded-dialog border border-border bg-card p-5">...</article>
<section className="rounded-[26px] border border-border/70 bg-[linear-gradient(...)] p-5">...</section>
<div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 border-b border-border">...</div>   // usar <CardHeader divider>
```

### Referencia canónica
- Card operativa: dashboard overview en `app/(dashboard)/dashboard/page.tsx`.
- Card + CardHeader + DataTable: `MovementsCard` / `BalancesCard` en `components/dashboard/treasury-card.tsx`.

---

## 🗂️ Regla crítica: settings tabs

### Primitivo obligatorio
- Tabs de settings con búsqueda + CTA usan **`<SettingsTabShell>`** (`components/settings/settings-tab-shell.tsx`).

### Referencia canónica
- `MembersTab` y `AccountsTab`.

---

## 🔔 Regla crítica: feedback al usuario

### Patrón obligatorio
- Todo feedback post-acción de éxito o error debe mostrarse en toast.
- El toast debe ser reutilizable y consistente con el design system.
- El mensaje debe ser breve, visible y no depender del scroll de la página.

### API de toasts

**Desde client components** — llamada imperativa:

```tsx
import { showToast, showSuccess, showError, showWarning, showInfo } from "@/lib/toast";

showToast({
  kind: "success",
  title: "Movimiento registrado",
  desc: "Ingreso de $ 185.000,00 en Caja Pesos.",
  meta: "N° 004812 · 17/04 14:32"
});
```

**Desde server actions** — helper `flashToast()` + redirect:

```ts
import { flashToast } from "@/lib/toast-server";
import { resolveFeedback } from "@/lib/feedback-catalog";

flashToast(resolveFeedback("settings", result.code));
redirect("/settings");
```

La cookie flash `__toast` se consume una sola vez al rehidratar en el cliente. Nunca volver al patrón `?feedback=CODE` en la URL.

### Excepciones válidas
- Validación inline de campos dentro de formularios.
- Estados persistentes que forman parte principal de una pantalla.
- Modales o diálogos solo para confirmaciones previas o acciones irreversibles.

### Migración de legacy UI
- Si se toca una pantalla que todavía usa feedback inline transitorio, debe migrarse a toast en la misma tarea.
- No se deben introducir nuevos mensajes inline para feedback post-acción.

### Forms dentro de modales con server actions

El patrón `flashToast() + redirect()` por sí solo **NO cierra el modal**: el modal vive en estado React del cliente, y la soft-navigation al mismo path preserva el árbol React, dejando el modal abierto con el toast detrás. Hay dos patrones canónicos según cómo termine la action:

**Patrón A — Action devuelve `{ok, code}` (recomendado para nuevas features)**:

1. La server action devuelve `{ ok: boolean; code: string }` (no `redirect`, no `flashToast`).
2. La action solo llama `revalidatePath(...)` para invalidar la cache.
3. El client-component que abre el modal envuelve la action en un handler:

```tsx
const router = useRouter();
const [, startTransition] = useTransition();

async function handleSubmit(formData: FormData) {
  setModalOpen(false);                          // 1. cerrar el modal
  const result = await action(formData);        // 2. esperar al server
  triggerClientFeedback("domain", result.code); // 3. toast client-side
  if (result.ok) {
    startTransition(() => router.refresh());    // 4. refrescar datos
  }
}
```

Ejemplo canónico: `components/dashboard/treasury-card.tsx` (función `handleCreateTreasuryMovement`).

**Patrón B — Action hace `flashToast + redirect` (legacy, vigente en /settings)**:

Cuando la action redirige (toda la familia `redirectToSettings`), el modal igual queda abierto. Para cerrarlo, el cliente envuelve la action en un thin handler que cierra el modal **antes** del await:

```tsx
async function handleEdit(formData: FormData) {
  setEditingMember(null);            // 1. cerrar el modal optimistamente
  await updateMembershipRoleAction(formData);   // 2. la action redirige + flashToast
}
```

El toast llega vía cookie en la próxima render. Si la action falla, el toast traerá el código de error y el modal igual queda cerrado (el usuario lo reabre para reintentar). Este patrón está en `components/settings/tabs/members-tab.tsx`.

**Prohibido**: pasar `?feedback=CODE` en la URL para señalar éxito/error al cliente. La cookie flash + el handler son suficientes.

---

## 🧩 Flujo de desarrollo

Para cada US:

1. Leer US + AC
2. Leer PDD (/pdd)
3. Validar contracts
4. Validar domain model
5. Validar impacto en DB
6. Implementar
7. Validar contra AC
8. **Auditoría de primitivos antes de cerrar** (hard-gate)

### Paso 8 · Auditoría de primitivos (obligatorio)

Antes de cerrar cualquier PR / commit que toque `components/**` o `app/**`:

```bash
npm run check:primitives   # gate deterministico — exit 1 si encuentra anti-patrones
npm run lint               # ESLint con warnings sobre <input>/<select>/<textarea> crudos
npm run typecheck
```

Los tres comandos están encadenados en `npm run ci`. Ante un hit de `check:primitives`:

- **Si es un anti-patrón real** (pill hardcoded, footer de modal a mano, banner con `bg-amber-50` ad-hoc, button con `rounded-2xl bg-foreground` manual, input crudo que debería ser `<FormInput>`, empty-state con `border-dashed` sin primitivo, etc.) → migrar al primitivo correcto **en el mismo PR**. No mergear con violaciones.
- **Si es un falso positivo justificado** → actualizar la regla en `scripts/check-primitives.mjs` en ese mismo PR (con comentario explicando por qué es excepción) o sumar al `allowFiles` de la regla.

No se acepta el atajo "lo arreglo en otro PR": el script está para prevenir exactamente esa deuda.

### Referencia rápida de primitivos por situación

| Necesito… | Primitivo | Archivo |
|---|---|---|
| Modal | `<Modal>` + `<ModalFooter>` | `components/ui/modal.tsx`, `modal-footer.tsx` |
| Campo de form (text/number/date) | `<FormInput>` | `components/ui/modal-form.tsx` |
| Select | `<FormSelect>` | idem |
| Textarea | `<FormTextarea>` | idem |
| Checkbox estilo pill | `<FormCheckboxCard>` | idem |
| Banner amarillo/rojo dentro de form | `<FormBanner variant>` | idem |
| Pill de filtro clickable | `<ChipButton>` / `<ChipLink>` | `components/ui/chip.tsx` |
| Tab-bar tipo segmented control | Ver `SubTabNav` en `components/dashboard/treasury-role-card.tsx` + `RrhhModuleNav` | — |
| Tabla | `<DataTable>` + `<DataTableRow>` + `<DataTableCell>` | `components/ui/data-table.tsx` |
| Botón | `<Button>` / `<LinkButton>` | `components/ui/button.tsx`, `link-button.tsx` |
| Card contenedor | `<Card>` + `<CardHeader>` + `<CardBody>` | `components/ui/card.tsx` |
| Empty state standalone | `<EmptyState>` | `components/ui/empty-state.tsx` |
| Avatar con iniciales | `<Avatar>` + `getInitials()` | `components/ui/avatar.tsx` |
| Tabs de `/settings` | `<SettingsTabShell>` | `components/settings/settings-tab-shell.tsx` |

**Plantilla de componente nuevo**: `docs/design/component-template.md` tiene el esqueleto con imports canónicos listos para copiar.

---

## 🧪 Validación obligatoria

Antes de cerrar:

- Cumple TODOS los escenarios Gherkin
- No rompe contracts
- Respeta RLS
- No hardcodea textos
- No duplica lógica
- Respeta arquitectura
- Usa toast para feedback post-acción o justifica correctamente una excepción

---

## 🏗️ Arquitectura

### Separación de capas

- UI → render
- lógica → providers / services
- datos → repositories
- DB → source of truth

---

### Repository pattern (obligatorio)

Todo acceso a datos pasa por repositorios.

Nunca:
- fetch directo en componentes
- lógica en UI

---

### Estado

- Centralizado
- Derivado con selectores
- No duplicado

---

## 🔐 Auth & permisos

- Supabase Auth (Google)
- RLS obligatorio
- Ownership por user_id
- Backend define seguridad

---

## 🧱 Base de datos

Archivos:

- schema.sql
- /docs/database/rls-policies.sql

Reglas:

- No modificar schema sin impacto en domain
- Toda tabla con RLS
- Mantener consistencia con domain model

---

## 📄 PDD

Ubicación:

/pdd

Reglas:

- Traduce US → implementación
- Define flujos, estados, validaciones
- Claude debe seguirlo estrictamente

---

## 🔌 Contracts

Ubicación:

/docs/contracts

Incluye:
- API contracts
- Permission matrix

Reglas:

- No romper contracts
- Si cambia → actualizar docs

---

## 🚫 Anti-patrones

- Hardcode de textos
- Lógica en UI
- Acceso directo a DB desde UI
- Feedback post-acción inline dentro de la página
- Ignorar AC
- Crear sin US
- Duplicar lógica

---

## ✅ Definition of Done

Ubicación:

/DEFINITION_OF_DONE.md

Una tarea está completa si:

- Cumple AC
- No rompe nada existente
- Respeta arquitectura
- Documentación actualizada si aplica

---

## 🤖 Cómo debe trabajar Claude

Claude debe:

1. Leer contexto completo (US + PDD + docs)
2. Detectar impacto
3. Implementar mínimo necesario
4. Validar contra AC

---

## 🧭 Regla general

Si no está en:
- US
- AC
- PDD  
→ NO se implementa

---

## 📌 Nota final

Este proyecto está optimizado para desarrollo con IA.

Prioridades:

- Consistencia > creatividad
- Documentación > suposición
- Contracts > implementación
