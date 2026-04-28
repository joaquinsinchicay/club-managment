# PDD · US-71 · Bandeja Tesorería de pagos pendientes

> **Epic**: E04 · 👥 RRHH
> **Notion alias**: US-45 (numeración local al epic en Notion)
> **Estado**: implementado en Fase 3 del refactor E04 (2026-04-27).
> **Rediseño 2026-04-28**: la bandeja deja de ser ruta separada
> (`/treasury/payroll`) y pasa a ser sub-tab `?tab=payroll` dentro de
> `/treasury`, con header denso, filtros por colaborador y estructura,
> ordenamiento explícito y export CSV. La funcionalidad transaccional
> (pagar / devolver / pago en lote) no cambia.

---

## 1. User Story

> Como usuario con **rol Tesorería**, quiero ver una bandeja dedicada con
> las liquidaciones aprobadas por RRHH pendientes de pago, para focalizar
> mi flujo de ejecución de pagos sin mezclarlo con la gestión de RRHH.

## 2. Resumen

Bandeja específica del módulo Tesorería que lista las liquidaciones en
estado `aprobada_rrhh` del club activo. Tesorería ejecuta desde acá los
pagos individuales o en lote (US-64 / US-65) y, si detecta un error,
puede devolver la liquidación a "generada" (US-70) sin tener que abrir
el módulo `/rrhh` (que sigue siendo exclusivo de rol RRHH — ver
[CLAUDE.md](CLAUDE.md)).

Complementa con una **card destacada** en el dashboard `/treasury` que
solo se renderiza cuando hay al menos una liquidación pendiente.

## 3. Acceptance Criteria (Gherkin) y cobertura

| # | Escenario | Cobertura |
|---|---|---|
| 01-02 | Acceso solo rol Tesorería | ✅ Guard `canAccessTreasuryPayrollTray` (`hasMembershipRole(active, "tesoreria")`). Página y service redirigen / devuelven `forbidden` si no aplica. |
| 03 | Contador en navegación | ✅ **Resuelto en sub-tab**. El label del sub-tab muestra `"Pagos pendientes · {count}"` cuando hay pendientes. Se calcula server-side (`getTreasuryPayrollSummary`) y se pasa al shell como prop `payrollPendingCount`. La card del dashboard de Resumen también muestra el conteo. |
| 04 | Listado con colaborador, contrato, período, monto, fecha aprobación, usuario aprobador, notas | ✅ Cada fila muestra avatar circular con iniciales, nombre + código de contrato (`formatContractCode`), rol · estructura · actividad, período + fecha aprobación + nombre del aprobador (resuelto vía lookup en `users`), notas inline en italics si existen, monto + sigla de moneda. |
| 05 | Filtros: período, colaborador, estructura | ✅ 3 selects independientes (`<FormSelect>`) — Período, Colaborador, Estructura — con opciones derivadas de las liquidaciones cargadas. Línea inferior `Mostrando X de Y · Limpiar filtros`. |
| 06 | Acciones por fila: Pagar (US-64), Devolver a RRHH (US-70), Ver detalle | ✅ Botones `Pagar` (primary) + `Devolver` (secondary) + chevron expand. Al expandir muestra los ajustes (`adjustmentsBySettlementId`) o "Sin ajustes registrados". |
| 07 | Selección múltiple para pago en lote (US-65) | ✅ Multi-select con "Seleccionar todas" + barra "Seleccionadas: N · Total $X" y CTA "Pagar seleccionadas". |
| 08 | Card destacada en dashboard `/treasury` | ✅ `TreasuryPayrollPendingCard` con count + monto total + CTA "Abrir bandeja" → `/treasury?tab=payroll`. |
| 09 | Estado vacío | ✅ `<DataTableEmpty>` con dos variantes. |
| 10 | Liquidaciones devueltas desaparecen automáticamente | ✅ El service filtra por `status === 'aprobada_rrhh'`. Devolver cambia a `generada` → fila desaparece en el siguiente fetch (`router.refresh()` post-action). |
| 11 | Consistencia por club activo | ✅ Service usa `session.activeClub.id`; RPCs subyacentes verifican `app.current_club_id`. |
| 12 | Ordenamiento explícito | ✅ Select `Ordenar` con 8 opciones: Período (desc/asc), Monto (desc/asc), Aprobación (desc/asc), Colaborador (A-Z/Z-A). Default `period_desc`. |
| 13 | Export CSV de las filas filtradas | ✅ Botón "Exportar CSV" en el header. Genera client-side vía `formatPayrollPendingCsv` (UTF-8 con BOM, separador coma). Filename `pagos-pendientes-YYYY-MM-DD.csv`. Columnas: Período, Colaborador, Contrato, Rol, Actividad, Estructura, Monto, Aprobada el, Aprobada por, Notas. |
| 14 | Badge de antigüedad ("aging") | ✅ Chip "+N días" automático cuando la liquidación lleva > 7 días aprobada (tone `warning`) o > 14 días (tone `expense`/destructive). |

## 4. Backend

### Authorization

[lib/domain/authorization.ts](lib/domain/authorization.ts):

```ts
canAccessTreasuryPayrollTray(membership) → activo && hasRole 'tesoreria'
```

No reusa `canOperateTesoreria` para mantener la semántica explícita: este
guard es específico del flujo de pago de nómina.

### Service

[lib/services/treasury-payroll-service.ts](lib/services/treasury-payroll-service.ts):

- `listApprovedSettlementsForTreasury()` → filtra `payroll_settlements`
  por `status = 'aprobada_rrhh'`, precarga ajustes por id y resuelve
  `approverNamesByUserId` con un lookup adicional a `users` (best-effort:
  si falla, se devuelve mapa vacío y la UI hace fallback a "fecha sin
  nombre").
- `getTreasuryPayrollSummary()` → `{ count, totalAmount }` agregado
  para la card del dashboard y para el label del sub-tab.

Ambos usan el guard `canAccessTreasuryPayrollTray`. **No** crean nuevas
RPCs: las mutaciones reusan `payStaffSettlement`,
`payStaffSettlementsBatch` (US-64 / US-65) y `returnSettlementToGenerated`
(US-70) ya implementados.

### Helper de export CSV

[lib/services/treasury-payroll-csv.ts](lib/services/treasury-payroll-csv.ts) — funciones puras
`formatPayrollPendingCsv(settlements, currencyCode, approverNames)` y
`buildPayrollCsvFileName()`. Cliente puro, sin auth, sin DB.

### Server actions

No hay actions nuevas. El page importa de `app/(dashboard)/rrhh/settlements/actions.ts`:

- `payStaffSettlementAction`
- `payStaffSettlementsBatchAction`
- `returnSettlementToGeneratedAction`

## 5. UI

### Ubicación

Sub-tab `?tab=payroll` dentro de [app/(dashboard)/treasury/page.tsx](app/(dashboard)/treasury/page.tsx).
La ruta dedicada `/treasury/payroll` fue eliminada en el rediseño 2026-04-28.

El page server prepara el slot `payrollTab` con todos los datos cargados y lo
pasa a `<TreasuryRoleCard payrollTab={...} payrollPendingCount={...}>`.
El shell decide si mostrar la sub-tab (solo si el rol Tesorería está activo)
y aplica el contador en el label.

### Componente

[components/treasury/treasury-payroll-tab.tsx](components/treasury/treasury-payroll-tab.tsx) — `"use client"`. Estructura:

- Header: eyebrow `LIQUIDACIONES APROBADAS POR RRHH` + título + descripción + botón "Exportar CSV" alineado a la derecha.
- Línea de resumen: `{count} pendientes · {total} total`.
- Card de filtros: 3 selects (`<FormSelect>` Período / Colaborador / Estructura) + línea inferior con contador filtrado + "Limpiar filtros" + select de "Ordenar" con 8 opciones.
- Barra de selección sticky (visible cuando hay items seleccionados).
- `<DataTable density="compact">` con filas `useGrid={false}` y layout flex interno: checkbox + `<Avatar>` + nombre/contrato/rol + período/aprobador/notas + monto + acciones `Pagar`/`Devolver`/expand.
- Chip aging "+N días" automático según `daysSince(approvedAt)`.
- 3 modales: Pagar (single), Pagar bulk, Devolver a RRHH — sin cambios respecto a la versión previa.
- Patrón canónico de submit: `setModal(...) → action → triggerClientFeedback → router.refresh`.
- Reusa textos `rrhh.settlements.*` para los modales.

### Card en dashboard

[components/treasury/payroll-pending-card.tsx](components/treasury/payroll-pending-card.tsx) — `<Card>` con
`<CardHeader>` + acción `<LinkButton href="/treasury?tab=payroll">`. Muestra
count y monto total. Solo se renderiza desde
[app/(dashboard)/treasury/page.tsx](app/(dashboard)/treasury/page.tsx) si `payrollPending.count > 0`
y el actor tiene rol Tesorería.

## 6. Textos

`lib/texts.json` bajo `dashboard.treasury.payroll.*`:

- Header: `header_eyebrow`, `header_title`, `header_description`, `export_cta`, `summary_template`.
- Filtros: `filter_period_label`, `filter_staff_label`, `filter_structure_label`, `filter_all_period`, `filter_all_staff`, `filter_all_structure`, `filter_count_template`, `filter_clear_cta`.
- Sort: `sort_label` + `sort_{period,amount,approved,staff}_{asc,desc}` (8 opciones).
- Filas: `row_period_template`, `row_approved_template`, `row_approved_template_no_user`, `row_aging_days_template`.
- Acciones: `action_pay`, `action_return`.
- Detalle expandible: `detail_expand_label`, `detail_collapse_label`, `detail_adjustments_title`, `detail_no_adjustments`.
- Multi-select: `select_all_label`, `select_row_label`, `bulk_selected_prefix`, `bulk_clear_cta`, `bulk_pay_cta`.
- Empty state: `empty_title`, `empty_description`, `empty_filter_title`, `empty_filter_description`.
- Card del dashboard: `dashboard_card_eyebrow`, `dashboard_card_title`, `dashboard_card_description`, `dashboard_card_cta`.

`lib/texts.json` bajo `dashboard.treasury_role.*`:

- `tab_payroll`, `tab_payroll_count_template` para el sub-tab.

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

Resuelto en el rediseño 2026-04-28: el label del sub-tab muestra
`"Pagos pendientes · {count}"` cuando hay pendientes. La card destacada
del Resumen sigue existiendo como entrada de atención. No se modifica
`AppHeader` (sigue valiendo el argumento de blast radius para no agregar
fetches globales).

## 9. Archivos tocados

Originales (Fase 3, 2026-04-27):
- `lib/domain/authorization.ts` (guard `canAccessTreasuryPayrollTray`)
- `lib/services/treasury-payroll-service.ts`
- `components/treasury/payroll-pending-card.tsx`
- `lib/texts.json` (sección `dashboard.treasury.payroll`)

Rediseño (2026-04-28):
- ❌ `app/(dashboard)/treasury/payroll/page.tsx` — eliminado.
- ❌ `components/treasury/payroll-tray.tsx` — eliminado.
- ✅ `components/treasury/treasury-payroll-tab.tsx` — nuevo, reemplaza al anterior.
- ✅ `lib/services/treasury-payroll-csv.ts` — nuevo helper de export.
- ✏️ `lib/services/treasury-payroll-service.ts` — agrega lookup de aprobadores en `users`.
- ✏️ `app/(dashboard)/treasury/page.tsx` — pre-carga lista + monta sub-tab y lo pasa al shell.
- ✏️ `components/dashboard/treasury-role-card.tsx` — agrega sub-tab `payroll` con count en el label.
- ✏️ `components/treasury/payroll-pending-card.tsx` — CTA apunta a `/treasury?tab=payroll`.
- ✏️ `lib/texts.json` — keys nuevas para header denso, filtros, sort, export, aging, detail expand.
