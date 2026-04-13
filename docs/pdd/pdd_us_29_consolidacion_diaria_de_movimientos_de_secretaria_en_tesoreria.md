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

Tesorería debe contar con una vista de consolidación diaria accesible por fecha, con fecha por defecto igual al día anterior. Desde esa vista debe poder listar pendientes, corregir imputaciones, integrar coincidencias con movimientos propios ya registrados y consolidar todos los movimientos válidos del día en un batch auditable.

---

## 3. Alcance

### Incluye
- Ruta específica de consolidación para Tesorería.
- Fecha por defecto igual al día anterior, editable manualmente.
- Listado de movimientos `pending_consolidation` del club activo para la fecha elegida.
- Detección de coincidencias con movimientos `posted` de Tesorería por cuenta, moneda e importe.
- Edición previa de fecha, cuenta, tipo, categoría, concepto, moneda e importe.
- Integración de coincidencias sin doble impacto contable.
- Consolidación diaria con batch explícito.
- Historial auditable con carga original, correcciones, integración y consolidación.

### No incluye
- Matching automático definitivo sin decisión humana.
- Reversión de integraciones o de batch ya consolidado.
- Edición de movimientos fuera del flujo de consolidación.

---

## 4. Reglas de negocio

- Solo `tesoreria` puede acceder y operar la consolidación.
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
