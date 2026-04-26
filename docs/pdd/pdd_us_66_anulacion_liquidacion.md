# PDD — US-66 · Anulación de liquidación

> PDD del módulo **E04 · RRHH**. Fuente Notion: `E04 👥 RRHH` · alias `US-44`. En el repo: **US-66**. (Pre-refactor 2026-04-27 el alias era `US-42`.)

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E04 · RRHH |
| User Story | Como Tesorero del club, quiero anular una liquidación para corregir errores, para que los montos no se contabilicen y pueda regenerarla si corresponde. |
| Prioridad | Media |
| Objetivo de negocio | Permitir corregir errores sin perder trazabilidad: las liquidaciones anuladas siguen visibles como histórico pero no afectan reportes ni impiden regenerar una válida para el mismo período. |

---

## 2. Problema a resolver

Cualquier sistema operativo comete errores: una liquidación mal cargada, un contrato equivocado, un monto incorrecto confirmado. Sin anulación, el único camino sería "corregirla con otra liquidación compensatoria", que ensucia reportes. La anulación formaliza la corrección.

---

## 3. Objetivo funcional

Desde el detalle o el listado, el tesorero puede anular una liquidación en estados `generada` o `confirmada` directamente. Si la liquidación está `pagada`, la anulación queda bloqueada hasta que el movimiento de tesorería asociado sea revertido manualmente en el módulo de Tesorería (siguiendo el patrón existente de reversión de movimientos). Una vez revertido el movement, la anulación se habilita.

---

## 4. Alcance

### Incluye
- Acción `Anular` con confirmación y motivo opcional.
- Flujo bloqueado con mensaje claro cuando `status = 'pagada'`.
- Post-reversión del movement, la acción se desbloquea.
- Estado `anulada` visible en el listado con filtro.
- Posibilidad de **regenerar** una liquidación para ese contrato y período (el unique parcial excluye `anulada`).
- Registro de `SETTLEMENT_ANNULLED` con motivo y actor.

### No incluye
- Anulación automática por reglas.
- Anulación masiva.
- Reversión automática del movimiento de tesorería: la reversión la ejecuta el tesorero manualmente siguiendo el patrón existente en `treasury-movement-service` (decisión #7 del plan).

---

## 5. Actor principal

`admin`, `rrhh` o `tesoreria`.

---

## 6. Precondiciones

- Liquidación existe y pertenece al club activo.
- Si estaba `pagada`, el movement asociado fue revertido previamente.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Anulación desde `generada` | `status = 'anulada'`. |
| Anulación desde `confirmada` | `status = 'anulada'`. |
| Anulación desde `pagada` con movement **vigente** | Bloqueada con `movement_still_active`. |
| Anulación desde `pagada` tras reversión del movement | `status = 'anulada'`. |
| Liquidación anulada en reportes | Excluida de reportes y dashboards. |
| Regeneración post-anulación | Permitida (unique parcial ignora `anulada`). |

---

## 8. Reglas de negocio

### Estados permitidos para anular
- `generada` → permitida directa.
- `confirmada` → permitida directa.
- `pagada` → permitida sólo si `paid_movement_id` referencia un movement con `status = 'cancelled'` (estado existente en `TreasuryMovementStatus`). Si el movement está `posted` o similar, la anulación se bloquea.

### Motivo
- `annulled_reason` texto libre hasta 500 caracteres, opcional.

### Efectos sobre el movement
- El movement **no se toca** desde esta acción (ni se cancela, ni se modifica). La reversión del movement la hace el tesorero separadamente. Esta US sólo cambia el status de la liquidación.

### Regeneración
- El unique parcial `(contract_id, period_year, period_month) where status <> 'anulada'` permite crear una liquidación nueva para el mismo contrato y período una vez anulada la anterior. La generación masiva (US-61) la omitiría si hay una no-anulada, pero la anulada no bloquea.

### Auditoría
- `SETTLEMENT_ANNULLED` en `hr_activity_log` con `{ annulled_from_status, annulled_reason }`.

### Idempotencia
- Anular una liquidación ya anulada retorna `already_annulled` sin efecto.

---

## 9. Flujo principal

1. Tesorero abre detalle de una liquidación `generada` o `confirmada` y presiona `Anular`.
2. Se abre `<Modal size="sm">` con `<FormBanner variant="destructive">` advertencia + campo Motivo.
3. Confirma con `submitVariant="destructive"`.
4. RPC `hr_annul_settlement(settlement_id, reason)` ejecuta el cambio de status y registra auditoría.
5. Toast + refresh.

## 9.b Flujo alternativo para `pagada`

1. Tesorero abre detalle de liquidación `pagada`.
2. El botón `Anular` está deshabilitado con tooltip: "Primero revertí el movimiento asociado en Tesorería".
3. Clic en el link `Ver movimiento` → navega al detalle del movement.
4. El tesorero ejecuta la reversión del movement (acción existente en Tesorería).
5. Vuelve a la liquidación → botón `Anular` se habilita (recheck server-side).
6. Confirma anulación normalmente.

---

## 10. Flujos alternativos

### A. Sin motivo
Permitido: `annulled_reason = null`.

### B. Movement revertido pero no asociado
Edge case improbable. Si `paid_movement_id is not null` pero el movement no existe, la RPC retorna `unknown_error` y el admin debe investigar.

### C. Regenerar después de anular
Al correr US-61 para el mismo período, el contrato ahora cuenta como "sin liquidación no-anulada" y se genera una nueva.

---

## 11. UI / UX

### Reglas
- Acción `Anular` como `<Button variant="destructive">` dentro de `<DataTableActions>` o en el detalle.
- Cuando está `pagada` con movement vigente: botón disabled con tooltip + link secundario `Ver movimiento`.
- Modal de anulación: `<FormBanner variant="destructive">` prominente + `<FormTextarea>` para motivo.
- Al listar con filtro incluyendo `anulada`, las filas se ven en gris con chip `<DataTableChip tone="neutral">Anulada</DataTableChip>`.

---

## 12. Mensajes y textos

### Namespace
`rrhh.settlements.annul.*`

### Keys mínimas
- `trigger_cta`, `trigger_disabled_tooltip`
- `modal_title`, `modal_description`, `warning_banner`
- `form_reason_label`, `form_reason_placeholder`
- `submit_cta`, `submit_pending`, `cancel_cta`
- `paid_status_link_movement_cta`
- `feedback.{annulled,movement_still_active,invalid_status,already_annulled,forbidden,unknown_error}`

---

## 13. Persistencia

### UPDATE sobre `payroll_settlements`
- `status = 'anulada'`, `annulled_at = now()`, `annulled_by_user_id = $user`, `annulled_reason = $reason`, `updated_at`, `updated_by_user_id`.

### RPC
- `hr_annul_settlement(p_settlement_id uuid, p_reason text) returns json` SECURITY DEFINER.

### RLS
- Existente.

---

## 14. Seguridad

- Club-scoped.
- Rol `admin | rrhh | tesoreria`.
- La RPC chequea el estado y, si la liquidación estaba `pagada`, valida que el movement asociado esté en estado `cancelled` antes de permitir el cambio.

---

## 15. Dependencias

- **contracts:** `Annul settlement`.
- **domain entities:** `payroll_settlements`, `treasury_movements` (lectura de status), `hr_activity_log`.
- **otras US:** US-61 (regeneración post-anulación), US-63 (anula confirmadas), US-64/65 (pagadas requieren reversión previa).
