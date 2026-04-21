# PDD — US-52 · Administración de Centros de Costo

> Nota: esta US corresponde a **E03 · US-30 del Notion "Centro de Costos"**. Se numera como US-52 en el repo para mantener la continuidad del backlog existente (US-30 ya está tomada por "Dashboard de Tesorería"). Fuente: Notion E03 — 💰 Centro de Costos.

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E03 · Tesorería |
| User Story | Como usuario con rol `tesoreria`, quiero administrar los Centros de Costo del club (alta, edición y cierre), para imputar movimientos a conceptos específicos como deudas, eventos, jornadas, presupuestos, publicidades y sponsors. |
| Prioridad | Alta |
| Objetivo de negocio | Incorporar una dimensión de imputación contable paralela a categorías y actividades que permita planificar, ejecutar y cerrar presupuestos, deudas, eventos y acuerdos comerciales del club, con indicadores de avance e historial de cambios. |

---

## 2. Problema a resolver

Hoy Tesorería puede clasificar movimientos por cuenta, categoría y actividad, pero no dispone de un agrupador que represente un **compromiso económico acotado en el tiempo** (una deuda, un presupuesto trimestral, un evento, un sponsor anual). No existe forma de planificar un monto objetivo, medir ejecución contra ese monto ni cerrar el concepto cuando se completa.

---

## 3. Objetivo funcional

Desde el módulo de Tesorería, un usuario con rol `tesoreria` debe disponer de una pestaña "Centros de Costo" donde pueda listar, filtrar, buscar, crear y editar Centros de Costo (CC) del club activo. Cada CC tiene un tipo, un estado, una moneda, una fecha de inicio, un responsable y — según tipo — un monto objetivo y una periodicidad. El listado debe exhibir en tiempo real el avance de cada CC y levantar badges visuales cuando cruza umbrales relevantes (deuda saldada, presupuesto cerca del límite o superado, meta cumplida, CC vencido). Toda mutación queda registrada en un historial de auditoría.

---

## 4. Alcance

### Incluye
- Nueva pestaña `Centros de Costo` dentro del módulo de Tesorería, junto a `Resumen`, `Cuentas`, `Movimientos` y `Conciliación`.
- KPI cards de encabezado: `Activos`, `Presupuesto comprometido`, `Deudas pendientes`.
- Listado de CC del club activo con columnas `Nombre`, `Tipo`, `Estado`, `Moneda`, `Monto`, `Avance`, `Fecha Inicio`, `Fecha Fin`, `Responsable`.
- Filtros por `Tipo`, `Estado` y `Responsable`, y búsqueda por `Nombre`.
- Estado vacío con CTA `+ Nuevo Centro de Costo`.
- Alta de CC con validaciones completas.
- Edición de CC con restricciones según si tiene movimientos enlazados.
- Cierre de CC mediante cambio de estado a `Inactivo`, con autocompletado de `Fecha Fin`.
- Badges visuales de estado en el listado.
- Historial de auditoría por CC.

### No incluye
- Baja física de CC (solo cierre lógico vía estado `Inactivo`).
- Asociación de movimientos a CC (cubierto por **US-53**).
- Reportes agregados entre múltiples CC.
- Conversión de moneda para consolidar avance entre CC con monedas distintas.
- Generación automática de CC "hijos" por período cuando la periodicidad es mensual, trimestral, etc.
- Permisos para roles distintos de `tesoreria`.
- Vinculación de CC con el calendario o con contratos externos.

---

## 5. Actor principal

Usuario autenticado con membership `activo` y rol `tesoreria` en el club activo.

---

## 6. Precondiciones

- El club activo está resuelto.
- El usuario actual tiene rol `tesoreria` confirmado para el club activo.
- El módulo de Tesorería ya expone la barra de pestañas.
- El club tiene al menos un miembro disponible para asignar como `Responsable`.
- El catálogo de monedas habilitadas para el club (US-23) está resuelto.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Tesorería entra a la pestaña `Centros de Costo` sin CC cargados | Ve el estado vacío con CTA de alta. |
| Tesorería crea un CC válido | El CC queda registrado en el club activo con estado `Activo`. |
| Tesorería edita campos permitidos de un CC existente | El CC queda actualizado y el cambio se persiste en el historial de auditoría. |
| Tesorería cambia el estado de un CC de `Activo` a `Inactivo` | El CC queda cerrado y la `Fecha Fin` se completa automáticamente si estaba vacía o era futura. |
| El CC cruza un umbral de avance | El badge visual correspondiente se muestra en el listado sin requerir refresh manual adicional al próximo render. |
| Un usuario sin rol `tesoreria` entra al módulo de Tesorería | La pestaña `Centros de Costo` no se renderiza. |

---

## 8. Reglas de negocio

### Acceso
- Solo usuarios con rol `tesoreria` del club activo pueden acceder a la pestaña, listar, crear y editar CC.
- Todas las operaciones aplican exclusivamente al club activo.

### Tipos válidos
- `deuda`, `evento`, `jornada`, `presupuesto`, `publicidad`, `sponsor`.

### Estados válidos
- `activo`, `inactivo`. Estado por defecto al crear: `activo`.

### Periodicidad válida
- `unico`, `mensual`, `trimestral`, `semestral`, `anual`.
- La periodicidad es **metadata descriptiva** en esta US (no genera CC hijos).

### Campos obligatorios base
- `Nombre`, `Tipo`, `Estado`, `Fecha Inicio` son obligatorios siempre.

### Monto visible y obligatorio según tipo
- Visible y obligatorio para `deuda`, `presupuesto`, `publicidad`, `sponsor`.
- Oculto y opcional para `evento` y `jornada` (persistido como `null`).

### Moneda visible y obligatoria según tipo
- Visible y obligatoria para `deuda`, `presupuesto`, `publicidad`, `sponsor`.
- Oculta y opcional para `evento` y `jornada`. En esos casos el sistema persiste por default `ARS` (la columna `currency_code` en DB es `NOT NULL`).

### Responsable visible y obligatorio según tipo
- Visible y obligatorio para `deuda`, `presupuesto`.
- Oculto y opcional para `evento`, `jornada`, `publicidad`, `sponsor` (persistido como `null` en alta; en edición se preserva el valor previo si existía).

### Periodicidad visible según tipo
- Campo visible solo cuando el tipo es `presupuesto`, `sponsor` o `publicidad`.
- En los demás tipos, el campo no se muestra y el valor persistido queda nulo.

### Validaciones transversales
- `Nombre` único por club (case-insensitive, trimeado).
- `Fecha Fin`, si se informa, debe ser mayor o igual a `Fecha Inicio`.
- `Moneda` debe pertenecer al catálogo de monedas habilitadas para el club.
- `Responsable` debe ser un miembro activo del club.

### Edición · campos inmutables
- En modo edición, **`Tipo`, `Moneda` y `Monto` son siempre inmutables**, exista o no movimientos enlazados. Esta regla evita romper reportes ya emitidos sobre el CC. Si un valor estuvo mal cargado, se debe inactivar el CC y crear uno nuevo.
- `Fecha Inicio` se deshabilita solo cuando el CC ya tiene movimientos enlazados.
- El resto de los campos (`Nombre`, `Descripción`, `Estado`, `Fecha Fin`, `Periodicidad`, `Responsable`) permanecen editables siempre.

### Cierre lógico
- Al cambiar el estado de un CC de `activo` a `inactivo`:
  - Si `Fecha Fin` está vacía o es posterior a la fecha actual, se autocompleta con la fecha actual.
  - Si `Fecha Fin` ya es anterior o igual a la fecha actual, se conserva el valor existente.

### Indicadores de avance y badges visuales
Los badges se calculan a partir de la suma de movimientos enlazados vigentes (ver US-53) y se muestran en cada fila del listado:

| Badge | Condición |
|---|---|
| `Deuda saldada — listo para cerrar` | Tipo = `deuda` y Σ egresos enlazados ≥ Monto. |
| `Presupuesto cerca del límite` | Tipo = `presupuesto` y 80% ≤ Σ egresos enlazados / Monto < 100%. |
| `Presupuesto superado` | Tipo = `presupuesto` y Σ egresos enlazados / Monto ≥ 100%. |
| `Meta cumplida` | Tipo ∈ {`sponsor`, `publicidad`} y Σ ingresos enlazados ≥ Monto. |
| `CC vencido — revisar cierre` | Estado = `activo` y Fecha Fin anterior a la fecha actual. |

Los agregados se calculan en suma directa (sin conversión de moneda). Si existen movimientos enlazados en moneda distinta a la del CC, el cálculo considera los valores nominales tal cual están cargados (limitación conocida).

### Auditoría
- Cada creación, edición y cierre genera una o más filas en el historial del CC con `usuario`, `fecha y hora`, `campo modificado`, `valor anterior` y `valor nuevo`.
- La creación registra una fila por cada campo poblado inicialmente (o una única fila de tipo `CREATED` con snapshot, según el patrón usado en el resto del proyecto).

### Unicidad e idempotencia
- La validación de nombre único se hace server-side sobre el club activo.
- No se permite crear un CC en otro club por manipulación del `club_id`.

---

## 9. Flujo principal

1. Tesorería ingresa al módulo de Tesorería.
2. Selecciona la pestaña `Centros de Costo`.
3. El sistema muestra las KPI cards de encabezado y el listado del club activo (o el estado vacío si no hay CC).
4. Tesorería aplica filtros (`Tipo`, `Estado`, `Responsable`) o busca por nombre.
5. Tesorería abre `+ Nuevo Centro de Costo`, completa el formulario y guarda.
6. El sistema valida, persiste, registra en el historial y vuelve al listado con feedback de éxito.
7. Tesorería abre un CC existente para editar.
8. El sistema muestra el formulario con campos habilitados o deshabilitados según si el CC tiene movimientos enlazados.
9. Tesorería modifica los campos permitidos y guarda.
10. El sistema valida, persiste el cambio, registra cada diff en el historial y vuelve al listado con feedback de éxito.
11. Tesorería cambia estado a `Inactivo` en un CC activo y guarda.
12. El sistema autocompleta `Fecha Fin` si corresponde, persiste el cambio, registra en el historial y vuelve al listado.

---

## 10. Flujos alternativos

### A. Usuario sin rol `tesoreria`

1. El usuario entra al módulo de Tesorería.
2. El sistema no renderiza la pestaña `Centros de Costo`.
3. Si intenta acceder por URL directa, el sistema responde con una redirección o bloqueo equivalente al patrón ya existente del módulo.

### B. Campos obligatorios faltantes

1. Tesorería guarda sin completar un campo obligatorio.
2. El sistema bloquea el guardado y devuelve feedback puntual por campo.

### C. Fecha fin anterior a fecha inicio

1. Tesorería guarda con `Fecha Fin` anterior a `Fecha Inicio`.
2. El sistema bloquea el guardado y muestra feedback específico.

### D. Nombre duplicado

1. Tesorería guarda con un nombre ya existente en el club activo.
2. El sistema bloquea el guardado y muestra el mensaje correspondiente.

### E. Monto obligatorio faltante según tipo

1. Tesorería guarda un CC de tipo `deuda`, `presupuesto`, `publicidad` o `sponsor` sin `Monto`.
2. El sistema bloquea el guardado y muestra feedback específico.

### F. Edición sobre CC con movimientos enlazados

1. Tesorería abre un CC con movimientos enlazados.
2. El sistema carga el formulario con `Tipo`, `Moneda` y `Fecha Inicio` deshabilitados.
3. Tesorería edita campos habilitados y guarda.
4. El sistema valida, persiste y registra cada diff en el historial.

### G. Listado vacío

1. Tesorería entra a la pestaña sin CC creados.
2. El sistema muestra el estado vacío con CTA `+ Nuevo Centro de Costo`.

### H. CC vencido

1. Un CC en estado `activo` tiene `Fecha Fin` anterior a hoy.
2. El listado muestra el badge `CC vencido — revisar cierre` sin modificar automáticamente el estado.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- La pestaña `Centros de Costo` usa el mismo patrón de sub-tabs ya aplicado en Tesorería (barra horizontal con scroll en mobile, tab activa con fondo `surface` y sombra sutil).
- El encabezado muestra tres KPI cards en una sola fila (colapsa en mobile): `Activos` con total y menciones de vencidos, `Presupuesto comprometido` con porcentaje y totales ejecutado/total, `Deudas pendientes` con totales por moneda y conteo de CC.
- Debajo del encabezado: subtítulo con contadores del listado (`N activos · M inactivos · club activo`) y CTA primaria `+ Nuevo` alineada a la derecha.
- Una barra de búsqueda por nombre con ícono de lupa.
- Dos filas de filtros-pill: la primera por `Tipo` (`Todos`, `Deudas`, `Presupuestos`, `Eventos`, `Sponsors`, `Publicidad`, `Jornada`), con contador por opción; la segunda por `Estado` (`Activos`, `Inactivos`).
- Cada fila del listado es una card con:
  - Línea superior: nombre del CC y subtítulo contextual (ej: `Mantenimiento · Q2 2026`).
  - Chip de tipo (`PRESUPUESTO`, `DEUDA`, `EVENTO`, `SPONSOR`, `PUBLICIDAD`, `JORNADA`).
  - Metadata inline: periodicidad (si aplica), rango de fechas, estado (`ACTIVO` o `INACTIVO`) con indicador visual.
  - Monto objetivo y moneda alineados a la derecha con el ejecutado debajo en formato `$ X ejecutado · N%`.
  - Barra de progreso horizontal con color semántico (verde saldado, amarillo cerca del límite, rojo superado, gris en progreso).
  - Badge de estado debajo de la barra cuando aplica.
  - Avatar + iniciales del `Responsable` alineadas a la derecha.
- La card hace clic en toda su superficie para abrir el detalle del CC (detalle cubierto por US-53 en lo operativo; en esta US alcanza con mostrar el formulario de edición).
- El formulario es mobile-first, sin textos hardcodeados, con el CTA entrando en loading inmediatamente y el formulario bloqueado hasta resolver.
- Los campos `Monto` y `Periodicidad` aparecen y desaparecen según el `Tipo` seleccionado, sin recargar la pantalla.
- Los campos deshabilitados en edición muestran tooltip explicativo (`No editable: hay movimientos enlazados`).
- El feedback de éxito y de error se resuelve con toast según la convención del proyecto (`lib/toast.ts` desde cliente, `flashToast` + redirect desde server actions).
- El historial de auditoría puede exponerse como drawer/modal al pie del formulario de edición o en una sección plegable; alcanza con que sea consultable desde el detalle del CC.

---

## 12. Mensajes y textos

### Fuente de verdad
- `lib/texts.json`

### Reglas
- No hardcoded strings are allowed.
- All user-facing texts must map to `lib/texts.json`.

### Keys requeridas (propuesta bajo `dashboard.treasury.costCenters.*`)

| Tipo | Key | Contexto |
|---|---|---|
| title | `dashboard.treasury.costCenters.tab_title` | Etiqueta de la pestaña dentro de Tesorería. |
| title | `dashboard.treasury.costCenters.section_title` | Encabezado principal de la pestaña. |
| body | `dashboard.treasury.costCenters.section_description` | Descripción secundaria debajo del título. |
| title | `dashboard.treasury.costCenters.kpi_active_title` | KPI card `Activos`. |
| title | `dashboard.treasury.costCenters.kpi_budget_title` | KPI card `Presupuesto comprometido`. |
| title | `dashboard.treasury.costCenters.kpi_debts_title` | KPI card `Deudas pendientes`. |
| label | `dashboard.treasury.costCenters.search_placeholder` | Placeholder de la barra de búsqueda. |
| action | `dashboard.treasury.costCenters.create_cta` | CTA `+ Nuevo`. |
| status | `dashboard.treasury.costCenters.save_loading` | Estado de carga al crear. |
| status | `dashboard.treasury.costCenters.update_loading` | Estado de carga al editar. |
| empty | `dashboard.treasury.costCenters.empty_title` | Título del estado vacío. |
| empty | `dashboard.treasury.costCenters.empty_description` | Descripción del estado vacío. |
| empty | `dashboard.treasury.costCenters.empty_cta` | CTA del estado vacío. |
| label | `dashboard.treasury.costCenters.filter_all` | Pill `Todos`. |
| label | `dashboard.treasury.costCenters.filter_type_debt` | Pill `Deudas`. |
| label | `dashboard.treasury.costCenters.filter_type_budget` | Pill `Presupuestos`. |
| label | `dashboard.treasury.costCenters.filter_type_event` | Pill `Eventos`. |
| label | `dashboard.treasury.costCenters.filter_type_sponsor` | Pill `Sponsors`. |
| label | `dashboard.treasury.costCenters.filter_type_advertising` | Pill `Publicidad`. |
| label | `dashboard.treasury.costCenters.filter_type_workday` | Pill `Jornada`. |
| label | `dashboard.treasury.costCenters.filter_status_active` | Pill `Activos`. |
| label | `dashboard.treasury.costCenters.filter_status_inactive` | Pill `Inactivos`. |
| label | `dashboard.treasury.costCenters.form_name_label` | Campo `Nombre`. |
| label | `dashboard.treasury.costCenters.form_description_label` | Campo `Descripción`. |
| label | `dashboard.treasury.costCenters.form_type_label` | Campo `Tipo`. |
| label | `dashboard.treasury.costCenters.form_status_label` | Campo `Estado`. |
| label | `dashboard.treasury.costCenters.form_start_date_label` | Campo `Fecha Inicio`. |
| label | `dashboard.treasury.costCenters.form_end_date_label` | Campo `Fecha Fin`. |
| label | `dashboard.treasury.costCenters.form_currency_label` | Campo `Moneda`. |
| label | `dashboard.treasury.costCenters.form_amount_label` | Campo `Monto`. |
| label | `dashboard.treasury.costCenters.form_periodicity_label` | Campo `Periodicidad`. |
| label | `dashboard.treasury.costCenters.form_responsible_label` | Campo `Responsable`. |
| label | `dashboard.treasury.costCenters.form_disabled_hint` | Tooltip en campos deshabilitados por movimientos enlazados. |
| badge | `dashboard.treasury.costCenters.badge_debt_settled` | Badge `Deuda saldada — listo para cerrar`. |
| badge | `dashboard.treasury.costCenters.badge_budget_near_limit` | Badge `Presupuesto cerca del límite`. |
| badge | `dashboard.treasury.costCenters.badge_budget_exceeded` | Badge `Presupuesto superado`. |
| badge | `dashboard.treasury.costCenters.badge_goal_met` | Badge `Meta cumplida`. |
| badge | `dashboard.treasury.costCenters.badge_overdue` | Badge `CC vencido — revisar cierre`. |
| feedback | `dashboard.treasury.costCenters.feedback.created` | Alta exitosa. |
| feedback | `dashboard.treasury.costCenters.feedback.updated` | Edición exitosa. |
| feedback | `dashboard.treasury.costCenters.feedback.closed` | Cierre exitoso (estado `Inactivo`). |
| feedback | `dashboard.treasury.costCenters.feedback.name_required` | Nombre faltante. |
| feedback | `dashboard.treasury.costCenters.feedback.type_required` | Tipo faltante. |
| feedback | `dashboard.treasury.costCenters.feedback.start_date_required` | Fecha inicio faltante. |
| feedback | `dashboard.treasury.costCenters.feedback.currency_required` | Moneda faltante. |
| feedback | `dashboard.treasury.costCenters.feedback.responsible_required` | Responsable faltante. |
| feedback | `dashboard.treasury.costCenters.feedback.amount_required_for_type` | Monto obligatorio según tipo. |
| feedback | `dashboard.treasury.costCenters.feedback.invalid_date_range` | Fecha fin anterior a fecha inicio. |
| feedback | `dashboard.treasury.costCenters.feedback.duplicate_name` | "Ya existe un Centro de Costo con ese nombre". |
| title | `dashboard.treasury.costCenters.audit_log_title` | Título del historial de auditoría. |
| label | `dashboard.treasury.costCenters.audit_log_actor` | Columna `Usuario`. |
| label | `dashboard.treasury.costCenters.audit_log_when` | Columna `Fecha y hora`. |
| label | `dashboard.treasury.costCenters.audit_log_field` | Columna `Campo`. |
| label | `dashboard.treasury.costCenters.audit_log_old_value` | Columna `Valor anterior`. |
| label | `dashboard.treasury.costCenters.audit_log_new_value` | Columna `Valor nuevo`. |

---

## 13. Persistencia

### Entidades afectadas
- `cost_centers`: CREATE, READ, UPDATE. Campos mínimos: `id`, `club_id`, `name`, `description`, `type`, `status`, `start_date`, `end_date`, `currency`, `amount`, `periodicity`, `responsible_member_id`, `created_at`, `updated_at`, `created_by`, `updated_by`.
- `cost_center_audit_log`: APPEND-ONLY. Campos mínimos: `id`, `cost_center_id`, `actor_user_id`, `changed_at`, `field`, `old_value`, `new_value`.
- `treasury_movement_cost_centers`: READ (solo se consulta para determinar si un CC tiene movimientos enlazados y para agregar Σ ingresos/egresos; la escritura se cubre en US-53).
- `treasury_movements`: READ (para calcular agregados por CC).
- `club_members`: READ (para resolver el catálogo de responsables).

Do not reference current code files.

---

## 14. Seguridad

- Toda lectura y mutación debe limitarse al club activo y al rol `tesoreria`.
- El `club_id` del CC se resuelve server-side a partir del club activo; no puede venir del cliente como valor confiable.
- RLS debe impedir que un usuario de otro club lea o modifique CC ajenos.
- La validación final de unicidad de nombre, rango de fechas y obligatoriedad por tipo debe resolverse server-side, más allá de cualquier validación de UI.
- El historial de auditoría es append-only; no se permite edición ni borrado desde la UI.

---

## 15. Dependencias

- **contracts:** `List cost centers`, `Get cost center`, `Create cost center`, `Update cost center`, `Get cost center audit log`.
- **domain entities:** `cost_centers`, `cost_center_audit_log`, `treasury_movement_cost_centers` (solo lectura), `club_members`.
- **permissions:** matriz donde solo `tesoreria` accede y muta CC; `secretaria` no ve la pestaña.
- **other US if relevant:** US-23 (catálogo de monedas habilitadas), US-09 (miembros activos del club), US-53 (asociación de movimientos a CC, necesaria para alimentar los agregados de avance).

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Crear CC en otro club por manipulación de ids | Baja | Alta | Resolver `club_id` server-side desde el contexto autenticado y reforzar con RLS. |
| Duplicar nombres de CC por carreras concurrentes | Baja | Media | Índice único compuesto `(club_id, lower(name))` y validación en el service antes del insert. |
| Cálculo de badges inconsistente con moneda mixta | Media | Media | Documentar explícitamente que la suma es directa sin conversión, y mostrarlo en el PDD; dejar una advertencia en UI para CC con enlaces en monedas distintas. |
| Bloqueo excesivo de edición cuando el CC tiene movimientos enlazados | Media | Media | Permitir editar `Estado`, `Fecha Fin`, `Monto`, `Periodicidad`, `Responsable`, `Nombre` y `Descripción` incluso con enlaces; bloquear solo `Tipo`, `Moneda` y `Fecha Inicio`. |
| Pérdida de trazabilidad de cambios | Baja | Alta | Registrar todo diff en el historial de auditoría; prohibir updates sin pasar por el service. |
| Confusión entre CC y Categorías/Actividades | Media | Media | Mantener CC como pestaña propia de Tesorería y documentar en UI que es una dimensión paralela. |
