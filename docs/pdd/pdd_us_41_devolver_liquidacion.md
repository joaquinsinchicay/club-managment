# PDD · US-41 · Devolver liquidación a "generada"

> **Epic**: E04 · 👥 RRHH
> **Notion ID**: US-41 (sin equivalente en numeración legacy del repo)
> **Estado**: implementado en Fase 2.2 del refactor E04 (2026-04-27)

---

## 1. User Story

> Como usuario con **rol RRHH** o **rol Tesorería**, quiero devolver una
> liquidación aprobada al estado "generada" con un motivo, para corregir
> errores detectados después de la aprobación sin tener que anularla.

## 2. Resumen

Cuando una liquidación pasa al estado `aprobada_rrhh` (US-40) y se detecta
un error (horas mal cargadas, ajuste pendiente, cuenta de pago incorrecta,
etc.), tanto RRHH como Tesorería pueden devolverla al estado `generada`.
La liquidación vuelve a ser editable y deja de aparecer en la bandeja de
Tesorería (US-45). El motivo es obligatorio y queda registrado en el
historial. Los timestamps de aprobación se resetean para que la próxima
aprobación deje su propio rastro.

## 3. Acceptance Criteria (Gherkin)

| # | Escenario | Resultado |
|---|---|---|
| 01-02 | Acceso | RRHH o Tesorería ven la acción "Devolver a generada" sobre liquidaciones en `aprobada_rrhh`. Otros roles → no la ven. |
| 03 | Confirmación con motivo obligatorio | El sistema pide motivo antes de confirmar. Sin motivo, bloquea con `reason_required`. |
| 04 | Ejecución exitosa | `status = 'generada'`, monto editable, fuera de bandeja Tesorería. Audit log con `SETTLEMENT_RETURNED_TO_GENERATED`. |
| 05 | Indicador visual | El listado muestra "Devuelta por [rol]" (RRHH o Tesorería) en la fila de la liquidación devuelta. |
| 06 | Motivo visible | El detalle muestra `returned_reason`. |
| 07 | Solo desde `aprobada_rrhh` | Liquidaciones `pagada` o `anulada` no se pueden devolver — bloquea con `invalid_status`. |
| 08 | Re-aprobación | Si se aprueba nuevamente, el historial mantiene ambos eventos (`SETTLEMENT_APPROVED` posterior al `RETURNED_TO_GENERATED`). |
| 09 | Registro del historial | `hr_activity_log` guarda usuario, fecha y motivo. |
| 10 | Consistencia por club activo | Solo se devuelven liquidaciones del club activo (`current_setting('app.current_club_id')`). |

## 4. Modelo de datos (impacto)

`payroll_settlements` (4 columnas nuevas — migración `20260427050000`):

| Columna | Tipo | Descripción |
|---|---|---|
| `returned_at` | `timestamptz null` | Fecha/hora de la última devolución. |
| `returned_by_user_id` | `uuid null fk → public.users(id)` | Usuario que ejecutó la devolución. |
| `returned_by_role` | `text null check (in 'rrhh','tesoreria')` | Rol con el que se ejecutó (para el indicador visual). |
| `returned_reason` | `text null` | Motivo libre (mín. 1 char trim). |

Cuando se aprueba nuevamente, los campos `returned_*` se mantienen (histórico), pero `approved_at`/`approved_by_user_id` se resetean al devolver y se llenan al re-aprobar.

## 5. Backend

### RPC `hr_return_settlement_to_generated(settlement_id, reason)`

`SECURITY DEFINER`. Validaciones:
- `settlement_not_found` si el id no existe.
- `forbidden` si el club activo difiere del club de la liquidación, o si el actor no tiene rol `rrhh` ni `tesoreria` activo en el club.
- `invalid_status` si el estado no es `aprobada_rrhh`.
- `reason_required` si el motivo está vacío o solo whitespace.

Ejecuta:
1. `update payroll_settlements set status = 'generada', approved_at = null, approved_by_user_id = null, returned_at = now(), returned_by_user_id, returned_by_role, returned_reason, updated_at, updated_by_user_id`.
2. `insert into hr_activity_log` con action `SETTLEMENT_RETURNED_TO_GENERATED`, payload con rol y motivo.

Retorno: `{ ok, code: 'returned_to_generated', returned_by_role }`.

### Authorization (TS)

Nuevo guard en [lib/domain/authorization.ts](lib/domain/authorization.ts):

```ts
canReturnPayrollSettlement(membership) → activo && (hasRole 'rrhh' || hasRole 'tesoreria')
```

### Service

[lib/services/payroll-settlement-service.ts](lib/services/payroll-settlement-service.ts):
- Code nuevo `returned_to_generated` y `reason_required` en `PayrollSettlementActionCode`.
- Función `returnSettlementToGenerated({ settlementId, reason })` con guard propio (no `canOperateHrSettlements`, sino `canReturnPayrollSettlement`).

### Server action

[app/(dashboard)/rrhh/settlements/actions.ts](app/(dashboard)/rrhh/settlements/actions.ts):
- `returnSettlementToGeneratedAction(formData)` revalida `/rrhh/settlements` y `/treasury/payroll` (esta última será la bandeja Tesorería de US-45 / Fase 3).
- Mapea codes a feedback: `settlement_returned_to_generated`, `settlement_reason_required`.

## 6. UI

### Botón de devolución

En [components/hr/settlements-list.tsx](components/hr/settlements-list.tsx):
- Filas con `status = 'aprobada_rrhh'` muestran el botón **"Devolver a generada"** (variant `secondary`) junto al botón **"Pagar"** (variant `primary`).
- Click abre modal con motivo obligatorio (`<FormTextarea required />`).
- Submit usa el patrón canónico `setModalOpen(false) → action → triggerClientFeedback → router.refresh`.

### Indicador "Devuelta por [rol]"

Filas con `status = 'generada'` y `returnedByRole != null` muestran debajo del status badge una línea
`text-[10px] text-ds-amber-700` con el texto:

> Devuelta por RRHH (o Tesoreria)

Implementación: bloque condicional dentro del `DataTableCell` del status, usando los textos
`rrhh.settlements.returned_by_template` + `returned_role_options`.

### Textos nuevos (`lib/texts.json` bajo `rrhh.settlements`)

- `action_return`
- `return_modal_title`
- `return_modal_description`
- `return_reason_label`
- `return_reason_placeholder`
- `return_submit_cta`
- `returned_by_template`
- `returned_role_options.rrhh` / `returned_role_options.tesoreria`
- `feedback.settlement_returned_to_generated`
- `feedback.settlement_reason_required`

## 7. Testing manual (smoke)

1. Como rol RRHH, generar liquidaciones de un período → aprobar una → confirmar que aparece el botón "Devolver a generada" en la fila aprobada.
2. Click → modal pide motivo. Sin motivo: submit bloqueado por `required`. Backend valida `reason_required` defensivo si se manipula el form.
3. Confirmar con motivo → liquidación vuelve a `generada`, indicador `Devuelta por RRHH` visible debajo del badge.
4. Re-aprobar → indicador desaparece (status pasa a `aprobada_rrhh`), `approved_at` se setea de nuevo. Historial conserva ambos eventos.
5. Como rol Tesorería (cuando se implemente la bandeja en Fase 3), repetir desde `/treasury/payroll`.
6. Liquidación pagada → la action devuelve `invalid_status` (no debería verse el botón).

## 8. Archivos tocados

- `supabase/migrations/20260427050000_us41_return_settlement_to_generated.sql` (nuevo)
- `lib/domain/payroll-settlement.ts` (4 fields)
- `lib/domain/authorization.ts` (guard `canReturnPayrollSettlement`)
- `lib/repositories/payroll-settlement-repository.ts` (4 cols, mapper, `callReturnToGenerated`)
- `lib/services/payroll-settlement-service.ts` (codes, función)
- `app/(dashboard)/rrhh/settlements/actions.ts` (action wrapper, mapper)
- `app/(dashboard)/rrhh/settlements/page.tsx` (prop)
- `components/hr/settlements-list.tsx` (modal, botón, indicador)
- `lib/feedback-catalog.ts` (registro)
- `lib/texts.json` (nuevas keys)
