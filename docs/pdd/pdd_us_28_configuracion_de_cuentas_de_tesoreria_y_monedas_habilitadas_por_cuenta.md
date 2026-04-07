# PDD — US-28 · Configuración de visibilidad y monedas habilitadas por cuenta

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E03 · Tesorería |
| User Story | Como Admin del club, quiero configurar la visibilidad por rol y las monedas habilitadas de cada cuenta, para definir correctamente qué cuentas usa cada operador del club. |
| Prioridad | Media |
| Objetivo de negocio | Permitir una configuración financiera más realista, donde una cuenta pueda ser usada por Secretaría, por Tesorería o por ambos roles, manteniendo monedas habilitadas a nivel de cuenta. |

---

## 2. Problema a resolver

La configuración actual mezcla `ámbito` con un campo adicional de visibilidad para Secretaría. Eso duplica decisiones, vuelve confuso el formulario y no permite representar claramente cuentas compartidas entre Secretaría y Tesorería.

---

## 3. Objetivo funcional

Un usuario `admin` debe poder crear y editar cuentas del club definiendo un único campo `Visibilidad` multiselección con las opciones `Secretaría` y `Tesorería`, además de las monedas habilitadas por cuenta dentro del catálogo fijo `ARS` y `USD`.

---

## 4. Alcance

### Incluye
- Extensión de la configuración de cuentas dentro de `Tesorería`.
- Campo `Visibilidad` multiselect con `Secretaría` y `Tesorería`.
- Selección obligatoria de una o más monedas por cuenta entre `ARS` y `USD`.
- Visualización de la visibilidad compuesta y monedas configuradas en el listado.
- Validación de nombre obligatorio, al menos una visibilidad y al menos una moneda por cuenta.
- Consumo operativo por rol según visibilidad configurada.

### No incluye
- Pantalla operativa nueva para usuarios `tesoreria`.
- Transferencias, cambio de moneda o movimientos propios de Tesorería fuera de las historias ya definidas.
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
| Admin crea cuenta válida | La cuenta queda asociada al club activo con su visibilidad por rol y monedas habilitadas. |
| Admin edita cuenta válida | La cuenta queda actualizada sin afectar otros clubes. |
| Cuenta visible para un rol | Ese rol puede verla en formularios y saldos donde corresponda. |

---

## 8. Reglas de negocio

- Solo `admin` puede crear y editar cuentas.
- Toda cuenta pertenece exclusivamente al club activo.
- El nombre de cuenta es obligatorio.
- El tipo de cuenta es obligatorio.
- Debe existir al menos una visibilidad habilitada para la cuenta.
- Debe existir al menos una moneda habilitada para la cuenta.
- Las monedas de la cuenta solo pueden ser `ARS` y/o `USD`.
- No puede existir otra cuenta `active` con el mismo nombre en el mismo club.
- Si la cuenta tiene visibilidad `secretaria`, Secretaría la ve en formularios y dashboard con todas sus monedas.
- Si la cuenta tiene visibilidad `tesoreria`, Tesorería la ve en sus formularios y dashboards presentes o futuros con todas sus monedas.
- Si la cuenta tiene ambas visibilidades, ambos roles la visualizan.
- La representación persistida puede conservar `account_scope` como dato legacy no funcional, pero la fuente de verdad de negocio pasa a ser la visibilidad por rol.

---

## 9. Flujo principal

1. Un admin entra a `Configuración del club`.
2. Abre la solapa `Tesorería`.
3. Visualiza el listado de cuentas del club.
4. Crea o edita una cuenta indicando nombre, tipo, visibilidad, estado, emoji seleccionado desde un listado simple del sistema y monedas habilitadas.
5. El sistema valida y persiste la configuración.

---

## 10. Flujos alternativos

### A. Cuenta sin nombre

1. El admin intenta guardar sin nombre.
2. El sistema devuelve `account_name_required`.

### B. Cuenta sin visibilidad

1. El admin intenta guardar sin seleccionar ninguna visibilidad.
2. El sistema devuelve `account_visibility_required`.

### C. Cuenta sin monedas

1. El admin intenta guardar sin seleccionar monedas.
2. El sistema devuelve `account_currencies_required`.

### D. Cuenta con moneda inválida

1. El admin intenta guardar una moneda fuera de `ARS` o `USD`.
2. El sistema devuelve `invalid_account_currency`.

### E. Duplicado activo

1. El admin crea o edita una cuenta con nombre repetido en otra cuenta activa del mismo club.
2. El sistema bloquea la operación con `duplicate_account_name`.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- La UI debe seguir dentro de la misma solapa `Tesorería`.
- El formulario debe seguir siendo mobile-first.
- El listado debe mostrar al menos nombre, estado, visibilidad y monedas habilitadas.
- `Visibilidad` debe resolverse como multicheck con `Secretaría` y `Tesorería`.
- El campo `Emoji` debe resolverse con un selector simple de opciones predefinidas del sistema.
- No debe existir un segundo campo redundante de “Visible para Secretaría” en cuentas.
- Al crear o editar cuentas, el CTA debe entrar en loading de inmediato y el formulario debe quedar bloqueado hasta resolver.
- No debe haber textos hardcodeados.

---

## 12. Mensajes y textos

### Fuente de verdad
- `lib/texts.json`

### Keys requeridas

| Tipo | Key | Contexto |
|---|---|---|
| label | `settings.club.treasury.account_visibility_label` | Visibilidad de la cuenta. |
| label | `settings.club.treasury.account_visibility_options.secretaria` | Opción Secretaría. |
| label | `settings.club.treasury.account_visibility_options.tesoreria` | Opción Tesorería. |
| label | `settings.club.treasury.account_currencies_label` | Monedas habilitadas por cuenta. |
| label | `settings.club.treasury.emoji_placeholder` | Placeholder del selector de emoji. |
| status | `settings.club.treasury.save_account_loading` | Estado visible mientras se crea una cuenta con visibilidad y monedas. |
| status | `settings.club.treasury.update_account_loading` | Estado visible mientras se actualiza una cuenta con visibilidad y monedas. |
| feedback | `settings.club.treasury.feedback.account_visibility_required` | Cuenta sin visibilidad seleccionada. |
| feedback | `settings.club.treasury.feedback.invalid_emoji_option` | Emoji fuera del catálogo predefinido del sistema. |
| feedback | `settings.club.treasury.feedback.account_currencies_required` | Cuenta sin monedas seleccionadas. |
| feedback | `settings.club.treasury.feedback.invalid_account_currency` | Monedas fuera del catálogo `ARS`/`USD`. |

---

## 13. Persistencia

### Entidades afectadas
- `treasury_accounts`: READ, INSERT y UPDATE usando `visible_for_secretaria` y `visible_for_tesoreria` como fuente de verdad funcional.
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
- other US if relevant: US-11, US-12, US-14, US-15, US-23.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Mantener reglas contradictorias entre `scope` y visibilidad | Media | Alta | Tomar la visibilidad por rol como única fuente de verdad funcional. |
| Permitir cuentas invisibles para ambos roles | Media | Media | Validar server-side al menos una visibilidad. |
| Permitir monedas fuera de `ARS`/`USD` | Media | Alta | Validar server-side contra el catálogo fijo del MVP. |
