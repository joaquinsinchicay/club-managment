# PDD — US-20 · Configuración de actividades del club

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E03 · Tesorería |
| User Story | Como Tesoreria del club, quiero configurar las actividades del club, para que los formularios operativos puedan asociar movimientos a la disciplina correspondiente. |
| Prioridad | Media |
| Objetivo de negocio | Permitir que cada club mantenga su catálogo de actividades para mejorar la imputación operativa de movimientos y preparar futuras vinculaciones contables y de calendario. |

---

## 2. Problema a resolver

La tesorería diaria ya puede operar con cuentas y categorías, pero todavía no dispone de un catálogo propio de actividades por club. Sin esa configuración, Secretaría no puede asociar movimientos a disciplinas concretas cuando el formulario lo requiera.

---

## 3. Objetivo funcional

Desde la solapa `Tesorería` de `Configuración del club`, un usuario `tesoreria` debe poder ver, crear y editar actividades del club activo, definiendo su visibilidad por rol para disponibilizarlas en los formularios operativos correspondientes.

---

## 4. Alcance

### Incluye
- Sección de actividades dentro de la solapa `Tesorería`.
- Listado de actividades configuradas del club activo.
- Alta de actividad.
- Edición de actividad.
- Estado vacío cuando no existen actividades.
- Validación de nombre obligatorio.
- Validación de duplicado por club.
- Estado oculto cuando no se selecciona ningún rol en `Visibilidad`.
- Disponibilización de actividades por visibilidad para el formulario de movimientos.

### No incluye
- Baja de actividades.
- Reglas avanzadas de visibilidad del campo `Actividad`.
- Vinculación obligatoria del movimiento con actividad por categoría.

---

## 5. Actor principal

Usuario autenticado con membership `activo` y rol `tesoreria` en el club activo.

---

## 6. Precondiciones

- El club activo está resuelto.
- El usuario actual tiene permisos `tesoreria`.
- La pantalla `Configuración del club` y la solapa `Tesorería` ya existen.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Tesorería visualiza actividades | Ve el listado del club activo con nombre, visibilidad y emoji. |
| Tesorería crea actividad válida | La actividad queda registrada para el club activo. |
| Tesorería edita actividad válida | La actividad queda actualizada solo en el club activo. |
| Actividad visible para Secretaría | Se ofrece en el formulario de movimientos de Secretaría. |
| Actividad visible para Tesorería | Se ofrece en el formulario de movimientos de Tesorería. |

---

## 8. Reglas de negocio

- Solo `tesoreria` puede crear y editar actividades.
- Toda actividad pertenece solo al club activo.
- El nombre de actividad es obligatorio.
- No puede existir otra actividad con el mismo nombre en el mismo club.
- Una actividad puede quedar sin roles seleccionados en `Visibilidad`; en ese caso permanece oculta para ambos roles.
- En este bloque, el formulario de movimientos consume actividades visibles para el rol activo como catálogo opcional.

---

## 9. Flujo principal

1. Un usuario de Tesorería entra a `Configuración del club`.
2. Abre la solapa `Tesorería`.
3. Visualiza la sección `Actividades`.
4. Crea o edita una actividad con nombre, visibilidad y emoji seleccionado desde un listado simple del sistema.
5. El sistema valida y guarda la configuración.
6. Las actividades quedan disponibles para los formularios del rol correspondiente según su visibilidad.

---

## 10. Flujos alternativos

### A. Usuario sin Tesorería

1. Un usuario sin rol `tesoreria` intenta acceder.
2. La pantalla sigue bloqueada.

### B. Nombre faltante

1. Tesorería intenta guardar una actividad sin nombre.
2. El sistema bloquea la operación y devuelve feedback.

### C. Actividad sin visibilidad

1. Tesorería crea o edita una actividad sin seleccionar ningún rol en `Visibilidad`.
2. El sistema permite guardar la actividad.
3. La actividad queda marcada como oculta y no aparece en formularios operativos.

### D. Duplicado

1. Tesorería intenta crear o editar una actividad con un nombre ya usado por otra actividad del club.
2. El sistema bloquea la acción y devuelve feedback.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- La sección debe convivir con cuentas y categorías dentro de `Tesorería`.
- El listado debe ser simple de escanear en mobile.
- El estado vacío debe quedar claro y accionable.
- El campo `Emoji` debe resolverse con un selector simple de opciones predefinidas del sistema.
- Si no se selecciona ningún rol en una actividad, la UI debe representarla como `Oculta`.
- Al crear o editar, el CTA debe entrar en loading de inmediato y el formulario debe quedar bloqueado hasta resolver.
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
| title | `settings.club.treasury.activities_title` | Encabezado de actividades. |
| body | `settings.club.treasury.activities_description` | Descripción de la sección. |
| action | `settings.club.treasury.create_activity_cta` | Alta de actividad. |
| action | `settings.club.treasury.edit_activity_cta` | Edición de actividad. |
| status | `settings.club.treasury.save_activity_loading` | Estado visible mientras se crea una actividad. |
| status | `settings.club.treasury.update_activity_loading` | Estado visible mientras se actualiza una actividad. |
| label | `settings.club.treasury.activity_name_label` | Nombre de la actividad. |
| label | `settings.club.treasury.account_visibility_label` | Visibilidad de la actividad. |
| label | `settings.club.treasury.emoji_label` | Emoji. |
| label | `settings.club.treasury.emoji_placeholder` | Placeholder del selector de emoji. |
| empty | `settings.club.treasury.empty_activities` | Estado vacío. |
| feedback | `settings.club.treasury.feedback.activity_created` | Alta exitosa. |
| feedback | `settings.club.treasury.feedback.activity_updated` | Edición exitosa. |
| feedback | `settings.club.treasury.feedback.activity_name_required` | Nombre obligatorio. |
| feedback | `settings.club.treasury.feedback.invalid_emoji_option` | Emoji fuera del catálogo predefinido del sistema. |
| feedback | `settings.club.treasury.feedback.duplicate_activity_name` | Duplicado activo. |

---

## 13. Persistencia

### Entidades afectadas
- `club_activities`: READ, INSERT y UPDATE.
- `treasury_movements`: lectura y escritura futura del `activity_id`, con preparación del catálogo activo para el formulario.

Do not reference current code files.

---

## 14. Seguridad

- Las actividades deben resolverse siempre dentro del club activo.
- Un usuario de Tesorería no puede editar actividades de otro club manipulando ids.
- Secretaría y Tesorería solo deben consumir actividades visibles para su rol dentro del club activo.

---

## 15. Dependencias

- contracts: `Create club activity`, `Update club activity`.
- domain entities: `club_activities`, `treasury_movements`.
- permissions: matriz donde solo `tesoreria` crea y edita actividades.
- other US if relevant: US-15 para compartir la misma solapa de configuración; US-19 para futura vinculación explícita de movimientos con actividad.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Mezclar actividades entre clubes | Media | Alta | Validar club activo server-side para todo READ/WRITE. |
| Exponer actividades a roles no habilitados | Media | Media | Filtrar por visibilidad del rol al construir opciones del formulario. |
| Generar duplicados semánticos | Media | Media | Validar nombre activo repetido antes de persistir. |
