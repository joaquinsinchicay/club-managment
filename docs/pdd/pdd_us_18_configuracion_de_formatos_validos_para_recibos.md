# PDD — US-18 · Configuración de formatos válidos para recibos

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E03 · Tesorería |
| User Story | Como Admin del club, quiero visualizar la integración del campo Recibo, para asegurar que Secretaría cargue referencias consistentes con el sistema de socios utilizado por el club. |
| Prioridad | Media |
| Objetivo de negocio | Estandarizar la captura del campo `Recibo` con una integración predefinida visible para Admin y reusable en los formularios operativos de Secretaría. |

---

## 2. Problema a resolver

La versión anterior de la historia permitía administrar formatos libres desde la UI. En esta iteración el negocio define una integración fija con el sistema de socios, por lo que la pantalla debe dejar de comportarse como configurador manual y pasar a mostrar una referencia operativa consistente para Admin y Secretaría.

---

## 3. Objetivo funcional

Un usuario `admin` debe poder visualizar dentro de `Configuración del club` la configuración fija del recibo del sistema de socios, mientras que Secretaría debe ver ayuda contextual con el formato válido y el rango disponible al cargar movimientos.

---

## 4. Alcance

### Incluye
- Sección read-only de recibos dentro de la sección de Tesorería de `Configuración del club`.
- Visualización de `Nombre del sistema de socios`, `Ejemplo`, `Patrón` y `Próximo recibo`.
- Helper visible para Secretaría en formularios de movimientos.
- Validación server-side del campo `Recibo` contra el formato fijo predefinido.

### No incluye
- Alta, edición o baja manual de formatos desde la UI.
- Configuración de múltiples formatos convivientes.
- Validaciones cruzadas contra sistemas externos.
- Límite máximo de recibos disponibles.

---

## 5. Actor principal

Usuario autenticado con membership `activo` y rol `admin` para visualizar la integración; usuario `secretaria` o `tesoreria` para consumir la ayuda y validación durante la carga de movimientos.

---

## 6. Precondiciones

- El club activo está resuelto.
- El usuario `admin` puede acceder a `Configuración del club`.
- La operatoria diaria ya permite registrar movimientos.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Admin visualiza la integración | La sección muestra la configuración read-only del recibo del sistema de socios. |
| Secretaría o Tesorería ingresan un recibo válido | El movimiento puede continuar. |
| Secretaría o Tesorería ingresan un recibo inválido | El movimiento se bloquea con feedback. |

---

## 8. Reglas de negocio

- Solo `admin` accede a la visualización de la integración en `Configuración del club`.
- La UI no expone acciones para crear o editar formatos de recibo.
- El formato soportado por defecto es `PAY-SOC-<número de 5 dígitos>`.
- El ejemplo visible es `PAY-SOC-26205`.
- El patrón visible es `^PAY-SOC-[0-9]{5}$`.
- El próximo recibo visible y mínimo inclusivo es `PAY-SOC-10556`.
- No existe valor máximo configurable ni visible.
- El helper de formularios debe mostrar formato válido, ejemplo y disponibilidad desde el mínimo.
- La validación server-side exige:
  - prefijo `PAY-SOC-`
  - bloque numérico de 5 dígitos
  - valor numérico mayor o igual a `10556`

---

## 9. Flujo principal

1. Un admin entra a `Configuración del club`.
2. Abre la sección de Tesorería dentro de `Configuración del club`.
3. Visualiza la integración de recibos en un bloque read-only.
4. Secretaría o Tesorería abren el formulario de movimientos.
5. El sistema muestra el formato válido, un ejemplo y el texto `Disponibles desde PAY-SOC-10556`.
6. Al guardar un movimiento con recibo informado, el sistema valida el valor server-side.

---

## 10. Flujos alternativos

### A. Recibo debajo del mínimo

1. El usuario ingresa `PAY-SOC-10555`.
2. El sistema devuelve `invalid_receipt_format`.

### B. Recibo con patrón inválido

1. El usuario ingresa un valor con prefijo o estructura distinta.
2. El sistema devuelve `invalid_receipt_format`.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- La sección debe convivir con cuentas, categorías y actividades dentro de `Tesorería`.
- La configuración de recibos se renderiza como información read-only.
- No deben mostrarse CTAs para crear o editar formatos de recibo.
- La ayuda contextual del campo `Recibo` debe ser breve y fácil de escanear en mobile.
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
| body | `settings.club.treasury.receipt_formats_description` | Descripción de la integración. |
| label | `settings.club.treasury.receipt_name_label` | Nombre del sistema de socios. |
| label | `settings.club.treasury.receipt_example_label` | Ejemplo fijo. |
| label | `settings.club.treasury.receipt_pattern_label` | Patrón visible. |
| label | `settings.club.treasury.receipt_min_label` | Próximo recibo. |
| body | `settings.club.treasury.receipt_formats_read_only` | Aclaración de solo lectura. |
| label | `dashboard.treasury.receipt_label` | Campo recibo en formulario. |
| body | `dashboard.treasury.receipt_helper_example` | Helper de ejemplo. |
| body | `dashboard.treasury.receipt_helper_available_from` | Helper de disponibilidad. |
| feedback | `dashboard.feedback.invalid_receipt_format` | Recibo inválido. |

---

## 13. Persistencia

### Entidades afectadas
- `treasury_movements`: escritura opcional de `receipt_number` con validación previa.
- `receipt_formats`: puede conservarse internamente por compatibilidad técnica, pero no se administra desde la UI en esta iteración.

Do not reference current code files.

---

## 14. Seguridad

- La validación del recibo debe ejecutarse server-side.
- La integración visible no habilita escrituras desde la UI.
- El comportamiento aplica al club activo resuelto en sesión.

---

## 15. Dependencias

- contracts: `Set receipt formats`, `Create treasury movement`.
- domain entities: `receipt_formats`, `treasury_movements`.
- permissions: solo `admin` visualiza la sección; Secretaría y Tesorería consumen validación.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Aceptar recibos inválidos | Media | Alta | Validar prefijo, longitud y mínimo server-side. |
| Mostrar información distinta entre settings y formularios | Media | Media | Resolver la integración desde una fuente única. |
| Reintroducir edición manual por error | Baja | Media | Eliminar CTAs y formularios de edición en la UI. |
