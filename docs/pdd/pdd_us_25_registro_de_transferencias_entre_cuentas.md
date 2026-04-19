# PDD — US-25 · Registro de transferencias entre cuentas

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E03 · Tesorería |
| User Story | Como Secretaria o Tesorería del club, quiero registrar transferencias entre cuentas de la misma moneda, para reflejar correctamente traspasos internos sin cargar movimientos duplicados manualmente. |
| Prioridad | Alta |
| Objetivo de negocio | Permitir registrar transferencias internas con trazabilidad común y sin tratarlas como ingresos o egresos externos del club. |

---

## 2. Objetivo funcional

Secretaría y Tesorería deben disponer de un formulario específico para registrar una transferencia interna entre dos cuentas del club activo en una misma moneda. Al confirmar, el sistema debe generar automáticamente un egreso en la cuenta origen y un ingreso en la cuenta destino, ambos asociados a la misma referencia de transferencia.

---

## 3. Alcance

### Incluye
- Modal específico de transferencia abierto desde el dashboard de Secretaría y desde el dashboard de Tesorería.
- Validaciones de cuentas distintas, moneda compatible e importe positivo. Jornada abierta requerida sólo cuando el rol operador es `secretaria`.
- Filtrado de cuentas dependiente del rol operador:
  - `secretaria`:
    - cuenta origen: visible para `secretaria`
    - cuenta destino: visible para otros roles operativos y no visible para `secretaria`
  - `tesoreria`:
    - cuenta origen: visible para `tesoreria`
    - cuenta destino: cualquier cuenta del club distinta a la cuenta origen
- Control cliente del formulario:
  - campos obligatorios marcados
  - CTA de creación deshabilitada hasta completar obligatorios
  - moneda autoseleccionada según cuenta origen
  - validación inline sobre cuenta destino si la moneda no es compatible
  - importe con el mismo comportamiento de ingreso que el formulario de movimientos
  - cierre inmediato del modal al enviar
  - overlay bloqueante de pantalla hasta que el dashboard refresque la transferencia creada
- Creación de un registro de transferencia interna.
- Generación automática de dos movimientos asociados a la misma referencia.
- Visualización de la referencia de transferencia en el detalle del movimiento.

### No incluye
- Transferencias entre distintas monedas.
- Comisiones o gastos asociados a la transferencia.
- Reversión o anulación de transferencias.

---

## 4. Reglas de negocio

- `secretaria` y `tesoreria` pueden registrar transferencias.
- Requiere jornada abierta únicamente si el rol operador es `secretaria`. `tesoreria` no depende de jornada.
- La cuenta origen y la cuenta destino deben pertenecer al club activo.
- Reglas de visibilidad de cuentas por rol operador:
  - `secretaria`: la cuenta origen debe ser visible para `secretaria`; la cuenta destino debe ser visible para otros roles operativos y no visible para `secretaria`.
  - `tesoreria`: la cuenta origen debe ser visible para `tesoreria`; la cuenta destino puede ser cualquier cuenta del club distinta a la cuenta origen.
- El campo `origin_role` de los movimientos generados refleja el rol que ejecutó la transferencia (`secretaria` o `tesoreria`).
- Las cuentas deben ser distintas.
- La moneda seleccionada debe ser válida para ambas cuentas.
- La moneda debe autocompletarse a partir de la cuenta origen con la misma regla usada en el alta de movimientos.
- Si la cuenta destino no soporta la moneda seleccionada, el formulario debe mostrar error inline en ese campo y bloquear la creación.
- El importe debe ser mayor a cero.
- La cuenta origen debe tener saldo disponible suficiente en la moneda seleccionada.
- La operación nunca puede dejar saldo negativo en la cuenta origen para la moneda seleccionada.
- La operación genera dos movimientos:
  - egreso en la cuenta origen
  - ingreso en la cuenta destino
- Ambos movimientos comparten una misma referencia de transferencia.
- La operación debe considerarse transferencia interna y no ingreso/egreso externo.
- La creación debe ejecutarse de forma transaccional para evitar estados parciales.
- El feedback final debe mostrarse en toast, luego de liberar el overlay bloqueante.

---

## 5. Persistencia

- `account_transfers`
- `treasury_movements.transfer_group_id`
- La escritura remota debe resolverse mediante un RPC club-scoped transaccional que cree la transferencia y ambos movimientos dentro de la misma operación.

Do not reference current code files.

---

## 6. Dependencias

- jornada diaria abierta (sólo cuando el rol operador es `secretaria`)
- reglas de visibilidad de cuentas dependientes del rol operador (ver §4)
- contratos `Create account transfer`
