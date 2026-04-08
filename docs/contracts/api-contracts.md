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
  "receipt_formats": [],
  "field_rules": []
}
```

---

### 5.2 Create treasury account

**Purpose**
Crear cuenta del club.

**Auth required**
Sí

**Allowed roles**
`tesoreria`

**Input**

```json
{
  "name": "Caja principal",
  "account_type": "efectivo",
  "status": "active",
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
  "status": "active",
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
Crear categoría del club.

**Auth required**
Sí

**Allowed roles**
`tesoreria`

**Input**

```json
{
  "name": "Cuotas",
  "status": "active",
  "visibility": ["secretaria", "tesoreria"],
  "emoji": "📄"
}
```

**Validations**

* `emoji` debe pertenecer al catálogo predefinido del sistema para categorías

**Output**

```json
{
  "category_id": "uuid"
}
```

---

### 5.5 Update treasury category

**Purpose**
Editar categoría.

**Auth required**
Sí

**Allowed roles**
`tesoreria`

**Input**

```json
{
  "category_id": "uuid",
  "name": "Sueldos",
  "status": "active",
  "visibility": ["secretaria", "tesoreria"],
  "emoji": "💼"
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
  "status": "active",
  "emoji": "🥊"
}
```

**Validations**

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
  "status": "active",
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
Exponer la integración predefinida del campo recibo.

**Auth required**
Sí

**Allowed roles**
`tesoreria`

**Behavior**

- La integración soportada por defecto es `PAY-SOC-<número de 5 dígitos>`.
- El ejemplo visible es `PAY-SOC-26205`.
- El mínimo inclusivo es `PAY-SOC-10556`.
- No existe máximo.
- La UI no administra colecciones libres de formatos en esta iteración.

**Output**

```json
{
  "receipt_integration": {
    "name": "Sistema de socios",
    "example": "PAY-SOC-26205",
    "pattern": "^PAY-SOC-[0-9]{5}$",
    "min_receipt": "PAY-SOC-10556",
    "max_receipt": null,
    "editable": false
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
  "available_actions": [
    "close_session",
    "create_movement"
  ]
}
```

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
  ]
}
```

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
  "movement_types": [],
  "field_rules": []
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
  "activity_id": "uuid",
  "calendar_event_id": "uuid"
}
```

**Validations**

* cuenta válida del club activo
* categoría válida y visible para el rol
* movement_type habilitado en el club
* currency_code válida para la cuenta
* receipt_number debe cumplir `^PAY-SOC-[0-9]{5}$` y ser `>= PAY-SOC-10556` cuando se informa
* amount > 0
* campos dinámicos obligatorios según categoría
* si el rol es `secretaria`, debe existir jornada abierta
* si el rol es `secretaria`, `movement_date` debe ser la fecha del día y no editable por contrato
* si el rol es `tesoreria`, la fecha puede ser editable según negocio

**Output**

```json
{
  "movement_id": "uuid",
  "status": "pending_consolidation"
}
```

**Notes**

* si el movimiento lo crea `tesoreria`, el status final puede ser `posted` en lugar de `pending_consolidation`, según implementación elegida

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
  "account_id": "uuid",
  "date": "2026-04-02"
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

* jornada abierta
* cuentas distintas
* ambas cuentas del club activo
* moneda válida para ambas cuentas
* amount > 0

**Output**

```json
{
  "transfer_id": "uuid",
  "movement_ids": ["uuid", "uuid"]
}
```

---

### 7.2 Create fx operation

**Purpose**
Registrar compra o venta de moneda entre cuentas de distinta moneda.

**Auth required**
Sí

**Allowed roles**
`secretaria`

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

* jornada abierta
* cuentas válidas
* monedas distintas
* importes > 0

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
  "account_id": "uuid",
  "movement_type": "ingreso",
  "category_id": "uuid",
  "concept": "Pago cuota abril",
  "currency_code": "ARS",
  "amount": 25000
}
```

**Validations**

* el movimiento debe pertenecer al club activo
* el movimiento debe estar pendiente de consolidación
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
5. El saldo se calcula desde `treasury_movements`, no desde snapshots persistidos.
6. Las operaciones compuestas deben ser transaccionales.
7. La consolidación diaria debe ser transaccional.
8. Las operaciones de apertura/cierre deben ser transaccionales.
9. Los estados de los movimientos deben tratarse como parte central del dominio.
10. Toda operación que cree múltiples movimientos debe dejar referencias cruzadas trazables.

```
```
