# PDD — US-26 · Registro de compra y venta de moneda extranjera

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E03 · Tesorería |
| User Story | Como Secretaria del club, quiero registrar operaciones de compra y venta de moneda entre cuentas de distinta moneda, para reflejar correctamente conversiones de fondos y su impacto en los saldos del club. |
| Prioridad | Alta |
| Objetivo de negocio | Registrar conversiones internas entre monedas con trazabilidad común y sin tratarlas como ingresos o egresos externos. |

---

## 2. Objetivo funcional

Secretaría debe poder registrar una operación de cambio entre dos cuentas del club activo usando monedas distintas. El sistema debe generar automáticamente dos movimientos asociados a una misma referencia de operación FX.

---

## 3. Alcance

### Incluye
- Formulario específico de compra/venta de moneda en el dashboard de Secretaría.
- Validaciones de jornada abierta, cuentas distintas, monedas distintas y montos positivos.
- Creación de la operación de cambio.
- Generación automática de dos movimientos asociados.
- Visualización de la referencia FX en el detalle del movimiento.

### No incluye
- Cálculo automático del tipo de cambio.
- Comisiones, spreads o gastos asociados.
- Reversión de operaciones de cambio.

---

## 4. Reglas de negocio

- Solo `secretaria` puede registrar la operación.
- Requiere jornada abierta.
- La cuenta origen y la cuenta destino deben pertenecer al club activo.
- Las cuentas deben ser distintas.
- La moneda origen y la moneda destino deben ser distintas.
- Cada moneda debe ser válida para la cuenta correspondiente.
- Ambos importes deben ser mayores a cero.
- La operación genera:
  - egreso por el importe origen en la cuenta origen
  - ingreso por el importe destino en la cuenta destino
- Ambos movimientos comparten una misma referencia de operación FX.
- La operación debe identificarse como conversión interna.

---

## 5. Persistencia

- `fx_operations`
- `treasury_movements.fx_operation_group_id`

Do not reference current code files.

---

## 6. Dependencias

- jornada diaria abierta
- cuentas visibles para Secretaría
- contratos `Create fx operation`
