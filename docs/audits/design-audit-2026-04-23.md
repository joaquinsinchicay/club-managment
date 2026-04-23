# Design System Audit · 2026-04-23

Reporte generado por `scripts/audit-design-system.mjs`. No es gate — es inspector.

**Total hits finales**: 0 (0 drift).
**Total hits iniciales**: 100.

## Cierre de remediación

Toda la auditoría quedó cerrada a través de 3 commits:

1. **Fase 2.1** (commit `6178eea`) · Modal conventions uniformadas — `hideCloseButton` removido de 16 modales, `size` explícito en 6, convención "siempre X" establecida. 22 hits remediados.
2. **Fase 2.2 + 3** (commit `f9b9439`) · Auditor + guardrail JSX-aware + triaje B2/C1/D1/E2. 10 hits remediados, 68 quedaron como backlog para la pasada siguiente.
3. **Fase 2.3** (commit actual) · Tokens expandidos (`tracking-section`, `tracking-card-eyebrow`, `rounded-xs`, `dsColors.rose`, `red.{100,200,500}`, `amber.500`) + 68 hits migrados a tokens + A3 suprimido con `check-primitives-ignore-next-line` (motivo cross-file documentado). 68 hits remediados.

Total: **100 hits drift → 0 hits** en el codebase.

Mecanismo de excepción para falsos positivos cross-file: comentario `{/* check-primitives-ignore-next-line: <motivo> */}` sobre la línea de hit. Aplica tanto a `check:primitives` como a `audit:design`. Único uso documentado hoy: `treasury-card.tsx:868` (Modal "Cerrar jornada" → CloseSessionModalForm).

## Resumen por categoría

| ID | Categoría | Hits |
|---|---|---|
| A1 | Modal sin `size` explicito | 0 |
| A2 | Modal con `hideCloseButton` (violacion de la nueva convencion) | 0 |
| A3 | Modal destructivo sin `submitVariant="destructive"` | 0 |
| A4 | ModalFooter con className/size override | 0 |
| B1 | Section-header uppercase con tracking distinto de 0.14em (fuera de primitivos) | 0 |
| B2 | Focus rings fuera de ring-foreground/10 | 0 |
| B3 | Radios fuera del token (rounded-xl/[4px]/[24px]/[7px] fuera de primitivos) | 0 |
| B4 | Colores slate/amber/rose hardcoded fuera de primitivos | 0 |
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

✓ Sin hallazgos.

## A4 · ModalFooter con className/size override

✓ Sin hallazgos.

## B1 · Section-header uppercase con tracking distinto de 0.14em (fuera de primitivos)

✓ Sin hallazgos.

## B2 · Focus rings fuera de ring-foreground/10

✓ Sin hallazgos.

## B3 · Radios fuera del token (rounded-xl/[4px]/[24px]/[7px] fuera de primitivos)

✓ Sin hallazgos.

## B4 · Colores slate/amber/rose hardcoded fuera de primitivos

✓ Sin hallazgos.

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
