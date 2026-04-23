# Design System Audit · 2026-04-23

Reporte generado por `scripts/audit-design-system.mjs`. No es gate — es inspector.

**Total hits actuales**: 68 (post-remediación).
**Total hits iniciales**: 100.
**Hits remediados**: 32.

## Triaje y decisiones (Fase 2)

Origen del reporte: el usuario observó que unos modales mostraban X (`/rrhh/contracts`) y otros no (`/treasury` "Cargar movimiento"). Auditoría completa reveló que el gap se extendía a otras convenciones.

Decisiones tomadas durante la remediación:

**Remediado (Fase 2.1 — commit `6178eea`)**
- A1 · 6 modales sin `size` → agregado `size="md"` explícito.
- A2 · 16 modales con `hideCloseButton` → removido. Nueva convención uniforme: **siempre mostrar X** en todos los modales.
- A3 · 2 hits → verificados como falsos positivos; ambos usan `submitVariant="destructive"` en subcomponente o en expresión dinámica (heurística mejorada del auditor).

**Remediado (Fase 2.2)**
- B2 · 2 focus rings `/20`, `/30` → `/10`.
- C1 · 1 DataTable sin `density` → `density="comfortable"` explícito.
- D1 · 2 labels `<span>` reales → migrados a `<FormSection>` (`club-data-tab.tsx`, `placeholder-tab.tsx`).

**Diferido a backlog (requiere token refactor o caso-a-caso)**
- B1 · 23 hits de `tracking-[0.22em|0.18em|0.16em|0.08em]`. Los tokens actuales (`tracking-eyebrow` 0.08em, `tracking-badge` 0.06em, `tracking-wider` 0.10em) no incluyen un nombre semántico para 0.14em o 0.18em, que son los dos valores canónicos de facto. Se propone como tarea futura extender `lib/tokens/typography.ts` con `tracking-section` (0.14em) y `tracking-card-eyebrow` (0.18em) y luego migrar consumidores.
- B3 · 25 hits de `rounded-xl|rounded-[4px]|rounded-[24px]`. Algunos son legítimos (chips pequeños ⚠ inline de 4px), otros son drift real (card shells en settings-manager y dashboard). Necesita revisión caso-a-caso y posible nuevo token `rounded-xs` (4px) para chips small.
- B4 · 19 hits de `text-amber-*|bg-amber-*|bg-rose-*|text-red-*`. Casi todos son semánticos (error/warning) que actualmente viven inline. Requiere estrategia: o bien migrar a tokens de status (`text-status-warning`) o aceptar el uso directo en contextos limitados y documentar.

**Falsos positivos conocidos**
- A3 · `treasury-card.tsx:868` Modal "Cerrar jornada" delega a `CloseSessionModalForm` que SÍ usa `submitVariant="destructive"` (L320). El auditor no cruza archivos; limitación documentada.

## Resumen por categoría

| ID | Categoría | Hits |
|---|---|---|
| A1 | Modal sin `size` explicito | 0 |
| A2 | Modal con `hideCloseButton` (violacion de la nueva convencion) | 0 |
| A3 | Modal destructivo sin `submitVariant="destructive"` | 1 |
| A4 | ModalFooter con className/size override | 0 |
| B1 | Section-header uppercase con tracking distinto de 0.14em (fuera de primitivos) | 23 |
| B2 | Focus rings fuera de ring-foreground/10 | 0 |
| B3 | Radios fuera del token (rounded-xl/[4px]/[24px]/[7px] fuera de primitivos) | 25 |
| B4 | Colores slate/amber/rose hardcoded fuera de primitivos | 19 |
| C1 | DataTable sin `density` explicito | 0 |
| C2 | DataTable con Header pero sin `gridColumns` | 0 |
| D1 | Label como <span> en lugar de <FormFieldLabel> | 0 |
| E2 | Strings de feedback inline post-accion sospechosos | 0 |
| F1 | Sub-nav segmented reimplementado a mano (sin SegmentedNav) | 0 |

## A1 · Modal sin `size` explicito

✓ Sin hallazgos.

## A2 · Modal con `hideCloseButton` (violacion de la nueva convencion)

✓ Sin hallazgos.

## A3 · Modal destructivo sin `submitVariant="destructive"`

### [components/dashboard/treasury-card.tsx](components/dashboard/treasury-card.tsx)

- **L868** · `title destructive sin submitVariant="destructive" en archivo`

## A4 · ModalFooter con className/size override

✓ Sin hallazgos.

## B1 · Section-header uppercase con tracking distinto de 0.14em (fuera de primitivos)

### [app/(dashboard)/dashboard/page.tsx](app/(dashboard)/dashboard/page.tsx)

- **L93** · `<p className="text-meta font-semibold uppercase tracking-[0.22em] text-muted-foreground">`
- **L109** · `<p className="text-meta font-semibold uppercase tracking-[0.18em] text-muted-foreground">`
- **L118** · `<p className="text-meta font-semibold uppercase tracking-[0.18em] text-muted-foreground">`
- **L137** · `<p className="text-meta font-semibold uppercase tracking-[0.22em] text-muted-foreground">`
- **L147** · `<p className="text-meta font-semibold uppercase tracking-[0.18em] text-muted-foreground">`
- **L156** · `<p className="text-meta font-semibold uppercase tracking-[0.18em] text-muted-foreground">`
- **L170** · `<p className="text-meta font-semibold uppercase tracking-[0.18em] text-muted-foreground">`
- **L189** · `<p className="text-meta font-semibold uppercase tracking-[0.22em] text-muted-foreground">`

### [components/dashboard/account-detail-card.tsx](components/dashboard/account-detail-card.tsx)

- **L150** · `<p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">`

### [components/dashboard/active-club-selector.tsx](components/dashboard/active-club-selector.tsx)

- **L32** · `inline ? "sr-only" : "text-xs uppercase tracking-[0.18em] text-muted-foreground"`

### [components/dashboard/daily-session-balance-card.tsx](components/dashboard/daily-session-balance-card.tsx)

- **L161** · `<p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">`
- **L170** · `<p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">`
- **L217** · `<p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">`

### [components/dashboard/treasury-card.tsx](components/dashboard/treasury-card.tsx)

- **L218** · `<span className="text-eyebrow font-semibold uppercase tracking-[0.08em] text-muted-foreground">`
- **L245** · `<span className="text-eyebrow font-semibold uppercase tracking-[0.08em] text-muted-foreground">`
- **L329** · `<span className="text-eyebrow font-semibold uppercase tracking-[0.08em] text-muted-foreground">`

### [components/dashboard/treasury-conciliacion-tab.tsx](components/dashboard/treasury-conciliacion-tab.tsx)

- **L114** · `<p className="text-eyebrow font-semibold uppercase tracking-[0.18em] text-muted-foreground">`
- **L324** · `<span className="text-eyebrow font-semibold uppercase tracking-[0.18em] text-muted-foreground">`

### [components/dashboard/treasury-operation-forms.tsx](components/dashboard/treasury-operation-forms.tsx)

- **L2129** · `<span className="rounded-[4px] bg-slate-100 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">`
- **L2132** · `<span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">`
- **L2137** · `className="rounded-[4px] bg-amber-50 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-amber-700"`

### [components/dashboard/treasury-role-card.tsx](components/dashboard/treasury-role-card.tsx)

- **L614** · `<p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">`

### [components/settings/club-treasury-settings-manager.tsx](components/settings/club-treasury-settings-manager.tsx)

- **L607** · `<p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">`

## B2 · Focus rings fuera de ring-foreground/10

✓ Sin hallazgos.

## B3 · Radios fuera del token (rounded-xl/[4px]/[24px]/[7px] fuera de primitivos)

### [app/(dashboard)/dashboard/page.tsx](app/(dashboard)/dashboard/page.tsx)

- **L117** · `<div className="rounded-xl border border-border bg-secondary/50 p-4">`
- **L146** · `<div className="rounded-xl border border-border bg-secondary/50 p-4">`
- **L155** · `<div className="rounded-xl border border-border bg-secondary/50 p-4">`
- **L169** · `<div className="rounded-xl border border-border bg-secondary/50 p-4">`

### [app/(dashboard)/treasury/cost-centers/[id]/page.tsx](app/(dashboard)/treasury/cost-centers/[id]/page.tsx)

- **L181** · `className="inline-flex items-center rounded-[4px] border border-border bg-slate-50 px-2 py-0.5 text-xs font-medium"`
- **L208** · `className={\`rounded-[4px] px-1.5 py-0.5 text-eyebrow font-semibold uppercase ${`

### [components/dashboard/account-detail-card.tsx](components/dashboard/account-detail-card.tsx)

- **L148** · `className="rounded-xl border border-border bg-card px-4 py-4"`
- **L247** · `<div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between">`

### [components/dashboard/active-club-selector.tsx](components/dashboard/active-club-selector.tsx)

- **L42** · `"min-h-11 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground",`

### [components/dashboard/daily-session-balance-card.tsx](components/dashboard/daily-session-balance-card.tsx)

- **L153** · `className="rounded-xl border border-border bg-secondary/40 p-4"`
- **L169** · `<div className="rounded-xl border border-border bg-card px-4 py-3">`
- **L212** · `className="min-h-11 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground"`
- **L216** · `<div className="rounded-xl border border-border bg-card px-4 py-3">`
- **L240** · `<div className="rounded-xl border border-border bg-card p-4">`
- **L254** · `className="rounded-xl border border-border bg-secondary/40 px-4 py-3"`

### [components/dashboard/treasury-operation-forms.tsx](components/dashboard/treasury-operation-forms.tsx)

- **L2129** · `<span className="rounded-[4px] bg-slate-100 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">`
- **L2137** · `className="rounded-[4px] bg-amber-50 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-amber-700"`

### [components/dashboard/treasury-role-card.tsx](components/dashboard/treasury-role-card.tsx)

- **L336** · `<span className="inline-flex shrink-0 items-center rounded-[4px] bg-slate-100 px-1.5 py-0.5 text-eyebrow font-semibold text-slate-600">`
- **L613** · `<div className="rounded-xl border border-border bg-card px-4 py-3">`

### [components/settings/club-invitation-manager.tsx](components/settings/club-invitation-manager.tsx)

- **L19** · `<section className="rounded-[24px] border border-border bg-secondary/50 p-4">`

### [components/settings/club-treasury-settings-manager.tsx](components/settings/club-treasury-settings-manager.tsx)

- **L91** · `<form action={action} className="grid gap-4 rounded-[24px] border border-border bg-secondary/40 p-4">`
- **L206** · `className="grid gap-4 rounded-[24px] border border-border bg-secondary/40 p-4"`
- **L340** · `<form action={action} className="grid gap-4 rounded-[24px] border border-border bg-secondary/40 p-4">`
- **L592** · `className={\`rounded-[24px] border p-5 ${`
- **L795** · `<div className="grid gap-4 rounded-[24px] border border-border/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.92)_0%,rgba(255,255,255,0.98)_100%)] p-5">`

## B4 · Colores slate/amber/rose hardcoded fuera de primitivos

### [app/(dashboard)/rrhh/page.tsx](app/(dashboard)/rrhh/page.tsx)

- **L200** · `? "text-h2 font-semibold text-amber-700"`

### [app/(dashboard)/treasury/cost-centers/[id]/page.tsx](app/(dashboard)/treasury/cost-centers/[id]/page.tsx)

- **L211** · `: "bg-rose-50 text-rose-700"`

### [components/dashboard/close-session-modal-form.tsx](components/dashboard/close-session-modal-form.tsx)

- **L173** · `<p className="mt-0.5 text-[17px] font-semibold tabular-nums text-red-700">`

### [components/dashboard/treasury-card.tsx](components/dashboard/treasury-card.tsx)

- **L211** · `isUnresolved ? "bg-slate-100 text-slate-500" : cn(cfg.iconBg, cfg.iconColor)`

### [components/dashboard/treasury-conciliacion-tab.tsx](components/dashboard/treasury-conciliacion-tab.tsx)

- **L107** · `? "text-amber-700"`

### [components/dashboard/treasury-operation-forms.tsx](components/dashboard/treasury-operation-forms.tsx)

- **L612** · `: "border-red-200 bg-red-50 text-red-700"`
- **L940** · `: "border-red-200 bg-red-50 text-red-700"`
- **L1903** · `: "border-red-200 bg-red-50 text-red-700"`
- **L2129** · `<span className="rounded-[4px] bg-slate-100 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">`
- **L2137** · `className="rounded-[4px] bg-amber-50 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-amber-700"`

### [components/dashboard/treasury-role-card.tsx](components/dashboard/treasury-role-card.tsx)

- **L336** · `<span className="inline-flex shrink-0 items-center rounded-[4px] bg-slate-100 px-1.5 py-0.5 text-eyebrow font-semibold text-slate-600">`
- **L384** · `<p className="mt-1.5 text-meta text-slate-500">`
- **L459** · `<p className="mt-1.5 text-meta text-slate-500">`

### [components/hr/settlements-list.tsx](components/hr/settlements-list.tsx)

- **L266** · `<span className="ml-2 text-xs text-amber-700">{sTexts.bulk_mixed_note}</span>`
- **L373** · `<span className="ml-2 text-[10px] font-semibold uppercase text-amber-700">`

### [components/hr/staff-members-tab.tsx](components/hr/staff-members-tab.tsx)

- **L253** · `<span className="text-xs text-amber-700">`

### [components/treasury/cost-centers-tab.tsx](components/treasury/cost-centers-tab.tsx)

- **L186** · `if (cc.type === "presupuesto" && pct >= 100) return "bg-rose-500";`
- **L187** · `if (cc.type === "presupuesto" && pct >= 80) return "bg-amber-500";`
- **L271** · `<p key={code} className="text-sm font-semibold tabular-nums text-rose-600">`

## C1 · DataTable sin `density` explicito

✓ Sin hallazgos.

## C2 · DataTable con Header pero sin `gridColumns`

✓ Sin hallazgos.

## D1 · Label como <span> en lugar de <FormFieldLabel>

✓ Sin hallazgos.

## E2 · Strings de feedback inline post-accion sospechosos

✓ Sin hallazgos.

## F1 · Sub-nav segmented reimplementado a mano (sin SegmentedNav)

✓ Sin hallazgos.
