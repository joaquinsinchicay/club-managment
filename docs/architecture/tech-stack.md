# Tech Stack

## Objetivo

Este documento define el stack tecnológico oficial del proyecto para el MVP.
Es obligatorio respetar estas decisiones para evitar inconsistencias, duplicación de enfoques o divergencias en la implementación.

---

## 1. Frontend

### Framework

* Next.js 14+
* App Router obligatorio

### Lenguaje

* TypeScript

### Rendering

* Server Components por defecto
* Client Components solo cuando sea necesario (interacción, estado local)

### UI

* Tailwind CSS
* shadcn/ui (para componentes base)

### Estado

* Preferir server state
* Evitar librerías globales de estado innecesarias en MVP

---

## 2. Backend

### Enfoque

* Backend integrado en Next.js

### Opciones permitidas

* Server Actions (preferido)
* Route Handlers (solo si aplica)

### No permitido

* No crear backend separado (ej: Express, NestJS) para MVP

---

## 3. Base de datos

### Motor

* PostgreSQL

### Proveedor

* Supabase

### Acceso

* Supabase client (server-side)

### Seguridad

* Row Level Security (RLS) obligatorio
* No bypass de RLS con service role en lógica de negocio

---

## 4. Autenticación

* Supabase Auth
* Google OAuth obligatorio

### Reglas

* usar `auth.uid()` como fuente de verdad
* no persistir sesiones custom fuera de Supabase

---

## 5. Multi-tenancy

### Estrategia

* shared database, shared schema
* aislamiento por `club_id`

### Obligatorio

* uso de `app.current_club_id`
* validación backend + RLS

---

## 6. Manejo de datos

### Queries

* usar SQL o Supabase client
* siempre filtrar por `club_id`

### Mutaciones

* siempre validadas en backend
* siempre respetando RLS

---

## 7. Transacciones

Operaciones que deben ser atómicas:

* apertura de jornada
* cierre de jornada
* transferencias
* operaciones FX
* consolidación

Implementación:

* usar transacciones SQL o RPC en Supabase

---

## 8. Estructura del proyecto

```text
/app
  /(auth)
  /(dashboard)
  /(settings)

/lib
  /db
  /auth
  /permissions
  /validators

/domain
/database
/contracts
/architecture
```

---

## 9. Validación

### Backend

* Zod (recomendado)

### Reglas

* validar input antes de DB
* no confiar en frontend

---

## 10. Manejo de errores

Formato estándar:

```json
{
  "success": false,
  "error": {
    "code": "string_code",
    "message": "Mensaje claro"
  }
}
```

---

## 11. Logging

* logs en backend
* errores críticos visibles
* no exponer detalles sensibles al cliente

---

## 12. Testing (mínimo MVP)

* tests de smoke
* validación manual de:

  * RLS
  * multi-club
  * roles

---

## 13. No permitido

* múltiples ORMs
* duplicar lógica de permisos
* lógica de negocio en frontend
* bypass de RLS
* múltiples fuentes de verdad para saldos

---

## 14. Decisiones no negociables

1. Next.js App Router
2. Supabase como DB + Auth
3. RLS obligatorio
4. Una sola tabla de movimientos
5. Membership como eje de permisos
6. Saldo derivado de movimientos
7. Server-first architecture

---

## 15. Criterio de extensión

Si se necesita agregar tecnología:

* debe justificarse
* debe documentarse en `architecture/decisions.md`
* no debe romper el modelo actual

```
```
