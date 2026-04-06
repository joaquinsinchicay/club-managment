# PDD — US-11 · Registro de movimientos diarios

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E03 · Tesorería |
| User Story | Como Secretaria del club, quiero registrar movimientos diarios, para imputar correctamente ingresos y egresos en las cuentas del club durante una jornada abierta. |
| Prioridad | Alta |
| Objetivo de negocio | Permitir la carga básica de ingresos y egresos del día dentro de una jornada abierta, respetando validaciones mínimas de cuenta, categoría, moneda e importe. |

---

## 2. Problema a resolver

Una vez abierta la jornada, Secretaría necesita registrar movimientos del día en cuentas del club. Sin un formulario operativo y validado, la jornada carece de utilidad real.

---

## 3. Objetivo funcional

El dashboard debe habilitar un formulario de carga de movimientos solo cuando exista una jornada abierta del día en el club activo. El formulario debe validar campos obligatorios y registrar el movimiento asociado a la jornada y al usuario responsable.

---

## 4. Alcance

### Incluye
- Formulario de registro de movimientos para Secretaría.
- Fecha visible y no editable.
- Validaciones de cuenta, tipo, categoría, concepto, moneda e importe.
- Alta de movimiento asociado a jornada abierta.
- Confirmación de éxito y actualización del dashboard.

### No incluye
- Campos dinámicos por categoría.
- Recibos, actividades o eventos.
- Edición o cancelación de movimientos.

---

## 5. Actor principal

Usuario autenticado con membership `activo` y rol `secretaria` en el club activo.

---

## 6. Precondiciones

- Existe una jornada abierta para el día actual y club activo.
- Existen cuentas y categorías válidas para el club activo.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Formulario completo y válido | Se crea un movimiento `pending_consolidation` asociado a la jornada. |
| Jornada no abierta | No se permite registrar movimientos. |
| Falta un campo obligatorio | No se persiste el movimiento y se informa el error. |
| Importe no positivo | No se persiste el movimiento. |

---

## 8. Reglas de negocio

- Solo `secretaria` puede usar este formulario en este bloque.
- El movimiento debe pertenecer al club activo.
- Debe existir jornada `open` del día.
- `movement_date` se fija al día actual y no es editable.
- `amount` debe ser mayor a cero.
- La cuenta y categoría deben pertenecer al club activo.
- La moneda debe ser válida para la cuenta elegida.
- El movimiento resultante queda en `pending_consolidation`.

---

## 9. Flujo principal

1. Secretaría entra al dashboard con jornada abierta.
2. La UI muestra el formulario de registro.
3. El usuario completa cuenta, tipo, categoría, concepto, moneda e importe.
4. Envía el formulario.
5. El backend valida datos y jornada abierta.
6. El sistema crea el movimiento y refresca la card con saldos actualizados.

---

## 10. Flujos alternativos

### A. Intento sin jornada abierta

1. El usuario intenta registrar movimiento sin jornada `open`.
2. El backend rechaza la acción.
3. La UI muestra mensaje indicando que debe abrir la jornada.

### B. Validación fallida

1. Falta un campo obligatorio o el importe es inválido.
2. El sistema no crea el movimiento.
3. La UI muestra feedback específico.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- El formulario debe estar disponible solo cuando tenga sentido operativo.
- La fecha debe verse completa y bloqueada.
- Los campos deben ser simples y legibles en mobile.
- Debe existir acción de reset del formulario.
- No debe haber textos hardcodeados.

---

## 12. Mensajes y textos

### Fuente de verdad
- `lib/texts.json`

### Reglas
- No hardcoded strings are allowed.
- All user-facing texts must map to `lib/texts.json`.

### Keys requeridas

| Tipo | Key | Contexto |
|---|---|---|
| title | `dashboard.treasury.movement_form_title` | Título del formulario. |
| body | `dashboard.treasury.movement_form_description` | Descripción del formulario. |
| label | `dashboard.treasury.date_label` | Campo fecha. |
| label | `dashboard.treasury.account_label` | Campo cuenta. |
| label | `dashboard.treasury.movement_type_label` | Campo tipo. |
| label | `dashboard.treasury.category_label` | Campo categoría. |
| label | `dashboard.treasury.concept_label` | Campo concepto. |
| label | `dashboard.treasury.currency_label` | Campo moneda. |
| label | `dashboard.treasury.amount_label` | Campo importe. |
| action | `dashboard.treasury.create_cta` | Crear movimiento. |
| action | `dashboard.treasury.reset_cta` | Borrar formulario. |
| feedback | `dashboard.feedback.movement_created` | Alta exitosa. |
| feedback | `dashboard.feedback.session_required` | Error sin jornada abierta. |
| feedback | `dashboard.feedback.amount_must_be_positive` | Importe inválido. |

---

## 13. Persistencia

### Entidades afectadas
- `treasury_movements`: INSERT para el alta del movimiento; READ para recomputar saldos de la card.
- `daily_cash_sessions`: READ para validar jornada abierta y vincular el movimiento.
- `treasury_accounts`: READ para validar cuenta y moneda.
- `treasury_categories`: READ para validar categoría.

Do not reference current code files.

---

## 14. Seguridad

- Solo `secretaria` del club activo puede registrar movimientos en este bloque.
- El backend debe validar club activo, cuenta y categoría del mismo club.
- La fecha del movimiento no debe confiarse al frontend en este flujo.
- No debe permitirse carga de movimientos fuera de una jornada abierta.

---

## 15. Dependencias

- contracts: `Get movement form config`, `Create treasury movement`.
- domain entities: `treasury_movements`, `daily_cash_sessions`, `treasury_accounts`, `treasury_categories`.
- other US if relevant: US-10 para estado de jornada; US-12 para exposición del resultado en dashboard.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Crear movimientos sin jornada activa | Media | Alta | Validar jornada `open` antes del insert. |
| Registrar movimientos en cuenta o categoría inválida | Media | Alta | Validar contra catálogos del club activo. |
| Permitir importes cero o negativos | Media | Media | Validar `amount > 0` antes de persistir. |

