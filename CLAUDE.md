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

## 🪟 Regla crítica: modales

### Primitivos obligatorios
- Todo modal usa `@/components/ui/modal`. Prohibido re-implementar overlay/panel con `BlockingOverlay` o `<div fixed>`.
- El primitivo ya renderiza un botón de cerrar con icono `X` en el header. **No agregar** botones textuales "Cerrar" dentro del body.
- Todo form dentro de un modal usa `@/components/ui/modal-footer` para los botones de acción. `onCancel` es **obligatorio** — el botón de Cancelar debe cerrar el modal.

### Tokens
- Los botones usan `Button` o `buttonClass()` de `@/components/ui/button`. **Prohibido hardcodear** `min-h-*`, `py-*`, `rounded-*`, `px-*` en clases de botón.
- Tamaño default: `size="md"` (44px alto, 10px padding vertical).
- Radio default para botones de form: `radius="btn"`.

### Tamaños de panel
- `max-w-md` — confirmaciones / diálogos simples.
- `max-w-xl` — formularios de un solo flujo (default para edición).
- `max-w-3xl` — listas, tablas, formularios multi-columna.

### Referencia canónica
- Wiring del Modal + form: `components/dashboard/treasury-role-card.tsx` bloque `edit_movement`.
- Form con footer tokenizado: `SecretariaMovementEditForm` en `components/dashboard/treasury-operation-forms.tsx`.

---

## 🔔 Regla crítica: feedback al usuario

### Patrón obligatorio
- Todo feedback post-acción de éxito o error debe mostrarse en toast.
- El toast debe ser reutilizable y consistente con el design system.
- El mensaje debe ser breve, visible y no depender del scroll de la página.

### API de toasts

**Desde client components** — llamada imperativa:

```tsx
import { showToast, showSuccess, showError, showWarning, showInfo } from "@/lib/toast";

showToast({
  kind: "success",
  title: "Movimiento registrado",
  desc: "Ingreso de $ 185.000,00 en Caja Pesos.",
  meta: "N° 004812 · 17/04 14:32"
});
```

**Desde server actions** — helper `flashToast()` + redirect:

```ts
import { flashToast } from "@/lib/toast-server";
import { resolveFeedback } from "@/lib/feedback-catalog";

flashToast(resolveFeedback("settings", result.code));
redirect("/settings");
```

La cookie flash `__toast` se consume una sola vez al rehidratar en el cliente. Nunca volver al patrón `?feedback=CODE` en la URL.

### Excepciones válidas
- Validación inline de campos dentro de formularios.
- Estados persistentes que forman parte principal de una pantalla.
- Modales o diálogos solo para confirmaciones previas o acciones irreversibles.

### Migración de legacy UI
- Si se toca una pantalla que todavía usa feedback inline transitorio, debe migrarse a toast en la misma tarea.
- No se deben introducir nuevos mensajes inline para feedback post-acción.

### Forms dentro de modales con server actions

El patrón `flashToast() + redirect()` **NO sirve** dentro de modales: el modal vive en estado React del cliente, y la soft-navigation al mismo path preserva el árbol React, dejando el modal abierto con el toast detrás.

**Patrón obligatorio para forms en modal**:

1. La server action devuelve `{ ok: boolean; code: string }` (no `redirect`, no `flashToast`).
2. La action solo llama `revalidatePath(...)` para invalidar la cache.
3. El client-component que abre el modal envuelve la action en un handler:

```tsx
const router = useRouter();
const [, startTransition] = useTransition();

async function handleSubmit(formData: FormData) {
  setModalOpen(false);                          // 1. cerrar el modal
  const result = await action(formData);        // 2. esperar al server
  triggerClientFeedback("domain", result.code); // 3. toast client-side
  if (result.ok) {
    startTransition(() => router.refresh());    // 4. refrescar datos
  }
}
```

Ejemplo canónico: `components/dashboard/treasury-card.tsx` (función `handleCreateTreasuryMovement`).

Para forms que NO viven en modal (settings, full-page) seguir usando el patrón `flashToast + redirect`.

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
- Usa toast para feedback post-acción o justifica correctamente una excepción

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
- Feedback post-acción inline dentro de la página
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
