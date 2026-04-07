# PDD — US-15 · Configuración de cuentas y categorías del club

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E03 · Tesorería |
| User Story | Como Tesoreria del club, quiero configurar las cuentas y categorías de tesorería del club activo, para definir los parámetros que utilizará Secretaria en la operatoria diaria. |
| Prioridad | Alta |
| Objetivo de negocio | Permitir que cada club defina su base operativa de cuentas y categorías antes de la carga diaria de movimientos, manteniendo aislamiento por club y administración solo por rol `tesoreria`. |

---

## 2. Problema a resolver

La operatoria diaria de Secretaría ya puede registrar movimientos, pero todavía depende de una configuración financiera fija. Tesorería necesita crear y editar cuentas y categorías del club activo para adaptar la tesorería a su operación real.

---

## 3. Objetivo funcional

Desde `Configuración del club`, un usuario `tesoreria` debe visualizar una solapa `Tesorería` y administrar cuentas y categorías del club activo, pudiendo listarlas, crearlas y editarlas con sus atributos operativos mínimos.

---

## 4. Alcance

### Incluye
- Solapa `Tesorería` dentro de `Configuración del club`.
- Listado de cuentas del club activo.
- Listado de categorías del club activo.
- Alta de cuenta.
- Edición de cuenta.
- Alta de categoría.
- Edición de categoría.
- Validaciones de nombre obligatorio, tipo obligatorio y duplicados activos.
- Feedback visible en la misma pantalla.

### No incluye
- Baja de cuentas o categorías.
- Configuración de monedas por cuenta como input editable en esta historia.
- Configuración de cuentas exclusivas de Tesorería.
- Configuración de actividades, monedas globales, tipos de movimiento o formatos de recibo.
- La edición de tipos de movimiento, que se muestran solo en modo lectura según US-24.

---

## 5. Actor principal

Usuario autenticado con membership `activo` y rol `tesoreria` en el club activo.

---

## 6. Precondiciones

- El club activo está resuelto.
- El usuario actual tiene permisos de tesorería del club activo.
- `Configuración del club` ya existe como entrada de navegación.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Tesorería entra a configuración | Ve la solapa `Tesorería`. |
| Tesorería crea una cuenta válida | La cuenta queda registrada en el club activo. |
| Tesorería edita una cuenta existente | La cuenta queda actualizada solo en el club activo. |
| Tesorería crea una categoría válida | La categoría queda registrada en el club activo. |
| Tesorería edita una categoría existente | La categoría queda actualizada solo en el club activo. |

---

## 8. Reglas de negocio

- Solo `tesoreria` puede acceder y mutar esta configuración.
- Toda configuración aplica exclusivamente al club activo.
- Las cuentas creadas en esta historia quedan orientadas a la operatoria de `secretaria`.
- La definición explícita de monedas por cuenta queda superseded por US-28.
- La visibilidad operativa de cuentas se define por rol y no por la combinación de `ámbito` más un campo visible redundante.
- El club debe contar con un catálogo fijo de categorías del sistema, siempre presente y no eliminable.
- Las categorías del sistema solo permiten editar su visibilidad por rol.
- Las categorías manuales adicionales mantienen edición completa de nombre, visibilidad, estado y emoji.
- El nombre de cuenta es obligatorio.
- El tipo de cuenta es obligatorio.
- El nombre de categoría es obligatorio.
- No puede existir otra cuenta `active` con el mismo nombre en el mismo club.
- No puede existir otra categoría `active` con el mismo nombre en el mismo club.
- La edición debe respetar las mismas validaciones que el alta.

---

## 9. Flujo principal

1. Un usuario de Tesorería entra a `Configuración del club`.
2. La UI muestra tabs y una de ellas es `Tesorería`.
3. Tesorería abre la solapa `Tesorería`.
4. El sistema muestra cuentas y categorías del club activo.
5. Tesorería crea o edita cuentas y categorías; para categorías del sistema solo ajusta visibilidad por rol.
6. El sistema valida, persiste y vuelve a mostrar la configuración actualizada con feedback.

---

## 10. Flujos alternativos

### A. Usuario sin Tesorería

1. Un usuario sin rol `tesoreria` intenta acceder a la configuración de tesorería.
2. El sistema mantiene el bloqueo de la pantalla.

### B. Nombre faltante o tipo faltante

1. Tesorería intenta guardar una cuenta o categoría incompleta.
2. El sistema rechaza la acción y devuelve feedback específico.

### C. Duplicado activo

1. Tesorería intenta crear o editar con un nombre ya usado por otra entidad `active` del mismo club.
2. El sistema bloquea la operación y devuelve feedback.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- La configuración debe mantenerse dentro de `settings/club`.
- La solapa `Tesorería` debe ser visible al entrar a la pantalla solo para usuarios con rol `tesoreria`.
- Un usuario con ambos roles puede alternar entre `Miembros` y `Tesorería` sin salir de la página.
- La pantalla puede incluir bloques informativos read-only de catálogos fijos del sistema, sin convertirlos en configuraciones editables.
- Al crear o editar cuentas/categorías, el CTA debe entrar en loading de inmediato y el formulario debe quedar bloqueado hasta resolver.
- El campo `Visibilidad` de categorías debe usar el mismo patrón UI que el de cuentas, con selección por rol para `Secretaria` y `Tesoreria`.
- El campo `Emoji` en cuentas y categorías debe resolverse con un selector simple de opciones predefinidas del sistema.
- Los formularios deben ser mobile-first y no incluir textos hardcodeados.

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
| tab | `settings.club.tabs.treasury` | Nombre visible de la solapa. |
| title | `settings.club.treasury.section_title` | Encabezado de Tesorería. |
| body | `settings.club.treasury.section_description` | Descripción general. |
| action | `settings.club.treasury.create_account_cta` | Alta de cuenta. |
| action | `settings.club.treasury.edit_account_cta` | Edición de cuenta. |
| status | `settings.club.treasury.save_account_loading` | Estado visible mientras se crea una cuenta. |
| status | `settings.club.treasury.update_account_loading` | Estado visible mientras se actualiza una cuenta. |
| action | `settings.club.treasury.create_category_cta` | Alta de categoría. |
| action | `settings.club.treasury.edit_category_cta` | Edición de categoría. |
| status | `settings.club.treasury.save_category_loading` | Estado visible mientras se crea una categoría. |
| status | `settings.club.treasury.update_category_loading` | Estado visible mientras se actualiza una categoría. |
| label | `settings.club.treasury.account_name_label` | Nombre de cuenta. |
| label | `settings.club.treasury.account_type_label` | Tipo de cuenta. |
| label | `settings.club.treasury.account_visibility_label` | Visibilidad por rol en cuentas y categorías. |
| label | `settings.club.treasury.status_label` | Estado. |
| label | `settings.club.treasury.emoji_label` | Emoji. |
| label | `settings.club.treasury.emoji_placeholder` | Placeholder del selector de emoji. |
| feedback | `settings.club.treasury.feedback.account_name_required` | Validación de nombre de cuenta. |
| feedback | `settings.club.treasury.feedback.account_type_required` | Validación de tipo de cuenta. |
| feedback | `settings.club.treasury.feedback.category_name_required` | Validación de nombre de categoría. |
| feedback | `settings.club.treasury.feedback.invalid_emoji_option` | Emoji fuera del catálogo predefinido del sistema. |
| feedback | `settings.club.treasury.feedback.duplicate_account_name` | Duplicado de cuenta. |
| feedback | `settings.club.treasury.feedback.duplicate_category_name` | Duplicado de categoría. |

---

## 13. Persistencia

### Entidades afectadas
- `treasury_accounts`: READ, INSERT y UPDATE.
- `treasury_account_currencies`: se mantiene como entidad asociada, pero la selección explícita de monedas por cuenta queda definida en US-28.
- `treasury_categories`: READ, INSERT y UPDATE.

Do not reference current code files.

---

## 14. Seguridad

- La lectura y mutación deben limitarse al club activo.
- Solo `tesoreria` puede operar sobre esta configuración.
- No debe ser posible editar una cuenta o categoría de otro club por manipulación de ids.

---

## 15. Dependencias

- contracts: `Get treasury settings`, `Create treasury account`, `Update treasury account`, `Create treasury category`, `Update treasury category`.
- domain entities: `treasury_accounts`, `treasury_account_currencies`, `treasury_categories`.
- permissions: matriz donde solo `tesoreria` crea y edita cuentas/categorías.
- other US if relevant: US-11 para que Secretaría consuma categorías y cuentas; US-12/13/14 para operación diaria sobre la configuración creada.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Mezclar configuración de otro club | Media | Alta | Resolver siempre sobre club activo y validar ids server-side. |
| Crear cuentas duplicadas activas | Media | Media | Validar nombres activos antes de persistir. |
| Configuración incoherente con historias posteriores | Baja | Media | Tomar US-28 como fuente de verdad para monedas por cuenta y visibilidad por rol. |
