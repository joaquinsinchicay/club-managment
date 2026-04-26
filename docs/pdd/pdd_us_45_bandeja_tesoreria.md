# PDD · US-45 · Bandeja Tesorería de pagos pendientes

> **Epic**: E04 · 👥 RRHH
> **Notion ID**: US-45 (sin equivalente en numeración legacy del repo)
> **Estado**: implementado en Fase 3 del refactor E04 (2026-04-27)

---

## 1. User Story

> Como usuario con **rol Tesorería**, quiero ver una bandeja dedicada con
> las liquidaciones aprobadas por RRHH pendientes de pago, para focalizar
> mi flujo de ejecución de pagos sin mezclarlo con la gestión de RRHH.

## 2. Resumen

Bandeja específica del módulo Tesorería que lista las liquidaciones en
estado `aprobada_rrhh` del club activo. Tesorería ejecuta desde acá los
pagos individuales o en lote (US-42 / US-43) y, si detecta un error,
puede devolver la liquidación a "generada" (US-41) sin tener que abrir
el módulo `/rrhh` (que sigue siendo exclusivo de rol RRHH — ver
[CLAUDE.md](CLAUDE.md)).

Complementa con una **card destacada** en el dashboard `/treasury` que
solo se renderiza cuando hay al menos una liquidación pendiente.

## 3. Acceptance Criteria (Gherkin) y cobertura

| # | Escenario | Cobertura |
|---|---|---|
| 01-02 | Acceso solo rol Tesorería | ✅ Guard `canAccessTreasuryPayrollTray` (`hasMembershipRole(active, "tesoreria")`). Página y service redirigen / devuelven `forbidden` si no aplica. |
| 03 | Contador en navegación | ⚠️ **Parcial**. Decisión: mostramos contador en la **card del dashboard `/treasury`** (más visible, ya destacada) en lugar de modificar el header global. Modificar `app-header.tsx` requeriría fetch global por navegación con blast radius alto. **TODO documentado**: si el negocio lo pide, sumar badge al tab "Tesorería" del header con server-side fetch ligero. |
| 04 | Listado con colaborador, contrato, período, monto, fecha aprobación, usuario aprobador, notas | ✅ Tabla con `col_period`, `col_member`, `col_structure`, `col_total`, `col_approved_at`. Usuario aprobador y notas ya están en el modelo (`approvedByUserId`, `notes`) — quedan visibles en el detalle / podrían exponerse como columna extra si se pide. |
| 05 | Filtros: período, colaborador, estructura | ✅ Búsqueda libre (cubre colaborador, estructura, rol, actividad, período label) + chips por período disponible. |
| 06 | Acciones por fila: Pagar (US-42), Devolver a RRHH (US-41), Ver detalle | ✅ Pagar y Devolver implementados. **Ver detalle**: por simplicidad reusa el modal de pago como vista (datos no editables). Si se pide vista detallada con ajustes, conectar `adjustmentsBySettlementId` (ya pre-cargado por el service). |
| 07 | Selección múltiple para pago en lote (US-43) | ✅ Multi-select con barra "Seleccionadas: N · Total $X" y CTA "Pagar seleccionadas". Reusa `payStaffSettlementsBatchAction`. |
| 08 | Card destacada en dashboard `/treasury` | ✅ `TreasuryPayrollPendingCard` con count + monto total + CTA "Abrir bandeja". Se renderiza solo si hay pendientes. |
| 09 | Estado vacío | ✅ `<DataTableEmpty>` con dos variantes (`empty_*` cuando no hay nada / `empty_filter_*` cuando no hay match). |
| 10 | Liquidaciones devueltas desaparecen automáticamente | ✅ La query del service filtra por `status === 'aprobada_rrhh'`. La devolución cambia el status a `generada`, por lo que la fila ya no aparece en el siguiente fetch (`router.refresh()` se dispara desde el handler de devolución). |
| 11 | Consistencia por club activo | ✅ Service usa `session.activeClub.id`; las RPCs subyacentes (US-42 / US-43 / US-41) verifican `app.current_club_id`. |

## 4. Backend

### Authorization

[lib/domain/authorization.ts](lib/domain/authorization.ts):

```ts
canAccessTreasuryPayrollTray(membership) → activo && hasRole 'tesoreria'
```

No reusa `canOperateTesoreria` para mantener la semántica explícita: este
guard es específico del flujo de pago de nómina.

### Service

[lib/services/treasury-payroll-service.ts](lib/services/treasury-payroll-service.ts) — nuevo:

- `listApprovedSettlementsForTreasury()` → filtra `payroll_settlements`
  por `status = 'aprobada_rrhh'` y precarga ajustes por id.
- `getTreasuryPayrollSummary()` → `{ count, totalAmount }` agregado
  para la card del dashboard.

Ambos usan el guard `canAccessTreasuryPayrollTray`. **No** crean nuevas
RPCs: las mutaciones reusan `payStaffSettlement`,
`payStaffSettlementsBatch` (US-42 / US-43) y `returnSettlementToGenerated`
(US-41) ya implementados.

### Server actions

No hay actions nuevas. La página `/treasury/payroll` importa
directamente:

- `payStaffSettlementAction` (de `app/(dashboard)/rrhh/settlements/actions.ts`)
- `payStaffSettlementsBatchAction` (idem)
- `returnSettlementToGeneratedAction` (idem)

Estas actions ya hacen `revalidatePath("/treasury/payroll")` —
agregado en Fase 2.2 anticipando este uso.

## 5. UI

### Ruta

[app/(dashboard)/treasury/payroll/page.tsx](app/(dashboard)/treasury/payroll/page.tsx) — server component. Carga
liquidaciones + cuentas pagables (`visibleForTesoreria` + currency
matching) y los pasa al componente.

### Componente

[components/treasury/payroll-tray.tsx](components/treasury/payroll-tray.tsx) — `"use client"`. Estructura:

- `<PageContentHeader>` con eyebrow + título + descripción.
- Filtros: input de búsqueda + chips de período disponibles.
- Barra de selección (visible cuando hay items seleccionados).
- `<DataTable>` con grid `32px 90px minmax(0,1.2fr) minmax(0,1.2fr) 130px 130px 200px`.
- 3 modales: Pagar (single), Pagar bulk, Devolver a RRHH.
- Patrón canónico de submit: `setModalOpen(false) → action → triggerClientFeedback → router.refresh`.
- Reusa todos los textos `rrhh.settlements.*` para los modales (mismo flujo, no duplicar texto).

### Card en dashboard

[components/treasury/payroll-pending-card.tsx](components/treasury/payroll-pending-card.tsx) — `<Card>` con
`<CardHeader>` + acción `<LinkButton href="/treasury/payroll">`. Muestra
count y monto total. Solo se renderiza desde
[app/(dashboard)/treasury/page.tsx](app/(dashboard)/treasury/page.tsx) si `payrollPending.count > 0`
y el actor tiene rol Tesorería (guard `canAccessTreasuryPayrollTray`).

## 6. Textos nuevos

`lib/texts.json` bajo `dashboard.treasury.payroll.*`:

- `page_eyebrow`, `page_title`, `page_description`, `subtitle_counts`
- `search_placeholder`, `filter_period_all`
- Columnas: `col_period`, `col_member`, `col_structure`, `col_total`, `col_approved_at`
- Acciones: `action_pay`, `action_return`
- Multi-select: `select_all_label`, `select_row_label`, `bulk_selected_prefix`, `bulk_clear_cta`, `bulk_pay_cta`
- Empty state: `empty_title`, `empty_description`, `empty_filter_title`, `empty_filter_description`
- Card del dashboard: `dashboard_card_eyebrow`, `dashboard_card_title`, `dashboard_card_description`, `dashboard_card_cta`

## 7. Testing manual (smoke)

1. Como rol RRHH, generar y aprobar 2-3 liquidaciones del mes.
2. Loguearse como rol Tesorería del mismo club → abrir `/treasury`.
3. Ver la card "Pagos de nómina pendientes" con el contador y monto correctos.
4. Click en "Abrir bandeja" → llega a `/treasury/payroll`.
5. Filtrar por período → solo se muestran las del período elegido.
6. Buscar por nombre del colaborador → match.
7. Seleccionar 2 liquidaciones → barra muestra "Seleccionadas: 2 · Total $X".
8. Click "Pagar seleccionadas" → modal pide cuenta + fecha → confirmar → ambas pasan a `pagada`, desaparecen de la bandeja, toast de éxito.
9. Sobre una liquidación restante: click "Devolver a RRHH" → modal pide motivo → confirmar → liquidación desaparece de la bandeja (ahora está en `generada`). En `/rrhh/settlements`, aparece con indicador "Devuelta por Tesoreria".
10. Como rol que no es Tesorería: `/treasury/payroll` redirige a `/treasury` (o `/dashboard` si no tiene rol tesorería en absoluto).

## 8. Decisión: contador en navegación (Scenario 03)

La US pide "contador en el ítem de navegación (ej. 'Tesorería (12)')".
Optamos por mostrar el contador en la **card del dashboard** en lugar de
modificar `AppHeader`:

- `AppHeader` es un client component sticky activo en todas las páginas.
- Agregarle un fetch del contador implica server prop o un client fetch
  por navegación → blast radius alto y costo de red recurrente.
- La card del dashboard es la primera cosa visible al entrar a Tesorería
  y muestra exactamente la misma información (count + monto).
- Si el negocio lo pide en una iteración futura, sumar el badge al tab
  "Tesorería" via prop server-side desde el layout.

## 9. Archivos tocados

- `lib/domain/authorization.ts` (guard `canAccessTreasuryPayrollTray`)
- `lib/services/treasury-payroll-service.ts` (nuevo)
- `app/(dashboard)/treasury/payroll/page.tsx` (nuevo)
- `app/(dashboard)/treasury/page.tsx` (sumar card)
- `components/treasury/payroll-tray.tsx` (nuevo)
- `components/treasury/payroll-pending-card.tsx` (nuevo)
- `lib/texts.json` (sección `dashboard.treasury.payroll`)
