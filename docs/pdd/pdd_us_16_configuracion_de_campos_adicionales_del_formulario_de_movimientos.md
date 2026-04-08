# PDD — US-16 · Configuración de campos adicionales del formulario de movimientos

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E03 · Tesorería |
| User Story | Como Admin del club, quiero configurar la visibilidad y obligatoriedad de los campos adicionales del formulario de movimientos, para adaptar la carga de Secretaria a la operatoria del club. |
| Prioridad | Alta |
| Objetivo de negocio | Permitir que cada club adapte la carga operativa diaria de Secretaría según su operatoria real, sin imponer campos irrelevantes ni permitir guardados incompletos. |

---

## 2. Problema a resolver

La carga diaria de movimientos hoy expone siempre los mismos campos adicionales. Eso genera formularios poco precisos para algunos clubes y no permite exigir información clave según la categoría del movimiento.

---

## 3. Objetivo funcional

Desde `Configuración del club > Tesorería`, un usuario `admin` del club activo debe poder definir, por categoría, si los campos `Actividad`, `Recibo` y `Calendario` se muestran y si además son obligatorios. Secretaría debe ver esas reglas reflejadas en el formulario manual de movimientos.

---

## 4. Alcance

### Incluye
- Sección de configuración de campos adicionales dentro de la solapa `Tesorería`.
- Configuración por categoría para `Actividad`, `Recibo` y `Calendario`.
- Reglas `visible` y `obligatorio`.
- Validación de que un campo no pueda ser obligatorio si no es visible.
- Impacto inmediato en el formulario manual de movimientos de Secretaría.
- Validación server-side para bloquear guardados incompletos.
- Uso de eventos del club habilitados para tesorería al mostrar el campo `Calendario`.

### No incluye
- Sincronización de Google Calendar ni alta/edición de eventos.
- Reglas dinámicas para el formulario de Tesorería.
- Nuevos campos adicionales fuera de `Actividad`, `Recibo` y `Calendario`.

---

## 5. Actor principal

Usuario autenticado con membership `activo` y rol `admin` en el club activo.

---

## 6. Precondiciones

- El club activo está resuelto.
- Existen categorías de tesorería del club activo.
- Secretaría ya puede registrar movimientos manuales.
- Existen eventos del club con marca `is_enabled_for_treasury` para que el campo `Calendario` tenga opciones operativas cuando corresponda.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Admin guarda reglas válidas | Las reglas quedan persistidas para esa categoría y club. |
| Secretaría selecciona una categoría con campos visibles | El formulario muestra solo los campos configurados para esa categoría. |
| Secretaría omite un campo obligatorio | El sistema rechaza el guardado y muestra feedback. |
| Admin cambia de club activo | Las reglas visibles y editables corresponden solo al club actual. |

---

## 8. Reglas de negocio

- Solo `admin` puede guardar reglas de campos adicionales.
- La configuración se guarda por `club_id + category_id + field_name`.
- Los únicos campos soportados en esta historia son `activity`, `receipt` y `calendar`.
- Un campo no puede ser `required` si no es `visible`.
- La ausencia de regla para una categoría implica que el campo no se muestra.
- El impacto de las reglas aplica únicamente al formulario manual de Secretaría.
- Si `Actividad` es obligatoria, el movimiento no puede guardarse sin `activity_id`.
- Si `Recibo` es obligatorio, el movimiento no puede guardarse sin `receipt_number`.
- Si `Calendario` es obligatorio, el movimiento no puede guardarse sin `calendar_event_id`.
- Si se informa `calendar_event_id`, el evento debe pertenecer al club activo y estar habilitado para tesorería.
- La configuración no debe afectar otros clubes del mismo usuario.

---

## 9. Flujo principal

1. Un admin entra a `Configuración del club`.
2. Abre la solapa `Tesorería`.
3. Ve una sección `Campos adicionales por categoría`.
4. Para cada categoría, define visibilidad y obligatoriedad de `Actividad`, `Recibo` y `Calendario`.
5. El sistema valida la combinación y persiste las reglas.
6. Secretaría abre el formulario manual de movimientos.
7. Al elegir una categoría, el formulario muestra los campos adicionales configurados para esa categoría.
8. Si alguno es obligatorio y falta, el sistema bloquea el guardado.

---

## 10. Flujos alternativos

### A. Usuario no admin intenta guardar reglas

1. Un usuario sin rol `admin` intenta mutar la configuración.
2. El sistema rechaza la operación con feedback de permisos.

### B. Regla inválida

1. El admin intenta dejar un campo obligatorio sin marcarlo visible.
2. El sistema rechaza la operación con feedback específico.

### C. Evento inválido

1. Secretaría intenta guardar un movimiento con un `calendar_event_id` inexistente o no habilitado.
2. El sistema rechaza el guardado.

---

## 11. UI / UX

### Reglas
- La sección debe vivir dentro de `Configuración del club > Tesorería`.
- La configuración debe presentarse agrupada por categoría.
- Cada categoría debe mostrar los tres campos configurables con toggles de `Visible` y `Obligatorio`.
- Si `Visible` está apagado, `Obligatorio` debe quedar deshabilitado o apagado.
- El formulario de Secretaría debe reaccionar a la categoría elegida sin requerir navegación adicional.
- El feedback post-acción debe resolverse por toast.
- Las validaciones propias del formulario pueden seguir siendo nativas o inline si corresponden al campo activo.

---

## 12. Mensajes y textos

### Fuente de verdad
- `lib/texts.json`

### Keys requeridas

| Tipo | Key | Contexto |
|---|---|---|
| title | `settings.club.treasury.additional_fields_title` | Título de la sección. |
| body | `settings.club.treasury.additional_fields_description` | Descripción general. |
| label | `settings.club.treasury.additional_field_names.activity` | Nombre del campo Actividad. |
| label | `settings.club.treasury.additional_field_names.receipt` | Nombre del campo Recibo. |
| label | `settings.club.treasury.additional_field_names.calendar` | Nombre del campo Calendario. |
| label | `settings.club.treasury.additional_field_visible_label` | Toggle visible. |
| label | `settings.club.treasury.additional_field_required_label` | Toggle obligatorio. |
| action | `settings.club.treasury.save_field_rules_cta` | Guardado de reglas. |
| status | `settings.club.treasury.save_field_rules_loading` | Estado mientras guarda. |
| feedback | `settings.club.treasury.feedback.field_rules_updated` | Guardado exitoso. |
| feedback | `settings.club.treasury.feedback.field_rule_category_not_found` | Categoría inexistente. |
| feedback | `settings.club.treasury.feedback.field_rule_invalid` | Combinación inválida. |
| label | `dashboard.treasury.calendar_label` | Campo calendario en el formulario. |
| label | `dashboard.treasury.calendar_placeholder` | Placeholder de calendario. |
| feedback | `dashboard.feedback.activity_required` | Falta actividad obligatoria. |
| feedback | `dashboard.feedback.receipt_required` | Falta recibo obligatorio. |
| feedback | `dashboard.feedback.calendar_required` | Falta calendario obligatorio. |
| feedback | `dashboard.feedback.invalid_calendar_event` | Evento inválido. |

---

## 13. Persistencia

### Entidades afectadas
- `treasury_field_rules`: READ, DELETE e INSERT por categoría.
- `club_calendar_events`: READ para poblar el selector de calendario.
- `treasury_movements`: uso de `calendar_event_id` en guardado manual de Secretaría.

Do not reference current code files.

---

## 14. Seguridad

- La lectura y mutación deben limitarse al club activo.
- Solo `admin` puede guardar reglas de campos adicionales.
- Secretaría solo consume reglas del club activo y no puede mutarlas.
- No debe ser posible usar ids de categoría o evento de otro club.

---

## 15. Dependencias

- contracts: `Get treasury settings`, `Set field rules by category`, `Create treasury movement`.
- domain entities: `treasury_field_rules`, `club_calendar_events`, `treasury_movements`.
- other US: US-11 para registro de movimientos, US-15 para categorías, US-20 para actividades, US-22 para disponibilidad de eventos.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Reglas inconsistentes por categoría | Media | Media | Validar server-side que `required` implique `visible`. |
| Diferencias entre UI y persistencia | Media | Alta | Resolver la visibilidad en cliente, pero validar nuevamente en server al guardar movimientos. |
| Usar eventos de otro club | Baja | Alta | Filtrar y validar siempre por club activo y flag de tesorería. |
