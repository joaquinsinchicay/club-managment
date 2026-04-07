# PDD — US-28 · Configuración de cuentas de Tesorería y monedas habilitadas por cuenta

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E03 · Tesorería |
| User Story | Como Admin del club, quiero configurar las cuentas de Tesorería y las monedas habilitadas para cada una, para definir correctamente la operatoria financiera del club. |
| Prioridad | Media |
| Objetivo de negocio | Permitir una configuración financiera más realista, separando cuentas operativas de Secretaría y cuentas propias de Tesorería, con monedas habilitadas a nivel de cuenta. |

---

## 2. Problema a resolver

La configuración inicial de cuentas quedó limitada a Secretaría y heredaba de forma rígida las monedas globales del club. Eso no permite modelar cuentas propias de Tesorería ni restringir las monedas que cada cuenta puede operar.

---

## 3. Objetivo funcional

Un usuario `admin` debe poder crear y editar cuentas del club con ámbito `secretaria` o `tesoreria`, definiendo además las monedas habilitadas para cada cuenta dentro del catálogo fijo `ARS` y `USD`.

---

## 4. Alcance

### Incluye
- Extensión de la configuración de cuentas dentro de `Tesorería`.
- Soporte para cuentas con ámbito `tesoreria`.
- Selección obligatoria de una o más monedas por cuenta entre `ARS` y `USD`.
- Visualización del ámbito y monedas configuradas en el listado.
- Validación de nombre obligatorio y al menos una moneda por cuenta.
- Validación de que las monedas seleccionadas pertenezcan al catálogo fijo del MVP.

### No incluye
- Pantalla operativa final para usuarios `tesoreria`.
- Transferencias, cambio de moneda o movimientos propios de Tesorería.
- Baja de cuentas.

---

## 5. Actor principal

Usuario autenticado con membership `activo` y rol `admin` en el club activo.

---

## 6. Precondiciones

- El club activo está resuelto.
- El usuario actual tiene permisos de `admin`.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Admin crea cuenta válida | La cuenta queda asociada al club activo con sus monedas habilitadas. |
| Admin edita cuenta válida | La cuenta queda actualizada sin afectar otros clubes. |

---

## 8. Reglas de negocio

- Solo `admin` puede crear y editar cuentas.
- Toda cuenta pertenece exclusivamente al club activo.
- El nombre de cuenta es obligatorio.
- El tipo de cuenta es obligatorio.
- Debe existir al menos una moneda habilitada para la cuenta.
- Las monedas de la cuenta solo pueden ser `ARS` y/o `USD`.
- No puede existir otra cuenta `active` con el mismo nombre en el mismo club.
- Las cuentas `tesoreria` no deben quedar visibles para Secretaría.
- Las cuentas `secretaria` mantienen su comportamiento actual y siguen consumiendo sus monedas configuradas.

---

## 9. Flujo principal

1. Un admin entra a `Configuración del club`.
2. Abre la solapa `Tesorería`.
3. Visualiza el listado de cuentas del club.
4. Crea o edita una cuenta indicando nombre, tipo, ámbito, estado, emoji y monedas habilitadas.
5. El sistema valida y persiste la configuración.

---

## 10. Flujos alternativos

### A. Cuenta sin nombre

1. El admin intenta guardar sin nombre.
2. El sistema devuelve `account_name_required`.

### B. Cuenta sin monedas

1. El admin intenta guardar sin seleccionar monedas.
2. El sistema devuelve `account_currencies_required`.

### C. Cuenta con moneda inválida

1. El admin intenta guardar una moneda fuera de `ARS` o `USD`.
2. El sistema devuelve `invalid_account_currency`.

### D. Duplicado activo

1. El admin crea o edita una cuenta con nombre repetido en otra cuenta activa del mismo club.
2. El sistema bloquea la operación con `duplicate_account_name`.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- La UI debe seguir dentro de la misma solapa `Tesorería`.
- El formulario debe seguir siendo mobile-first.
- El listado debe mostrar al menos nombre, estado, ámbito y monedas habilitadas.
- Al crear o editar cuentas, el CTA debe entrar en loading de inmediato y el formulario debe quedar bloqueado hasta resolver.
- No debe haber textos hardcodeados.

---

## 12. Mensajes y textos

### Fuente de verdad
- `lib/texts.json`

### Keys requeridas

| Tipo | Key | Contexto |
|---|---|---|
| label | `settings.club.treasury.account_scope_label` | Ámbito de la cuenta. |
| label | `settings.club.treasury.account_currencies_label` | Monedas habilitadas por cuenta. |
| status | `settings.club.treasury.save_account_loading` | Estado visible mientras se crea una cuenta con monedas por cuenta. |
| status | `settings.club.treasury.update_account_loading` | Estado visible mientras se actualiza una cuenta con monedas por cuenta. |
| label | `settings.club.treasury.account_scopes.secretaria` | Scope Secretaría. |
| label | `settings.club.treasury.account_scopes.tesoreria` | Scope Tesorería. |
| feedback | `settings.club.treasury.feedback.account_currencies_required` | Cuenta sin monedas seleccionadas. |
| feedback | `settings.club.treasury.feedback.invalid_account_scope` | Scope inválido. |
| feedback | `settings.club.treasury.feedback.invalid_account_currency` | Monedas fuera del catálogo `ARS`/`USD`. |

---

## 13. Persistencia

### Entidades afectadas
- `treasury_accounts`: READ, INSERT y UPDATE con `account_scope`.
- `treasury_account_currencies`: READ, INSERT y UPDATE por cuenta.

Do not reference current code files.

---

## 14. Seguridad

- La lectura y mutación deben limitarse al club activo.
- Solo `admin` puede operar sobre esta configuración.
- No debe ser posible editar cuentas de otro club manipulando ids.

---

## 15. Dependencias

- contracts: `Get treasury settings`, `Create treasury account`, `Update treasury account`.
- domain entities: `treasury_accounts`, `treasury_account_currencies`.
- other US if relevant: US-15, US-23.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Mezclar cuentas de Secretaría y Tesorería | Media | Media | Persistir `account_scope` y mostrarlo explícitamente en la UI. |
| Permitir monedas fuera de `ARS`/`USD` | Media | Alta | Validar server-side contra el catálogo fijo del MVP. |
