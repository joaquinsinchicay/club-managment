# Club Management System

Sistema de gestión para clubes de barrio enfocado en tesorería, operatoria diaria y control financiero.

Este proyecto está diseñado para ser desarrollado utilizando IA (Claude / Codex) de forma controlada, consistente y escalable.

---

## 🎯 Objetivo

Proveer una herramienta operativa para:

* control de caja diaria (Secretaria)
* registro de movimientos financieros
* gestión de cuentas y categorías
* consolidación financiera (Tesorería)
* soporte multi-club con aislamiento completo de datos

---

## 🧠 Enfoque del proyecto

Este repositorio sigue un modelo **document-driven development**:

* la documentación define el sistema
* la IA implementa en base a esa documentación
* el código no es la fuente de verdad

---

## 📂 Estructura del repositorio

```text
/domain
  domain-model.md
  schema.sql

/database
  rls-policies.sql
  README.md

/contracts
  api-contracts.md
  permission-matrix.md

/architecture
  decisions.md
  tech-stack.md

/design
  design-system.md

/pdd
  {US_ID}.md

/docs
  /audit
    {US_ID}.md

/lib
  texts.json

.claude/skills
.codex/skills

WORKFLOW.md
DEFINITION_OF_DONE.md
```

---

## ⚙️ Stack tecnológico

* Frontend: Next.js (App Router)
* Lenguaje: TypeScript
* UI: Tailwind + shadcn/ui
* Backend: Server Actions / Route Handlers
* DB: PostgreSQL (Supabase)
* Auth: Google OAuth (Supabase)
* Seguridad: Row Level Security (RLS)

---

## 🔐 Conceptos clave

### Multi-tenancy

* El sistema es multi-club
* Todo se filtra por `club_id`
* No existe acceso cross-club

---

### Roles

* `admin` → configuración
* `secretaria` → operación diaria
* `tesoreria` → control y consolidación

Los permisos se definen en:

```
/contracts/permission-matrix.md
```

---

### Fuente de verdad

| Tipo          | Archivo                          |
| ------------- | -------------------------------- |
| Dominio       | `domain/domain-model.md`         |
| Base de datos | `domain/schema.sql`              |
| Seguridad     | `database/rls-policies.sql`      |
| API           | `contracts/api-contracts.md`     |
| Permisos      | `contracts/permission-matrix.md` |
| Arquitectura  | `architecture/decisions.md`      |
| Stack         | `architecture/tech-stack.md`     |
| UI            | `design/design-system.md`        |
| Workflow      | `WORKFLOW.md`                    |
| Calidad       | `DEFINITION_OF_DONE.md`          |

---

## 🧾 Regla CRÍTICA: textos

Todos los textos deben provenir de:

```
lib/texts.json
```

No permitido:

* strings hardcodeados
* textos en componentes
* textos en server actions

---

## 🔄 Workflow de desarrollo

Resumen:

1. Definir User Story
2. Generar PDD (`generate-pdd`)
3. Validar PDD
4. Implementar (Claude / Codex)
5. Auditar (`audit-pdd-vs-code`)
6. Corregir
7. QA
8. Release

Ver detalle en:

```
WORKFLOW.md
```

---

## ✅ Definition of Done

Una User Story está terminada solo si:

* cumple su PDD
* pasa auditoría
* respeta documentación
* no tiene issues críticos

Ver:

```
DEFINITION_OF_DONE.md
```

---

## 🤖 Uso de IA

Este proyecto está diseñado para trabajar con IA.

### Skills disponibles

* `generate-pdd` → genera PDD
* `audit-pdd-vs-code` → audita implementación

Ubicación:

```
.claude/skills/
.codex/skills/
```

---

### Prompts básicos

#### Generar PDD

```
Generate PDD for {US_ID} using repository documentation
```

#### Implementar

```
Implement feature based on PDD {US_ID}
```

#### Auditar

```
Audit implementation of {US_ID}
```

#### Corregir

```
Fix issues from audit for {US_ID}
```

---

## 🚀 Bootstrap actual

El repositorio ya incluye una base ejecutable minima con:

* Next.js + TypeScript + Tailwind
* estructura `app/` inicial
* capa base de `lib/auth`, `lib/domain` y `lib/repositories`
* validacion documental por script
* pipeline CI con `lint`, `typecheck` y `build`
* implementacion de US-01 y US-02 sobre un proveedor de auth mockeable

### Correr local

```bash
npm install
npm run dev
```

### Modo bootstrap

Por defecto el proyecto corre con `AUTH_PROVIDER_MODE=mock`.

Esto permite validar la primera vertical funcional sin depender todavia de credenciales reales de Supabase. La integracion real queda preparada como siguiente iteracion.

Perfiles mock disponibles para probar flujos y permisos:

* `/auth/google/start?mockProfile=existing_active` → usuario admin con acceso a configuracion del club
* `/auth/google/start?mockProfile=existing_secretaria` → usuario no admin sin acceso a configuracion del club
* `/auth/google/start?mockProfile=existing_pending` → usuario sin membresia activa
* `/auth/google/start` → usuario nuevo sin membresia activa

### Conexion con Supabase

El repositorio ya queda preparado para el proyecto:

```bash
SUPABASE_PROJECT_REF=qfiyxpaxbdhbeapksyjp
NEXT_PUBLIC_SUPABASE_URL=https://qfiyxpaxbdhbeapksyjp.supabase.co
```

Pasos pendientes para activar integracion real:

```bash
cp .env.example .env.local
# completar NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
# opcional: completar SUPABASE_ACCESS_TOKEN
npx supabase link --project-ref qfiyxpaxbdhbeapksyjp
```

Sin `SUPABASE_ACCESS_TOKEN` o `supabase login`, la CLI no puede terminar el `link` remoto.

La app cambia automaticamente a auth real cuando existen `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Si esas variables no estan disponibles, conserva el fallback `mock` para CI y bootstrap local.

---

## ⚠️ Reglas importantes

* No implementar sin PDD
* No modificar comportamiento sin actualizar PDD
* No ignorar documentación
* No romper multi-tenancy
* No hardcodear textos
* No bypass de RLS

---

## 🚀 Estado del proyecto

MVP en desarrollo.

---

## 📌 Nota final

Este no es un proyecto tradicional.

Es un sistema diseñado para:

* ser desarrollado con IA
* mantener control de calidad
* escalar sin perder consistencia

Si algo no está documentado:
👉 no existe
