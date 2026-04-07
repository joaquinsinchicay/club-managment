# PDD — US-23 · Configuración de monedas disponibles para tesorería

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E03 · Tesorería |
| User Story | Como Admin del club, quiero configurar las monedas disponibles para tesorería, para definir qué moneda puede utilizar Secretaria en la carga de movimientos y en la visualización de saldos del club. |
| Prioridad | Media |
| Objetivo de negocio | Dar control por club sobre las monedas operativas de Secretaría y establecer una moneda principal que ordene la experiencia de carga diaria. |

---

## 2. Problema a resolver

La operatoria diaria de Secretaría todavía asume una sola moneda fija. Eso impide adaptar el flujo a clubes que trabajan con varias monedas y no deja definido cuál debe precargarse por defecto al registrar movimientos.

---

## 3. Objetivo funcional

Un usuario `admin` debe poder configurar desde la solapa `Tesorería` qué monedas del set predefinido `ARS`, `USD` y `EUR` quedan habilitadas para el club activo, y cuál de ellas será la moneda principal. Secretaría debe consumir esa configuración al ver saldos y al registrar movimientos.

---

## 4. Alcance

### Incluye
- Sección de monedas dentro de `Configuración del club > Tesorería`.
- Listado fijo de monedas `ARS`, `USD` y `EUR`.
- Selección de una o más monedas habilitadas.
- Definición de una única moneda principal.
- Persistencia por club activo.
- Uso de monedas habilitadas en el formulario de movimientos.
- Precarga de la moneda principal en el formulario de Secretaría.

### No incluye
- Conversión automática de montos entre monedas.
- Cotización de moneda extranjera.
- Configuración específica de monedas por cuenta; eso queda para US-28.

---

## 5. Actor principal

Usuario autenticado con membership `activo` y rol `admin` para configurar; usuario `secretaria` para consumir la configuración en la operatoria diaria.

---

## 6. Precondiciones

- El club activo está resuelto.
- El usuario `admin` puede acceder a `Configuración del club`.
- La operatoria diaria ya permite cargar movimientos y mostrar saldos.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Admin guarda monedas válidas | La configuración queda asociada solo al club activo. |
| Admin intenta guardar sin monedas | El sistema bloquea la operación. |
| Admin define moneda principal fuera de la selección | El sistema rechaza la operación con feedback. |
| Secretaría accede al formulario | Solo ve monedas habilitadas y la principal queda precargada. |

---

## 8. Reglas de negocio

- Solo `admin` puede modificar la configuración de monedas.
- El catálogo visible para configuración es fijo: `ARS`, `USD`, `EUR`.
- Debe existir al menos una moneda habilitada.
- Debe existir una sola moneda principal.
- La moneda principal debe pertenecer al listado de monedas habilitadas.
- La configuración aplica únicamente al club activo.
- Secretaría solo puede registrar movimientos con monedas habilitadas para el club activo.
- Mientras no exista configuración persistida, el sistema puede operar con fallback `ARS` para no romper la experiencia previa.

---

## 9. Flujo principal

1. Un admin entra a `Configuración del club`.
2. Abre la solapa `Tesorería`.
3. Visualiza la sección de monedas con `ARS`, `USD` y `EUR`.
4. Selecciona una o más monedas.
5. Marca una de ellas como principal.
6. Confirma la configuración.
7. Secretaría abre el formulario de movimientos y ve solo las monedas habilitadas con la principal precargada.

---

## 10. Flujos alternativos

### A. Sin monedas seleccionadas

1. El admin intenta guardar sin seleccionar ninguna moneda.
2. El sistema devuelve `treasury_currencies_required`.

### B. Moneda principal inválida

1. El admin intenta guardar con una moneda principal que no está incluida.
2. El sistema devuelve `primary_currency_invalid`.

### C. Cambio de club activo

1. El usuario cambia de club activo.
2. El sistema carga la configuración de monedas correspondiente a ese club sin afectar otras configuraciones.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- La sección debe convivir con cuentas, categorías, actividades y formatos dentro de `Tesorería`.
- La selección debe ser simple de usar en mobile: checkboxes para monedas habilitadas y radio buttons para moneda principal.
- No debe haber textos hardcodeados.

---

## 12. Mensajes y textos

### Fuente de verdad
- `lib/texts.json`

### Keys requeridas

| Tipo | Key | Contexto |
|---|---|---|
| title | `settings.club.treasury.currencies_title` | Encabezado de la sección. |
| body | `settings.club.treasury.currencies_description` | Descripción de la sección. |
| label | `settings.club.treasury.currency_selection_label` | Grupo de monedas disponibles. |
| label | `settings.club.treasury.primary_currency_label` | Selección de moneda principal. |
| action | `settings.club.treasury.save_currencies_cta` | Guardado de configuración. |
| label | `settings.club.treasury.currency_options.ARS` | Opción ARS. |
| label | `settings.club.treasury.currency_options.USD` | Opción USD. |
| label | `settings.club.treasury.currency_options.EUR` | Opción EUR. |
| feedback | `settings.club.treasury.feedback.treasury_currencies_updated` | Guardado exitoso. |
| feedback | `settings.club.treasury.feedback.treasury_currencies_required` | Sin monedas seleccionadas. |
| feedback | `settings.club.treasury.feedback.primary_currency_invalid` | Principal fuera de selección. |

---

## 13. Persistencia

### Entidades afectadas
- `club_treasury_currencies`: READ y reemplazo completo de la configuración por club.
- `treasury_account_currencies`: sincronización base del slice actual para que las cuentas operativas reflejen las monedas habilitadas mientras no exista configuración por cuenta.

Do not reference current code files.

---

## 14. Seguridad

- La lectura y escritura se resuelven por club activo.
- Solo `admin` puede cambiar la configuración.
- La validación de moneda en el registro de movimientos debe ejecutarse server-side.

---

## 15. Dependencias

- contracts: `Set treasury currencies`, `Create treasury movement`.
- domain entities: `club_treasury_currencies`, `treasury_account_currencies`, `treasury_movements`.
- permissions: `Configurar monedas` solo para `admin`.
- other US if relevant: US-11, US-12, US-13, US-14, US-15.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Configuración inválida sin moneda principal | Media | Alta | Validar server-side antes de persistir. |
| Mostrar monedas de otro club | Baja | Alta | Resolver siempre por club activo. |
| Desalinear monedas visibles y validación del movimiento | Media | Alta | Consumir la misma configuración para UI y validación server-side. |
