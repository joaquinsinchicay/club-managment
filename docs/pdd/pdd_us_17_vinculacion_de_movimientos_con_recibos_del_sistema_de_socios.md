# PDD — US-17 · Vinculación de movimientos con recibos del sistema de socios

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E03 · Tesorería |
| User Story | Como Secretaria del club, quiero asociar un movimiento a un número de recibo del sistema de socios, para vincular correctamente el ingreso o egreso con su comprobante correspondiente. |
| Prioridad | Alta |
| Objetivo de negocio | Garantizar trazabilidad operativa entre movimientos manuales de Secretaría y su comprobante del sistema de socios. |

---

## 2. Problema a resolver

La operatoria diaria ya permite registrar movimientos y la configuración por categoría puede exigir el campo `Recibo`, pero la historia necesita consolidar ese flujo como comportamiento explícito: mostrar el campo cuando corresponde, bloquear el guardado si es obligatorio y exponer el valor guardado en el detalle.

---

## 3. Objetivo funcional

Cuando una categoría tenga configurado el campo `Recibo`, Secretaría debe poder informar un número válido de recibo al registrar el movimiento. Ese valor debe persistirse en el movimiento del club activo y verse luego en el detalle de la cuenta.

---

## 4. Alcance

### Incluye
- Reutilización de la configuración por categoría del campo `Recibo`.
- Validación de obligatoriedad en el guardado del movimiento.
- Validación del formato del recibo según la integración disponible del club.
- Persistencia de `receipt_number` en el movimiento.
- Visualización del número de recibo en el detalle del movimiento.

### No incluye
- Edición posterior del recibo una vez creado el movimiento.
- Búsqueda externa en el sistema de socios.
- Conciliación automática con cobranzas.

---

## 5. Actor principal

Usuario autenticado con membership `activo` y rol `secretaria` en el club activo.

---

## 6. Precondiciones

- Existe una jornada abierta para registrar movimientos.
- El club activo tiene categorías configuradas.
- La configuración de campos adicionales puede marcar `Recibo` como visible u obligatorio por categoría.
- Existe una integración/configuración de formatos de recibo válida para el club.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Secretaría registra un movimiento con recibo válido | El movimiento queda creado con `receipt_number`. |
| Secretaría intenta guardar sin recibo cuando es obligatorio | El sistema rechaza la operación. |
| Se consulta el detalle del movimiento | El recibo se muestra si existe. |

---

## 8. Reglas de negocio

- La visibilidad del campo `Recibo` depende de las reglas por categoría.
- La obligatoriedad del campo `Recibo` depende de las reglas por categoría.
- Si el campo no es visible para la categoría seleccionada, no debe mostrarse en el formulario.
- Si el campo es obligatorio y no se completa, el movimiento no se registra.
- Si se informa un recibo, debe cumplir el formato válido del club activo.
- El recibo queda asociado únicamente al movimiento del club activo.
- En el detalle del movimiento, el recibo solo se muestra si el movimiento tiene `receipt_number`.

---

## 9. Flujo principal

1. Secretaría abre el formulario manual de movimientos.
2. Selecciona una categoría.
3. Si la categoría tiene `Recibo` visible, el formulario muestra el campo.
4. Secretaría ingresa un número válido y guarda el movimiento.
5. El sistema persiste el `receipt_number`.
6. Al consultar el detalle de la cuenta, el sistema muestra el recibo asociado.

---

## 10. Flujos alternativos

### A. Categoría sin recibo

1. Secretaría selecciona una categoría sin regla visible para `Recibo`.
2. El formulario no muestra el campo.

### B. Recibo obligatorio faltante

1. Secretaría selecciona una categoría que exige recibo.
2. Intenta guardar sin completar el campo.
3. El sistema rechaza la operación con feedback.

### C. Recibo inválido

1. Secretaría ingresa un número que no cumple el formato del club.
2. El sistema rechaza el guardado.

---

## 11. UI / UX

- El campo `Recibo` se muestra solo cuando la categoría lo requiere.
- Debe mantenerse el último valor ingresado hasta el submit o reset del formulario.
- El detalle del movimiento debe mostrar el recibo de forma simple y escaneable, sin abrir una pantalla nueva.
- Todo feedback post-acción debe seguir el patrón global de toast.

---

## 12. Mensajes y textos

### Fuente de verdad
- `lib/texts.json`

### Keys requeridas

| Tipo | Key | Contexto |
|---|---|---|
| label | `dashboard.treasury.receipt_label` | Campo de recibo en el formulario. |
| feedback | `dashboard.feedback.receipt_required` | Recibo obligatorio faltante. |
| feedback | `dashboard.feedback.invalid_receipt_format` | Recibo con formato inválido. |
| label | `dashboard.treasury.detail_receipt_label` | Recibo en el detalle del movimiento. |

---

## 13. Persistencia

### Entidades afectadas
- `treasury_movements`: uso de `receipt_number`.
- `treasury_field_rules`: lectura de regla `receipt`.
- `receipt_formats`: lectura de integración/configuración disponible para validar el número.

Do not reference current code files.

---

## 14. Seguridad

- Secretaría solo puede registrar movimientos del club activo.
- La validación del recibo debe resolverse server-side.
- No debe poder asociarse un recibo a un movimiento de otro club por manipulación de contexto.

---

## 15. Dependencias

- US-16 para la visibilidad/obligatoriedad por categoría.
- US-18 para el formato válido de recibos.
- US-11 para el registro de movimientos.
- US-13 para visualización del detalle de movimientos.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Mostrar el campo cuando no corresponde | Media | Media | Resolver la visibilidad según la regla de la categoría seleccionada. |
| Guardar recibos inválidos | Media | Alta | Validar server-side contra el formato disponible del club. |
| Perder trazabilidad en detalle | Baja | Media | Mostrar `receipt_number` en el detalle del movimiento cuando exista. |
