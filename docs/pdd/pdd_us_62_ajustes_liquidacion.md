# PDD — US-62 · Ajustes sobre liquidación generada

> PDD del módulo **E04 · RRHH**. Fuente Notion: `E04 👥 RRHH` · `US-38`. En el repo: **US-62**.

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E04 · RRHH |
| User Story | Como Tesorero del club, quiero ajustar una liquidación generada agregando adicionales, descuentos o cargando horas/clases, para reflejar correctamente lo que corresponde pagar en el mes. |
| Prioridad | Alta |
| Objetivo de negocio | Permitir que el monto pagado refleje la realidad del mes (adicionales, premios, descuentos, días no trabajados) sin perder la trazabilidad entre monto base, ajustes y monto final. |

---

## 2. Problema a resolver

Una liquidación generada no siempre coincide con lo que corresponde pagar. Hay casos frecuentes: premio por rendimiento, descuento por ausencia, reintegro, carga de horas realmente trabajadas. El sistema debe permitir documentar cada ajuste con tipo, descripción y monto, recalculando en vivo el total final.

---

## 3. Objetivo funcional

Desde el detalle de una liquidación `generada`, el tesorero puede:
- Agregar, editar y eliminar **ajustes** (`type`, `concept`, `amount`).
- Cargar `hours_worked` o `classes_worked` para contratos `por_hora`/`por_clase`, lo que recalcula `base_amount = horas × monto_unitario_estructura`.
- Editar `base_amount` directamente cuando el contrato tiene flag `uses_structure_amount = false`.
- Editar `notes` libres.

El `total_amount` se recalcula automáticamente tras cada cambio: `base_amount + sum(adjustments.signed_amount)`.

---

## 4. Alcance

### Incluye
- Listado de ajustes en el detalle de la liquidación.
- CRUD de ajustes mientras `status = 'generada'`.
- Carga de horas/clases con recálculo automático.
- Edición inline del `base_amount` en contratos con flag `false`.
- Campo `notes` libre.
- Recálculo de `total_amount` en cada mutación.
- Bloqueo total de edición si `status in ('confirmada','pagada','anulada')`.
- Registro en `hr_activity_log` con diff.

### No incluye
- Adjuntos (comprobantes escaneados) — fuera de scope MVP.
- Ajustes automáticos por reglas (ej. descontar días no trabajados según calendario) — se hace manual.
- Límites de % de descuento.

---

## 5. Actor principal

`admin`, `rrhh` o `tesoreria` del club activo.

---

## 6. Precondiciones

- Liquidación existe y está en estado `generada`.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Se agrega ajuste | `adjustments_total` y `total_amount` se recalculan. |
| Se carga horas en contrato `por_hora` | `base_amount = hours_worked * hourly_rate`, `requires_hours_input = false` si pasa a ser `> 0`. |
| Se edita `base_amount` manualmente | Solo permitido si contrato tiene flag `false`. |
| Se intenta editar en `confirmada`/`pagada`/`anulada` | Bloqueado. |
| Se valida total final | Siempre `>= 0`. Cero permitido con confirmación explícita. |

---

## 8. Reglas de negocio

### Tipos de ajuste
- Enum `adjustment_type`: `adicional | descuento | reintegro`.
- `adicional` suma, `descuento` resta, `reintegro` suma.
- Se guarda siempre el `amount` como positivo; el signo se resuelve al calcular `total_amount` (vista o trigger).

### Carga de horas/clases
- Solo para contratos con `remuneration_type in ('por_hora','por_clase')`.
- Fórmula: `base_amount = (hours_worked or classes_worked) * rate`.
- `rate` se resuelve:
  - `uses_structure_amount = true` → versión vigente del monto de la estructura.
  - `uses_structure_amount = false` → `frozen_amount` del contrato (interpretado como rate unitario).
- Cualquier cambio en horas/clases dispara recálculo.

### Edición de `base_amount`
- Permitida sólo cuando `remuneration_type = 'mensual_fijo'` y `uses_structure_amount = false`.
- En `mensual_fijo` con flag `true`, `base_amount` viene de la estructura y no se edita desde acá (usar adjustments en cambio).

### Total final
- `total_amount = base_amount + sum(case when type = 'descuento' then -amount else amount end)`.
- Mantenido en la fila de `payroll_settlements` vía trigger o recalculado por el service al cada mutación.
- `total_amount < 0` → bloqueado con `total_negative`.
- `total_amount = 0` → permitido con `<FormBanner variant="warning">` pidiendo confirmación explícita en la UI al confirmar (US-63).

### Auditoría
- `SETTLEMENT_ADJUSTMENT_ADDED`, `SETTLEMENT_ADJUSTMENT_UPDATED`, `SETTLEMENT_ADJUSTMENT_REMOVED`, `SETTLEMENT_HOURS_LOADED`, `SETTLEMENT_NOTES_UPDATED`, `SETTLEMENT_BASE_AMOUNT_UPDATED`.

---

## 9. Flujo principal

1. Tesorero abre el detalle de una liquidación `generada`.
2. Ve `base_amount`, lista de ajustes, `adjustments_total`, `total_amount`, campo horas (si aplica), campo notas.
3. Agrega ajuste presionando `+ Adicional / Descuento / Reintegro`. Abre un sub-modal con Tipo, Concepto, Monto.
4. Al guardar, el backend inserta el ajuste, recalcula y devuelve la liquidación actualizada.
5. La UI refresca el total.
6. Opcionalmente carga horas/clases.
7. Al salir, si `status` sigue `generada`, la liquidación queda lista para confirmar (US-63).

---

## 10. Flujos alternativos

### A. Total negativo
Bloqueo con `total_negative`.

### B. Carga de horas fuera de tipo correcto
Contrato `mensual_fijo` no permite input de horas. El campo queda oculto.

### C. Edición en `confirmada`
Todos los controles están deshabilitados. Se muestra `<FormBanner variant="info">Liquidación confirmada. Para editarla, anulá y regenerá.</FormBanner>`.

---

## 11. UI / UX

### Reglas
- Detalle: `<Modal size="lg">` o página dedicada `/rrhh/settlements/[id]`.
- Encabezado con Colaborador, Período, Contrato, Estructura.
- Sección "Monto base" con `<FormInput>` editable o `<FormReadonly>` según flags.
- Sección "Horas / Clases" con `<FormInput type="number">` + display del rate aplicado.
- Sección "Ajustes" con listado tabular pequeño (`<DataTable density="compact">`) con acciones inline.
- Footer con `total_amount` grande + `<ModalFooter>` que cambia según estado.

---

## 12. Mensajes y textos

### Namespace
`rrhh.settlements.detail.*` y `rrhh.settlements.adjustments.*`

### Keys mínimas
- `modal_title`, `section_base_amount`, `section_hours`, `section_adjustments`, `section_notes`
- `base_amount_label`, `hours_worked_label`, `classes_worked_label`, `rate_helper`, `notes_label`
- `add_adjustment_cta`, `adjustment_type_options.{adicional,descuento,reintegro}`, `adjustment_concept_label`, `adjustment_amount_label`
- `totals.base`, `totals.adjustments`, `totals.final`
- `feedback.{adjustment_added,adjustment_updated,adjustment_removed,hours_loaded,base_amount_updated,notes_updated,total_negative,edit_blocked_confirmed,edit_blocked_paid,edit_blocked_annulled,forbidden,unknown_error}`

---

## 13. Persistencia

### Entidad nueva
- `public.payroll_settlement_adjustments`:
  - `id uuid pk`
  - `settlement_id uuid not null references payroll_settlements(id) on delete cascade`
  - `type text not null check (type in ('adicional','descuento','reintegro'))`
  - `concept text not null`
  - `amount numeric(18,2) not null check (amount > 0)`
  - `created_at timestamptz default now()`, `created_by_user_id uuid`
  - Índice: `(settlement_id)`.

### UPDATE sobre `payroll_settlements`
- `adjustments_total`, `total_amount`, `hours_worked`, `classes_worked`, `base_amount`, `notes`, `updated_at`, `updated_by_user_id`.

### Trigger
- `payroll_settlement_recalc_totals` trigger `after insert or update or delete on payroll_settlement_adjustments` que recalcula `adjustments_total` y `total_amount` en la fila padre. Evita inconsistencias.

### RLS
- `payroll_settlement_adjustments_club_scope`: via join con `payroll_settlements` que ya tiene club.

---

## 14. Seguridad

- Club-scoped por RLS.
- Rol `admin | rrhh | tesoreria` en service.
- Bloqueo server-side si `status` ≠ `generada` al mutar ajustes o horas.

---

## 15. Dependencias

- **contracts:** `Add adjustment`, `Update adjustment`, `Delete adjustment`, `Load hours`, `Update notes`, `Update base amount`.
- **domain entities:** `payroll_settlements`, `payroll_settlement_adjustments`, `staff_contracts` (lectura), `salary_structure_versions` (lectura).
- **otras US:** US-61 (generación), US-63 (confirmación que bloquea la edición), US-66 (anulación).
