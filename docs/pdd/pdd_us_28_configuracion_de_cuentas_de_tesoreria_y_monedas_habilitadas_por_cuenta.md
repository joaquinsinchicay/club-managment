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
- Saldo inicial por cada moneda habilitada de la cuenta (default 0).
- Campos bancarios opcionales para cuentas tipo `Banco`: entidad bancaria, tipo de cuenta bancaria (cuenta corriente / caja de ahorro), número de cuenta, CBU / CVU.
- Campo CBU/CVU opcional para tipo `Billetera virtual`.
- Visualización de la visibilidad compuesta y monedas configuradas en el listado.
- Validación de nombre obligatorio, al menos una moneda por cuenta y formato de CBU/CVU (22 dígitos numéricos) cuando se completa.
- Consumo operativo por rol según visibilidad configurada.

### No incluye
- Pantalla operativa nueva para usuarios `tesoreria`.
- Transferencias, cambio de moneda o movimientos propios de Tesorería fuera de las historias ya definidas.
- Baja de cuentas.
- Auditoría de última modificación de cuenta (usuario / fecha).

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
- Una cuenta puede quedar sin roles seleccionados en `Visibilidad`; en ese caso permanece oculta para ambos roles.
- Debe existir al menos una moneda habilitada para la cuenta.
- Las monedas de la cuenta solo pueden ser `ARS` y/o `USD`.
- Cada moneda habilitada lleva un `saldo inicial` numérico ≥ 0 (default 0).
- No puede existir otra cuenta con el mismo nombre en el mismo club.
- Si la cuenta tiene visibilidad `secretaria`, Secretaría la ve en formularios y dashboard con todas sus monedas.
- Si la cuenta tiene visibilidad `tesoreria`, Tesorería la ve en sus formularios y en su card del dashboard `/dashboard` con todas sus monedas.
- Si la cuenta tiene ambas visibilidades, ambos roles la visualizan.
- La representación persistida puede conservar `account_scope` como dato legacy no funcional, pero la fuente de verdad de negocio pasa a ser la visibilidad por rol.
- Campos bancarios (`bank_entity`, `bank_account_subtype`, `account_number`, `cbu_cvu`) son opcionales. Solo son relevantes si `accountType = bancaria`; si el tipo cambia a `efectivo`, se persisten en `null`.
- `cbu_cvu` también puede completarse para `billetera_virtual`. Para `efectivo` siempre queda en `null`.
- `bank_account_subtype` solo admite los valores `cuenta_corriente` o `caja_ahorro`.
- Cuando se informa `cbu_cvu`, el valor debe ser exactamente 22 dígitos numéricos.

---

## 9. Flujo principal

1. Un admin entra a `Configuración del club`.
2. Abre la sección de Tesorería dentro de `Configuración del club`.
3. Visualiza el listado de cuentas del club.
4. Crea o edita una cuenta indicando nombre, tipo, visibilidad, emoji seleccionado desde un listado simple del sistema y monedas habilitadas.
5. El sistema valida y persiste la configuración.

---

## 10. Flujos alternativos

### A. Cuenta sin nombre

1. El admin intenta guardar sin nombre.
2. El sistema devuelve `account_name_required`.

### B. Cuenta sin visibilidad

1. El admin guarda sin seleccionar ninguna visibilidad.
2. El sistema permite guardar. La cuenta queda marcada como oculta y no aparece en formularios operativos.

### C. Cuenta sin monedas

1. El admin intenta guardar sin seleccionar monedas.
2. El sistema devuelve `account_currencies_required`.

### D. Cuenta con moneda inválida

1. El admin intenta guardar una moneda fuera de `ARS` o `USD`.
2. El sistema devuelve `invalid_account_currency`.

### E. Duplicado

1. El admin crea o edita una cuenta con nombre repetido en otra cuenta del mismo club.
2. El sistema bloquea la operación con `duplicate_account_name`.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- La UI debe seguir dentro de la misma solapa `Tesorería`.
- El formulario debe seguir siendo mobile-first.
- El listado debe mostrar al menos nombre, visibilidad y monedas habilitadas.
- `Visibilidad` debe resolverse como multicheck con `Secretaría` y `Tesorería`.
- `Monedas habilitadas` debe resolverse como multicheck con `ARS` y `USD`.
- El formulario no debe permitir guardar una cuenta mientras no haya al menos una moneda seleccionada.
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
- `treasury_accounts`: READ, INSERT y UPDATE usando `visible_for_secretaria` y `visible_for_tesoreria` como fuente de verdad funcional. Incluye columnas opcionales `bank_entity`, `bank_account_subtype`, `account_number`, `cbu_cvu`.
- `treasury_account_currencies`: READ, INSERT y UPDATE por cuenta. Incluye columna `initial_balance` (numeric(18,2)) con saldo inicial por moneda habilitada.

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
