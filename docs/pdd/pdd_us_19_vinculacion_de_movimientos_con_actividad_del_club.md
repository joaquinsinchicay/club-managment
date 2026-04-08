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

La carga manual ya puede consumir actividades activas del club y las reglas por categoría pueden exigir el campo `Actividad`, pero faltaba consolidar el flujo completo para que la selección se refleje en el detalle del movimiento y el cambio de categoría limpie correctamente el valor previo cuando deja de aplicar.

---

## 3. Objetivo funcional

Secretaría debe poder vincular un movimiento manual con una actividad del club activo cuando la categoría lo requiera. La actividad elegida debe persistirse en el movimiento y mostrarse luego en el detalle de la cuenta.

---

## 4. Alcance

### Incluye
- Reutilización de la configuración por categoría del campo `Actividad`.
- Selección desde actividades activas del club activo.
- Validación de obligatoriedad al guardar.
- Persistencia de `activity_id` en el movimiento.
- Visualización de la actividad en el detalle del movimiento.
- Limpieza del valor seleccionado cuando la categoría deja de requerir actividad.

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
- La configuración de campos adicionales puede marcar `Actividad` como visible u obligatoria por categoría.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Secretaría guarda un movimiento con actividad válida | El movimiento queda registrado con `activity_id`. |
| Secretaría cambia a una categoría sin actividad | El campo deja de mostrarse y el valor previo se limpia. |
| Se consulta el detalle del movimiento | La actividad asociada se muestra si existe. |

---

## 8. Reglas de negocio

- La visibilidad del campo `Actividad` depende de las reglas por categoría.
- La obligatoriedad del campo `Actividad` depende de las reglas por categoría.
- Solo se pueden seleccionar actividades `active` del club activo.
- Actividades inactivas no deben aparecer para Secretaría.
- Si la categoría deja de requerir actividad, el valor previamente seleccionado no debe conservarse.
- Si se informa `activity_id`, debe pertenecer al club activo y estar activa.
- La actividad asociada se muestra en el detalle del movimiento cuando existe.

---

## 9. Flujo principal

1. Secretaría abre el formulario manual de movimientos.
2. Selecciona una categoría.
3. Si la categoría tiene `Actividad` visible, el formulario muestra el selector.
4. Secretaría selecciona una actividad activa del club.
5. Guarda el movimiento.
6. El sistema persiste `activity_id`.
7. En el detalle de la cuenta, el movimiento muestra la actividad vinculada.

---

## 10. Flujos alternativos

### A. Categoría sin actividad

1. Secretaría selecciona una categoría que no usa `Actividad`.
2. El campo no se muestra.

### B. Actividad obligatoria faltante

1. Secretaría selecciona una categoría que exige actividad.
2. Intenta guardar sin seleccionar una.
3. El sistema rechaza el guardado.

### C. Cambio de categoría

1. Secretaría había seleccionado una actividad.
2. Cambia la categoría por otra que no muestra actividad.
3. El valor seleccionado se limpia y no se envía en el submit.

---

## 11. UI / UX

- El selector de actividad se muestra solo cuando la categoría lo requiere.
- Debe listar únicamente actividades activas del club activo.
- Al cambiar a una categoría que no usa actividad, el selector debe desaparecer y su valor resetearse.
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
| feedback | `dashboard.feedback.activity_required` | Actividad obligatoria faltante. |
| feedback | `dashboard.feedback.invalid_activity` | Actividad inválida o inactiva. |
| label | `dashboard.treasury.detail_activity_label` | Actividad mostrada en el detalle del movimiento. |

---

## 13. Persistencia

### Entidades afectadas
- `treasury_movements`: uso de `activity_id`.
- `treasury_field_rules`: lectura de regla `activity`.
- `club_activities`: lectura del catálogo activo del club.

Do not reference current code files.

---

## 14. Seguridad

- Secretaría solo puede seleccionar actividades del club activo.
- La validación final del `activity_id` debe resolverse server-side.
- No debe poder asociarse una actividad de otro club por manipulación del formulario.

---

## 15. Dependencias

- US-16 para reglas de visibilidad/obligatoriedad por categoría.
- US-20 para el catálogo de actividades del club.
- US-11 para el registro de movimientos.
- US-13 para la vista de detalle.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Mostrar actividades inactivas | Media | Media | Filtrar por `status = active` antes de renderizar opciones. |
| Mantener un valor obsoleto al cambiar de categoría | Media | Media | Resetear el valor local cuando la categoría deje de requerir actividad. |
| Perder trazabilidad en detalle | Baja | Media | Mostrar la actividad guardada en el detalle del movimiento. |
