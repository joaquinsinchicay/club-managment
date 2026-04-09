# PDD — US-19 · Vinculación de movimientos con actividad del club

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E03 · Tesorería |
| User Story | Como Secretaria del club, quiero asociar un movimiento a una actividad del club, para identificar a qué disciplina corresponde el ingreso o egreso. |
| Prioridad | Alta |
| Objetivo de negocio | Mejorar la trazabilidad operativa para distinguir a qué disciplina deportiva corresponde cada movimiento manual de Secretaría. |

---

## 2. Problema a resolver

La carga manual ya puede consumir actividades visibles del club como dato opcional, pero faltaba consolidar el flujo completo para que la selección se refleje en el detalle del movimiento.

---

## 3. Objetivo funcional

Secretaría debe poder vincular un movimiento manual con una actividad del club activo. La actividad elegida debe persistirse en el movimiento y mostrarse luego en el detalle de la cuenta.

---

## 4. Alcance

### Incluye
- Campo `Actividad` opcional en el formulario manual.
- Selección desde actividades visibles del club activo para el rol que opera.
- Persistencia de `activity_id` en el movimiento.
- Visualización de la actividad en el detalle del movimiento.

### No incluye
- Alta o edición de actividades.
- Asociación múltiple de actividades a un mismo movimiento.
- Cambios sobre el formulario de Tesorería.

---

## 5. Actor principal

Usuario autenticado con membership `activo` y rol `secretaria` en el club activo.

---

## 6. Precondiciones

- Existe una jornada abierta para registrar movimientos.
- El club activo tiene actividades configuradas.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Secretaría guarda un movimiento con actividad válida | El movimiento queda registrado con `activity_id`. |
| Se consulta el detalle del movimiento | La actividad asociada se muestra si existe. |

---

## 8. Reglas de negocio

- El campo `Actividad` está disponible como dato opcional del formulario manual.
- Solo se pueden seleccionar actividades visibles para el rol activo dentro del club activo.
- Actividades sin visibilidad para el rol activo no deben aparecer en el selector.
- Si se informa `activity_id`, debe pertenecer al club activo y estar visible para el rol que opera.
- La actividad asociada se muestra en el detalle del movimiento cuando existe.

---

## 9. Flujo principal

1. Secretaría abre el formulario manual de movimientos.
2. Selecciona una actividad visible para su rol dentro del club.
3. Guarda el movimiento.
4. El sistema persiste `activity_id`.
5. En el detalle de la cuenta, el movimiento muestra la actividad vinculada.

---

## 10. Flujos alternativos

### A. Actividad inválida

1. Secretaría informa una actividad inexistente o no visible para su rol.
2. El sistema rechaza el guardado.

---

## 11. UI / UX

- El selector de actividad está disponible en el formulario manual como dato opcional.
- Debe listar únicamente actividades visibles para el rol activo dentro del club activo.
- El detalle del movimiento debe exponer la actividad de forma simple, sin añadir una vista nueva.

---

## 12. Mensajes y textos

### Fuente de verdad
- `lib/texts.json`

### Keys requeridas

| Tipo | Key | Contexto |
|---|---|---|
| label | `dashboard.treasury.activity_label` | Campo actividad en el formulario. |
| placeholder | `dashboard.treasury.activity_placeholder` | Opción vacía del selector. |
| feedback | `dashboard.feedback.invalid_activity` | Actividad inválida o no visible para el rol. |
| label | `dashboard.treasury.detail_activity_label` | Actividad mostrada en el detalle del movimiento. |

---

## 13. Persistencia

### Entidades afectadas
- `treasury_movements`: uso de `activity_id`.
- `club_activities`: lectura del catálogo visible del club para el rol activo.

Do not reference current code files.

---

## 14. Seguridad

- Secretaría solo puede seleccionar actividades del club activo.
- La validación final del `activity_id` debe resolverse server-side.
- No debe poder asociarse una actividad de otro club por manipulación del formulario.

---

## 15. Dependencias

- US-20 para el catálogo de actividades del club.
- US-11 para el registro de movimientos.
- US-13 para la vista de detalle.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Mostrar actividades no visibles para el rol | Media | Media | Filtrar por visibilidad antes de renderizar opciones. |
| Perder trazabilidad en detalle | Baja | Media | Mostrar la actividad guardada en el detalle del movimiento. |
