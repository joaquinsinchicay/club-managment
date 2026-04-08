# PDD — US-27 · Registro de movimientos de Tesorería en cuentas propias

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E03 · Tesorería |
| User Story | Como usuario con rol Tesorería, quiero registrar movimientos en las cuentas de Tesorería del club, para reflejar la operatoria financiera en cuentas distintas a las utilizadas por Secretaria. |
| Prioridad | Alta |
| Objetivo de negocio | Permitir que Tesorería opere sobre sus cuentas visibles sin depender de la jornada diaria de Secretaría y manteniendo consistencia por club activo. |

---

## 2. Objetivo funcional

Un usuario con rol `tesoreria` en el club activo debe poder consultar saldos de sus cuentas visibles y registrar ingresos o egresos en esas cuentas desde un formulario propio. El movimiento debe quedar asociado al club activo, con fecha editable, usuario responsable y saldo afectado solo en la moneda seleccionada.

---

## 3. Alcance

### Incluye
- Card específica de Tesorería en el dashboard cuando el usuario tiene ese rol y no opera como Secretaría.
- Listado de cuentas visibles para Tesorería con saldos separados por moneda.
- Formulario de alta con `Fecha`, `Cuenta`, `Tipo`, `Categoría`, `Concepto`, `Moneda` e `Importe`.
- Soporte para cuentas bimonetarias y selección de moneda válida por cuenta.
- Validaciones server-side de cuenta, tipo, categoría, moneda e importe.
- Registro del usuario responsable y fecha/hora de creación.
- Reseteo del formulario luego de crear exitosamente.
- Persistencia del movimiento únicamente en el club activo.

### No incluye
- Jornada diaria obligatoria para Tesorería.
- Consolidación de movimientos de Tesorería.
- Edición o anulación de movimientos ya creados.
- Operaciones compuestas de transferencia o FX.

---

## 4. Reglas de negocio

- Solo un usuario con rol `tesoreria` activo en el club activo puede usar este formulario.
- La opción no debe mostrarse a usuarios sin ese rol.
- El formulario solo expone cuentas con visibilidad para Tesorería.
- `Fecha`, `Cuenta`, `Tipo`, `Categoría`, `Concepto`, `Moneda` e `Importe` son requeridos.
- `Fecha` se precarga con la fecha actual, pero Tesorería puede editarla.
- El importe debe ser mayor a cero.
- La moneda elegida debe estar habilitada globalmente para el club y también para la cuenta seleccionada.
- Si la cuenta es bimonetaria, el movimiento impacta únicamente el saldo de la moneda informada.
- El movimiento debe registrar `created_at` y `created_by_user_id`.
- El movimiento creado por Tesorería queda con estado `posted`.
- La operación afecta solo el club activo y nunca debe tocar cuentas de otros clubes.

---

## 5. Persistencia

- `treasury_movements`
  - `club_id`
  - `account_id`
  - `movement_type`
  - `category_id`
  - `concept`
  - `currency_code`
  - `amount`
  - `movement_date`
  - `created_by_user_id`
  - `status = posted`

Do not reference current code files.

---

## 6. Dependencias

- cuentas de Tesorería visibles para el rol
- categorías visibles para Tesorería
- monedas habilitadas para el club y por cuenta
- contrato `Create movement`
