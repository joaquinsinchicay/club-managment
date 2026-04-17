# PDD — US-11 · Registro de movimientos diarios

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E03 · Tesorería |
| User Story | Como Secretaria del club, quiero registrar movimientos diarios, para imputar correctamente ingresos y egresos en las cuentas del club durante una jornada abierta. |
| Prioridad | Alta |
| Objetivo de negocio | Permitir la carga básica de ingresos y egresos del día dentro de una jornada abierta, usando el catálogo fijo del sistema para tipos de movimiento y subcategorías operativas, y respetando validaciones mínimas de cuenta, subcategoría, moneda e importe. |

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
- Validaciones de cuenta, tipo, subcategoría, concepto, moneda e importe.
- Alta de movimiento asociado a jornada abierta.
- Edición de movimientos de la jornada abierta desde el dashboard.
- Confirmación de éxito y actualización del dashboard.

### No incluye
- Campos dinámicos por categoría.
- Cancelación de movimientos.

---

## 5. Actor principal

Usuario autenticado con membership `activo` y rol `secretaria` en el club activo.

---

## 6. Precondiciones

- Existe una jornada abierta para el día actual y club activo.
- Existen cuentas y categorías válidas para el club activo.
- El catálogo fijo del sistema expone los tipos `Ingreso` y `Egreso`.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Formulario completo y válido | Se crea un movimiento `pending_consolidation` asociado a la jornada. |
| Formulario enviado correctamente | El modal se cierra, la pantalla queda bloqueada con loader y se libera al resolverse el alta. |
| Jornada no abierta | No se permite registrar movimientos. |
| Falta un campo obligatorio | No se persiste el movimiento y se informa el error. |
| Importe no positivo | No se persiste el movimiento. |
| Egreso superior al saldo disponible | No se persiste el movimiento ni la edición. |

---

## 8. Reglas de negocio

- Solo `secretaria` puede usar este formulario en este bloque.
- El movimiento debe pertenecer al club activo.
- Debe existir jornada `open` del día.
- `movement_date` se fija al día actual y no es editable.
- El campo `Tipo` usa siempre el catálogo fijo del sistema `Ingreso` y `Egreso`.
- `amount` debe ser mayor a cero.
- La cuenta debe pertenecer al club activo y tener visibilidad `secretaria`.
- La subcategoría debe pertenecer al club activo.
- La moneda debe ser válida para la cuenta elegida.
- Si el movimiento es `egreso`, la cuenta debe tener saldo disponible suficiente en la moneda seleccionada.
- El movimiento resultante queda en `pending_consolidation`.
- Mientras la jornada siga `open`, Secretaría puede editar los campos operativos del movimiento.
- La edición no puede dejar saldo negativo en la cuenta y moneda afectadas.
- `movement_display_id` y `movement_date` permanecen read-only en edición.

---

## 9. Flujo principal

1. Secretaría entra al dashboard con jornada abierta.
2. La UI muestra el formulario de registro.
3. El usuario completa cuenta, tipo, subcategoría, concepto, moneda e importe.
4. Envía el formulario.
5. El modal se cierra de inmediato y la pantalla queda bloqueada con un loader mientras la mutación sigue pendiente.
6. El backend valida datos y jornada abierta.
7. El sistema crea el movimiento, refresca la card con saldos actualizados y muestra el resultado final mediante toast.

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

### C. Saldo insuficiente para un egreso

1. El usuario intenta registrar o editar un `egreso` por encima del saldo disponible de la cuenta.
2. El backend rechaza la acción.
3. La UI muestra un toast indicando que la cuenta no tiene saldo suficiente.

### D. Edición de movimiento durante jornada abierta

1. Secretaría selecciona editar un movimiento visible de la jornada.
2. La UI abre un modal con datos precargados.
3. El usuario puede modificar todos los campos operativos salvo identificador y fecha.
4. El backend valida jornada abierta, pertenencia al club y reglas del formulario.
5. El sistema actualiza el movimiento, audita el cambio y refresca el dashboard.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- El formulario debe estar disponible solo cuando tenga sentido operativo.
- La fecha debe verse completa y bloqueada.
- El campo `Tipo` debe mostrar siempre `Ingreso` y `Egreso`.
- Los campos deben ser simples y legibles en mobile.
- Debe existir acción de reset solo en el formulario de alta.
- En este flujo puntual, la creación iniciada desde modal puede usar un overlay bloqueante de pantalla como excepción válida al loading local general.
- Al confirmar `Crear`, el modal debe cerrarse inmediatamente y el dashboard debe quedar no interactivo hasta que finalice la creación.
- Los movimientos de la jornada abierta deben exponer CTA de edición desde el dashboard.
- El modal de edición debe precargar valores, mostrar `movement_display_id` y fecha como read-only, mantener read-only las referencias técnicas derivadas si existen, y no debe exponer la acción `Borrar formulario`.
- No debe haber textos hardcodeados.

---

## 12. Mensajes y textos

### Fuente de verdad
- `lib/texts.json`

### Reglas
- No hardcoded strings are allowed.
- All user-facing texts must map to `lib/texts.json`.
- Al enviar el formulario, el CTA debe entrar en loading de inmediato y el formulario debe quedar bloqueado hasta resolver.
- Cuando la acción se dispara desde el modal del dashboard, el estado pending debe representarse con un loader bloqueante de pantalla.
- El resultado final del alta debe mostrarse mediante toast.

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
| status | `dashboard.treasury.create_loading` | Estado visible mientras se registra el movimiento. |
| action | `dashboard.treasury.edit_movement_cta` | Editar movimiento. |
| title | `dashboard.treasury.edit_form_title` | Título del modal de edición. |
| body | `dashboard.treasury.edit_form_description` | Descripción del modal de edición. |
| label | `dashboard.treasury.movement_id_label` | Identificador visible del movimiento en read-only. |
| action | `dashboard.treasury.update_cta` | Guardar cambios. |
| status | `dashboard.treasury.update_loading` | Estado visible mientras se actualiza el movimiento. |
| action | `dashboard.treasury.reset_cta` | Borrar formulario en el modal de alta. |
| feedback | `dashboard.feedback.movement_created` | Alta exitosa. |
| feedback | `dashboard.feedback.movement_updated` | Edición exitosa. |
| feedback | `dashboard.feedback.movement_not_editable` | Error de edición fuera de jornada abierta o fuera de alcance. |
| feedback | `dashboard.feedback.session_required` | Error sin jornada abierta. |
| feedback | `dashboard.feedback.amount_must_be_positive` | Importe inválido. |
| feedback | `dashboard.feedback.insufficient_funds` | Saldo insuficiente para registrar o editar un egreso. |

---

## 13. Persistencia

### Entidades afectadas
- `treasury_movements`: INSERT para el alta del movimiento; READ para recomputar saldos de la card.
- La lectura y escritura de `treasury_movements` en base remota debe ejecutarse con RPCs club-scoped que seteen `app.current_club_id` server-side antes de aplicar RLS.
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
- other US if relevant: US-10 para estado de jornada; US-12 para exposición del resultado en dashboard; US-24 para visualización del catálogo fijo en settings.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Crear movimientos sin jornada activa | Media | Alta | Validar jornada `open` antes del insert. |
| Registrar movimientos en cuenta o categoría inválida | Media | Alta | Validar contra catálogos del club activo. |
| Permitir importes cero o negativos | Media | Media | Validar `amount > 0` antes de persistir. |
| Permitir egresos que dejen saldo negativo | Media | Alta | Validar saldo disponible antes de crear o editar el movimiento. |
