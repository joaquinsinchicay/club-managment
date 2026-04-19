# PDD — US-29 · Consolidación diaria de movimientos de Secretaría en Tesorería

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E03 · Tesorería |
| User Story | Como usuario con rol Tesorería, quiero revisar y consolidar diariamente los movimientos cargados por Secretaría, para incorporarlos correctamente a Tesorería, corregir imputaciones si es necesario e integrar coincidencias con trazabilidad completa. |
| Prioridad | Alta |
| Objetivo de negocio | Dar a Tesorería un flujo explícito de control diario sobre los movimientos de Secretaría antes de su incorporación definitiva al circuito financiero. |

---

## 2. Objetivo funcional

Tesorería debe contar con una **pestaña Conciliación** embebida dentro del dashboard de Tesorería (`/treasury?tab=conciliacion`), accesible por fecha, con fecha por defecto igual al día anterior. Desde esa pestaña debe poder listar pendientes, corregir imputaciones, integrar coincidencias con movimientos propios ya registrados y consolidar todos los movimientos válidos del día en un batch auditable.

---

## 3. Alcance

### Incluye
- Pestaña **Conciliación** dentro del dashboard de Tesorería (`/treasury?tab=conciliacion`), al mismo nivel que Resumen, Cuentas y Movimientos.
- KPIs visibles: cantidad de pendientes, monto neto sin conciliar y cantidad aprobada hoy.
- Selector de fecha de jornada inline, con fecha por defecto igual al día anterior, editable manualmente.
- Filtro por cuenta mediante chips (`Todas las cuentas` + una chip por cuenta visible con pendientes).
- Listado de movimientos `pending_consolidation` del club activo para la fecha elegida.
- Detección de coincidencias con movimientos `posted` de Tesorería por cuenta, moneda e importe.
- Edición previa de fecha, cuenta, tipo, categoría, actividad, recibo, calendario, concepto, moneda e importe vía modal por fila.
- Integración de coincidencias sin doble impacto contable.
- Acción "Aprobar todos" visible desde el header de la pestaña, que ejecuta la consolidación diaria con batch explícito.
- Historial auditable con carga original, correcciones, integración y consolidación.

### No incluye
- Ruta dedicada `/treasury/consolidation` (queda deprecada; la operatoria vive dentro de la pestaña).
- Matching automático definitivo sin decisión humana.
- Reversión de integraciones o de batch ya consolidado.
- Edición de movimientos fuera del flujo de consolidación.

---

## 4. Reglas de negocio

- Solo `tesoreria` puede acceder y operar la pestaña Conciliación.
- La fecha propuesta por defecto es el día anterior.
- Las acciones aplican solo al club activo.
- Los movimientos de Secretaría llegan a este flujo con estado `pending_consolidation`.
- Tesorería puede editar únicamente movimientos que sigan pendientes.
- La integración solo puede ocurrir contra un movimiento `posted` del mismo club con misma cuenta, moneda e importe.
- Integrar cambia el movimiento de Secretaría a estado `integrated`.
- Consolidar cambia los movimientos pendientes válidos a estado `consolidated`.
- Los movimientos ya integrados conservan estado `integrated`.
- No se permite consolidar la misma fecha dos veces.
- No se permite consolidar mientras existan pendientes inválidos.
- No se permite operar la conciliación de una fecha cuya jornada de Secretaría esté `open`. La pestaña debe ocultar el listado y los KPIs (mostrarlos en cero) y reemplazar el contenido por un mensaje explicando que se debe esperar al cierre de jornada.
- Toda edición, integración y consolidación debe generar auditoría con fecha, hora y usuario responsable.
- El historial debe conservar la imputación original cargada por Secretaría.

---

## 5. Persistencia

- `daily_consolidation_batches`
- `movement_integrations`
- `movement_audit_logs`
- `treasury_movements.status`
- `treasury_movements.consolidation_batch_id`

Do not reference current code files.

---

## 6. Dependencias

- movimientos de Secretaría con estado `pending_consolidation`
- movimientos de Tesorería con estado `posted`
- contratos de consolidación y auditoría
- aislamiento por club activo

---

## 7. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`
- Mock de referencia: Claude Design · `Tesoreria.html` (pestaña Conciliación).

### Reglas
- La conciliación se renderiza **dentro** de la pestaña Conciliación del dashboard de Tesorería, no como ruta separada.
- Layout mobile-first, consistente con el resto de pestañas de Tesorería.
- Header con strip de 3 KPIs: Pendientes, Monto sin conciliar (ARS neto), Aprobadas hoy.
- Bloque "Movimientos a conciliar" con subtítulo y CTA "Aprobar todos" alineado a la derecha.
- Selector "Fecha de jornada" con `<input type="date">` y botón "Buscar" que actualiza `?date=` en la URL sin perder la pestaña.
- Chips de filtro por cuenta: `Todas las cuentas` + una chip por cuenta visible con pendientes. Filtro client-side.
- Cada fila muestra: concepto, tags consistentes (cuenta, categoría, actividad o evento) con la misma jerarquía visual, código `PJ-MOV-…`, responsable, referencia de recibo / transferencia / cambio de moneda cuando exista, monto en color según ingreso/egreso, timestamp, badge de estado (`Pendiente` / `Integrado` / `Inválido`) y CTA "Editar".
- Cuando la jornada de Secretaría para la fecha seleccionada esté `open`, los chips de cuenta y el listado se reemplazan por un mensaje informativo y los KPIs muestran cero hasta que la jornada cierre.
- La edición abre un modal con el formulario existente de corrección (movimiento o transferencia según corresponda).
- No deben existir textos hardcodeados.

---

## 8. Mensajes y textos

### Fuente de verdad
- `lib/texts.json`

### Reglas
- No hardcoded strings are allowed.
- All user-facing texts must map to `lib/texts.json`.

### Keys requeridas

| Tipo | Key | Contexto |
|---|---|---|
| label | `dashboard.treasury_role.conciliacion_kpi_pending_label` | KPI de pendientes. |
| body | `dashboard.treasury_role.conciliacion_kpi_pending_suffix` | Sufijo del KPI de pendientes. |
| label | `dashboard.treasury_role.conciliacion_kpi_amount_label` | KPI de monto sin conciliar. |
| body | `dashboard.treasury_role.conciliacion_kpi_amount_suffix` | Sufijo del KPI de monto. |
| label | `dashboard.treasury_role.conciliacion_kpi_approved_label` | KPI de aprobadas hoy. |
| body | `dashboard.treasury_role.conciliacion_kpi_approved_suffix` | Sufijo del KPI aprobadas. |
| title | `dashboard.treasury_role.conciliacion_movements_title` | Título del bloque de movimientos a conciliar. |
| body | `dashboard.treasury_role.conciliacion_movements_subtitle` | Subtítulo del bloque. |
| action | `dashboard.treasury_role.conciliacion_approve_all_cta` | CTA aprobar todos. |
| label | `dashboard.treasury_role.conciliacion_date_label` | Label del selector de fecha de jornada. |
| action | `dashboard.treasury_role.conciliacion_date_submit_cta` | CTA para cargar la fecha seleccionada. |
| label | `dashboard.treasury_role.conciliacion_filter_all_accounts` | Chip "Todas las cuentas". |
| status | `dashboard.treasury_role.conciliacion_status_pending` | Badge de estado pendiente. |
| action | `dashboard.treasury_role.conciliacion_edit_cta` | CTA editar movimiento desde la fila. |
| title | `dashboard.treasury_role.conciliacion_session_open_title` | Título del bloqueo cuando la jornada está abierta. |
| body | `dashboard.treasury_role.conciliacion_session_open_description` | Descripción del bloqueo cuando la jornada está abierta. |
