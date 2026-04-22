# PDD — US-65 · Pago en lote de múltiples liquidaciones

> PDD del módulo **E04 · RRHH**. Fuente Notion: `E04 👥 RRHH` · `US-41`. En el repo: **US-65**.

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E04 · RRHH |
| User Story | Como Tesorero del club, quiero ejecutar el pago de múltiples liquidaciones confirmadas en una sola operación, para pagar la nómina del mes de forma eficiente. |
| Prioridad | Alta |
| Objetivo de negocio | Escalar la operación de pago mensual: ejecutar en segundos lo que a mano son N clics × N colaboradores, con integridad transaccional (todo o nada). |

---

## 2. Problema a resolver

Pagar uno por uno no escala. Se necesita una operación "masa" con resumen previo, pago único de cuenta común, y fallback seguro si algo falla.

---

## 3. Objetivo funcional

Desde el listado filtrado por `status = 'confirmada'`, el tesorero selecciona N liquidaciones y presiona `Pagar seleccionadas`. Abre un formulario de pago en lote con Cuenta de origen, Fecha de pago y Notas. Al confirmar, la RPC `hr_pay_settlements_batch(ids[], account_id, date, notes)` ejecuta **todas o ninguna** (rollback total si una falla). Cada pago genera su movimiento individual vinculado a su liquidación, registrando también un `payroll_payment_batches` para consolidación.

---

## 4. Alcance

### Incluye
- Selección múltiple en listado de confirmadas.
- Resumen previo: cantidad, monto total, cuenta, fecha.
- RPC transaccional con rollback total ante fallo parcial.
- Creación de un `payroll_payment_batches` como agrupador.
- Un `treasury_movements` por cada liquidación, vinculado y asociado al batch vía una tabla puente o columna `batch_id` en el movement.
- Validación de saldo total suficiente en la cuenta antes de procesar.
- Registro en `hr_activity_log` por cada pago + un evento consolidado `SETTLEMENTS_PAID_BATCH`.

### No incluye
- Pago parcial de algunas liquidaciones (si una falla, ninguna se paga).
- Configuración de pago escalonado (una liquidación a cuenta A, otra a cuenta B) — esta US usa una única cuenta.
- Reversión de batch; la reversión sigue el patrón individual (anulación de cada liquidación + reverso del movimiento).

---

## 5. Actor principal

`admin`, `rrhh` o `tesoreria`.

---

## 6. Precondiciones

- Existen liquidaciones `confirmada` en el club activo.
- Cuenta con saldo suficiente para cubrir la suma.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Batch exitoso | Todas las liquidaciones pasan a `pagada`. Todos los movimientos se crean. `payroll_payment_batches` insertado con totales y referencia a cada pago. |
| Batch fallido | Rollback total. Nada persiste. Intento fallido se registra en `hr_activity_log` y en `hr_job_runs` (reutilizando tabla de US-59) como `payment_batch_failed`. |

---

## 8. Reglas de negocio

### Validaciones previas (pre-RPC, lado cliente + server)
- Todas las liquidaciones seleccionadas están en `confirmada`.
- Todas pertenecen al club activo.
- Suma de `total_amount` ≤ saldo de la cuenta (si la cuenta no permite sobregiro).
- `payment_date` válida.

### Atomicidad
- RPC envuelve todo en una transacción única (`BEGIN … COMMIT` en PL/pgSQL).
- Si un UPDATE o INSERT falla → `RAISE EXCEPTION` propaga y la transacción rollback completo.
- El código de error específico se captura y se retorna en el `json` de respuesta: `{ ok: false, code, failed_settlement_id }`.

### Tabla batch
- `public.payroll_payment_batches`:
  - `id uuid pk`
  - `club_id uuid not null references clubs(id)`
  - `account_id uuid not null references treasury_accounts(id)`
  - `payment_date date not null`
  - `notes text null`
  - `total_amount numeric(18,2) not null`
  - `settlement_count int not null`
  - `created_at timestamptz default now()`
  - `created_by_user_id uuid`

### Movimientos del batch
- Cada movement agregado tiene `payroll_settlement_id` apuntando a su liquidación + una columna nueva `payroll_payment_batch_id uuid null references payroll_payment_batches(id)`.
- La descripción del movement sigue el mismo patrón que en US-64.

### Jornada abierta
- Si el tesorero tiene jornada abierta, **todos** los movimientos del batch se asocian a esa jornada. Si no, ninguno.

### Auditoría
- Por cada liquidación: `SETTLEMENT_PAID` con `{ batch_id }`.
- Evento global: `SETTLEMENTS_PAID_BATCH` con `{ batch_id, count, total_amount }`.
- Intento fallido registra `SETTLEMENTS_PAYMENT_BATCH_FAILED` con `{ attempted_ids, reason, failed_settlement_id }`.

---

## 9. Flujo principal

1. Tesorero filtra listado por `confirmada`, selecciona N filas.
2. Presiona `Pagar seleccionadas`.
3. Abre `<Modal size="lg">` con:
   - Lista de liquidaciones seleccionadas en `<DataTable density="compact">`.
   - Formulario con Cuenta de origen, Fecha de pago, Notas comunes.
   - Card con totales: cantidad, monto total, saldo de cuenta, saldo post-pago.
4. Confirma. El sistema ejecuta la RPC.
5. En éxito: toast + refresh del listado (todas pasan a `pagada`).
6. En fallo parcial (rollback): `<FormBanner variant="destructive">` con el error + liquidación que lo causó.

---

## 10. Flujos alternativos

### A. Saldo insuficiente global
Bloqueo pre-RPC con `insufficient_funds`. No se ejecuta la transacción.

### B. Una liquidación ya no está en `confirmada` (race condition)
La RPC detecta → rollback → retorna `failed_settlement_id` con código `invalid_status`.

### C. Una cuenta no admite la moneda del club
Bloqueo con `currency_mismatch`.

---

## 11. UI / UX

### Reglas
- Bulk action bar aparece cuando hay selección.
- Resumen previo como vista de confirmación clara y escaneable.
- `<ModalFooter submitLabel="Confirmar pago de {N} liquidaciones" pendingLabel="Procesando…">`.
- Si hay error parcial tras rollback, mostrar el código + link a la liquidación problemática.

---

## 12. Mensajes y textos

### Namespace
`rrhh.settlements.pay_batch.*`

### Keys mínimas
- `bulk_action_cta`, `modal_title`, `modal_description`
- `table_header_period`, `table_header_staff`, `table_header_amount`
- `summary_count`, `summary_total`, `summary_balance`, `summary_balance_after`
- `form_account_label`, `form_payment_date_label`, `form_notes_label`
- `submit_cta`, `submit_pending`, `cancel_cta`
- `feedback.{paid_batch,insufficient_funds,currency_mismatch,invalid_status,rollback,forbidden,unknown_error}`
- `error_banner_title`, `error_banner_description`

---

## 13. Persistencia

### Entidad nueva
- `public.payroll_payment_batches` (schema ver sección 8).

### UPDATEs sobre existing
- `treasury_movements`: agregar columna `payroll_payment_batch_id uuid null references payroll_payment_batches(id)` en la misma migration de Fase 1.

### RPC
- `hr_pay_settlements_batch(p_ids uuid[], p_account_id uuid, p_payment_date date, p_notes text) returns json` SECURITY DEFINER.

### RLS
- `payroll_payment_batches` club-scoped.

---

## 14. Seguridad

- Club-scoped por RLS.
- Rol `admin | rrhh | tesoreria`.
- Validación de saldo pre-RPC server-side para evitar sobregiro indebido.
- Rollback garantiza que un intento fallido no deja restos.

---

## 15. Dependencias

- **contracts:** `Pay settlements batch`.
- **domain entities:** `payroll_payment_batches` (nueva), `payroll_settlements`, `treasury_movements`, `treasury_accounts`, `daily_cash_sessions`, `hr_activity_log`.
- **otras US:** US-63 (origen), US-64 (variante individual), US-66 (anulación, no reverse de batch).
