# PDD — US-18 · Configuración de formatos válidos para recibos

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E03 · Tesorería |
| User Story | Como Admin del club, quiero configurar los formatos válidos del campo Recibo, para asegurar que Secretaria cargue referencias consistentes con los sistemas de socios utilizados por el club. |
| Prioridad | Media |
| Objetivo de negocio | Normalizar la carga del campo recibo por club y permitir convivencia entre formatos legados y nuevos sin perder control de validación en la operatoria diaria. |

---

## 2. Problema a resolver

Secretaría puede registrar movimientos, pero todavía no existe una forma de validar el campo `Recibo` según los sistemas que cada club utiliza. Sin esa configuración, el dato puede quedar inconsistente y perder valor como referencia operativa.

---

## 3. Objetivo funcional

Un usuario `admin` debe poder configurar formatos válidos para recibos dentro de la solapa `Tesorería`, y Secretaría debe ver ayuda contextual con ejemplos válidos y recibir validación contra al menos uno de los formatos activos al cargar un movimiento.

---

## 4. Alcance

### Incluye
- Sección de formatos de recibo en la solapa `Tesorería`.
- Listado de formatos configurados por club activo.
- Alta de formato numérico.
- Alta de formato con nomenclatura.
- Edición de formatos existentes.
- Validación del campo `Recibo` en la carga de movimientos.
- Helper con ejemplos válidos visibles para Secretaría cuando existen formatos activos.

### No incluye
- Regla de obligatoriedad del campo `Recibo` por categoría.
- Gestión masiva de formatos en una sola acción.
- Validaciones cruzadas contra sistemas externos de socios.

---

## 5. Actor principal

Usuario autenticado con membership `activo` y rol `admin` para configuración; usuario `secretaria` para validación durante la carga de movimientos.

---

## 6. Precondiciones

- El club activo está resuelto.
- El usuario `admin` puede acceder a `Configuración del club`.
- La operatoria diaria de Secretaría ya permite registrar movimientos.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Admin crea o edita formato | El formato queda persistido solo para el club activo. |
| Secretaría ingresa un recibo válido | El movimiento puede continuar. |
| Secretaría ingresa un recibo inválido | El movimiento se bloquea con feedback. |
| Existen múltiples formatos activos | El recibo se acepta si cumple al menos uno. |

---

## 8. Reglas de negocio

- Solo `admin` puede crear y editar formatos de recibo.
- Cada formato pertenece exclusivamente al club activo.
- El nombre del formato es obligatorio.
- Para formatos `numeric`, `min_numeric_value` es obligatorio.
- Para formatos `pattern`, `pattern` es obligatorio.
- Los formatos `inactive` no participan de la validación.
- Si hay múltiples formatos `active`, el recibo es válido si cumple al menos uno.
- El helper visible para Secretaría debe usar ejemplos o nombres de formatos activos del club.

---

## 9. Flujo principal

1. Un admin entra a `Configuración del club`.
2. Abre la solapa `Tesorería`.
3. Visualiza y administra formatos de recibo.
4. Secretaría abre el formulario de movimientos.
5. Si existen formatos activos, ve ayuda contextual con ejemplos.
6. Al guardar un movimiento con recibo informado, el sistema valida el valor contra los formatos activos.

---

## 10. Flujos alternativos

### A. Formato sin nombre

1. El admin intenta guardar un formato sin nombre.
2. El sistema rechaza la operación con feedback.

### B. Formato numérico sin mínimo

1. El admin selecciona validación numérica y no informa mínimo.
2. El sistema bloquea el guardado.

### C. Formato con nomenclatura sin patrón

1. El admin selecciona validación por patrón y no informa patrón.
2. El sistema bloquea el guardado.

### D. Recibo inválido

1. Secretaría informa un recibo que no cumple ninguno de los formatos activos.
2. El sistema devuelve `invalid_receipt_format`.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- La sección debe convivir con cuentas, categorías y actividades dentro de `Tesorería`.
- El formulario debe permitir cargar tanto mínimo numérico como patrón dentro del mismo layout.
- La ayuda contextual del campo `Recibo` debe ser breve y fácil de escanear en mobile.
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
| title | `settings.club.treasury.receipt_formats_title` | Encabezado de la sección. |
| body | `settings.club.treasury.receipt_formats_description` | Descripción de formatos. |
| action | `settings.club.treasury.create_receipt_format_cta` | Alta de formato. |
| status | `settings.club.treasury.save_receipt_format_loading` | Estado visible mientras se crea un formato. |
| status | `settings.club.treasury.update_receipt_format_loading` | Estado visible mientras se actualiza un formato. |
| label | `settings.club.treasury.receipt_validation_type_label` | Tipo de validación. |
| label | `settings.club.treasury.receipt_min_label` | Mínimo numérico. |
| label | `settings.club.treasury.receipt_pattern_label` | Patrón. |
| label | `settings.club.treasury.receipt_example_label` | Ejemplo. |
| label | `dashboard.treasury.receipt_label` | Campo recibo en formulario. |
| body | `dashboard.treasury.receipt_helper` | Helper para Secretaría. |
| feedback | `settings.club.treasury.feedback.receipt_format_name_required` | Nombre obligatorio. |
| feedback | `settings.club.treasury.feedback.receipt_format_min_required` | Mínimo obligatorio. |
| feedback | `settings.club.treasury.feedback.receipt_format_pattern_required` | Patrón obligatorio. |
| feedback | `dashboard.feedback.invalid_receipt_format` | Recibo inválido. |

---

## 13. Persistencia

### Entidades afectadas
- `receipt_formats`: READ, INSERT y UPDATE.
- `treasury_movements`: escritura opcional de `receipt_number` con validación previa.

Do not reference current code files.

---

## 14. Seguridad

- Los formatos deben resolverse por club activo.
- Solo `admin` puede mutarlos.
- La validación de recibos debe ejecutarse server-side al registrar movimientos.

---

## 15. Dependencias

- contracts: `Set receipt formats`, `Create treasury movement`.
- domain entities: `receipt_formats`, `treasury_movements`.
- permissions: solo `admin` configura; Secretaría consume validación.
- other US if relevant: US-11 para el registro de movimientos; US-15/20 para la misma pantalla de configuración.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Aceptar recibos inválidos | Media | Alta | Validar contra todos los formatos activos server-side. |
| Rechazar por patrón mal configurado | Media | Media | Si el patrón no compila, tratarlo como inválido en validación y exigir revisión del admin. |
| Mezclar formatos entre clubes | Media | Alta | Resolver siempre por club activo. |
