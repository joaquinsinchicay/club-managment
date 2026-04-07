# PDD — US-23 · Configuración de monedas disponibles para tesorería

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E03 · Tesorería |
| User Story | Como equipo de producto, queremos fijar las monedas operativas del MVP en `ARS` y `USD`, para evitar configuración global por club y delegar la selección al alta de cada cuenta. |
| Prioridad | Media |
| Objetivo de negocio | Simplificar el MVP eliminando configuración global de monedas y haciendo que la operatoria dependa exclusivamente de las monedas habilitadas en cada cuenta. |

---

## 2. Problema a resolver

La existencia de una configuración global de monedas por club agrega complejidad innecesaria al MVP y duplica decisiones que igualmente deben resolverse a nivel de cuenta.

---

## 3. Objetivo funcional

El sistema debe operar con un catálogo fijo `ARS` y `USD` para todos los clubes. No existe una pantalla ni acción para configurar monedas globales del club. La selección de moneda queda a cargo del alta o edición de cada cuenta y la operatoria diaria consume únicamente las monedas permitidas por la cuenta elegida.

---

## 4. Alcance

### Incluye
- Catálogo fijo `ARS` y `USD` para el MVP.
- Eliminación de la sección global de monedas dentro de `Configuración del club > Tesorería`.
- Consumo de monedas según la cuenta seleccionada en la operatoria diaria.

### No incluye
- Conversión automática de montos entre monedas.
- Cotización de moneda extranjera.
- Configuración global por club.
- Moneda principal del club.
- Monedas fuera de `ARS` y `USD`.

---

## 5. Actor principal

Usuario autenticado con membership `activo` y rol `admin` para visualizar la configuración simplificada; usuario `secretaria` para consumir la moneda definida por cuenta en la operatoria diaria.

---

## 6. Precondiciones

- El club activo está resuelto.
- El usuario `admin` puede acceder a `Configuración del club`.
- La operatoria diaria ya permite cargar movimientos y mostrar saldos.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Admin entra a Tesorería | No ve configuración global de monedas. |
| Admin crea o edita cuenta | Puede elegir `ARS`, `USD` o ambas para la cuenta. |
| Secretaría accede al formulario | La moneda disponible depende de la cuenta seleccionada y no existe moneda principal del club. |

---

## 8. Reglas de negocio

- El catálogo operativo del MVP es fijo: `ARS` y `USD`.
- No existe configuración global de monedas por club.
- Secretaría solo puede registrar movimientos con monedas válidas para la cuenta seleccionada.
- No existe moneda principal ni precarga derivada de una configuración del club.

---

## 9. Flujo principal

1. Un admin entra a `Configuración del club`.
2. Abre la solapa `Tesorería`.
3. No encuentra una sección de configuración global de monedas.
4. Crea o edita una cuenta y define `ARS`, `USD` o ambas.
5. Secretaría abre el formulario de movimientos.
6. El sistema habilita únicamente las monedas permitidas por la cuenta seleccionada.

---

## 10. Flujos alternativos

### A. Catálogo inválido

1. Un flujo intenta operar con una moneda distinta de `ARS` o `USD`.
2. El sistema bloquea la acción.

### B. Cuenta sin monedas

1. El admin intenta guardar una cuenta sin seleccionar monedas.
2. El sistema devuelve `account_currencies_required`.

---

## 11. UI / UX

### Fuente de verdad
- `docs/design/design-system.md`

### Reglas
- No debe mostrarse una sección de configuración global de monedas dentro de `Tesorería`.
- No debe haber textos hardcodeados.

---

## 12. Mensajes y textos

### Fuente de verdad
- `lib/texts.json`

### Keys requeridas

| Tipo | Key | Contexto |
|---|---|---|
| label | `settings.club.treasury.currency_options.ARS` | Opción ARS. |
| label | `settings.club.treasury.currency_options.USD` | Opción USD. |

---

## 13. Persistencia

### Entidades afectadas
- `treasury_account_currencies`: fuente operativa de monedas por cuenta.

Do not reference current code files.

---

## 14. Seguridad

- La validación de moneda en el registro de movimientos debe ejecutarse server-side contra la cuenta seleccionada.

---

## 15. Dependencias

- contracts: `Create treasury movement`, `Create treasury account`, `Update treasury account`.
- domain entities: `treasury_account_currencies`, `treasury_movements`.
- other US if relevant: US-11, US-15, US-28.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Mostrar monedas fuera del catálogo `ARS`/`USD` | Baja | Media | Validar server-side y limitar el catálogo visible. |
| Desalinear monedas visibles y validación del movimiento | Media | Alta | Consumir la moneda permitida por cuenta tanto en UI como en server-side. |
