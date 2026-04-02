# CLAUDE.md

## 🧠 Contexto del proyecto

Este repositorio implementa una aplicación web mobile-first para gestión de cenas grupales.

El desarrollo está guiado por:
- User Stories (US)
- Acceptance Criteria (Gherkin)
- PDD por US (/pdd)
- Documentación técnica (/docs)
- Contratos (/docs/contracts)
- Modelo de dominio (/docs/domain)
- Base de datos (/docs/database + schema.sql)
- Textos centralizados (/lib/texts.json)

---

## 📚 Fuentes de verdad (orden de prioridad)

1. User Stories + Acceptance Criteria
2. PDD (/pdd)
3. Contracts (/docs/contracts)
4. Domain Model (/docs/domain/domain-model.md)
5. Database (schema.sql, rls-policies.sql)
6. Architecture (/docs/architecture)
7. texts.json

Si hay conflicto:
- Gherkin manda
- Luego PDD
- Luego contracts/domain

---

## ⚠️ Regla crítica: textos

### ❌ PROHIBIDO
- Hardcodear textos
- Strings en componentes
- Mensajes inline

### ✅ OBLIGATORIO
Todos los textos salen de:

/lib/texts.json

Ejemplo:

INCORRECTO:
<Button>Confirmar</Button>

CORRECTO:
<Button>{texts.buttons.confirm}</Button>

---

## 🧩 Flujo de desarrollo

Para cada US:

1. Leer US + AC
2. Leer PDD (/pdd)
3. Validar contracts
4. Validar domain model
5. Validar impacto en DB
6. Implementar
7. Validar contra AC

---

## 🧪 Validación obligatoria

Antes de cerrar:

- Cumple TODOS los escenarios Gherkin
- No rompe contracts
- Respeta RLS
- No hardcodea textos
- No duplica lógica
- Respeta arquitectura

---

## 🏗️ Arquitectura

### Separación de capas

- UI → render
- lógica → providers / services
- datos → repositories
- DB → source of truth

---

### Repository pattern (obligatorio)

Todo acceso a datos pasa por repositorios.

Nunca:
- fetch directo en componentes
- lógica en UI

---

### Estado

- Centralizado
- Derivado con selectores
- No duplicado

---

## 🔐 Auth & permisos

- Supabase Auth (Google)
- RLS obligatorio
- Ownership por user_id
- Backend define seguridad

---

## 🧱 Base de datos

Archivos:

- schema.sql
- /docs/database/rls-policies.sql

Reglas:

- No modificar schema sin impacto en domain
- Toda tabla con RLS
- Mantener consistencia con domain model

---

## 📄 PDD

Ubicación:

/pdd

Reglas:

- Traduce US → implementación
- Define flujos, estados, validaciones
- Claude debe seguirlo estrictamente

---

## 🔌 Contracts

Ubicación:

/docs/contracts

Incluye:
- API contracts
- Permission matrix

Reglas:

- No romper contracts
- Si cambia → actualizar docs

---

## 🚫 Anti-patrones

- Hardcode de textos
- Lógica en UI
- Acceso directo a DB desde UI
- Ignorar AC
- Crear sin US
- Duplicar lógica

---

## ✅ Definition of Done

Ubicación:

/DEFINITION_OF_DONE.md

Una tarea está completa si:

- Cumple AC
- No rompe nada existente
- Respeta arquitectura
- Documentación actualizada si aplica

---

## 🤖 Cómo debe trabajar Claude

Claude debe:

1. Leer contexto completo (US + PDD + docs)
2. Detectar impacto
3. Implementar mínimo necesario
4. Validar contra AC

---

## 🧭 Regla general

Si no está en:
- US
- AC
- PDD  
→ NO se implementa

---

## 📌 Nota final

Este proyecto está optimizado para desarrollo con IA.

Prioridades:

- Consistencia > creatividad
- Documentación > suposición
- Contracts > implementación