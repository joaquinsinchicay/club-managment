# PDD — US-53 · Asociación de movimientos a Centros de Costo

> Nota: esta US corresponde a **E03 · US-31 del Notion "Centro de Costos"**. Se numera como US-53 en el repo para mantener la continuidad del backlog existente y en coherencia con la numeración elegida para US-52 (Administración de CC). Fuente: Notion E03 — 💰 Centro de Costos.

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E03 · Tesorería |
| User Story | Como usuario con rol `tesoreria`, quiero asociar un movimiento a uno o más Centros de Costo al cargarlo o editarlo, para que el movimiento impacte en los reportes de cada CC relacionado. |
| Prioridad | Alta |
| Objetivo de negocio | Permitir que cada movimiento de Tesorería impacte en la ejecución de los Centros de Costo vigentes, habilitando indicadores de avance, badges de estado y trazabilidad por concepto (deuda, presupuesto, evento, sponsor, publicidad, jornada). |

---

## 2. Problema a resolver

Con los Centros de Costo ya administrables (US-52), Tesorería necesita el mecanismo operativo para vincular movimientos existentes y nuevos a uno o más CC. Sin esa asociación, el listado de CC no puede calcular avance ni levantar badges, y pierde sentido como herramienta de seguimiento.

---

## 3. Objetivo funcional

Desde el formulario de carga y edición de movimientos del módulo de Tesorería, un usuario con rol `tesoreria` debe disponer de un campo multiselect `Centros de Costo` que permita asociar el movimiento a cero, uno o más CC activos del club. La asociación impacta íntegramente sobre cada CC seleccionado (sin división del importe) y se refleja en tiempo real en los indicadores de avance y en la vista de detalle de cada CC. La desvinculación puede realizarse desde la edición del movimiento o desde el detalle del CC, sin borrar el movimiento. Toda modificación de enlaces queda registrada en el historial de auditoría del movimiento.

---

## 4. Alcance

### Incluye
- Campo multiselect `Centros de Costo` en el formulario de carga y edición de movimientos de Tesorería.
- Visibilidad del campo restringida al rol `tesoreria`.
- Filtrado del catálogo a CC del club activo con estado `activo`.
- Filtrado secundario por `Tipo` dentro del selector.
- Persistencia de la relación N:M entre movimiento y CC.
- Recalculo de indicadores de avance y badges del CC al asociar, desasociar o editar enlaces.
- Advertencia no bloqueante cuando la moneda del movimiento no coincide con la moneda del CC.
- Vista de movimientos enlazados en el detalle del CC con acción de desvinculación.
- Registro de la modificación de enlaces en el historial de auditoría del movimiento.

### No incluye
- División o prorrateo del importe entre múltiples CC (la imputación es completa a cada uno).
- Conversión automática de moneda al enlazar movimientos en moneda distinta al CC.
- Alta, edición o cierre de CC (cubierto por US-52).
- Visibilidad del campo para roles distintos de `tesoreria`.
- Reportes cruzados entre CC (con o sin doble conteo).
- Asociación automática a CC por reglas o por tipo de movimiento.

---

## 5. Actor principal

Usuario autenticado con membership `activo` y rol `tesoreria` en el club activo.

---

## 6. Precondiciones

- El club activo está resuelto.
- El usuario actual tiene rol `tesoreria` confirmado para el club activo.
- Existe al menos un CC creado para que el selector tenga opciones; si no existen, el campo se renderiza vacío y sin opciones disponibles.
- El movimiento a cargar o editar corresponde al club activo.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Tesorería guarda un movimiento sin seleccionar CC | El movimiento queda registrado sin enlaces a CC. |
| Tesorería guarda un movimiento con uno o más CC seleccionados | El movimiento queda enlazado a cada CC seleccionado. |
| Tesorería edita un movimiento y cambia la selección de CC | Los enlaces quedan sincronizados con la nueva selección y el cambio se registra en el historial del movimiento. |
| Tesorería desvincula un movimiento desde el detalle del CC | El enlace se elimina, el movimiento se preserva, el CC recalcula avance. |
| Los agregados de un CC se actualizan | Las KPI cards y los badges del listado de CC reflejan el nuevo estado en el próximo render. |
| Un CC pasa a estado `inactivo` | Deja de aparecer en el selector, pero los enlaces previos se conservan. |
| Un usuario con rol `secretaria` carga un movimiento | El campo `Centros de Costo` no se renderiza y no se persiste ningún enlace. |

---

## 8. Reglas de negocio

### Acceso y visibilidad
- El campo `Centros de Costo` se renderiza únicamente para usuarios con rol `tesoreria` del club activo.
- Para otros roles (ej: `secretaria`) el campo no se muestra en el formulario y los movimientos quedan sin enlaces.

### Catálogo del selector
- Solo se listan CC del club activo con estado `activo`.
- CC con estado `inactivo` no aparecen como opción seleccionable, aun si están vinculados al movimiento en edición.
- Si el movimiento en edición ya tenía enlaces a CC hoy `inactivos`, esos enlaces se conservan y se muestran en la selección actual con indicador visual de inactivo (no removible por defecto; la desvinculación explícita sí es posible).
- El selector permite filtrar por `Tipo` dentro de la lista.

### Opcionalidad
- El campo es opcional. Se permite guardar un movimiento sin CC asociados.

### Imputación completa (sin división)
- Si un movimiento de importe M se enlaza a N CC, cada CC recibe la imputación completa de M.
- No se divide ni prorratea el importe.
- Los reportes individuales por CC son consistentes; los reportes cruzados entre CC pueden contener doble conteo y eso se considera **comportamiento esperado y documentado**.

### Moneda
- Se permite enlazar un movimiento a un CC en moneda distinta.
- En ese caso, al seleccionar el CC el sistema muestra una advertencia no bloqueante con el texto "La moneda del movimiento no coincide con la del CC".
- El agregado para el cálculo de avance del CC toma el valor nominal del movimiento tal como está cargado (suma directa, sin conversión).

### Sincronización de indicadores
- Al asociar o desasociar un movimiento a un CC, los indicadores del CC (Σ ingresos, Σ egresos, avance, badges) se recalculan.
- El recalculo se refleja en el próximo render del listado y del detalle del CC; no se requiere un refresh manual adicional.

### Edición de enlaces
- Editar la selección de CC en un movimiento existente sincroniza los enlaces (agrega los nuevos, elimina los removidos, conserva los mantenidos).
- Cada modificación (alta y baja de enlace) se registra en el historial de auditoría del movimiento con `usuario`, `fecha y hora`, `cost_center_id`, `acción` (`linked`/`unlinked`).

### Desvinculación desde el detalle del CC
- Desde el detalle de un CC, Tesorería puede quitar el enlace de un movimiento listado.
- La acción no elimina el movimiento; sólo remueve la fila de la tabla de relación.
- El CC recalcula los agregados tras la desvinculación.
- La acción también queda registrada en el historial de auditoría del movimiento.

### Aislamiento por club activo
- Tanto el selector como la persistencia de enlaces operan exclusivamente sobre CC del club activo.
- No se puede enlazar un movimiento a un CC de otro club, ni por manipulación del formulario.

---

## 9. Flujo principal

1. Tesorería abre el formulario de carga o edición de un movimiento.
2. El sistema renderiza el campo multiselect `Centros de Costo`.
3. El selector lista únicamente CC del club activo con estado `activo`, con filtro secundario por `Tipo`.
4. Tesorería selecciona uno o más CC. Si la moneda de alguno difiere, el sistema muestra advertencia no bloqueante.
5. Tesorería guarda el movimiento.
6. El sistema valida, persiste el movimiento y sincroniza los enlaces en la tabla de relación.
7. El sistema registra la creación o modificación de enlaces en el historial de auditoría del movimiento.
8. El sistema recalcula los agregados de cada CC afectado.
9. Tesorería regresa al listado, ve feedback de éxito y al abrir un CC impactado observa el movimiento enlazado y los indicadores actualizados.

---

## 10. Flujos alternativos

### A. Usuario con rol `secretaria`

1. Secretaría abre el formulario de carga de movimiento.
2. El sistema no renderiza el campo `Centros de Costo`.
3. El movimiento se guarda sin enlaces a CC.

### B. No existen CC activos

1. Tesorería abre el formulario y no existen CC activos en el club.
2. El selector se muestra vacío con mensaje `No hay Centros de Costo activos`.
3. Tesorería guarda el movimiento sin enlaces.

### C. Movimiento sin selección de CC

1. Tesorería guarda un movimiento sin elegir CC.
2. El sistema persiste el movimiento sin filas en la tabla de relación.

### D. Selección múltiple

1. Tesorería elige N CC y guarda.
2. El sistema crea N filas en la tabla de relación.
3. Cada CC seleccionado recibe la imputación completa del importe.

### E. Moneda distinta

1. Tesorería selecciona un CC cuya moneda difiere de la del movimiento.
2. El sistema muestra advertencia visible pero no bloqueante.
3. Tesorería confirma y guarda.
4. El enlace se persiste y el CC suma el valor nominal sin conversión.

### F. Edición de enlaces existentes

1. Tesorería abre un movimiento ya cargado.
2. Modifica la selección de CC (agrega, quita o reordena).
3. Al guardar, el sistema sincroniza la tabla de relación (diff contra el estado previo).
4. Los CC agregados suman la imputación; los removidos dejan de contarla.
5. Se registra cada alta y baja en el historial de auditoría del movimiento.

### G. Desvinculación desde el detalle del CC

1. Tesorería abre el detalle de un CC.
2. Ubica un movimiento enlazado y pulsa `Desvincular`.
3. El sistema elimina la fila de relación, preserva el movimiento y recalcula agregados.
4. La acción queda registrada en el historial de auditoría del movimiento.

### H. CC en estado `inactivo`

1. Existe un CC con estado `inactivo`.
2. Al abrir el selector, el CC no aparece como opción seleccionable.
3. Si el movimiento tenía un enlace previo a ese CC, el enlace se conserva y se muestra con indicador de inactivo.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- El campo `Centros de Costo` se ubica dentro del formulario de movimientos de Tesorería, después de los campos ya existentes de cuenta, categoría y actividad, sin reemplazarlos.
- El control es un multiselect con búsqueda interna por nombre, con agrupación visual o filtro por `Tipo`.
- Cada opción muestra el nombre del CC, un chip de tipo (`DEUDA`, `PRESUPUESTO`, etc.) y su moneda para facilitar la decisión.
- Las opciones seleccionadas se muestran como chips removibles.
- La advertencia de moneda distinta se muestra inline como helper text debajo del campo, con estilo de aviso (no de error).
- Los CC `inactivos` que permanezcan enlazados a un movimiento en edición se muestran como chips con indicador visual de inactivo y tooltip explicativo.
- El detalle del CC (accesible desde el listado de US-52) incluye una tabla de movimientos enlazados con columnas `Fecha`, `Tipo`, `Descripción`, `Cuenta`, `Monto`, `Moneda` y una acción por fila para `Desvincular` y otra para `Ver detalle del movimiento`.
- La acción `Desvincular` debe confirmarse con un diálogo ligero indicando que el movimiento se mantendrá y solo se quita el enlace.
- Feedback de éxito y error con toast según convención (`lib/toast.ts` desde cliente, `flashToast` + redirect desde server actions).
- Mobile-first, sin textos hardcodeados, CTAs con estado de loading.

---

## 12. Mensajes y textos

### Fuente de verdad
- `lib/texts.json`

### Reglas
- No hardcoded strings are allowed.
- All user-facing texts must map to `lib/texts.json`.

### Keys requeridas (propuesta bajo `dashboard.treasury.costCenters.linking.*` y complementos en `dashboard.treasury.movements.*`)

| Tipo | Key | Contexto |
|---|---|---|
| label | `dashboard.treasury.movements.cost_centers_label` | Campo multiselect en el form de movimiento. |
| placeholder | `dashboard.treasury.movements.cost_centers_placeholder` | Placeholder del multiselect. |
| empty | `dashboard.treasury.movements.cost_centers_empty_options` | "No hay Centros de Costo activos". |
| label | `dashboard.treasury.movements.cost_centers_type_filter_label` | Filtro secundario por tipo dentro del selector. |
| warning | `dashboard.treasury.movements.cost_centers_currency_mismatch_warning` | "La moneda del movimiento no coincide con la del CC". |
| label | `dashboard.treasury.movements.cost_centers_inactive_hint` | Hint sobre CC inactivo que permanece enlazado. |
| title | `dashboard.treasury.costCenters.detail_movements_title` | Título del listado de movimientos enlazados en el detalle del CC. |
| label | `dashboard.treasury.costCenters.detail_movements_column_date` | Columna `Fecha`. |
| label | `dashboard.treasury.costCenters.detail_movements_column_type` | Columna `Tipo`. |
| label | `dashboard.treasury.costCenters.detail_movements_column_description` | Columna `Descripción`. |
| label | `dashboard.treasury.costCenters.detail_movements_column_account` | Columna `Cuenta`. |
| label | `dashboard.treasury.costCenters.detail_movements_column_amount` | Columna `Monto`. |
| label | `dashboard.treasury.costCenters.detail_movements_column_currency` | Columna `Moneda`. |
| action | `dashboard.treasury.costCenters.detail_movements_unlink_cta` | Botón `Desvincular`. |
| action | `dashboard.treasury.costCenters.detail_movements_open_cta` | Botón `Ver detalle del movimiento`. |
| dialog | `dashboard.treasury.costCenters.unlink_confirm_title` | Título del diálogo de confirmación. |
| dialog | `dashboard.treasury.costCenters.unlink_confirm_description` | Descripción del diálogo de confirmación. |
| feedback | `dashboard.treasury.costCenters.feedback.movement_linked` | "Movimiento enlazado a los CC seleccionados". |
| feedback | `dashboard.treasury.costCenters.feedback.movement_unlinked` | "Se quitó el enlace del movimiento". |
| feedback | `dashboard.treasury.costCenters.feedback.invalid_cost_center` | CC inválido, inactivo o de otro club enviado desde el cliente. |

---

## 13. Persistencia

### Entidades afectadas
- `treasury_movement_cost_centers`: CREATE, READ, DELETE. Campos mínimos: `movement_id`, `cost_center_id`, `created_at`. PK compuesta `(movement_id, cost_center_id)`.
- `treasury_movements`: READ y UPDATE indirecto (solo del audit trail de enlaces; los campos propios del movimiento no cambian por esta US).
- `cost_centers`: READ (para validar estado `activo`, pertenencia al club y moneda).
- Historial de auditoría del movimiento: APPEND-ONLY para las acciones `linked` y `unlinked` sobre `cost_center_id`. Puede reutilizarse el mecanismo existente del movimiento o extenderse con el mismo patrón que `cost_center_audit_log` de US-52.

Do not reference current code files.

---

## 14. Seguridad

- El rol `tesoreria` es la única vía autorizada para crear o eliminar filas en `treasury_movement_cost_centers`.
- La validación de pertenencia (que el CC y el movimiento correspondan al club activo) se resuelve server-side; no se puede confiar en los ids que envía el cliente.
- RLS debe impedir que un usuario de otro club vea o manipule enlaces ajenos.
- El estado `activo` del CC se valida al enlazar; se rechaza el enlace nuevo a CC `inactivo` (aunque se permite conservar un enlace previo).
- Un `secretaria` que intente enviar `cost_center_id` manipulando el formulario debe ser rechazado server-side, aun si el campo no se renderiza.
- La acción de desvinculación respeta el mismo check de rol y club.

---

## 15. Dependencias

- **contracts:** `Link movement to cost centers`, `Unlink movement from cost center`, `List movements by cost center`.
- **domain entities:** `treasury_movement_cost_centers`, `treasury_movements`, `cost_centers`.
- **permissions:** matriz donde solo `tesoreria` puede enlazar/desvincular; `secretaria` no ve el campo ni puede persistir enlaces.
- **other US if relevant:** US-52 (administración de CC, provee el catálogo y los agregados/badges), US-11 (registro de movimientos), US-13 (consulta detallada de movimientos), US-19 (patrón análogo para actividades), US-23 (monedas habilitadas).

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Doble conteo mal interpretado como error | Alta | Media | Documentar como comportamiento esperado en PDD y en UI; evitar reportes cruzados sin disclaimers. |
| Enlaces a CC de otro club por manipulación del formulario | Baja | Alta | Validar pertenencia server-side y reforzar con RLS. |
| Enlaces huérfanos si se elimina un movimiento | Baja | Media | Definir la tabla con FK y `ON DELETE CASCADE` hacia `treasury_movements`. |
| Inconsistencia al desvincular si el CC ya está inactivo | Baja | Baja | Permitir desvinculación incluso sobre CC `inactivos`; validar solo el rol y la pertenencia al club. |
| Agregados desactualizados tras edición de enlaces | Media | Media | Recalcular en el service al cerrar la transacción y no depender de cachés intermedios. |
| Confusión entre CC y Actividades en el formulario | Media | Media | Mantener ambos campos con labels explícitos y ubicarlos en orden consistente en el form. |
| Moneda mixta en un CC | Media | Baja | Mostrar advertencia no bloqueante al enlazar y documentar en el PDD de US-52 la limitación de suma directa. |
