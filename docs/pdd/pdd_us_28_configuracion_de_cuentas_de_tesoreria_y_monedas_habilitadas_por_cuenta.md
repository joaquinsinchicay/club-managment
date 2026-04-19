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

Un usuario `admin` debe poder crear y editar cuentas del club definiendo un único campo `Visibilidad` multiselección con las opciones `Secretaría` y `Tesorería`, más la única moneda operativa de la cuenta dentro del catálogo fijo `ARS` o `USD`. Para operar la misma entidad en dos monedas se crean dos cuentas separadas.

---

## 4. Alcance

### Incluye
- Extensión de la configuración de cuentas dentro de `Tesorería`.
- Visibilidad: Tesorería la ve siempre. Secretaría es un opt-in booleano (`available_for_secretaria`) representado como checkbox único en el formulario.
- Selección obligatoria de **exactamente una** moneda por cuenta entre `ARS` y `USD`.
- Saldo inicial de la moneda operativa de la cuenta (default 0).
- Campos obligatorios para cuentas tipo `Banco`: entidad bancaria y tipo de cuenta bancaria (cuenta corriente / caja de ahorro). Opcionales: número de cuenta, CBU / CVU (22 dígitos numéricos).
- Para cuentas tipo `Banco`, el `nombre` se compone automáticamente como `"{entidad_bancaria} - {tipo_cuenta_bancaria}"` (ej: `"Banco Nación - Caja de ahorro"`) y se muestra como campo read-only en el formulario.
- Campos de billetera virtual: selector de `Proveedor` (Mercado Pago, Ualá, Personal Pay, Naranja X, Otro) y campo `Alias` alfanumérico con punto como único separador permitido.
- Validación de nombre obligatorio (auto-compuesto para Banco), moneda única obligatoria, formato de CBU (22 dígitos numéricos) y formato de Alias (sólo letras, números y `.`).
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
- El nombre de cuenta es obligatorio. Para `accountType = bancaria`, el `name` se deriva server-side como `"{bank_entity} - {bank_account_subtype_label}"` y el input en UI es read-only. Para `billetera_virtual` y `efectivo` el nombre es ingresado libremente por el admin.
- El tipo de cuenta es obligatorio y debe ser uno de `bancaria`, `billetera_virtual` o `efectivo`.
- Tesorería siempre ve la cuenta (`visible_for_tesoreria = true` por regla de sistema). No hay checkbox para desactivarlo.
- Secretaría es opt-in: `visible_for_secretaria` refleja el checkbox `Disponible para Secretaría`.
- Debe existir **exactamente una** moneda operativa para la cuenta.
- La moneda de la cuenta solo puede ser `ARS` o `USD`.
- La moneda operativa lleva un `saldo inicial` numérico ≥ 0 (default 0).
- No puede existir otra cuenta con el mismo nombre en el mismo club.
- La representación persistida puede conservar `account_scope` como dato legacy no funcional, pero la fuente de verdad de negocio pasa a ser la visibilidad por rol.
- Si `accountType = bancaria`: `bank_entity` y `bank_account_subtype` son **obligatorios**. `bank_account_subtype` solo admite `cuenta_corriente` o `caja_ahorro`. Se aceptan `account_number` y `cbu_cvu` como datos opcionales; si se informa `cbu_cvu`, debe ser exactamente 22 dígitos numéricos. El catálogo de `bank_entity` no incluye la opción genérica `Otro`.
- Si `accountType = billetera_virtual`: se habilitan `wallet_provider` (persistido en la columna `bank_entity`) y `alias` (persistido en la columna `cbu_cvu`). El alias acepta letras, números y `.` como único carácter especial.
- Si `accountType = efectivo`: todos los campos bancarios se fuerzan a `null` antes de persistir.
- En **edición**, quedan bloqueados (read-only) el `tipo de cuenta`, la `moneda` operativa, y —para cuentas `bancaria`— la `entidad bancaria` y el `tipo de cuenta bancaria`. Como consecuencia, para `bancaria` el `nombre` derivado también es inmutable. Los movimientos ya registrados contra la cuenta referencian esos datos; modificarlos invalidaría esos movimientos. Para cambiar tipo, moneda o datos bancarios de identidad hay que dar de alta una nueva cuenta y archivar la anterior.
- El modal de creación y edición no expone botón de cerrar en la esquina superior derecha; el cierre se realiza desde el CTA `Cancelar` del footer.

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

### C. Cuenta sin moneda

1. El admin intenta guardar sin seleccionar moneda.
2. El sistema devuelve `account_currency_required`.

### C1. Cuenta con más de una moneda

1. El admin intenta forzar más de una moneda server-side.
2. El sistema devuelve `account_single_currency_required`.

### D. Cuenta con moneda inválida

1. El admin intenta guardar una moneda fuera de `ARS` o `USD`.
2. El sistema devuelve `invalid_account_currency`.

### F. Cuenta Banco sin entidad o sin tipo de cuenta

1. El admin, al crear una cuenta `bancaria`, no selecciona `entidad bancaria` o `tipo de cuenta bancaria`.
2. El sistema devuelve `bank_entity_required` o `bank_account_subtype_required` según corresponda.

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
- El listado debe mostrar al menos nombre, visibilidad y la moneda operativa de la cuenta.
- El listado de cuentas no muestra label multimoneda ni desglose por moneda. Cada cuenta expone un único saldo en su moneda operativa.
- `Visibilidad` debe resolverse como multicheck con `Secretaría` y `Tesorería`.
- `Moneda` debe resolverse como selector único y excluyente entre `ARS` y `USD`.
- Para cuentas `bancaria`, el input `Nombre` es read-only y se compone automáticamente al elegir entidad y tipo de cuenta.
- El formulario no debe permitir guardar una cuenta mientras no haya una moneda seleccionada.
- El campo `Emoji` debe resolverse con un selector simple de opciones predefinidas del sistema.
- No debe existir un segundo campo redundante de "Visible para Secretaría" en cuentas.
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
| label | `settings.club.treasury.account_currency_label` | Moneda operativa de la cuenta. |
| label | `settings.club.treasury.account_name_banco_auto_placeholder` | Placeholder del nombre auto-compuesto para Banco. |
| label | `settings.club.treasury.account_name_banco_helper` | Ayuda bajo el input de nombre cuando la cuenta es `bancaria`. |
| label | `settings.club.treasury.emoji_placeholder` | Placeholder del selector de emoji. |
| status | `settings.club.treasury.save_account_loading` | Estado visible mientras se crea una cuenta. |
| status | `settings.club.treasury.update_account_loading` | Estado visible mientras se actualiza una cuenta. |
| feedback | `settings.club.treasury.feedback.account_visibility_required` | Cuenta sin visibilidad seleccionada. |
| feedback | `settings.club.treasury.feedback.invalid_emoji_option` | Emoji fuera del catálogo predefinido del sistema. |
| feedback | `settings.club.treasury.feedback.account_currency_required` | Cuenta sin moneda seleccionada. |
| feedback | `settings.club.treasury.feedback.account_single_currency_required` | Intento de persistir más de una moneda operativa. |
| feedback | `settings.club.treasury.feedback.invalid_account_currency` | Moneda fuera del catálogo `ARS`/`USD`. |
| feedback | `settings.club.treasury.feedback.bank_entity_required` | Cuenta `bancaria` sin entidad bancaria seleccionada. |
| feedback | `settings.club.treasury.feedback.bank_account_subtype_required` | Cuenta `bancaria` sin tipo de cuenta bancaria seleccionada. |

---

## 13. Persistencia

### Entidades afectadas
- `treasury_accounts`: READ, INSERT y UPDATE usando `visible_for_secretaria` y `visible_for_tesoreria` como fuente de verdad funcional. Incluye columnas opcionales `bank_entity`, `bank_account_subtype`, `account_number`, `cbu_cvu`. Para `accountType = bancaria`, `bank_entity` y `bank_account_subtype` son obligatorios.
- `treasury_account_currencies`: READ, INSERT y UPDATE por cuenta. Invariante: **exactamente 1 row por cuenta**, reforzado por un unique index sobre `account_id`. Incluye columna `initial_balance` (numeric(18,2)) con saldo inicial de la moneda operativa.

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
