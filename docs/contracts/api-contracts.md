# API Contracts

## Objetivo

Este documento define los contratos funcionales de API del sistema de gestión de clubes.
Su propósito es servir como referencia para implementar acciones del backend, server actions, endpoints o servicios internos de forma consistente con el modelo de dominio, el esquema de datos y las reglas de permisos.

---

## 1. Reglas generales

1. Toda operación autenticada ocurre dentro de un **club activo**.
2. El club activo debe resolverse en backend, nunca confiar solo en frontend.
3. Los permisos se validan según la `membership` activa del usuario para ese club.
4. Todas las operaciones deben respetar RLS y validaciones de negocio.
5. Los importes monetarios se envían siempre como valores positivos.
6. El signo operativo depende de `movement_type`.
7. Todas las respuestas deben ser determinísticas y explícitas.
8. Toda operación sensible debe devolver errores de permisos, validación o conflicto de forma clara.
9. Las operaciones de jornada diaria deben resolver el estado vigente desde `daily_cash_sessions` del club activo.
10. Toda lectura o mutación operativa dependiente de RLS por club debe ejecutarse con `app.current_club_id` seteado server-side antes de acceder a datos del club activo.

---

## 2. Convención de respuesta

## 2.1 Respuesta exitosa

```json
{
  "success": true,
  "data": {}
}
```

## 2.2 Respuesta con error

```json
{
  "success": false,
  "error": {
    "code": "string_code",
    "message": "Mensaje legible para humanos"
  }
}
```

---

## 3. Contexto de autenticación

Toda operación autenticada debe resolver:

* `auth_user_id`
* `active_club_id`
* `membership.roles`
* `membership.status`

Si no existe contexto válido:

* no debe ejecutarse la operación
* debe devolver error de autenticación o permisos

---

## 4. Módulo de acceso y clubes

### 4.1 Get current session context

**Purpose**
Obtener usuario autenticado, clubes disponibles y club activo.

**Auth required**
Sí

**Allowed roles**
Cualquier usuario autenticado

**Input**

```json
{}
```

**Output**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "Nombre Apellido",
    "avatar_url": "https://..."
  },
  "active_club_id": "uuid|null",
  "memberships": [
    {
      "club_id": "uuid",
      "club_name": "Club Atlético Ejemplo",
      "roles": ["admin", "tesoreria"],
      "status": "activo"
    }
  ]
}
```

---

### 4.2 Set active club

**Purpose**
Actualizar el club activo del usuario.

**Auth required**
Sí

**Allowed roles**
Usuario con membership activa en el club destino

**Input**

```json
{
  "club_id": "uuid"
}
```

**Validations**

* el usuario debe pertenecer al club
* la membership debe estar en estado `activo`

**Output**

```json
{
  "active_club_id": "uuid"
}
```

---

### 4.3 Get club members

**Purpose**
Obtener miembros del club activo.

**Auth required**
Sí

**Allowed roles**
`admin`

**Input**

```json
{}
```

**Output**

```json
{
  "members": [
    {
      "membership_id": "uuid",
      "user_id": "uuid",
      "full_name": "Nombre",
      "email": "mail@example.com",
      "avatar_url": "https://...",
      "roles": ["secretaria"],
      "status": "activo"
    }
  ]
}
```

---

### 4.4 Invite club member

**Purpose**
Invitar usuario al club activo con rol asignado.

**Auth required**
Sí

**Allowed roles**
`admin`

**Input**

```json
{
  "email": "nuevo@usuario.com",
  "role": "secretaria"
}
```

**Validations**

* email obligatorio
* email válido
* role obligatorio
* no debe existir membership activa para ese email en el club
* no debe generar duplicados inconsistentes

**Output**

```json
{
  "invitation_id": "uuid",
  "club_id": "uuid",
  "email": "nuevo@usuario.com",
  "role": "secretaria",
  "status": "pending"
}
```

---

### 4.5 Approve membership

**Purpose**
Aprobar una membership pendiente y asignar o confirmar rol.

**Auth required**
Sí

**Allowed roles**
`admin`

**Input**

```json
{
  "membership_id": "uuid",
  "role": "tesoreria"
}
```

**Validations**

* la membership debe pertenecer al club activo
* la membership debe estar pendiente o editable por negocio
* role obligatorio

**Output**

```json
{
  "membership_id": "uuid",
  "role": "tesoreria",
  "status": "activo"
}
```

---

### 4.6 Update membership roles

**Purpose**
Modificar roles de un miembro activo del club.

**Auth required**
Sí

**Allowed roles**
`admin`

**Input**

```json
{
  "membership_id": "uuid",
  "roles": ["admin", "tesoreria"]
}
```

**Validations**

* la membership debe pertenecer al club activo
* debe preservarse al menos un admin activo en el club
* debe enviarse al menos un rol válido

**Output**

```json
{
  "membership_id": "uuid",
  "roles": ["admin", "tesoreria"],
  "status": "activo"
}
```

---

### 4.7 Remove membership

**Purpose**
Remover miembro del club activo.

**Auth required**
Sí

**Allowed roles**
`admin`, o usuario removiéndose a sí mismo según regla de negocio

**Input**

```json
{
  "membership_id": "uuid"
}
```

**Validations**

* debe pertenecer al club activo
* no debe dejar al club sin admins

**Output**

```json
{
  "membership_id": "uuid",
  "removed": true
}
```

---

## 5. Configuración de tesorería

### 5.1 Get treasury settings

**Purpose**
Obtener configuración de tesorería del club activo.

**Auth required**
Sí

**Allowed roles**
`admin`

**Input**

```json
{}
```

**Output**

```json
{
  "accounts": [],
  "categories": [],
  "activities": [],
  "currencies": [],
  "movement_types": [],
  "receipt_formats": [
    {
      "id": "uuid",
      "club_id": "uuid",
      "name": "Sistema de socios",
      "validation_type": "pattern",
      "pattern": "^PAY-SOC-[0-9]{5}$",
      "min_numeric_value": 10556,
      "example": "PAY-SOC-26205",
      "status": "active",
      "visible_for_secretaria": false,
      "visible_for_tesoreria": false
    }
  ]
}
```

---

### 5.2 Create treasury account

**Purpose**
Crear cuenta del club.

**Auth required**
Sí

**Allowed roles**
`secretaria`

**Input**

```json
{
  "name": "Caja principal",
  "account_type": "efectivo",
  "visibility": ["secretaria"],
  "emoji": "💵",
  "currencies": ["ARS"]
}
```

**Validations**

* name obligatorio
* account_type obligatorio
* `visibility` debe incluir `secretaria`, `tesoreria` o ambos
* `visibility` debe incluir al menos un rol
* `emoji` debe pertenecer al catálogo predefinido del sistema para cuentas
* `currencies` debe incluir al menos una moneda
* `currencies` solo admite `ARS` y/o `USD`
* no duplicar nombre activo en el club según regla de negocio

**Output**

```json
{
  "account_id": "uuid"
}
```

---

### 5.3 Update treasury account

**Purpose**
Editar cuenta del club.

**Auth required**
Sí

**Allowed roles**
`tesoreria`

**Input**

```json
{
  "account_id": "uuid",
  "name": "Caja sede",
  "account_type": "efectivo",
  "visibility": ["secretaria", "tesoreria"],
  "emoji": "💵",
  "currencies": ["ARS"]
}
```

**Output**

```json
{
  "account_id": "uuid",
  "updated": true
}
```

---

### 5.4 Create treasury category

**Purpose**
Crear subcategoría del club.

**Auth required**
Sí

**Allowed roles**
`tesoreria`

**Input**

```json
{
  "sub_category_name": "Cuotas/Fichajes",
  "description": "Cuota social, cuota deportiva, inscripción, etc.",
  "parent_category": "Ingresos por socios",
  "movement_type": "ingreso",
  "visibility": ["secretaria", "tesoreria"],
  "emoji": "👥"
}
```

**Validations**

* `visibility` debe incluir `secretaria`, `tesoreria` o ambos
* `visibility` debe incluir al menos un rol
* `sub_category_name`, `description` y `parent_category` son obligatorios
* `movement_type` se deriva de `parent_category` y se expone read-only en UI
* `emoji` debe pertenecer al catálogo predefinido del sistema para subcategorías

**Output**

```json
{
  "category_id": "uuid"
}
```

---

### 5.5 Update treasury category

**Purpose**
Editar subcategoría.

**Auth required**
Sí

**Allowed roles**
`tesoreria`

**Input**

```json
{
  "category_id": "uuid",
  "sub_category_name": "Sueldos",
  "description": "Profesores / contratados",
  "parent_category": "Recursos humanos",
  "movement_type": "egreso",
  "visibility": ["secretaria", "tesoreria"],
  "emoji": "💰"
}
```

**Output**

```json
{
  "category_id": "uuid",
  "updated": true
}
```

---

### 5.6 Create club activity

**Purpose**
Crear actividad del club.

**Auth required**
Sí

**Allowed roles**
`tesoreria`

**Input**

```json
{
  "name": "Boxeo",
  "visibility": ["secretaria"],
  "emoji": "🥊"
}
```

**Validations**

* `visibility` debe incluir `secretaria`, `tesoreria` o ambos
* `visibility` debe incluir al menos un rol
* `emoji` debe pertenecer al catálogo predefinido del sistema para actividades

**Output**

```json
{
  "activity_id": "uuid"
}
```

---

### 5.7 Update club activity

**Purpose**
Editar actividad.

**Auth required**
Sí

**Allowed roles**
`tesoreria`

**Input**

```json
{
  "activity_id": "uuid",
  "name": "Futsal",
  "visibility": ["secretaria", "tesoreria"],
  "emoji": "⚽"
}
```

**Output**

```json
{
  "activity_id": "uuid",
  "updated": true
}
```

### 5.10 Set field rules by category

**Purpose**
Configurar visibilidad y obligatoriedad de campos dinámicos por categoría.

**Auth required**
Sí

**Allowed roles**
`tesoreria`

**Input**

```json
{
  "category_id": "uuid",
  "rules": [
    {
      "field_name": "receipt",
      "is_visible": true,
      "is_required": true
    },
    {
      "field_name": "activity",
      "is_visible": true,
      "is_required": false
    }
  ]
}
```

**Validations**

* un campo no puede ser obligatorio si no es visible

**Output**

```json
{
  "saved": true
}
```

---

### 5.11 Set receipt formats

**Purpose**
Permitir que Admin consulte y actualice la configuración bootstrap del campo recibo del sistema de socios para el club activo.

**Auth required**
Sí

**Allowed roles**
`admin`

**Behavior**

- La integración soportada por defecto es `PAY-SOC-<número de 5 dígitos>`.
- El ejemplo visible es `PAY-SOC-26205`.
- El mínimo inclusivo es `PAY-SOC-10556`.
- No existe máximo.
- El club debe contar siempre con una configuración persistida en `receipt_formats`; si no existe, debe bootstrapearse con los defaults del sistema.
- La lectura de settings debe devolver `visible_for_secretaria` y `visible_for_tesoreria` dentro de `receipt_formats`.
- La configuración puede quedar oculta para todos los roles si `visible_for_secretaria=false` y `visible_for_tesoreria=false`.
- La UI no administra colecciones libres de formatos en esta iteración.
- Solo `admin` puede mutar la configuración del sistema de socios.

**Output**

```json
{
  "receipt_integration": {
    "name": "Sistema de socios",
    "example": "PAY-SOC-26205",
    "pattern": "^PAY-SOC-[0-9]{5}$",
    "min_receipt": "PAY-SOC-10556",
    "max_receipt": null,
    "editable": true
  }
}
```

---

## 6. Operatoria diaria de Secretaría

### 6.1 Get dashboard treasury card

**Purpose**
Obtener card resumida de saldos y estado operativo del día.

**Auth required**
Sí

**Allowed roles**
`secretaria`

**Input**

```json
{}
```

**Output**

```json
{
  "session_status": "open",
  "movement_data_status": "resolved",
  "session_date": "2026-04-02",
  "accounts": [
    {
      "account_id": "uuid",
      "name": "Caja principal",
      "balances": [
        { "currency_code": "ARS", "amount": 150000.00 }
      ]
    }
  ],
  "movements": [
    {
      "movement_id": "uuid",
      "account_id": "uuid",
      "account_name": "Caja principal",
      "movement_type": "ingreso",
      "category_name": "Cobranza",
      "concept": "Cuota abril",
      "currency_code": "ARS",
      "amount": 150000.00,
      "created_by_user_name": "Ana Perez",
      "created_at": "2026-04-02T13:45:00.000Z"
    }
  ],
  "available_actions": [
    "close_session",
    "create_movement"
  ]
}
```

This contract depends on the club-scoped daily cash session RPCs being deployed in the active database.

This contract also depends on the club-scoped treasury movement RPCs being deployed in the active database.

`accounts[].balances` must reflect the cumulative historical sum of visible `treasury_movements` for each visible account in the active club.

`movements[]` must list the visible `treasury_movements` of the active club and `session_date`, ordered from newest to oldest by `created_at`.

The dashboard uses `daily_cash_sessions` only to resolve `session_status` and available actions. Historical visible movements of each account contribute to `accounts[].balances`, while only movements that belong to the active club, match `session_date`, and are visible for Secretaría must appear in `movements[]` even if `dailyCashSessionId` is null or does not drive the read path.

`movement_data_status` can be:

* `resolved` when the dashboard could read the historical visible `treasury_movements` needed for `accounts[].balances` and the `session_date` movements needed for `movements[]`
* `unresolved` when the dashboard could not read those `treasury_movements` reliably; in that case the UI must not infer balances `0,00`, empty movements, or account detail availability from that failure

`session_status` can be:

* `not_started` when no daily session exists for the active club and current date
* `open` when the current daily session is open
* `closed` when the current daily session is closed
* `unresolved` when the dashboard could not resolve `daily_cash_sessions` reliably; in that case the UI must not infer `Jornada pendiente` or expose operational CTAs

Absence of a daily session must resolve as "no rows" and therefore `not_started`, not as an infrastructure error.

Before resolving `session_status` for the current date, the backend may reconcile and close the latest stale `daily_cash_session` that is still `open` for a previous date in the active club.

---

### 6.1B Get treasury role dashboard

**Purpose**
Obtener la card resumida de Tesorería visible en `/dashboard`.

**Auth required**
Sí

**Allowed roles**
`tesoreria`

**Input**

```json
{}
```

**Output**

```json
{
  "session_date": "2026-04-02",
  "accounts": [
    {
      "account_id": "uuid",
      "name": "Caja dolares",
      "balances": [
        { "currency_code": "USD", "amount": 950.00 }
      ]
    }
  ],
  "movement_groups": [
    {
      "movement_date": "2026-04-02",
      "accounts": [
        {
          "account_id": "uuid",
          "account_name": "Caja dolares",
          "movements": [
            {
              "movement_id": "uuid",
              "movement_display_id": "PJ-MOV-2026-9465",
              "movement_date": "2026-04-02",
              "account_id": "uuid",
              "account_name": "Caja dolares",
              "movement_type": "ingreso",
              "category_id": "uuid",
              "category_name": "Cobranza",
              "activity_id": "uuid",
              "activity_name": "Futbol",
              "receipt_number": "PAY-SOC-26205",
              "calendar_event_id": null,
              "calendar_event_title": null,
              "transfer_reference": null,
              "fx_operation_reference": null,
              "concept": "Pago cuota abril",
              "currency_code": "USD",
              "amount": 950.00,
              "created_by_user_name": "Nombre Apellido",
              "created_at": "2026-04-02T14:22:00.000Z",
              "can_edit": true
            }
          ]
        }
      ]
    }
  ],
  "available_actions": [
    "create_movement",
    "create_fx_operation"
  ]
}
```

**Notes**

* `accounts[].balances` debe reflejar la suma historica acumulada de los movimientos visibles para Tesoreria en cada cuenta visible del club activo
* `movement_groups[]` usa `movement_date` y cubre hoy y los 4 dias operativos anteriores
* para Tesoreria impactan saldo y listado los movimientos con estado `posted` y `consolidated`
* no impactan saldo ni listado los movimientos con estado `pending_consolidation`, `integrated` o `cancelled`
* `movement_groups[]` debe entregarse agrupado por fecha descendente y luego por cuenta en orden alfabetico ascendente
* dentro de cada cuenta, `movements[]` se ordena de mas reciente a mas antiguo por `created_at`

---

### 6.2 Open daily cash session

**Purpose**
Abrir jornada diaria.

**Auth required**
Sí

**Allowed roles**
`secretaria`

**Input**

```json
{
  "declared_balances": [
    {
      "account_id": "uuid",
      "currency_code": "ARS",
      "declared_balance": 120000.00
    }
  ]
}
```

**Validations**

* no debe existir jornada abierta o ya creada para ese día
* las cuentas deben pertenecer al club activo
* las monedas deben ser válidas para la cuenta
* el `saldo esperado` visible para cada cuenta y moneda debe derivarse del saldo acumulado de la cuenta hasta la fecha operativa
* si hay diferencia contra saldo esperado, debe registrarse ajuste según regla

**Output**

```json
{
  "session_id": "uuid",
  "status": "open"
}
```

---

### 6.3 Close daily cash session

**Purpose**
Cerrar jornada diaria.

**Auth required**
Sí

**Allowed roles**
`secretaria`

**Input**

```json
{
  "declared_balances": [
    {
      "account_id": "uuid",
      "currency_code": "ARS",
      "declared_balance": 142000.00
    }
  ]
}
```

**Validations**

* debe existir jornada abierta del día
* si existe una jornada `open` de un día anterior en el club activo, el backend debe cerrarla automáticamente antes de validar el cierre manual del día actual
* el `saldo esperado` visible para cada cuenta y moneda debe derivarse del saldo acumulado de la cuenta hasta la fecha operativa
* si hay diferencia, debe generarse ajuste
* luego del cierre, Secretaría no puede editar movimientos del día

**Output**

```json
{
  "session_id": "uuid",
  "status": "closed"
}
```

---

### 6.4 Get movement form config

**Purpose**
Obtener configuración efectiva del formulario de movimientos para el club y rol actual.

**Auth required**
Sí

**Allowed roles**
`secretaria`, `tesoreria`, `admin`

**Input**

```json
{}
```

**Output**

```json
{
  "accounts": [],
  "categories": [],
  "currencies": [],
  "movement_types": []
}
```

---

### 6.5 Create treasury movement

**Purpose**
Registrar movimiento monetario.

**Auth required**
Sí

**Allowed roles**
`secretaria`, `tesoreria`

**Input**

```json
{
  "account_id": "uuid",
  "movement_type": "ingreso",
  "category_id": "uuid",
  "concept": "Pago cuota abril",
  "currency_code": "ARS",
  "amount": 25000,
  "movement_date": "2026-04-02",
  "receipt_number": "PAY-SOC-26205",
  "activity_id": "uuid"
}
```

**Validations**

* cuenta válida del club activo
* subcategoría válida y visible para el rol
* movement_type habilitado en el club
* currency_code válida para la cuenta
* receipt_number debe cumplir `^PAY-SOC-[0-9]{5}$` y ser `>= PAY-SOC-10556` cuando se informa
* amount > 0
* si `movement_type = egreso`, la cuenta debe tener saldo disponible suficiente en la moneda seleccionada
* para `tesoreria`, el saldo disponible se valida contra el acumulado hasta `movement_date`
* `activity_id` y `receipt_number` son opcionales
* si el rol es `secretaria`, debe existir jornada abierta
* si el rol es `secretaria`, `movement_date` debe ser la fecha del día y no editable por contrato
* si el rol es `tesoreria`, la fecha puede ser editable según negocio

**Output**

```json
{
  "movement_id": "uuid",
  "movement_display_id": "PJ-MOV-2026-9465",
  "status": "posted"
}
```

**Notes**

* si el movimiento lo crea `secretaria`, el status inicial es `pending_consolidation`
* si el movimiento lo crea `tesoreria`, el status inicial es `posted`
* los movimientos creados por compra/venta de Tesorería se registran como `posted`
* `movement_display_id` es el identificador visible de negocio con formato `<iniciales_club>-MOV-<anio>-<secuencia>`

---

### 6.5B Update secretaria movement in open session

**Purpose**
Editar un movimiento de Secretaría mientras la jornada del día siga abierta.

**Auth required**
Sí

**Allowed roles**
`secretaria`

**Input**

```json
{
  "movement_id": "uuid",
  "account_id": "uuid",
  "movement_type": "ingreso",
  "category_id": "uuid",
  "activity_id": "uuid",
  "receipt_number": "PAY-SOC-26205",
  "concept": "Pago cuota abril",
  "currency_code": "ARS",
  "amount": 25000
}
```

**Validations**

* debe existir jornada abierta para el día actual
* el movimiento debe pertenecer al club activo
* el movimiento debe pertenecer a la jornada abierta actual
* cuenta válida del club activo y visible para `secretaria`
* subcategoría válida y visible para `secretaria`
* movement_type habilitado en el club
* currency_code válida para la cuenta
* `activity_id` y `receipt_number` son opcionales
* amount > 0
* si el resultado editado es un `egreso`, la cuenta debe conservar saldo disponible suficiente en la moneda seleccionada
* `movement_date` no es editable por contrato
* no se permite editar referencias técnicas derivadas
* la operación debe auditarse

**Output**

```json
{
  "movement_id": "uuid",
  "updated": true
}
```

---

### 6.5C Update treasury role movement

**Purpose**
Editar un movimiento visible de Tesorería desde el dashboard del módulo.

**Auth required**
Sí

**Allowed roles**
`tesoreria`

**Input**

```json
{
  "movement_id": "uuid",
  "account_id": "uuid",
  "movement_type": "ingreso",
  "category_id": "uuid",
  "activity_id": "uuid",
  "receipt_number": "PAY-SOC-26205",
  "concept": "Pago cuota abril",
  "currency_code": "ARS",
  "amount": 25000
}
```

**Validations**

* el movimiento debe pertenecer al club activo
* el movimiento debe ser visible para `tesoreria`
* el movimiento debe encontrarse en estado `posted`
* cuenta válida del club activo y visible para `tesoreria`
* categoría válida y visible para `tesoreria`
* movement_type habilitado en el club
* currency_code válida para la cuenta
* `activity_id` y `receipt_number` son opcionales
* amount > 0
* si el resultado editado es un `egreso`, la cuenta debe conservar saldo disponible suficiente en la moneda seleccionada
* `movement_date` no es editable por contrato
* no se permite editar referencias técnicas derivadas
* la operación debe auditarse

**Output**

```json
{
  "movement_id": "uuid",
  "updated": true
}
```

---

### 6.6 Get account detail

**Purpose**
Obtener saldo y detalle de movimientos de una cuenta.

**Auth required**
Sí

**Allowed roles**
`secretaria`, `tesoreria`, `admin`

**Input**

```json
{
  "account_id": "uuid"
}
```

**Output**

```json
{
  "account": {
    "account_id": "uuid",
    "name": "Caja principal"
  },
  "balances": [
    { "currency_code": "ARS", "amount": 142000.00 }
  ],
  "movements": [
    {
      "movement_id": "uuid",
      "movement_date": "2026-04-02",
      "movement_type": "ingreso",
      "category_name": "Cuotas",
      "concept": "Pago cuota abril",
      "currency_code": "ARS",
      "amount": 25000
    }
  ]
}
```

**Notes**

* devuelve el historial visible completo de la cuenta dentro del club activo
* la UI puede agrupar los movimientos por `movement_date`
* la UI pagina el render del historial a 10 movimientos por pagina
* la paginacion visual se aplica sobre movimientos; un mismo `movement_date` puede aparecer en mas de una pagina si tiene suficientes registros

---

## 7. Transferencias y cambio de moneda

### 7.1 Create account transfer

**Purpose**
Registrar transferencia interna entre cuentas de la misma moneda.

**Auth required**
Sí

**Allowed roles**
`secretaria`

**Input**

```json
{
  "source_account_id": "uuid",
  "target_account_id": "uuid",
  "currency_code": "ARS",
  "amount": 50000,
  "concept": "Transferencia a banco"
}
```

**Validations**

* requiere jornada abierta
* cuentas distintas
* ambas cuentas del club activo
* la cuenta origen debe ser visible para `secretaria`
* la cuenta destino debe ser visible para otro rol operativo y no visible para `secretaria`
* moneda válida para ambas cuentas
* amount > 0
* la cuenta origen debe tener saldo disponible suficiente en la moneda seleccionada

**Output**

```json
{
  "transfer_id": "uuid",
  "movement_ids": ["uuid", "uuid"]
}
```

**Notes**

* ambos movimientos deben compartir una referencia común de transferencia
* la operación debe ejecutarse de forma transaccional; si falla cualquier paso, no debe persistirse ningún registro

---

### 7.2 Create fx operation

**Purpose**
Registrar compra o venta de moneda entre cuentas de distinta moneda.

**Auth required**
Sí

**Allowed roles**
`tesoreria`

**Input**

```json
{
  "source_account_id": "uuid",
  "source_currency_code": "ARS",
  "source_amount": 120000,
  "target_account_id": "uuid",
  "target_currency_code": "USD",
  "target_amount": 100,
  "concept": "Compra USD"
}
```

**Validations**

* no requiere jornada abierta
* cuentas válidas
* monedas distintas
* importes > 0
* la cuenta origen debe tener saldo disponible suficiente en la moneda origen

**Output**

```json
{
  "fx_operation_id": "uuid",
  "movement_ids": ["uuid", "uuid"]
}
```

---

## 8. Consolidación diaria de Tesorería

### 8.1 Get consolidation candidates

**Purpose**
Obtener movimientos de Secretaría pendientes de consolidación para una fecha.

**Auth required**
Sí

**Allowed roles**
`tesoreria`, `admin`

**Input**

```json
{
  "consolidation_date": "2026-04-01"
}
```

**Output**

```json
{
  "consolidation_date": "2026-04-01",
  "movements": [
    {
      "movement_id": "uuid",
      "status": "pending_consolidation",
      "account_id": "uuid",
      "movement_type": "ingreso",
      "category_id": "uuid",
      "concept": "Pago cuota",
      "currency_code": "ARS",
      "amount": 25000,
      "created_by_user_id": "uuid",
      "possible_match": {
        "exists": true,
        "tesoreria_movement_id": "uuid"
      }
    }
  ]
}
```

---

### 8.2 Update movement before consolidation

**Purpose**
Corregir imputación de un movimiento pendiente durante consolidación.

**Auth required**
Sí

**Allowed roles**
`tesoreria`, `admin`

**Input**

```json
{
  "movement_id": "uuid",
  "movement_date": "2026-04-01",
  "account_id": "uuid",
  "movement_type": "ingreso",
  "category_id": "uuid",
  "activity_id": "uuid-opcional",
  "receipt_number": "PAY-SOC-26205",
  "calendar_event_id": "uuid-opcional",
  "concept": "Pago cuota abril",
  "currency_code": "ARS",
  "amount": 25000
}
```

**Validations**

* el movimiento debe pertenecer al club activo
* el movimiento debe estar pendiente de consolidación
* `movement_date` es obligatorio y debe ser una fecha válida
* `activity_id`, `receipt_number` y `calendar_event_id` son opcionales pero deben ser válidos si se informan
* si el movimiento es `egreso`, el saldo disponible se valida usando la fecha editada
* la operación debe auditarse

**Output**

```json
{
  "movement_id": "uuid",
  "updated": true
}
```

---

### 8.3 Integrate matching movement

**Purpose**
Integrar movimiento de Secretaría con movimiento ya existente en Tesorería.

**Auth required**
Sí

**Allowed roles**
`tesoreria`, `admin`

**Input**

```json
{
  "secretaria_movement_id": "uuid",
  "tesoreria_movement_id": "uuid"
}
```

**Validations**

* ambos movimientos deben pertenecer al club activo
* no debe haber integración previa incompatible
* no debe generar doble impacto contable

**Output**

```json
{
  "integration_id": "uuid",
  "secretaria_movement_id": "uuid",
  "tesoreria_movement_id": "uuid"
}
```

---

### 8.4 Execute daily consolidation

**Purpose**
Consolidar todos los movimientos válidos de una fecha para el club activo.

**Auth required**
Sí

**Allowed roles**
`tesoreria`, `admin`

**Input**

```json
{
  "consolidation_date": "2026-04-01"
}
```

**Validations**

* la fecha no debe estar consolidada previamente
* no deben existir movimientos inválidos pendientes
* debe generarse batch de consolidación
* debe auditarse el proceso

**Output**

```json
{
  "batch_id": "uuid",
  "consolidation_date": "2026-04-01",
  "status": "completed",
  "consolidated_count": 10,
  "integrated_count": 3
}
```

---

### 8.5 Get movement audit log

**Purpose**
Consultar historial auditable de un movimiento.

**Auth required**
Sí

**Allowed roles**
`tesoreria`, `admin`

**Input**

```json
{
  "movement_id": "uuid"
}
```

**Output**

```json
{
  "movement_id": "uuid",
  "audit_logs": [
    {
      "action_type": "edited",
      "performed_by_user_id": "uuid",
      "performed_at": "2026-04-02T14:03:00Z",
      "payload_before": {},
      "payload_after": {}
    }
  ]
}
```

---

## 9. Reglas de autorización por módulo

### 9.1 Admin

Puede:

* ver miembros del club
* invitar
* aprobar
* cambiar roles
* remover miembros
* configurar tesorería
* consultar información del club
* consultar movimientos
* opcionalmente operar funciones avanzadas de soporte

### 9.2 Secretaria

Puede:

* abrir jornada
* cerrar jornada
* registrar movimientos de Secretaría
* registrar transferencias
* registrar operaciones de cambio
* consultar saldos y movimientos visibles para su rol

### 9.3 Tesoreria

Puede:

* consultar dashboard de saldos de Tesorería
* registrar movimientos de Tesorería
* consultar detalle de cuentas de Tesorería
* revisar pendientes de consolidación
* corregir imputaciones durante consolidación
* integrar coincidencias
* consolidar por fecha
* ver auditoría

---

## 10. Códigos de error sugeridos

* `unauthenticated`
* `forbidden`
* `invalid_active_club`
* `membership_not_found`
* `membership_inactive`
* `validation_error`
* `resource_not_found`
* `duplicate_resource`
* `session_already_open`
* `session_not_open`
* `invalid_account`
* `invalid_category`
* `invalid_currency`
* `invalid_movement_type`
* `invalid_receipt_format`
* `invalid_field_rule`
* `invalid_transfer`
* `insufficient_funds`
* `invalid_fx_operation`
* `consolidation_already_completed`
* `consolidation_has_invalid_movements`
* `last_admin_conflict`

---

## 11. Notas de implementación para IA

1. No asumir permisos desde frontend.
2. Revalidar siempre `active_club_id` en backend.
3. Nunca permitir operaciones sobre recursos de otro club.
4. Toda corrección de movimientos en consolidación debe generar auditoría.
5. Toda auditoría de consolidación debe registrar el usuario responsable.
6. El saldo se calcula desde `treasury_movements`, no desde snapshots persistidos.
7. Las operaciones compuestas deben ser transaccionales.
8. La consolidación diaria debe ser transaccional.
9. Las operaciones de apertura/cierre deben ser transaccionales.
10. Los estados de los movimientos deben tratarse como parte central del dominio.
11. Toda operación que cree múltiples movimientos debe dejar referencias cruzadas trazables.
12. La edición operativa de Secretaría en jornada abierta debe auditarse igual que la corrección en consolidación.

```
```

---

## 12. E04 RRHH · Contratos del módulo de Recursos Humanos

Las RPCs SECURITY DEFINER del módulo RRHH cumplen la convención del
resto del sistema: cada una retorna `{ ok: boolean, code: string, ... }`
y respeta el club scope leyendo `app.current_club_id`. Todos los
mutadores registran eventos en `hr_activity_log`.

### Estructuras Salariales (US-54/55)

#### `hr_update_salary_structure_amount(p_structure_id, p_new_amount, p_effective_date)`
- Cierra la versión vigente (`end_date = p_effective_date - 1 día`) y
  abre una nueva vigente. Transaccional.
- Códigos: `updated`, `structure_not_found`, `forbidden`,
  `amount_must_be_positive`, `effective_date_required`,
  `current_version_not_found`, `invalid_effective_date`.

### Colaboradores y Contratos (US-56/57/58)

#### `hr_finalize_contract(p_contract_id, p_end_date, p_reason)`
- Cambia `status='finalizado'`, setea `finalized_at/reason/by` y libera
  la estructura (el unique parcial ignora `finalizado`).
- Códigos: `finalized`, `contract_not_found`, `forbidden`,
  `already_finalized`, `invalid_end_date`, `end_date_too_far` (> 10 años).

### Liquidaciones (US-61/62/63/66)

#### `hr_generate_monthly_settlements(p_year, p_month)`
- Itera contratos vigentes del período, calcula `base_amount` según
  flag + remuneration_type, omite los que ya tienen liquidación no
  anulada. `por_hora/por_clase` quedan con `requires_hours_input=true`
  y `base_amount=0`.
- Retorna `{ok, code, generated_count, skipped_count, error_count}`.
- Códigos: `generated`, `partial`, `no_active_contracts`, `forbidden`,
  `invalid_period`.

#### `hr_confirm_settlement(p_settlement_id, p_confirm_zero)`
- Valida horas para contratos variables, bloqueo por total<0, requiere
  confirmación explícita para total=0. Cambia a `confirmada`.
- Códigos: `confirmed`, `settlement_not_found`, `forbidden`,
  `invalid_status`, `already_confirmed`, `hours_required`,
  `total_negative`, `zero_amount_requires_confirm`.

#### `hr_confirm_settlements_bulk(p_ids, p_confirm_zero)`
- Itera cada id delegando al RPC individual. Retorna
  `{confirmed_count, skipped_count, errors: [{id, code}]}` con fallos
  por item sin abortar el batch.

#### `hr_annul_settlement(p_settlement_id, p_reason)`
- Para `pagada` requiere que el movement linkeado esté en
  `status='cancelled'`. Para `generada`/`confirmada` es directo.
- Códigos: `annulled`, `settlement_not_found`, `forbidden`,
  `already_annulled`, `movement_still_active`.

### Pagos (US-64/65)

#### `hr_pay_settlement(p_settlement_id, p_account_id, p_payment_date, p_receipt_number, p_notes, p_display_id, p_batch_id)`
- Transaccional. Crea un `treasury_movements` con
  `status='posted'`, `movement_type='egreso'`, `category_id` resuelto a
  la categoría "Sueldos" del club, `currency_code = clubs.currency_code`,
  `payroll_settlement_id` y `payroll_payment_batch_id` linkeados.
- Asocia `daily_cash_session_id` si el tesorero tiene jornada abierta
  hoy.
- Actualiza la liquidación a `pagada` con `paid_movement_id`.
- El `display_id` lo calcula el service en TypeScript siguiendo la
  convención `{CLUB_INITIALS}-MOV-{YYYY}-{seq}`.
- Códigos: `paid`, `settlement_not_found`, `forbidden`,
  `invalid_status`, `already_paid`, `invalid_total_amount`,
  `club_not_found`, `account_not_available`, `currency_mismatch`,
  `sueldos_category_not_found`, `payment_date_required`,
  `invalid_payment_date`.

#### `hr_pay_settlements_batch(p_ids, p_account_id, p_payment_date, p_notes, p_display_ids)`
- Crea un `payroll_payment_batches`, itera delegando al RPC individual
  pasando el `batch_id`. Si alguna liquidación falla, `RAISE EXCEPTION`
  aborta la transacción y retorna `{ok:false, code, failed_settlement_id}`.
- Códigos: `paid_batch`, `forbidden`, `display_ids_mismatch`,
  `settlement_not_found`, + cualquiera de los propagados desde
  `hr_pay_settlement`.

### Job diario (US-59)

#### `hr_finalize_contracts_due_today_all_clubs()`
- Disparado por `pg_cron` (`5 3 * * *` hora local argentina).
- Itera todos los clubes sin `app.current_club_id`, finaliza contratos
  con `end_date = current_date` y registra `CONTRACT_FINALIZED_AUTO`
  en `hr_activity_log`. Cierra con `hr_job_runs.status` en success /
  partial / failed.

### Reportes (US-69)

No son RPCs: viven como queries server-side en
`lib/services/hr-reports-service.ts` y exponen export CSV via route
handler `POST /api/rrhh/reports/export`.

### Rutas UI del módulo

| Ruta | Guard | Entidades renderizadas |
|---|---|---|
| `/rrhh` | `canAccessHrModule` (rrhh only) | Dashboard (6 cards operativas, US-68) |
| `/rrhh/contracts` | `canAccessHrMasters` (rrhh only) | `staff_contracts` + forms alta/edición/finalización |
| `/rrhh/staff` | `canAccessHrMasters` (rrhh only) | `staff_members` + forms + alerta US-60 |
| `/rrhh/structures` | `canAccessHrMasters` (rrhh only) | `salary_structures` + versionado US-55. **Sin sueldo inicial**: la estructura se crea y el sueldo se define despues via "Actualizar monto" (primera version abierta por la RPC `hr_update_salary_structure_amount`). `functional_role` es un catalogo cerrado (ver `FUNCTIONAL_ROLES` en `lib/domain/salary-structure.ts`). |
| `/rrhh/settlements` | `canOperateHrSettlements` (rrhh only) | `payroll_settlements` + adjustments + pagos |
| `/rrhh/reports` | `canAccessHrModule` (rrhh only) | Reportes con export CSV |
| `/rrhh/staff/[id]` | `canAccessHrModule` (rrhh only) | Ficha consolidada (US-67) |
| `/api/rrhh/reports/export` | `canAccessHrModule` (server-side, rrhh only) | POST que retorna CSV con `Content-Disposition` |

Los maestros (`structures`, `staff`, `contracts`) **no viven bajo `/settings`**: son parte del módulo RRHH operativo. **El acceso al módulo RRHH está restringido al rol `rrhh` exclusivo**: ni `admin` ni `tesoreria` ni `secretaria` ven el tab ni pueden invocar endpoints del módulo. Si se requiere co-operación parcial, sumar un rol combinado en el membership — no ampliar los guards.
