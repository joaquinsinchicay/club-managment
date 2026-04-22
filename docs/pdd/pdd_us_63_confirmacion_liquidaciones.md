# PDD — US-63 · Confirmación individual y masiva de liquidaciones

> PDD del módulo **E04 · RRHH**. Fuente Notion: `E04 👥 RRHH` · `US-39`. En el repo: **US-63**.

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E04 · RRHH |
| User Story | Como Tesorero del club, quiero confirmar una o múltiples liquidaciones generadas, para marcarlas como listas para pagar y prevenir edición accidental. |
| Prioridad | Alta |
| Objetivo de negocio | Formalizar el cierre del cálculo mensual. Separar el momento de "armé los números" del momento de "ejecuto el pago", evitando ediciones accidentales sobre liquidaciones ya validadas. |

---

## 2. Problema a resolver

Sin un paso intermedio de confirmación, cualquier ajuste accidental después de haber "visto bien" la liquidación reabre el cálculo. Se necesita un punto donde se congele el monto y quede lista para operaciones financieras.

---

## 3. Objetivo funcional

Desde el listado filtrado por `status = 'generada'`, el tesorero selecciona una o varias liquidaciones y presiona `Confirmar`. El sistema valida precondiciones (sin horas faltantes, total ≥ 0 o con confirmación explícita si es 0) y pasa cada liquidación a `status = 'confirmada'`, registrando `confirmed_at`, `confirmed_by_user_id`.

---

## 4. Alcance

### Incluye
- Acción individual `Confirmar` en cada liquidación `generada`.
- Acción masiva `Confirmar seleccionadas` con resumen previo.
- Validaciones de integridad previas.
- Bloqueo de edición post-confirmación (gestionado también en US-62).
- Registro de `SETTLEMENT_CONFIRMED` en `hr_activity_log`.

### No incluye
- Re-confirmación de liquidaciones anuladas o pagadas.
- Pago (cubierto por US-64/65).

---

## 5. Actor principal

`admin`, `rrhh` o `tesoreria` del club activo.

---

## 6. Precondiciones

- Al menos una liquidación en `status = 'generada'` en el club activo.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Confirmación individual válida | `status = 'confirmada'`. |
| Confirmación masiva válida | Todas las seleccionadas pasan a `confirmada`, excepto las que fallan validación (reportadas). |
| Confirmación con horas = 0 en `por_hora/por_clase` | Bloqueada hasta cargar horas. |
| Confirmación con total = 0 | Requiere confirmación explícita en UI. |
| Confirmación con total < 0 | Imposible (US-62 lo bloquea antes). |

---

## 8. Reglas de negocio

### Validaciones previas
- `status` debe ser `generada`.
- `requires_hours_input = true and hours_worked = 0 and classes_worked = 0` → bloquea con `hours_required`.
- `total_amount < 0` → bloquea con `total_negative` (no debería ocurrir si US-62 funciona correctamente).
- `total_amount = 0` → requiere `confirm_zero = true` en el input; sin eso bloquea con `zero_amount_requires_confirm`.

### Masiva
- El resumen previo muestra: cantidad, monto total, y alerta si hay ítems con total = 0 que requieren confirmación explícita (un único checkbox global `Confirmar liquidaciones con total cero`).
- La RPC procesa cada una individualmente: si una falla, queda en `generada` y se reporta; las demás se confirman.

### Atomicidad
- Individual: transacción simple (un UPDATE + un INSERT auditoría).
- Masiva: cada liquidación es su propia transacción, no hay rollback global. El resultado es `{ confirmed_count, skipped_count, errors: [] }`.

### Bloqueo post-confirmación
- `payroll_settlement_adjustments` no admite CRUD cuando la liquidación padre está `confirmada`.
- `payroll_settlements` no admite UPDATE de `base_amount`, `hours_worked`, `classes_worked`, `notes`, `adjustments_total`, `total_amount` mientras sea `confirmada`.

### Auditoría
- `SETTLEMENT_CONFIRMED` con `{ total_amount }`.

---

## 9. Flujo principal (individual)

1. Tesorero abre detalle o listado y presiona `Confirmar`.
2. El sistema valida.
3. Pasa a `confirmada`, registra auditoría.
4. Toast de éxito.

## 9.b Flujo principal (masiva)

1. Tesorero selecciona múltiples filas en el listado `generada`.
2. Presiona `Confirmar seleccionadas`.
3. Se abre `<Modal size="md">` con resumen: cantidad, monto total, lista de warnings (horas faltantes, totales cero).
4. El tesorero checkea `Confirmar liquidaciones con total cero` si corresponde.
5. Confirma. El sistema procesa una por una.
6. Retorna con `{ confirmed, skipped, errors }`. La UI muestra `<FormBanner variant="info">` con el resumen.

---

## 10. Flujos alternativos

### A. Horas faltantes
Bloqueo individual. En la masiva, esa liquidación se skippea y se reporta.

### B. Ya confirmada
La acción no debería estar disponible. Si llega al server, retorna `already_confirmed`.

### C. Liquidación anulada
No aparece en el filtro `generada`. Si llega al server, retorna `invalid_status`.

---

## 11. UI / UX

### Reglas
- Listado: checkbox por fila (usando el patrón de selección múltiple existente) con bulk action bar que aparece cuando hay selección.
- Modal de confirmación masiva: `<Modal size="md">` con `<DataTable density="compact">` mostrando las liquidaciones seleccionadas + resumen de totales + checkbox global.
- En el detalle: botón `Confirmar liquidación` `<Button variant="primary">` con loading state.

---

## 12. Mensajes y textos

### Namespace
`rrhh.settlements.confirm.*`

### Keys mínimas
- `confirm_cta_single`, `confirm_cta_bulk`
- `bulk_modal_title`, `bulk_modal_description`
- `bulk_summary_count`, `bulk_summary_amount`
- `warning_zero_total`, `confirm_zero_checkbox`
- `warning_hours_required`
- `submit_cta`, `submit_pending`, `cancel_cta`
- `feedback.{confirmed,confirmed_bulk,hours_required,zero_amount_requires_confirm,total_negative,already_confirmed,invalid_status,forbidden,unknown_error}`

---

## 13. Persistencia

### UPDATE sobre `payroll_settlements`
- `status = 'confirmada'`, `confirmed_at = now()`, `confirmed_by_user_id = $user`, `updated_at`, `updated_by_user_id`.

### RPC
- `hr_confirm_settlement(p_settlement_id uuid, p_confirm_zero boolean default false) returns json` SECURITY DEFINER.
- `hr_confirm_settlements_bulk(p_ids uuid[], p_confirm_zero boolean default false) returns json` SECURITY DEFINER.

### RLS
- Existente en `payroll_settlements` (club-scoped).

---

## 14. Seguridad

- Club-scoped.
- Rol `admin | rrhh | tesoreria`.
- Las RPCs validan `app.current_club_id` vía join con `staff_contracts`.

---

## 15. Dependencias

- **contracts:** `Confirm settlement`, `Confirm settlements bulk`.
- **domain entities:** `payroll_settlements`, `hr_activity_log`.
- **otras US:** US-61 (origen), US-62 (edición previa), US-64/65 (pago siguiente), US-66 (anulación).
