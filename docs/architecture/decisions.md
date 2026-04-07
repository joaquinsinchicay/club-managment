# Architecture Decisions

## Objetivo

Este documento registra las decisiones arquitectónicas y de implementación del MVP de gestión de clubes.
Su objetivo es evitar ambigüedades durante el desarrollo, mantener consistencia entre módulos y servir como referencia obligatoria para cualquier IA o desarrollador que implemente funcionalidades sobre este sistema.

---

## 1. Principios arquitectónicos

1. El sistema es **multi-tenant por club**.
2. La seguridad debe resolverse en backend y database, no en frontend.
3. El modelo de permisos depende de la `membership` del usuario en el club activo.
4. La base de datos es la fuente de verdad del sistema.
5. Los movimientos monetarios son la fuente primaria de verdad financiera.
6. Las operaciones críticas deben ser transaccionales.
7. Toda acción sensible debe ser auditable.
8. El MVP prioriza claridad y consistencia sobre flexibilidad extrema.

---

## 2. Stack objetivo

## 2.1 Frontend

* Next.js
* App Router
* TypeScript
* Server Components donde tenga sentido
* Client Components solo para interacción necesaria

## 2.2 Backend

* Next.js server actions o route handlers
* Lógica de negocio delgada en capa de acciones
* Validaciones explícitas antes de escribir en base

## 2.3 Base de datos

* PostgreSQL
* Supabase como proveedor de auth + db + RLS

## 2.4 Auth

* Google OAuth mediante Supabase Auth

---

## 3. Multi-tenancy

## 3.1 Unidad de aislamiento

La unidad de aislamiento es el **club**.

Toda entidad operativa relevante debe pertenecer a un club o derivar inequívocamente de uno.

## 3.2 Regla obligatoria

Toda operación autenticada debe ejecutarse dentro de un `active_club_id`.

## 3.3 Regla de implementación

No se debe confiar en el club enviado por frontend como única fuente.
El backend debe validar que el usuario tiene membership activa en ese club.

## 3.4 Seguridad

El aislamiento entre clubes debe estar reforzado por:

* validación en backend
* RLS en database
* joins y queries siempre filtrados por club

---

## 4. Modelo de acceso

## 4.1 Usuario global

El usuario existe una sola vez a nivel sistema.

## 4.2 Membership como eje de permisos

Los permisos no dependen del usuario global sino de la membership en el club activo.

## 4.3 Decisión cerrada

Cada membership tiene uno o más roles.

Roles válidos:

* `admin`
* `secretaria`
* `tesoreria`

## 4.4 Interpretación obligatoria

Toda referencia funcional del tipo:

* “como admin”
* “como secretaria”
* “como tesorería”

debe interpretarse como:

> usuario cuya membership activa en el club activo incluye ese rol

---

## 5. Organización de datos

## 5.1 Una sola tabla de cuentas

Todas las cuentas del club se modelan en una sola tabla: `treasury_accounts`.

No deben existir tablas separadas para cuentas de Secretaría y Tesorería.

La disponibilidad operativa por rol se resuelve mediante configuración:

* `visible_for_secretaria`
* `visible_for_tesoreria`

`account_scope` puede conservarse solo como dato legacy de compatibilidad, pero no debe definir el comportamiento funcional.

## 5.2 Una sola tabla de movimientos

Todos los movimientos monetarios del sistema se modelan en una sola tabla: `treasury_movements`.

No deben separarse en tablas distintas según origen.

La distinción entre tipos de movimiento se resuelve con:

* `origin_role`
* `origin_source`
* `status`
* referencias auxiliares

## 5.3 Saldo derivado

El saldo de una cuenta se calcula a partir de movimientos.

No existe tabla de saldos persistidos como fuente primaria en MVP.

Si en el futuro se agregan snapshots o caches:

* deben ser derivados
* nunca deben reemplazar a `treasury_movements` como fuente de verdad

---

## 6. Convenciones de implementación para movimientos

## 6.1 Importe siempre positivo

El campo `amount` se persiste siempre como valor positivo.

## 6.2 Signo contable

El impacto en saldo depende de `movement_type`:

* `ingreso` suma
* `egreso` resta

## 6.3 Fuente del movimiento

El origen del movimiento debe quedar explícito:

* `secretaria`
* `tesoreria`
* `system`

## 6.4 Estado del movimiento

El estado del movimiento es parte central del dominio y no un detalle técnico.

Estados esperados:

* `pending_consolidation`
* `integrated`
* `consolidated`
* `posted`
* `cancelled`

## 6.5 Inmutabilidad operativa

Los movimientos de Secretaría no deben editarse libremente después del cierre de jornada.

---

## 7. Jornadas diarias

## 7.1 Una jornada por club y fecha

Solo puede existir una jornada diaria por club y fecha.

## 7.2 Apertura obligatoria para Secretaría

Secretaría solo puede operar movimientos del día si existe una jornada abierta.

## 7.3 Cierre bloqueante

Una vez cerrada la jornada:

* Secretaría no puede editar movimientos
* Secretaría no puede crear nuevos movimientos para esa jornada cerrada
* Tesorería solo puede corregir mediante flujo de consolidación auditado

## 7.4 Ajustes automáticos

Las diferencias detectadas entre saldo esperado y saldo declarado en apertura/cierre generan ajustes trazables.

No deben resolverse con modificación silenciosa de saldo.

---

## 8. Consolidación

## 8.1 La consolidación es un proceso explícito

La consolidación diaria no es implícita ni automática por defecto.

Debe existir una entidad explícita: `daily_consolidation_batches`.

## 8.2 Unidad de consolidación

La consolidación se ejecuta por:

* club
* fecha

## 8.3 Qué puede hacer Tesorería durante consolidación

Tesorería puede:

* revisar movimientos pendientes
* corregir imputaciones
* integrar coincidencias
* consolidar el día

## 8.4 Restricción clave

La corrección durante consolidación debe preservar trazabilidad.

No se permite corrección destructiva sin historial.

## 8.5 Integraciones

Si un movimiento de Secretaría coincide con uno ya existente en Tesorería:

* se debe registrar una integración explícita
* no debe producirse doble impacto contable

## 8.6 Idempotencia funcional

Una fecha ya consolidada no debe consolidarse nuevamente.

---

## 9. Auditoría

## 9.1 Auditoría obligatoria

Toda acción sensible sobre movimientos debe quedar auditada.

## 9.2 Acciones auditables mínimas

* creación
* edición en consolidación
* integración
* consolidación
* cancelación

## 9.3 Qué debe preservarse

El log de auditoría debe permitir reconstruir:

* valor original
* valor final
* quién hizo el cambio
* cuándo ocurrió

## 9.4 Regla de implementación

No usar auditoría “best effort”.
La auditoría debe ser parte de la misma transacción lógica cuando la acción la requiera.

---

## 10. Operaciones transaccionales

Las siguientes operaciones deben implementarse como transacciones atómicas:

### 10.1 Apertura de jornada

Incluye:

* creación de sesión
* registro de balances
* generación de ajustes si corresponde

### 10.2 Cierre de jornada

Incluye:

* registro de balances
* generación de ajustes si corresponde
* cambio de estado de sesión

### 10.3 Registro de transferencia

Incluye:

* creación del registro de transferencia
* creación de movimiento egreso
* creación de movimiento ingreso

### 10.4 Registro de compra/venta de moneda

Incluye:

* creación de operación FX
* creación de movimiento origen
* creación de movimiento destino

### 10.5 Consolidación diaria

Incluye:

* validación de pendientes
* correcciones necesarias
* integraciones
* actualización de estados
* creación del batch
* auditoría

---

## 11. Validación

## 11.1 Validación en frontend

Puede existir para UX, pero nunca es suficiente.

## 11.2 Validación en backend

Toda operación debe validar:

* autenticación
* club activo
* membership
* rol
* pertenencia de los recursos al club activo
* reglas de negocio

## 11.3 Validación en database

Debe reforzarse con:

* foreign keys
* unique constraints
* check constraints
* RLS

---

## 12. Convenciones de modelado

## 12.1 IDs

Todas las entidades principales usan UUID.

## 12.2 Timestamps

Las entidades persistidas deben incluir timestamps relevantes.

## 12.3 Soft delete vs hard delete

Para MVP:

* preferir cambio de estado sobre borrado físico en entidades operativas/configurables
* evitar hard delete cuando afecte trazabilidad

## 12.4 Estados explícitos

Las entidades con lifecycle relevante deben tener estado explícito.

## 12.5 Naming

* nombres de tablas en plural
* nombres de columnas descriptivos
* evitar abreviaturas ambiguas

---

## 13. Convenciones para IA implementadora

## 13.1 No reinterpretar decisiones cerradas

No modificar:

* modelo de roles
* modelo de cuentas
* modelo de movimientos
* estrategia de saldo
* flujo de consolidación
* regla de inmutabilidad post cierre

## 13.2 No introducir abstracciones innecesarias

No agregar capas o patrones complejos sin necesidad del MVP.

## 13.3 No dividir el dominio contable en múltiples modelos paralelos

No crear estructuras alternativas para movimientos o saldos.

## 13.4 No confiar en frontend para seguridad

Todo permiso debe revalidarse en backend/database.

## 13.5 No alterar contratos sin actualizar documentación

Si cambia comportamiento:

* actualizar `domain-model.md`
* actualizar `schema.sql`
* actualizar `api-contracts.md`
* actualizar este documento

---

## 14. Orden recomendado de implementación

1. Auth con Google
2. Resolución de contexto de sesión y club activo
3. Memberships y permisos
4. Configuración de tesorería
5. Apertura/cierre de jornada
6. Registro de movimientos
7. Detalle de cuentas y saldos
8. Transferencias
9. Operaciones FX
10. Consolidación
11. Auditoría completa
12. Hardening de RLS

---

## 15. Estructura documental esperada

```text
/domain
  domain-model.md
  schema.sql

/database
  rls-policies.sql
  README.md

/contracts
  api-contracts.md

/architecture
  decisions.md
```

---

## 16. Criterio de prioridad para MVP

Ante conflicto entre alternativas, priorizar:

1. consistencia funcional
2. seguridad multi-club
3. trazabilidad
4. simplicidad de implementación
5. performance avanzada después

---

## 17. Resumen ejecutivo de decisiones cerradas

1. Multi-tenant por club.
2. Membership como eje de permisos.
3. Un solo rol por membership.
4. Una sola tabla de cuentas.
5. Una sola tabla de movimientos.
6. Saldo derivado por movimientos.
7. Jornada diaria obligatoria para Secretaría.
8. Consolidación explícita por fecha y club.
9. Corrección de Tesorería solo con auditoría.
10. Operaciones críticas siempre transaccionales.

```
```
