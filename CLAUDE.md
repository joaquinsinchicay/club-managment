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
- Todo modal usa `@/components/ui/modal`. Prohibido re-implementar overlay/panel con `BlockingOverlay`, `<div fixed>`, portales manuales o wrappers propios.
- El primitivo ya renderiza un botón de cerrar con icono `X` en el header. **No agregar** botones textuales "Cerrar" dentro del body.
- Todo form dentro de un modal usa `@/components/ui/modal-footer` para los botones de acción. Reimplementar el footer a mano está **prohibido**.

### API canónica: `<Modal>`
```tsx
<Modal
  open={...}
  onClose={...}
  title={...}
  description={...}         // opcional
  size="sm" | "md" | "lg"   // default "md"
  hideCloseButton           // opcional; usar si el footer ya tiene Cancelar
  closeDisabled             // durante submit
>
```
Taxonomía de `size`:
- `sm` → `max-w-md`. Confirmaciones irreversibles, modales de 1 campo (Invitar, Eliminar miembro, Confirmar remoción).
- `md` → `max-w-xl`. **Default**. Form simple de un solo flujo (editar movimiento, crear categoría/actividad, editar cost center).
- `lg` → `max-w-3xl`. Forms multi-columna, listas, tablas embebidas (apertura/cierre de jornada).

`panelClassName` es escape-hatch; no usar salvo excepción aprobada en code review.

### API canónica: `<ModalFooter>`
```tsx
<ModalFooter
  onCancel={handleCancel}       // opcional; si se omite, solo Submit (caso "Invitar")
  cancelLabel="Cancelar"
  submitLabel="Guardar"
  pendingLabel="Guardando…"
  submitDisabled={...}
  submitVariant="primary" | "destructive" | "dark"   // default "primary"
  size="sm" | "md"              // default "md"
  align="stretch" | "end"       // default "stretch"
/>
```

Reglas de uso:
- `align="stretch"` (default) → dos botones iguales en `grid-cols-2`. Úsese en confirmaciones y acciones principales (tesorería, sesión).
- `align="end"` → botones autoancho pegados a la derecha. Úsese en forms densos (settings, cost centers) donde el full-width se ve desproporcionado.
- `size="sm"` solo cuando el modal es de densidad compacta (cost centers, categorías, actividades, receipt formats). Default `md` para dashboard/tesorería.
- Para modales de **una sola acción** (Invitar), omitir `onCancel`/`cancelLabel`. La X del header sigue siendo vía de salida.
- Nunca pasar `className` para overridear padding/radius/altura. Si el layout no encaja, discutir antes de hackear.
- `submitVariant="destructive"` en acciones destructivas (cerrar jornada, remover miembro, eliminar recurso).

### Prohibiciones explícitas
```tsx
// ❌ radius hardcoded
<button className="rounded-2xl ..." />
// ❌ altura / padding hardcoded
<button className="min-h-11 py-3 ..." />
// ❌ footer a mano
<div className="flex gap-2 border-t pt-4">
  <button>Cancelar</button>
  <PendingSubmitButton ... />
</div>
// ❌ panelClassName para forzar ancho
<Modal panelClassName="max-w-xl" />   // usar size="md"
// ❌ X + botón "Cerrar" textual simultáneos
// ❌ MODAL_FOOTER_CLASSNAME (eliminado)
```

### Checklist para modales nuevos o modificados
- [ ] `<Modal>` con `size` explícito apropiado a la taxonomía.
- [ ] `<ModalFooter>` con labels desde `texts.*` (nunca hardcoded).
- [ ] Si el footer tiene Cancelar, considerar `hideCloseButton` para evitar doble salida.
- [ ] `submitVariant="destructive"` para acciones destructivas.
- [ ] Si el submit depende de validación client-side, `submitDisabled` conectado.
- [ ] Si usa server action, el handler sigue el patrón `setModalOpen(false) → await action → triggerClientFeedback → router.refresh` (ver sección de feedback).
- [ ] Nada de `rounded-2xl`, `rounded-card`, `py-3`, `min-h-11` hardcoded en botones o en el footer.

### Referencia canónica
- Wiring Modal + form con handler: `components/dashboard/treasury-role-card.tsx` (bloque `edit_movement`).
- Form con `<ModalFooter>` `stretch`/`md`: `SecretariaMovementEditForm` en `components/dashboard/treasury-operation-forms.tsx`.
- Footer `align="end"` + `size="sm"`: `CostCenterForm` en `components/treasury/cost-centers-tab.tsx`.
- Footer sin `onCancel` (acción única): modal "Invitar" en `components/settings/tabs/members-tab.tsx`.

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
