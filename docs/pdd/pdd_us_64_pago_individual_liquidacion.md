# PDD — US-64 · Pago individual de liquidación confirmada

> PDD del módulo **E04 · RRHH**. Fuente Notion: `E04 👥 RRHH` · alias `US-42`. En el repo: **US-64**. (Pre-refactor 2026-04-27 el alias era `US-40`.)

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E04 · RRHH |
| User Story | Como Tesorero del club, quiero ejecutar el pago de una liquidación confirmada generando el movimiento correspondiente en Tesorería, para cerrar el ciclo de liquidación con trazabilidad completa. |
| Prioridad | Alta |
| Objetivo de negocio | Cerrar el ciclo Liquidación → Pago con integración nativa a Tesorería: cada pago genera un movimiento vinculado, habilitando navegación bidireccional y reportes consolidados. |

---

## 2. Problema a resolver

Sin integración, el tesorero tendría que cargar manualmente el egreso en Tesorería y recordar que corresponde a una liquidación, perdiendo trazabilidad. El sistema debe ejecutar en una transacción el pago + el movimiento, vinculándolos.

---

## 3. Objetivo funcional

Desde el detalle de una liquidación `confirmada`, el tesorero presiona `Pagar`. Un formulario pide Cuenta de origen, Fecha de pago, Comprobante opcional y Notas. Al confirmar, la RPC `hr_pay_settlement(settlement_id, account_id, date, receipt, notes)` ejecuta atómicamente: crea un movimiento de egreso en `treasury_movements` con categoría "Sueldos", vincula `payroll_settlement_id` en el movimiento, actualiza la liquidación a `pagada` y registra auditoría.

---

## 4. Alcance

### Incluye
- Formulario de pago con campos requeridos y opcionales.
- Validación server-side de saldo suficiente según configuración de la cuenta.
- RPC transaccional.
- Asociación a jornada abierta del tesorero si existe.
- Vinculación bidireccional (`treasury_movements.payroll_settlement_id` y `payroll_settlements` con reference al movement via query).
- Registro en `hr_activity_log` y en el audit log de movimientos.
- Navegación desde el movimiento → liquidación en la UI.

### No incluye
- Pago en lote (cubierto por US-65).
- Reverso del pago (cubierto por US-66 que depende de la reversión manual del movimiento).
- Pagos parciales (siempre se paga el `total_amount` completo).
- Pagos en moneda distinta a la del club (`clubs.currency_code`): se bloquea con `currency_mismatch` si la cuenta no soporta la moneda del club.

---

## 5. Actor principal

`tesoreria` (principal), `admin` o `rrhh` (backup).

---

## 6. Precondiciones

- La liquidación está en `status = 'confirmada'`.
- Existe al menos una cuenta de tesorería habilitada para `tesoreria` con la moneda del club.
- La cuenta tiene `visibleForTesoreria = true`.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Pago exitoso | Liquidación → `pagada`, `paid_at = now()`. Movimiento creado en `treasury_movements` con categoría "Sueldos", `payroll_settlement_id` referenciando la liquidación. |
| Tesorero con jornada abierta | El movimiento queda asociado a `daily_cash_session_id` de la jornada. |
| Tesorero sin jornada abierta | Movimiento directo sin jornada (patrón existente de movimientos de tesorería). |
| Saldo insuficiente | Pago bloqueado con `insufficient_funds`. |
| Liquidación ya pagada | Bloqueada con `already_paid`. |

---

## 8. Reglas de negocio

### Campos del formulario
- `account_id` obligatorio. Sólo cuentas del club activo visibles para `tesoreria` con `currency_code` igual al del club.
- `payment_date` obligatoria, por defecto `current_date`. Debe estar en un rango razonable (`>= current_date - 365 días` y `<= current_date + 7 días`).
- `receipt_number` opcional, texto libre.
- `notes` opcional, texto libre hasta 500 caracteres.

### Saldo
- Lectura del saldo actual de la cuenta en la moneda del club (reutilizar `treasury-service`).
- Si el saldo resultante post-egreso es negativo → bloquea con `insufficient_funds` a menos que la cuenta permita sobregiro (flag existente en configuración de cuentas; reutilizar).

### Descripción autogenerada del movimiento
- Patrón: `Sueldo — {colaborador.full_name} — {period_month}/{period_year}`.
- Si el colaborador tiene `staff_contracts.functional_role` relevante, agregar al final: ` — {functional_role}`.

### Categoría "Sueldos"
- Ya existe en `LEGACY_SYSTEM_TREASURY_CATEGORY_NAMES` (`lib/treasury-system-categories.ts:29`). La migration de Fase 1 valida su presencia; si falta, la seed la crea.

### Monto y moneda
- `amount = settlement.total_amount`.
- `currency_code = clubs.currency_code`.
- `movement_type = 'egreso'`.

### Vinculación
- `treasury_movements.payroll_settlement_id uuid null references payroll_settlements(id)` (columna nueva, agregada en migration de Fase 1).
- `payroll_settlements.paid_movement_id` no se almacena directo — se consulta via `select id from treasury_movements where payroll_settlement_id = :settlement_id limit 1`. Opcionalmente se agrega columna para evitar el join — decidido: **se agrega** `payroll_settlements.paid_movement_id uuid null references treasury_movements(id)` para queries performantes en la ficha (US-67).

### Jornada abierta
- Lógica existente: si el usuario tiene sesión de caja abierta para hoy, el movimiento hereda `daily_cash_session_id`.

### Auditoría
- `SETTLEMENT_PAID` en `hr_activity_log` con `{ settlement_id, movement_id, account_id, amount }`.
- El `movement_audit_log` existente registra su propia fila de creación.

### Idempotencia
- El unique parcial en `treasury_movements.payroll_settlement_id where payroll_settlement_id is not null` previene doble pago incluso si el cliente reintenta.

---

## 9. Flujo principal

1. Tesorero abre detalle de liquidación `confirmada` y presiona `Pagar`.
2. Abre `<Modal size="md">` con formulario.
3. El selector de cuentas se prellena con `visibleForTesoreria = true` y `currency_code = clubs.currency_code`.
4. El tesorero completa y confirma.
5. RPC ejecuta:
   a. Valida estado de la liquidación.
   b. Valida cuenta y saldo.
   c. Resuelve `daily_cash_session_id` si hay jornada abierta.
   d. INSERT en `treasury_movements` con todos los campos + `payroll_settlement_id`.
   e. UPDATE `payroll_settlements` con `status = 'pagada'`, `paid_at = now()`, `paid_movement_id = <new_id>`.
   f. INSERT en `hr_activity_log` y `movement_audit_log`.
6. Toast de éxito + refresh.

---

## 10. Flujos alternativos

### A. Saldo insuficiente
Bloqueo con `insufficient_funds` + mensaje con saldo actual.

### B. Cuenta no admite moneda del club
Bloqueo con `currency_mismatch`.

### C. Liquidación en estado distinto de confirmada
Bloqueo con `invalid_status`.

### D. Error en Tesorería al insertar movimiento
Rollback completo. Ni la liquidación cambia estado ni queda movimiento huérfano.

---

## 11. UI / UX

### Reglas
- Modal `<Modal size="md">` con secciones Cuenta, Fecha, Comprobante, Notas.
- `<FormSelect>` de cuentas con saldo actual mostrado inline (`Caja Pesos · $ 320.000`).
- `<FormInput type="date">` con default hoy.
- `<FormBanner variant="info">` al seleccionar cuenta mostrando el saldo resultante post-egreso.
- Si `saldo_resultante < 0` → `<FormBanner variant="warning">` o destructive con texto explicativo.
- `<ModalFooter submitVariant="primary" submitLabel="Confirmar pago" pendingLabel="Procesando pago…">`.

---

## 12. Mensajes y textos

### Namespace
`rrhh.settlements.pay.*`

### Keys mínimas
- `trigger_cta` = "Pagar"
- `modal_title`, `modal_description`
- `form_account_label`, `form_account_balance_helper`, `form_payment_date_label`, `form_receipt_label`, `form_notes_label`
- `summary_settlement_amount`
- `balance_after_banner`, `insufficient_funds_warning`
- `submit_cta`, `submit_pending`, `cancel_cta`
- `movement_description_template` = "Sueldo — {staff_name} — {month}/{year}"
- `feedback.{paid,account_required,payment_date_required,invalid_payment_date,insufficient_funds,currency_mismatch,invalid_status,already_paid,forbidden,unknown_error}`

---

## 13. Persistencia

### UPDATEs
- `treasury_movements`: agregar columna `payroll_settlement_id uuid null references payroll_settlements(id)` + unique parcial + índice.
- `payroll_settlements`: agregar columna `paid_movement_id uuid null references treasury_movements(id)`.

### RPC
- `hr_pay_settlement(p_settlement_id uuid, p_account_id uuid, p_payment_date date, p_receipt_number text, p_notes text) returns json` SECURITY DEFINER.

### RLS
- Existente en ambas tablas (club-scoped).

### Integración Tesorería
- Reutiliza `treasury-movement-service` para creación del movement, pasando `payroll_settlement_id` como metadata. O bien el RPC crea directamente en la tabla `treasury_movements` garantizando shape compatible. Decisión: **RPC crea directamente** para atomicidad; el service de RRHH verifica que el shape coincida con el contrato del movement service (mismos campos obligatorios: `club_id`, `account_id`, `movement_type`, `category_id`, `concept`, `currency_code`, `amount`, `movement_date`, `status = 'posted'`).

---

## 14. Seguridad

- Club-scoped por RLS en ambas tablas afectadas.
- Rol `admin | rrhh | tesoreria` requerido.
- La RPC valida que la cuenta, la liquidación y el `app.current_club_id` coincidan.
- Unique parcial previene doble pago atómicamente.

---

## 15. Dependencias

- **contracts:** `Pay settlement`.
- **domain entities:** `payroll_settlements`, `treasury_movements`, `treasury_accounts`, `daily_cash_sessions`, `hr_activity_log`, `movement_audit_log`, categoría "Sueldos".
- **otras US:** US-63 (origen), US-65 (variante bulk), US-66 (reversión con anulación), US-67 (navegación desde ficha).
