# PDD — US-25 · Registro de transferencias entre cuentas

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E03 · Tesorería |
| User Story | Como Secretaria del club, quiero registrar transferencias entre cuentas de la misma moneda, para reflejar correctamente traspasos internos sin cargar movimientos duplicados manualmente. |
| Prioridad | Alta |
| Objetivo de negocio | Permitir registrar transferencias internas con trazabilidad común y sin tratarlas como ingresos o egresos externos del club. |

---

## 2. Objetivo funcional

Secretaría debe disponer de un formulario específico para registrar una transferencia interna entre dos cuentas del club activo en una misma moneda. Al confirmar, el sistema debe generar automáticamente un egreso en la cuenta origen y un ingreso en la cuenta destino, ambos asociados a la misma referencia de transferencia.

---

## 3. Alcance

### Incluye
- Modal específico de transferencia abierto desde el dashboard de Secretaría.
- Validaciones de jornada abierta, cuentas distintas, moneda compatible e importe positivo.
- Creación de un registro de transferencia interna.
- Generación automática de dos movimientos asociados a la misma referencia.
- Visualización de la referencia de transferencia en el detalle del movimiento.

### No incluye
- Transferencias entre distintas monedas.
- Comisiones o gastos asociados a la transferencia.
- Reversión o anulación de transferencias.

---

## 4. Reglas de negocio

- Solo `secretaria` puede registrar transferencias.
- Requiere jornada abierta.
- La cuenta origen y la cuenta destino deben pertenecer al club activo.
- Las cuentas deben ser distintas.
- La moneda seleccionada debe ser válida para ambas cuentas.
- El importe debe ser mayor a cero.
- La operación genera dos movimientos:
  - egreso en la cuenta origen
  - ingreso en la cuenta destino
- Ambos movimientos comparten una misma referencia de transferencia.
- La operación debe considerarse transferencia interna y no ingreso/egreso externo.

---

## 5. Persistencia

- `account_transfers`
- `treasury_movements.transfer_group_id`

Do not reference current code files.

---

## 6. Dependencias

- jornada diaria abierta
- cuentas visibles para Secretaría
- contratos `Create account transfer`
