# PDD — US-18 · Configuración del sistema de socios

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E03 · Tesorería |
| User Story | Como Admin del club, quiero configurar el sistema de socios, para definir el nombre del campo, el tipo de formato aceptado y la visibilidad por rol en los formularios operativos. |
| Prioridad | Media |
| Objetivo de negocio | Permitir que cada club defina cómo se captura y valida el campo de recibo del sistema de socios, controlando su nombre, tipo de dato y visibilidad por rol. |

---

## 2. Problema a resolver

La sección de sistema de socios era read-only y usaba un formato fijo `PAY-SOC-*`. En esta iteración el negocio requiere que Admin pueda configurar el nombre del campo, elegir entre dos tipos de formato (Alfanumérico / Número) y definir la visibilidad por rol. Si no hay roles habilitados, el campo queda oculto y no se muestra en formularios operativos.

---

## 3. Objetivo funcional

Un usuario `admin` debe poder editar dentro de `Configuración del club` el nombre, tipo de formato y visibilidad del sistema de socios. Los formularios operativos consumen esa configuración para mostrar u ocultar el campo con el nombre y tipo correcto.

---

## 4. Alcance

### Incluye
- Formulario de configuración del sistema de socios con campos `Nombre`, `Tipo de formato` y `Visibilidad`.
- Selector de tipo de formato: `Alfanumérico` (`^[a-zA-Z0-9]+$`) y `Número` (`^[0-9]+$`).
- Configuración de visibilidad por rol (Secretaría y/o Tesorería). Sin roles seleccionados → "Oculta".
- Validación client-side y server-side del campo en formularios operativos según tipo configurado.
- El label del campo en formularios es dinámico y proviene del `Nombre` configurado.
- Cuando la visibilidad es "Oculta", el campo no se muestra en ningún formulario operativo.
- Bootstrap defensivo de la configuración para que el club siempre disponga de un `receipt_format` editable, incluso si no existía registro persistido.

### No incluye
- Visualización de ejemplo, patrón regex ni próximo recibo en la UI.
- Alta o baja de sistemas de socios desde la UI.
- Configuración de múltiples sistemas convivientes.
- Validaciones cruzadas contra sistemas externos.

---

## 5. Actor principal

Usuario autenticado con membership `activo` y rol `admin` para editar la configuración; usuario `secretaria` o `tesoreria` para consumir el campo según visibilidad al cargar movimientos.

---

## 6. Precondiciones

- El club activo está resuelto.
- El usuario `admin` puede acceder a `Configuración del club`.
- El club activo debe contar con al menos un registro en `receipt_formats`; si no existe, el sistema debe bootstrapearlo automáticamente antes de renderizar la sección.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Admin edita nombre | El campo en formularios muestra el nuevo nombre. |
| Admin selecciona tipo Número | El campo acepta solo dígitos enteros en formularios. |
| Admin selecciona tipo Alfanumérico | El campo acepta letras y números, sin caracteres especiales. |
| Admin configura visibilidad Secretaría | Solo Secretaría ve el campo en sus formularios. |
| Admin configura sin visibilidad | El campo queda oculto en todos los formularios. |
| Secretaría o Tesorería ingresan un recibo válido | El movimiento puede continuar. |
| Secretaría o Tesorería ingresan un recibo inválido | El movimiento se bloquea con feedback. |

---

## 8. Reglas de negocio

- Solo `admin` puede editar la configuración del sistema de socios.
- El nombre es obligatorio, máximo 50 caracteres, solo letras, números y espacios.
- El tipo de formato es obligatorio: `Alfanumérico` (mapeado a `validationType: "pattern"`) o `Número` (mapeado a `validationType: "numeric"`).
- Un admin puede configurar la visibilidad por rol (Secretaría y/o Tesorería).
- Una configuración puede quedar sin roles seleccionados en `Visibilidad`; en ese caso el campo queda oculto y no se muestra en ningún formulario operativo.
- El label del campo en formularios operativos es dinámico y proviene del `Nombre` configurado.
- La validación server-side aplica el patrón correspondiente al tipo configurado:
  - `Alfanumérico`: `^[a-zA-Z0-9]+$`
  - `Número`: `^[0-9]+$`

---

## 9. Flujo principal

1. Un admin entra a `Configuración del club`.
2. Abre la solapa `Sistema de socios`.
3. Presiona el botón de edición.
4. Configura nombre, tipo de formato y visibilidad.
5. El sistema valida y persiste la configuración.
6. Los formularios operativos consumen la configuración actualizada.

---

## 10. Flujos alternativos

### A. Sin visibilidad seleccionada

1. Admin guarda sin seleccionar ningún rol.
2. El sistema permite guardar.
3. El campo queda oculto en todos los formularios operativos.

### B. Recibo con formato inválido

1. El usuario ingresa un valor que no cumple el patrón configurado.
2. El sistema devuelve `invalid_receipt_format`.

### C. Nombre inválido

1. Admin intenta guardar con nombre vacío, muy largo o con caracteres especiales.
2. El sistema devuelve el feedback correspondiente.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- La sección convive con cuentas, categorías y actividades dentro de `Tesorería`.
- El card principal muestra: nombre actual, tipo de formato y badge de visibilidad.
- El botón de edición abre modal con el mismo patrón visual que el resto de las tabs.
- No se muestran ejemplo, patrón técnico ni próximo recibo.
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
| title | `settings.club.treasury.receipt_formats_title` | Encabezado de la sección. |
| body | `settings.club.treasury.receipt_formats_description` | Descripción de la sección. |
| label | `settings.club.treasury.receipt_name_label` | Nombre del sistema de socios. |
| label | `settings.club.treasury.receipt_validation_type_label` | Tipo de formato. |
| options | `settings.club.treasury.receipt_validation_type_options.numeric` | Opción Número. |
| options | `settings.club.treasury.receipt_validation_type_options.pattern` | Opción Alfanumérico. |
| label | `settings.club.treasury.account_visibility_label` | Visibilidad (reutilizada). |
| options | `settings.club.treasury.account_visibility_options` | Opciones de visibilidad (reutilizadas). |
| status | `settings.club.treasury.visibility_hidden` | Estado "Oculta" (reutilizado). |
| body | `settings.club.treasury.receipt_formats_read_only` | Descripción del card. |
| action | `settings.club.treasury.edit_receipt_format_cta` | CTA de edición. |
| action | `settings.club.treasury.update_receipt_format_cta` | CTA de submit. |
| status | `settings.club.treasury.update_receipt_format_loading` | Estado de carga. |
| label | `dashboard.treasury.receipt_label` | Fallback del campo en formulario. |
| feedback | `settings.club.treasury.feedback.receipt_format_updated` | Actualización exitosa. |
| feedback | `settings.club.treasury.feedback.receipt_format_name_required` | Nombre obligatorio. |
| feedback | `settings.club.treasury.feedback.receipt_format_name_too_long` | Nombre muy largo. |
| feedback | `settings.club.treasury.feedback.receipt_format_name_invalid` | Caracteres inválidos. |
| feedback | `settings.club.treasury.feedback.receipt_format_invalid_type` | Tipo inválido. |
| feedback | `dashboard.feedback.invalid_receipt_format` | Recibo inválido en formulario. |

---

## 13. Persistencia

### Entidades afectadas
- `receipt_formats`: READ, CREATE defensivo y UPDATE de `name`, `validation_type`, `visible_for_secretaria`, `visible_for_tesoreria`. Los campos `pattern`, `min_numeric_value` y `example` se mantienen en DB pero no se exponen en la UI.
- Si el club no tiene registros, el sistema debe crear y persistir uno con los defaults funcionales del sistema de socios y visibilidad inicial `Oculta` antes de renderizar la sección.

Do not reference current code files.

---

## 14. Seguridad

- Solo `admin` puede mutar la configuración del sistema de socios.
- La validación del recibo debe ejecutarse server-side.
- El comportamiento aplica al club activo resuelto en sesión.

---

## 15. Dependencias

- contracts: `Update receipt format`, `Create treasury movement`.
- domain entities: `receipt_formats`, `treasury_movements`.
- permissions: solo `admin` edita la sección; Secretaría y Tesorería consumen validación según visibilidad configurada.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Mostrar el campo a un rol no habilitado | Media | Media | Filtrar receiptFormats por rol en las páginas del dashboard. |
| Label de campo desactualizado tras cambio de nombre | Baja | Baja | El label se lee dinámicamente del receipt format en cada render. |
| Aceptar recibos con formato incorrecto | Media | Alta | Validar client-side y server-side según validationType configurado. |
