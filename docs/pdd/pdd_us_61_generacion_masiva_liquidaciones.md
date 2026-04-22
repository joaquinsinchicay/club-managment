# PDD — US-61 · Generación masiva de liquidaciones del mes

> PDD del módulo **E04 · RRHH**. Fuente Notion: `E04 👥 RRHH` · `US-37`. En el repo: **US-61**.

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E04 · RRHH |
| User Story | Como Tesorero del club, quiero generar las liquidaciones del mes para todos los contratos vigentes, para preparar los pagos de la nómina en un solo paso. |
| Prioridad | Alta |
| Objetivo de negocio | Reducir a segundos una tarea que a mano es horas: precargar en un solo paso las liquidaciones del mes para cada contrato vigente, con monto correcto según las reglas del contrato. |

---

## 2. Problema a resolver

Sin generación masiva, el tesorero debería crear cada liquidación a mano, lo que es lento, error-prone y no escala con la nómina del club.

---

## 3. Objetivo funcional

Desde el módulo **`/rrhh/settlements`**, el tesorero, rrhh o admin presiona `Generar liquidaciones del mes` y elige el período (mes/año, default mes en curso). La RPC `hr_generate_monthly_settlements(year, month)` crea una `payroll_settlements` por cada contrato vigente durante el período, con monto precargado según las reglas. Es idempotente: si ya existen liquidaciones no anuladas para un contrato en ese período, se omiten.

---

## 4. Alcance

### Incluye
- Selector de período mes/año.
- RPC `hr_generate_monthly_settlements(year, month)` transaccional.
- Carga de `base_amount` según reglas del contrato.
- Reporte post-ejecución: N generadas, N omitidas, N en error.
- Registro en `hr_activity_log` con evento `SETTLEMENTS_GENERATED`.
- Listado de liquidaciones generadas filtrable por mes, contrato, colaborador, estructura.

### No incluye
- Generación retroactiva automática para meses anteriores (posible, pero no se habilita en MVP; se permite seleccionar manualmente un mes pasado).
- Confirmación o pago (cubiertos por US-63 y US-64).
- Ajustes por días trabajados en contratos finalizados a mitad de mes: el tesorero descuenta manualmente vía adjustments (decisión #3 del plan: ajuste manual, no prorrateo automático).
- Cálculo automático de horas/clases para contratos `por_hora/por_clase`: se genera con `base_amount = 0` y se marca `requires_hours_input`.

---

## 5. Actor principal

`admin`, `rrhh` o `tesoreria` del club activo.

---

## 6. Precondiciones

- Existe al menos un contrato `vigente` durante el período seleccionado.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Contrato vigente con flag `true` y estructura monetaria | Liquidación con `base_amount = versión vigente del monto`. |
| Contrato vigente con flag `false` | Liquidación con `base_amount = frozen_amount`. |
| Contrato `por_hora` o `por_clase` | Liquidación con `base_amount = 0`, `requires_hours_input = true`. |
| Contrato con liquidación no anulada ya existente | Omitido, reportado. |
| Contrato que se finaliza durante el período | Se genera igual (el tesorero ajusta manualmente). |
| Sin contratos vigentes | Sin creaciones; se informa vacío. |

---

## 8. Reglas de negocio

### Filtro de contratos candidatos
- `status = 'vigente'` al momento de ejecución.
- `start_date <= period_end and (end_date is null or end_date >= period_start)`.
- Excluye contratos con liquidación no anulada existente para el mismo `(contract_id, period_year, period_month)`.

### Cálculo de `base_amount`
- Si `uses_structure_amount = true`:
  - Lee de `salary_structure_current_amount` (vista de US-55).
  - Si no hay versión vigente (edge case improbable) → error por contrato, no aborta la batch.
- Si `uses_structure_amount = false`:
  - Usa `frozen_amount` (siempre debería estar por la constraint del modelo).
- Si `remuneration_type in ('por_hora','por_clase')`:
  - `base_amount = 0`, `requires_hours_input = true`, `hours_worked = 0`, `classes_worked = 0`.

### Unicidad
- `unique (contract_id, period_year, period_month) where status <> 'anulada'`. Si existe una anulada en el mismo período se puede regenerar (se crea una nueva).

### Estado inicial
- `status = 'generada'`, `total_amount = base_amount` (sin adjustments aún).

### Resumen de la corrida
- La RPC retorna `{ ok, code, generated_count, skipped_count, error_count, settlements: [...] }`.
- Se registra evento `SETTLEMENTS_GENERATED` con payload de totales.

### Idempotencia
- Correr dos veces la misma generación sobre el mismo período no duplica registros: ya existen no anuladas y quedan omitidas.

---

## 9. Flujo principal

1. Tesorero entra a `/rrhh/settlements`.
2. Presiona `Generar liquidaciones del mes`.
3. Se abre `<Modal size="sm">` con selector mes/año (default mes en curso).
4. Confirma. Se ejecuta la RPC.
5. Se muestra un `<FormBanner variant="info">` persistente con el resumen y un CTA `Ver generadas` que filtra el listado por ese período.

---

## 10. Flujos alternativos

### A. Todos los contratos ya tienen liquidación para el período
- `generated_count = 0`, `skipped_count = N`. Toast informativo.

### B. Sin contratos vigentes
- `generated_count = 0`, `skipped_count = 0`. Toast informativo "Sin contratos vigentes en el período".

### C. Error parcial
- Si un contrato específico falla en el cálculo (ej. estructura sin versión vigente), se registra el error, se continúa con el resto. `error_count > 0`, `status = 'partial'` en el registro del job.

### D. Período futuro
- Permite seleccionar. No hay restricción temporal fuerte.

---

## 11. UI / UX

### Reglas
- Página `/rrhh/settlements` con:
  - Header: título + CTA primaria `Generar liquidaciones del mes`.
  - Filtros: mes/año, status, colaborador, estructura.
  - `<DataTable density="compact">` con columnas Período, Colaborador, Estructura, Monto base, Ajustes, Monto final, Estado.
  - Chip de estado con `<DataTableChip tone>` según status.
  - Selección múltiple para acciones bulk (confirmar — ver US-63).
- Modal de generación: `<FormSelect>` mes, `<FormInput type="number">` año (limits sensatos).
- Feedback: `<FormBanner variant="info">` con resultado + toast.

---

## 12. Mensajes y textos

### Namespace
`rrhh.settlements.generate.*`

### Keys mínimas
- `page_title`, `page_description`
- `generate_cta`, `generate_modal_title`, `form_month_label`, `form_year_label`
- `generate_submit_cta`, `generate_pending`
- `result_banner_generated`, `result_banner_skipped`, `result_banner_errors`
- `view_generated_cta`
- `feedback.{generated,no_active_contracts,partial,forbidden,unknown_error}`
- Para el listado: `filter_*`, `columns.*`, `empty_title`, `empty_description`.

---

## 13. Persistencia

### Entidad nueva
- `public.payroll_settlements`:
  - `id uuid pk`
  - `club_id uuid not null references clubs(id)`
  - `contract_id uuid not null references staff_contracts(id)`
  - `period_year int not null`, `period_month int not null check (period_month between 1 and 12)`
  - `base_amount numeric(18,2) not null default 0`
  - `adjustments_total numeric(18,2) not null default 0`
  - `total_amount numeric(18,2) not null default 0`
  - `hours_worked numeric(10,2) default 0`, `classes_worked int default 0`
  - `requires_hours_input boolean not null default false`
  - `notes text null`
  - `status text not null default 'generada' check (status in ('generada','confirmada','pagada','anulada'))`
  - `confirmed_at timestamptz null`, `confirmed_by_user_id uuid null`
  - `paid_at timestamptz null`
  - `annulled_at timestamptz null`, `annulled_by_user_id uuid null`, `annulled_reason text null`
  - `created_at timestamptz default now()`, `updated_at timestamptz default now()`, `created_by_user_id uuid`
  - Unique parcial: `create unique index on payroll_settlements (contract_id, period_year, period_month) where status <> 'anulada'`.
  - Índices: `(club_id, status)`, `(club_id, period_year, period_month)`.

### RPC
- `hr_generate_monthly_settlements(p_year int, p_month int) returns json` SECURITY DEFINER.

### RLS
- `payroll_settlements_club_scope`: `club_id = current_setting('app.current_club_id', true)::uuid`.

---

## 14. Seguridad

- RLS al club activo.
- Service valida rol `admin | rrhh | tesoreria`.
- La RPC valida el `app.current_club_id` vía `staff_contracts` join.

---

## 15. Dependencias

- **contracts:** `Generate monthly settlements`, `List settlements`.
- **domain entities:** `payroll_settlements`, `staff_contracts` (lectura), `salary_structure_versions` (lectura), `hr_activity_log`.
- **otras US:** US-54, US-55, US-57, US-58; US-62 (ajustes), US-63 (confirmación), US-64/65 (pagos), US-66 (anulación).
