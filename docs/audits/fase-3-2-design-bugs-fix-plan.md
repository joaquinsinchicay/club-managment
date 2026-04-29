# FASE 3.2 — Plan de corrección de bugs de diseño

**Input**: [fase-3-1-design-bugs.md](fase-3-1-design-bugs.md) — 96+ hits (18 Blocker / 27 Major / 51+ Minor).
**Objetivo**: cerrar todos los desvíos del DS en 7 PRs ordenados por impacto y riesgo, dejando reglas de CI que prevengan regresiones.
**Restricción crítica**: cero cambios visuales perceptibles excepto donde explícitamente se decida lo contrario (header de Secretaría).

---

## Orden de ejecución

```
PR-1 (B3 · gates)    →  bloquea regresiones antes de tocar código
PR-2 (B1 · tokens)   →  resuelve 11 Blockers de primitivos UI con un cambio interno
PR-3 (B2 · header)   →  Secretaría alineada con Tesorería/RRHH
PR-4 (B7 · treasury) →  limpia treasury-operation-forms.tsx (6 Blockers)
PR-5 (B4 · tracking) →  find/replace global tracking-[0.18em]/[0.08em]
PR-6 (B6 · primitivos hand-rolled) → migra chips/botones a primitivos existentes
PR-7 (B5 · opacidades secondary)   → tokenización + cleanup masivo
```

Las dependencias son rígidas: PR-1 bloquea regresiones; PR-2 habilita PR-3/PR-4 (los tokens semánticos `info`/`success` se introducen ahí). PR-5/PR-6/PR-7 pueden ir en paralelo después de PR-4.

---

## PR-1 · Ampliar gates de DS (Bloque B3)

**Premisa**: si arreglamos hits sin endurecer las reglas, vuelven a aparecer en el próximo PR.

### Archivos a editar
- `scripts/check-primitives.mjs`

### Reglas nuevas

1. **`tailwind-raw-color`** — bloquea `bg-(amber|red|blue|emerald|green|slate|rose|indigo)-(50|100|200|400|500|600|700|800|900|950)` y `text-/border-/ring-` equivalentes en `app/**` y `components/**`. Excepción: `components/ui/*` whitelisted explícitamente y solo durante migración (PR-2 lo cierra). Mensaje sugerido por tono (warning→`warning`, destructive→`destructive`, info→`info`, success→`success`, slate→`secondary`/`muted-foreground`).
2. **`radius-out-of-taxonomy`** — bloquea `rounded-(2xl|xl|lg)` y `rounded-\[Npx\]`. Excepciones: `rounded-full` para chips circulares; `components/ui/*` durante migración.
3. **`typography-hardcoded`** — bloquea `text-\[Npx\]` y `tracking-\[N\]em\]`. Tabla de equivalencias en el mensaje de error (12→`text-small`, 13→`text-label`, 14→`text-body`, 15→`text-card-title`, 17→`text-h4`, 18→`text-h3`).

### Allowlist temporal

Agregar `// check-primitives-ignore-next-line: <bloque-de-fase-3-2>` en cada hit a migrar — se irán removiendo en cada PR siguiente. Esto permite mergear PR-1 con la baseline actual.

### Verificación
```bash
npm run check:primitives
npm run typecheck
```
- Debe seguir reportando 0 violaciones (todos los hits actuales tienen su ignore comment temporal).
- En PR-2..PR-7 al borrar el ignore comment, el script falla si el código no se migró.

---

## PR-2 · Tokenizar primitivos UI (Bloque B1)

Resuelve **11 Blockers** (B01–B08) + **2 Major** (M07, M08).

### Cambios

**1. `app/globals.css`** — agregar tokens semánticos faltantes:
```css
--info: 217 91% 60%;          /* HSL del azul info */
--info-foreground: 0 0% 100%;
--success-foreground: 0 0% 100%;
--warning-foreground: 0 0% 100%;
```

**2. `tailwind.config.ts`** — exponer los tokens:
```ts
info: { DEFAULT: "hsl(var(--info))", foreground: "hsl(var(--info-foreground))" },
// success y warning ya existen
```

**3. `components/ui/modal-form.tsx`** — reemplazar:
- L35: `border-amber-200 bg-amber-50 text-slate-700` → `border-warning/20 bg-warning/10 text-foreground`
- L37: `border-red-200 bg-red-50 text-slate-700` → `border-destructive/20 bg-destructive/10 text-foreground`
- L39: `border-blue-200 bg-blue-50 text-slate-700` → `border-info/20 bg-info/10 text-foreground`
- L196: `text-amber-700` → `text-warning`
- L197: `text-red-700` → `text-destructive`
- L198: `text-blue-700` → `text-info`

**4. `components/ui/status-badge.tsx`**
- L14: `border-warning/20 bg-warning/10 text-amber-700` → `border-warning/20 bg-warning/10 text-warning`

**5. `components/ui/button.tsx`**
- L27: `border border-red-200 bg-card text-ds-red-700 hover:bg-ds-red-050` → `border border-destructive/30 bg-card text-destructive hover:bg-destructive/10`
- L39: `xl: "rounded-xl"` → renombrar a `card: "rounded-card"` y migrar todos los consumers (find/replace `radius="xl"` → `radius="card"`).

**6. `components/ui/modal.tsx`**
- L67: `text-[18px] font-semibold tracking-tight` → `text-h3 font-semibold tracking-tight`
- L71: `text-[13px] leading-5` → `text-label leading-5`

### Verificación
- `npm run typecheck && npm run check:primitives && npm run lint`.
- **Smoke visual** (preview obligatorio): abrir un modal con `<FormBanner variant="warning|destructive|info">` y un `<StatusBadge tone="warning">`, comparar contra screenshots de baseline. Tono debería ser **idéntico** porque los tokens HSL del nuevo `--info` se calibran a partir de los hex de Tailwind `blue-500`. Para warning/destructive aplica lo mismo (los tokens ya existían y representan el mismo color que `amber-50`/`red-50`).
- Pantallas críticas a inspeccionar: cualquier modal con `<FormBanner>` (apertura de jornada, registrar movimiento, alta de contrato), pantalla de liquidaciones (status badge), Settings (botón destructive-outline en HR contracts).

### Riesgo
Bajo. Si el HSL de `--info` no calibra bien al primer intento, ajustar antes de mergear. Cero impacto sobre lógica/contracts.

---

## PR-3 · Header de Secretaría tokenizado (Bloque B2)

Resuelve **1 Blocker** (B09).

### Cambios

**Opción A (mínima)**: editar [app/(dashboard)/secretary/page.tsx:100](app/\(dashboard\)/secretary/page.tsx:100):
```tsx
<span className="size-1.5 rounded-full bg-ds-green" aria-hidden="true" />
```

**Opción B (recomendada — single source of truth)**: crear `components/dashboard/module-status-bullet.tsx`:
```tsx
type Module = "secretary" | "treasury" | "rrhh";
const TONE: Record<Module, string> = {
  secretary: "bg-ds-green",
  treasury: "bg-ds-blue",
  rrhh: "bg-ds-pink",
};
export function ModuleStatusBullet({ module }: { module: Module }) {
  return <span className={cn("size-1.5 rounded-full", TONE[module])} aria-hidden="true" />;
}
```
Y reemplazar los 3 bullets actuales (Secretaría, Tesorería, RRHH) por `<ModuleStatusBullet module="..." />`.

### Verificación
- Preview de `/secretary`, `/treasury`, `/rrhh` — cada header debe tener bullet del color tokenizado de su módulo.
- Cambio visual **esperado**: Secretaría pasa de `emerald-500` (#10B981) a `--ds-green` (puede ser sutilmente distinto). Confirmar con el usuario antes de mergear.

### Riesgo
Bajo, pero **es el único PR con cambio visual perceptible** — requiere aprobación visual explícita.

---

## PR-4 · Limpiar `treasury-operation-forms.tsx` (Bloque B7)

Resuelve **6 Blockers** (B10–B15) + **1 Major** (M27).

### Cambios

[components/dashboard/treasury-operation-forms.tsx](components/dashboard/treasury-operation-forms.tsx):

- L847, L1216, L2198: `border-emerald-200 bg-emerald-50 text-emerald-700` → `border-success/20 bg-success/10 text-success` (3 ocurrencias).
- L2549: `border-blue-200 bg-blue-50 text-blue-700` → `border-info/20 bg-info/10 text-info`.
- L2686-2687: reemplazar `<div className="rounded-card border border-blue-200 bg-blue-50 px-3 py-2.5"><p className="text-[12px] leading-[1.5] text-blue-800">` por `<FormBanner variant="info">` (1 ocurrencia + texto).
- L726, L730, L738: chips inline de cuenta — migrar a `<Chip size="sm">` o, si no existe `size="sm"` en el primitivo, ampliarlo en este mismo PR.
- L726: `bg-ds-slate-100 text-muted-foreground` → `bg-secondary text-muted-foreground` (Minor m02 — bonus en el mismo touch).

Adicionalmente migrar [components/dashboard/treasury-role-card.tsx:740,913,961](components/dashboard/treasury-role-card.tsx:740) — los 3 botones `bg-slate-900 text-white hover:bg-black` → `<Button variant="dark">` (Blockers B17, B18). Y [components/dashboard/treasury-role-card.tsx:366](components/dashboard/treasury-role-card.tsx:366): `bg-ds-slate-100 text-ds-slate-600` → `bg-secondary text-muted-foreground`.

### Verificación
- Preview obligatorio sobre `/treasury` — abrir cada modal de operación (registrar ingreso/egreso, transferir entre cuentas, conciliar, cerrar jornada) y verificar selectores y banners.
- Toast on submit y feedback inline de validación deben verse igual.

### Riesgo
Medio (archivo grande, 2700+ líneas). Mitigación: hacer el PR en commits chicos por sección del archivo y revisar cada uno con preview.

---

## PR-5 · Migrar tracking ad-hoc (Bloque B4)

Resuelve **18+ Major** (M20, M21, M22).

### Cambios

Find/replace global:
- `tracking-[0.18em]` → `tracking-card-eyebrow` (18+ ocurrencias en `components/**` y `app/**`).
- `tracking-[0.08em]` → `tracking-eyebrow` (5+ ocurrencias).

Verificar que `tracking-card-eyebrow` y `tracking-eyebrow` existen en `tailwind.config.ts` (vienen de `lib/tokens/typography.ts:dsLetterSpacing`); si no están expuestos como utilities Tailwind, agregarlos.

### Verificación
- `npm run typecheck && npm run check:primitives` — debe pasar (PR-1 estableció `typography-hardcoded` como bloqueante).
- Smoke visual: card eyebrows y status badges deberían renderizarse pixel-perfect porque los valores numéricos son idénticos.

### Riesgo
Mínimo. Es un find/replace mecánico con valores equivalentes.

---

## PR-6 · Migrar primitivos hand-rolled (Bloque B6)

Resuelve **6 Major** (M23, M24, M01, M02, B16) + **1 Blocker** (B16).

### Cambios

| Hit | Acción |
|---|---|
| [components/ui/card-shell.tsx:26](components/ui/card-shell.tsx:26) | Chip hand-rolled → `<MetaPill>` o `<Chip tone="neutral">`. |
| [components/settings/tabs/members-tab.tsx:305](components/settings/tabs/members-tab.tsx:305) | Chip hand-rolled → `<Chip>` o `<StatusBadge>`. |
| [components/settings/settings-tab-shell.tsx:49](components/settings/settings-tab-shell.tsx:49) | Input search crudo → `<FormInput type="search">`. |
| [components/settings/settings-tab-shell.tsx:58](components/settings/settings-tab-shell.tsx:58) | Botón CTA crudo → `<Button variant="primary">`. |
| [components/hr/staff-contracts-tab.tsx:427](components/hr/staff-contracts-tab.tsx:427) | Botón destructive outline crudo → `<Button variant="destructive-outline" size="sm">`. |
| [components/dashboard/treasury-card.tsx:218](components/dashboard/treasury-card.tsx:218) | `rounded-lg` → `rounded-btn` o `rounded-xs` según contexto. |
| [components/ui/avatar.tsx:37](components/ui/avatar.tsx:37) | `rounded-lg` (square shape) → `rounded-card`. |
| [components/ui/segmented-nav.tsx:38,40-42](components/ui/segmented-nav.tsx:38) | `bg-slate-100`/`bg-white`/`text-slate-600`/`rounded-[7px]` → tokens (`bg-secondary`, `bg-card`, `text-muted-foreground`, `rounded-btn`). |
| [components/ui/overlay.tsx:95](components/ui/overlay.tsx:95) | `bg-slate-950/45` → definir `--backdrop` y usar `bg-backdrop`. |
| [components/dashboard/active-club-selector.tsx:44](components/dashboard/active-club-selector.tsx:44) | `text-[15px] font-semibold tracking-tight` → `text-card-title font-semibold tracking-tight`. |
| [components/dashboard/close-session-modal-form.tsx:163,167,173,179](components/dashboard/close-session-modal-form.tsx:163) | `text-[17px] font-semibold` → `text-h4 font-semibold`; `text-emerald-700` → `text-success`. |
| [components/ui/toast/toast.tsx:155,163,169,171,179,187](components/ui/toast/toast.tsx:155) | Tipografía hardcoded → tokens; `text-white/*` → `text-primary-foreground/*` o variable de tema dedicada. |
| [components/ui/status-message.tsx:12](components/ui/status-message.tsx:12) | `rounded-2xl` → `rounded-card`. |
| [components/settings/club-treasury-settings-manager.tsx:373](components/settings/club-treasury-settings-manager.tsx:373) | Remover override `rounded-toast` sobre `<Card>`. |
| [components/treasury/cost-centers-tab.tsx:190](components/treasury/cost-centers-tab.tsx:190) | `bg-slate-400` → `bg-muted` o helper de tono. |

### Verificación
- Preview de cada pantalla afectada. Foco en miembros (`/settings`), HR contracts, treasury cards, close-session modal.
- `<Chip size="sm">` debe existir; si no, agregarlo al primitivo dentro de este PR.

### Riesgo
Medio (toca muchos archivos). Mitigación: commits por componente.

---

## PR-7 · Tokenizar opacidades de `bg-secondary` (Bloque B5)

Resuelve **51+ Minor** (m01).

### Cambios

**Decisión arquitectónica**: introducir tokens semánticos discretos en lugar de mantener 4 niveles de opacidad ad-hoc.

`app/globals.css` + `tailwind.config.ts`:
```css
--secondary-readonly: ...;   /* equivalente a bg-secondary/40 */
--secondary-hover: ...;      /* equivalente a bg-secondary/50 */
--secondary-pressed: ...;    /* equivalente a bg-secondary/60 */
--secondary-subtle: ...;     /* equivalente a bg-secondary/30 */
```

Tabla de migración (criterio): mapear cada opacidad según contexto de uso. La mayoría son `/40` en readonly fields (modal-form FORM_READONLY_CLASSNAME, settings-tab-shell) → `bg-secondary-readonly`.

### Verificación
- `grep -rn "bg-secondary/[0-9]" components app | wc -l` debe ser **0** después del PR.
- Preview de modales con readonly fields y Settings tabs.

### Riesgo
Bajo (cambios mecánicos), pero **alto volumen** (51 hits). Mitigación: scriptear el reemplazo y revisar diff por sampling.

---

## Definition of Done de Fase 3.2

- [ ] `npm run check:primitives` reporta 0 violaciones **con todas las nuevas reglas activas y sin allowlist temporal**.
- [ ] `npm run lint` y `npm run typecheck` pasan.
- [ ] `grep` no devuelve hits para los anti-patrones documentados en sección 1 del audit (paleta cruda, radios obsoletos, `text-[Npx]`, `tracking-[Nem]`, `bg-secondary/N`, chip/banner hand-rolled).
- [ ] Smoke visual hecho con `preview_*` tools sobre las 6 pantallas críticas: `/dashboard`, `/secretary`, `/treasury` (registrar movimiento + transferir + conciliar + cerrar jornada), `/treasury/staff/[id]`, `/rrhh/contracts`, `/settings/members`.
- [ ] Cero cambios visuales reportados por el usuario excepto el bullet del header de Secretaría (cambio aprobado en PR-3).
- [ ] El reporte original [fase-3-1-design-bugs.md](fase-3-1-design-bugs.md) recibe un footer "✅ Cerrado en commits XXX–YYY (Fase 3.2)".

---

## Estimación de esfuerzo

| PR | Esfuerzo | Riesgo visual | Smoke visual |
|---|---|---|---|
| PR-1 (gates) | M (4-6h) | Nulo | No requiere |
| PR-2 (tokens primitivos) | S (2-3h) | Bajo (calibración HSL info) | Sí |
| PR-3 (header) | XS (30min) | **Medio (cambio intencional)** | Sí (aprobación usuario) |
| PR-4 (treasury-operation-forms) | M (4-6h) | Bajo | Sí (5+ modales) |
| PR-5 (tracking) | XS (30min, find/replace) | Nulo | Sampling |
| PR-6 (primitivos hand-rolled) | M (5-7h) | Bajo | Sí (4+ pantallas) |
| PR-7 (opacidades) | S (2-3h) | Bajo | Sampling |
| **Total** | **18-26h** | | |

Sugerencia: PR-1 + PR-2 + PR-3 en una primera iteración (cierra 13 Blockers); luego PR-4 + PR-5; finalmente PR-6 + PR-7.

---

## Riesgos transversales

1. **Cambio de tono visual no detectado**: la calibración HSL del nuevo `--info` puede diferir de `bg-blue-50` lo suficiente como para que el usuario lo note. Mitigación: comparar HSL ↔ hex Tailwind en sección crítica de PR-2.
2. **Regresión en `radius="xl"` → `radius="card"`**: Renombrar el variant del Button rompe consumers. Mitigación: find/replace exhaustivo + `npm run typecheck`.
3. **Tokens nuevos no expuestos en Tailwind**: si `tracking-card-eyebrow` no está como utility, agregarlo en `tailwind.config.ts` antes de PR-5.
4. **Allowlist temporal "se queda"**: si algún PR de B se merguea sin remover su ignore, el script vuelve a estar en verde por la razón equivocada. Mitigación: en cada PR, primer commit es "remove allowlist for block BX", segundo commit es la migración.
