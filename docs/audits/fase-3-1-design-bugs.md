# FASE 3.1 — Auditoría de bugs de diseño

**Fecha**: 2026-04-29
**Alcance**: `components/**` + `app/**` del repo `club-managment`.
**Fuente de verdad**:
- Tokens: `lib/tokens/colors.ts`, `lib/tokens/typography.ts`, `lib/tokens/radii.ts`, `lib/tokens/shadows.ts`, `app/globals.css`, `tailwind.config.ts`.
- Primitivos: `components/ui/*` (27 archivos) + `components/ui/README.md`.
- Reglas codificadas: `scripts/check-primitives.mjs` (23 reglas), `docs/design/design-system.md`, `CLAUDE.md`.

> El URL externo del DS referenciado en la consigna (`api.anthropic.com/v1/design/h/...`) no es accesible desde el harness; la auditoría usa la documentación del repo como ground truth.

---

## 1. Executive summary

### Baseline gates

| Gate | Resultado |
|---|---|
| `npm run check:primitives` | ✅ **0 violaciones** sobre 67 archivos escaneados. |
| `npm run lint` | (no ejecutado en esta corrida — bloqueante para Fase 3.2) |

> Que `check:primitives` esté en verde no significa "DS limpio". El script cubre 23 anti-patrones JSX-aware; el resto de la deuda del DS **no está cubierta hoy por ese script** pero **sí entra dentro del scope de esta auditoría** y está enumerada en las secciones 2 y 3: colores Tailwind crudos dentro de los propios primitivos, opacidades de `bg-secondary` no documentadas, tipografía hardcoded vía `text-[Npx]`, radios obsoletos `rounded-2xl/lg/xl`, tracking ad-hoc, headers de módulo divergentes, chips/botones hand-rolled. Conclusión operativa: además de arreglar los 96+ hits, hay que **ampliar las reglas del check** (Bloque B3) para que esta deuda no se reintroduzca.

### Totales por severidad

| Severidad | Hits | Definición |
|---|---|---|
| **Blocker** | 18 | Color Tailwind crudo en lugar de token semántico, header de módulo divergente, banner de form con paleta no semántica. Render visualmente perceptible o inconsistente entre pantallas. |
| **Major** | 27 | Token incorrecto pero render aceptable: `rounded-2xl/lg/xl` fuera de la taxonomía oficial, `text-[Npx]` hardcoded, `tracking-[0.18em]` ad-hoc, chip hand-rolled, button hand-rolled con `bg-slate-900`. |
| **Minor** | 51+ | Opacidades de `bg-secondary/{30,40,50,60}` no documentadas y aliases `bg-ds-slate-*` que duplican `bg-secondary`. No hay diferencia visual perceptible. |
| **Total** | **96+** | |

### Salud global del DS: **6.5 / 10**

- ✅ Adopción correcta de primitivos (`<Modal>`, `<DataTable>`, `<Button>`, `<EmptyState>`, `<Avatar>`) — el grueso de la app respeta el contrato.
- ✅ `texts.json` centralizado, sin strings hardcoded en JSX (verificado por la regla `hardcoded-spanish-copy`).
- ⚠️ **Los primitivos UI propios contienen los desvíos más críticos** (FormBanner, StatusBadge, SegmentedNav, Modal, Toast). Una sola corrección en `modal-form.tsx` arregla 6 blockers/majors usados en toda la app.
- ⚠️ Header de módulo `secretary` rompe la convención "un color tokenizado por rol".
- ⚠️ `treasury-operation-forms.tsx` concentra la mayor deuda de paleta (8+ hits con `bg-emerald-*`, `bg-blue-*` crudos).

---

## 2. Tabla maestra de hits (ordenada por severidad)

### 🔴 Blockers (color Tailwind crudo / inconsistencia de módulo)

| # | Pantalla / Componente | Archivo:línea | Desvío | Fix sugerido |
|---|---|---|---|---|
| B01 | `<FormBanner variant="warning">` (todos los modales con avisos amarillos) | [components/ui/modal-form.tsx:35](components/ui/modal-form.tsx:35) | `border-amber-200 bg-amber-50 text-slate-700` (paleta Tailwind cruda dentro del primitivo) | `border-warning/20 bg-warning/10 text-foreground` |
| B02 | `<FormBanner variant="destructive">` | [components/ui/modal-form.tsx:37](components/ui/modal-form.tsx:37) | `border-red-200 bg-red-50 text-slate-700` | `border-destructive/20 bg-destructive/10 text-foreground` |
| B03 | `<FormBanner variant="info">` | [components/ui/modal-form.tsx:39](components/ui/modal-form.tsx:39) | `border-blue-200 bg-blue-50 text-slate-700` | Definir token `info` en `tailwind.config.ts` (HSL) y usar `border-info/20 bg-info/10 text-foreground`. |
| B04 | `FormError` color warning interno del primitivo | [components/ui/modal-form.tsx:196](components/ui/modal-form.tsx:196) | `text-amber-700` crudo | `text-warning` (o `text-ds-amber-700` si se quiere conservar tono brand). |
| B05 | `FormError` color destructive interno | [components/ui/modal-form.tsx:197](components/ui/modal-form.tsx:197) | `text-red-700` crudo | `text-destructive`. |
| B06 | `FormError` color info interno | [components/ui/modal-form.tsx:198](components/ui/modal-form.tsx:198) | `text-blue-700` crudo | `text-info`. |
| B07 | `<StatusBadge tone="warning">` | [components/ui/status-badge.tsx:14](components/ui/status-badge.tsx:14) | Mezcla token + crudo: `border-warning/20 bg-warning/10 text-amber-700` | `text-warning` (o `text-warning-foreground`). |
| B08 | `<Button variant="destructive-outline">` | [components/ui/button.tsx:27](components/ui/button.tsx:27) | `border-red-200` crudo dentro del primitivo | `border-destructive/30` o tokenizar como `border-ds-red-200`. |
| B09 | **Header del módulo Secretaría** — bullet de status | [app/(dashboard)/secretary/page.tsx:100](app/\(dashboard\)/secretary/page.tsx:100) | `<span className="size-1.5 rounded-full bg-emerald-500" />` con color **crudo** | Treasury usa `bg-ds-blue` y RRHH usa `bg-ds-pink` tokenizado — Secretaría debe usar el mismo patrón con un token (p.ej. `bg-ds-green` o `bg-success`). **Inconsistencia entre módulos**. |
| B10 | Treasury — modal selector cuenta destino (estado seleccionado) | [components/dashboard/treasury-operation-forms.tsx:847](components/dashboard/treasury-operation-forms.tsx:847) | `border-emerald-200 bg-emerald-50 text-emerald-700` crudo | `border-success/20 bg-success/10 text-success`. |
| B11 | Treasury — selector cuenta origen (estado seleccionado) | [components/dashboard/treasury-operation-forms.tsx:1216](components/dashboard/treasury-operation-forms.tsx:1216) | `border-emerald-200 bg-emerald-50 text-emerald-700` | idem B10. |
| B12 | Treasury — selector método pago | [components/dashboard/treasury-operation-forms.tsx:2198](components/dashboard/treasury-operation-forms.tsx:2198) | `border-emerald-200 bg-emerald-50 text-emerald-700` | idem B10. |
| B13 | Treasury — selector "tipo de movimiento" info state | [components/dashboard/treasury-operation-forms.tsx:2549](components/dashboard/treasury-operation-forms.tsx:2549) | `border-blue-200 bg-blue-50 text-blue-700` | `border-info/20 bg-info/10 text-info` (con token nuevo). |
| B14 | Treasury — banner info inline (registrar movimiento) | [components/dashboard/treasury-operation-forms.tsx:2686](components/dashboard/treasury-operation-forms.tsx:2686) | `<div className="rounded-card border border-blue-200 bg-blue-50 px-3 py-2.5">` — debería usar `<FormBanner variant="info">` | Reemplazar por `<FormBanner>`. |
| B15 | Treasury — copy del banner | [components/dashboard/treasury-operation-forms.tsx:2687](components/dashboard/treasury-operation-forms.tsx:2687) | `text-[12px] leading-[1.5] text-blue-800` (typography hardcoded + color crudo) | `text-meta text-info`. |
| B16 | HR — botón eliminar contrato | [components/hr/staff-contracts-tab.tsx:427](components/hr/staff-contracts-tab.tsx:427) | `border-red-200 bg-red-50 text-red-700 hover:bg-red-100` | Reemplazar por `<Button variant="destructive-outline" size="sm" />` + tokenización del propio variant (depende de B08). |
| B17 | Treasury — botón "ver más" oscuro | [components/dashboard/treasury-role-card.tsx:740](components/dashboard/treasury-role-card.tsx:740) | `bg-slate-900 text-white hover:bg-black` (crudo) | `<Button variant="dark">` ya existe en el primitivo. |
| B18 | Treasury — botón confirmar oscuro (bis) | [components/dashboard/treasury-role-card.tsx:913](components/dashboard/treasury-role-card.tsx:913) , [:961](components/dashboard/treasury-role-card.tsx:961) | `bg-slate-900 ... hover:bg-black` repetido | idem B17. |

### 🟠 Major (token incorrecto, render aceptable)

| # | Pantalla / Componente | Archivo:línea | Desvío | Fix sugerido |
|---|---|---|---|---|
| M01 | Settings tab shell — input de búsqueda | [components/settings/settings-tab-shell.tsx:49](components/settings/settings-tab-shell.tsx:49) | `rounded-2xl ... focus:ring-primary/30` (input crudo, no usa `<FormInput>`) | `<FormInput>` o al menos `rounded-card` + `focus:ring-foreground/10`. |
| M02 | Settings tab shell — CTA "+" | [components/settings/settings-tab-shell.tsx:58](components/settings/settings-tab-shell.tsx:58) | `<button className="rounded-2xl bg-primary ...">` | `<Button variant="primary" size="md">`. |
| M03 | StatusMessage primitivo | [components/ui/status-message.tsx:12](components/ui/status-message.tsx:12) | `rounded-2xl` (canon es `rounded-card`) | `rounded-card`. |
| M04 | Treasury role card — pill de monto | [components/dashboard/treasury-card.tsx:218](components/dashboard/treasury-card.tsx:218) | `rounded-lg text-sm font-bold` | `rounded-btn` o `rounded-xs` según contexto. |
| M05 | `<Avatar shape="square">` | [components/ui/avatar.tsx:37](components/ui/avatar.tsx:37) | `rounded-lg` (no existe en taxonomía) | `rounded-card` o `rounded-btn`. |
| M06 | `<Button radius="xl">` (default) | [components/ui/button.tsx:39](components/ui/button.tsx:39) | `rounded-xl` (canon es `rounded-card` o `rounded-btn`) | Renombrar el variant a `card` y mappear a `rounded-card`. Borrar `xl` del radio. |
| M07 | Modal — title | [components/ui/modal.tsx:67](components/ui/modal.tsx:67) | `text-[18px]` hardcoded | `text-card-title` o `text-h3` (token oficial). |
| M08 | Modal — description | [components/ui/modal.tsx:71](components/ui/modal.tsx:71) | `text-[13px] leading-5` hardcoded | `text-label` o `text-meta` según escala. |
| M09 | Toast — title | [components/ui/toast/toast.tsx:155](components/ui/toast/toast.tsx:155) | `text-[14px] font-semibold leading-5` | `text-body font-semibold`. |
| M10 | Toast — action label | [components/ui/toast/toast.tsx:163](components/ui/toast/toast.tsx:163) | `text-[13px] font-semibold` | `text-label font-semibold`. |
| M11 | Toast — description | [components/ui/toast/toast.tsx:169](components/ui/toast/toast.tsx:169) | `mt-0.5 text-[13px] leading-5` | `mt-0.5 text-label leading-5` (o `text-meta`). |
| M12 | Toast — meta line (mono) | [components/ui/toast/toast.tsx:171](components/ui/toast/toast.tsx:171) | `font-mono text-[12px] leading-4` | `text-mono` (definido como 13/500/mono en `lib/tokens/typography.ts`). |
| M13 | SegmentedNav — container | [components/ui/segmented-nav.tsx:38](components/ui/segmented-nav.tsx:38) | `bg-slate-100 p-0.75` (color crudo dentro de primitivo) | `bg-secondary` o `bg-muted`. |
| M14 | SegmentedNav — pill activa | [components/ui/segmented-nav.tsx:41](components/ui/segmented-nav.tsx:41) | `bg-white text-foreground shadow-sm` | `bg-card text-foreground shadow-xs`. |
| M15 | SegmentedNav — pill inactiva | [components/ui/segmented-nav.tsx:42](components/ui/segmented-nav.tsx:42) | `text-slate-600 hover:text-foreground` | `text-muted-foreground hover:text-foreground`. |
| M16 | SegmentedNav — pill radius | [components/ui/segmented-nav.tsx:40](components/ui/segmented-nav.tsx:40) | `rounded-[7px]` ad-hoc (no existe en taxonomía de radios) | `rounded-btn` (8px) o agregar `rounded-pill` al token set. |
| M17 | BlockingOverlay — backdrop | [components/ui/overlay.tsx:95](components/ui/overlay.tsx:95) | `bg-slate-950/45` (color crudo) | Definir `--backdrop` en `globals.css` y usar `bg-backdrop`. |
| M18 | Active club selector — botón inline | [components/dashboard/active-club-selector.tsx:44](components/dashboard/active-club-selector.tsx:44) | `text-[15px]` hardcoded | `text-card-title` o `text-body`. |
| M19 | Close session modal — totales | [components/dashboard/close-session-modal-form.tsx:163](components/dashboard/close-session-modal-form.tsx:163), [:167](components/dashboard/close-session-modal-form.tsx:167), [:173](components/dashboard/close-session-modal-form.tsx:173), [:179](components/dashboard/close-session-modal-form.tsx:179) | `text-[17px] font-semibold` (4 ocurrencias) + `text-emerald-700` (línea 167) | `text-h3 font-semibold` + `text-success` para el verde. |
| M20 | Card eyebrow — tracking ad-hoc en lugar de token `tracking-card-eyebrow` | [components/ui/card.tsx:77](components/ui/card.tsx:77), [components/ui/status-badge.tsx:27](components/ui/status-badge.tsx:27), [components/ui/card-shell.tsx:26](components/ui/card-shell.tsx:26) | `tracking-[0.18em]` hardcoded en 3+ primitivos | `tracking-card-eyebrow` (ya definido en `lib/tokens/typography.ts:dsLetterSpacing`). |
| M21 | Card eyebrow — tracking ad-hoc en consumers | [components/dashboard/treasury-card.tsx:226](components/dashboard/treasury-card.tsx:226), [:253](components/dashboard/treasury-card.tsx:253), [:337](components/dashboard/treasury-card.tsx:337), [components/dashboard/treasury-conciliacion-tab.tsx:116](components/dashboard/treasury-conciliacion-tab.tsx:116), [:326](components/dashboard/treasury-conciliacion-tab.tsx:326), [components/hr/contract-detail-view.tsx:349](components/hr/contract-detail-view.tsx:349), [:367](components/hr/contract-detail-view.tsx:367), [:665](components/hr/contract-detail-view.tsx:665), [:763](components/hr/contract-detail-view.tsx:763), [:769](components/hr/contract-detail-view.tsx:769), [:778](components/hr/contract-detail-view.tsx:778), [:962](components/hr/contract-detail-view.tsx:962), [components/dashboard/treasury-role-card.tsx:644](components/dashboard/treasury-role-card.tsx:644), [components/settings/club-treasury-settings-manager.tsx:545](components/settings/club-treasury-settings-manager.tsx:545), [components/settings/tabs/members-tab.tsx:305](components/settings/tabs/members-tab.tsx:305), [app/(dashboard)/dashboard/page.tsx:109](app/\(dashboard\)/dashboard/page.tsx:109), [:118](app/\(dashboard\)/dashboard/page.tsx:118), [:147](app/\(dashboard\)/dashboard/page.tsx:147) | `tracking-[0.18em]` hardcoded — 18+ ocurrencias en pantallas | Migrar a `tracking-card-eyebrow`. |
| M22 | Eyebrow tracking 0.08em ad-hoc | [components/dashboard/treasury-card.tsx:226,253,337](components/dashboard/treasury-card.tsx:226), [components/dashboard/treasury-operation-forms.tsx:726-738](components/dashboard/treasury-operation-forms.tsx:726) | `tracking-[0.08em]` hardcoded | `tracking-eyebrow` (token oficial). |
| M23 | Card-shell pill | [components/ui/card-shell.tsx:26](components/ui/card-shell.tsx:26) | `<span className="inline-flex rounded-full border ... px-3 py-1 text-xs ...">` chip hand-rolled | `<MetaPill>` o `<Chip tone="neutral">`. |
| M24 | Members tab — chip de rol | [components/settings/tabs/members-tab.tsx:305](components/settings/tabs/members-tab.tsx:305) | Chip hand-rolled `rounded-full border px-3 py-1 ...` | `<Chip>` o `<StatusBadge>` según semántica. |
| M25 | Settings — `<Card className="rounded-toast">` | [components/settings/club-treasury-settings-manager.tsx:373](components/settings/club-treasury-settings-manager.tsx:373) | Override de `rounded-toast` sobre `<Card>` (el primitivo ya define su radio) | Usar `<Card>` sin override; si se necesita más radio, ampliar la taxonomía vía prop `radius` en el primitivo. |
| M26 | Toast — bg interno crudo | [components/ui/toast/toast.tsx:179](components/ui/toast/toast.tsx:179), [:187](components/ui/toast/toast.tsx:187) | `bg-white/10`, `text-white/60`, `text-white/70`, `text-white/50` ad-hoc | Consolidar en una variable de tema (`--toast-fg-*`) si se mantiene la card en dark; o usar `text-primary-foreground/70`. |
| M27 | Treasury — pill de cuenta crudo | [components/dashboard/treasury-operation-forms.tsx:726](components/dashboard/treasury-operation-forms.tsx:726), [:730](components/dashboard/treasury-operation-forms.tsx:730), [:738](components/dashboard/treasury-operation-forms.tsx:738) | `<span className="rounded-xs bg-ds-slate-100 px-1.5 py-0.5 ...">` chip hand-rolled | `<Chip size="sm">` o crear `<DataTableChip>` para uso fuera de tabla. |

### 🟡 Minor (no documentado / equivalencia trivial)

| # | Pantalla / Componente | Archivo / detalle | Desvío |
|---|---|---|---|
| m01 | Opacidades de `bg-secondary/{30,40,50,60}` | **51 ocurrencias** repartidas en `components/**` y `app/**` (modal-form, treasury-operation-forms, contract-detail-view, settings-tab-shell, etc.) | El DS no documenta estas opacidades; conviven 4 niveles distintos sin criterio explícito. |
| m02 | Aliases `bg-ds-slate-*` que duplican `bg-secondary` | [components/dashboard/treasury-operation-forms.tsx:726,730](components/dashboard/treasury-operation-forms.tsx:726), [components/dashboard/treasury-role-card.tsx:366](components/dashboard/treasury-role-card.tsx:366) | `bg-ds-slate-100 text-muted-foreground` ≡ `bg-secondary text-muted-foreground` (más legible). |
| m03 | Treasury — color por estado de cuenta (`bg-slate-400`) | [components/treasury/cost-centers-tab.tsx:190](components/treasury/cost-centers-tab.tsx:190) | Slate crudo en helper `getStatusColor` para estado "inactivo". |
| m04 | Sufijos `-050` / `-700` sin documentar en DS | Todos los `bg-ds-*-050` y `text-ds-*-700` (≈68 ocurrencias) | Tokens existen en `lib/tokens/colors.ts` pero la guía `design-system.md` no documenta cuándo aplicar `050` vs `700`. |

> **Total Minor sin enumerar uno-a-uno**: ~51 hits de `bg-secondary/*`. Listado completo disponible vía `grep -rn "bg-secondary/[0-9]" components app`.

---

## 3. Apartados por categoría

### 3.1 Tokens de radio fuera de la taxonomía oficial

Taxonomía oficial (`lib/tokens/radii.ts`): `xs (4)`, `chip (6)`, `btn (8)`, `card (10)`, `shell (18)`, `dialog (20)`, `toast (28)`.

| Radio prohibido | Hits totales | Worst offenders |
|---|---|---|
| `rounded-2xl` | 3 fuera de primitivos `ui/` | settings-tab-shell.tsx (×2), club-treasury-settings-manager.tsx |
| `rounded-lg` | 2 | avatar.tsx (square), treasury-card.tsx:218 |
| `rounded-xl` | 1 | button.tsx (variant default) |
| `rounded-[7px]` | 1 | segmented-nav.tsx (pill) |
| `rounded-toast` aplicado vía override en `<Card>` | 1 | club-treasury-settings-manager.tsx:373 |

### 3.2 Colores Tailwind crudos en lugar de tokens semánticos

18 hits agrupados:

- **Amber crudo** (warning): 4 ocurrencias (modal-form ×2, status-badge ×1, statusbadge mezcla token+crudo).
- **Red crudo** (destructive): 3 ocurrencias (modal-form, button.tsx variant, hr/staff-contracts-tab).
- **Blue crudo** (info): 4 ocurrencias (modal-form, treasury-operation-forms ×2, ×1 banner inline).
- **Emerald crudo** (success ad-hoc): 5 ocurrencias (treasury-operation-forms ×3, secretary/page.tsx, close-session-modal-form ×1).
- **Slate crudo** (neutral / dark): 5+ ocurrencias (segmented-nav ×2, treasury-role-card ×3 botones dark, overlay backdrop, cost-centers helper).

**Causa raíz**: tokens semánticos `info` y `success` no están plenamente integrados a la convención (no hay `text-info` definido en globals.css; sólo `success`, `warning`, `destructive`).

### 3.3 Tipografía hardcoded

`text-[Npx]` detectado en:

- `text-[18px]` — 1 hit (modal title).
- `text-[17px]` — 4 hits (close-session-modal-form totales).
- `text-[15px]` — 1 hit (active-club-selector inline edit).
- `text-[14px]` — 1 hit (toast title).
- `text-[13px]` — 3 hits (modal description, toast action, toast desc).
- `text-[12px]` — 2 hits (toast meta, treasury-operation-forms banner).

**Tokens disponibles** que cubren el 100% de los casos: `text-eyebrow (10)`, `text-meta (11)`, `text-small (12)`, `text-label (13)`, `text-body (14)`, `text-card-title (15)`, `text-h3 (16)`, `text-h4 (17)`, `text-h2 (20)`.

### 3.4 Tracking ad-hoc

- `tracking-[0.18em]` — **18+ hits** en pantallas + 3 en primitivos. Existe el token `tracking-card-eyebrow` que valdría exactamente lo mismo.
- `tracking-[0.08em]` — 5+ hits. Existe `tracking-eyebrow`.
- `tracking-[0.14em]` — uso correcto solo en `<FormSection>` (el resto debe migrar a token).

### 3.5 Primitivos no usados / hand-rolled

| Caso | Hits | Primitivo correcto |
|---|---|---|
| Chip `rounded-full border ... px-3 py-1` | 3 confirmados (card-shell, members-tab, contract-detail) | `<Chip>` / `<MetaPill>` / `<StatusBadge>` |
| Chip "rounded-xs" para inline meta (treasury) | 3 | `<Chip size="sm">` o ampliar `DataTableChip` para uso fuera de tabla |
| Banner inline (treasury-operation-forms:2686) | 1 | `<FormBanner>` |
| Botón dark con `bg-slate-900` | 3 (treasury-role-card) | `<Button variant="dark">` (ya existe) |
| Botón destructive outline con `bg-red-50` | 1 (hr/staff-contracts-tab) | `<Button variant="destructive-outline">` (ya existe) |
| Input search en `<SettingsTabShell>` | 1 | `<FormInput>` |
| Botón CTA en `<SettingsTabShell>` | 1 | `<Button variant="primary">` |

### 3.6 Feedback post-acción

✅ **Sin hits**. El patrón de toasts (`flashToast` server-side + `showToast` client-side) está aplicado consistentemente. No se detectaron URLs con `?feedback=CODE` ni mensajes inline transitorios.

### 3.7 Modales

✅ Regla `modal-missing-size` y `modal-hideclose-forbidden` (check:primitives) → 0 violaciones.
✅ Footers usan `<ModalFooter>` consistentemente.
⚠️ El primitivo `<Modal>` mismo tiene typography hardcoded (M07, M08).

---

## 4. Inconsistencias entre módulos para el mismo rol

| Eje | Secretaría | Tesorería | RRHH | Diagnóstico |
|---|---|---|---|---|
| **Bullet de status en header** ([app/(dashboard)/secretary/page.tsx:100](app/\(dashboard\)/secretary/page.tsx:100), [app/(dashboard)/treasury/page.tsx](app/\(dashboard\)/treasury/page.tsx), `app-header.tsx`) | `bg-emerald-500` (Tailwind crudo) | `bg-ds-blue` (token) | `bg-ds-pink` (token) | **Blocker B09**: Secretaría rompe el contrato "un color tokenizado por rol". |
| **Sub-tabs / segmented control** | (no aplica) | `<SegmentedNav>` (con slate crudo internamente) | `<RrhhModuleNav>` (custom — no auditado en este pase) | El primitivo común `<SegmentedNav>` debe ser la base; verificar que `RrhhModuleNav` herede o se consolide en Fase 3.2. |
| **Chip de filtro** | (no aplica directamente) | `<ChipButton>` correcto en treasury-conciliacion-tab | `<ChipButton>` correcto en hr/settlements | ✅ Consistente. |
| **Avatar tone** | `neutral` para staff, no usa colores de cuenta | `bancaria/virtual/efectivo` por tipo de cuenta | `neutral` para staff | ✅ Diferenciación intencional documentada. |
| **CTAs primarios** | `<Button>` (vía `<LinkButton>` en page) | `<Button>` consistente | `<Button>` consistente | ✅. |
| **Banners de info** | (no detectados) | `bg-blue-50` crudo (treasury-operation-forms) y `<FormBanner>` mezclados | `<FormBanner>` consistente | ⚠️ Tesorería tiene la mezcla más sucia. |

**Conclusión**: la inconsistencia visible más fuerte entre módulos es el **bullet de status del header** (B09). El resto son consistencias respetadas con desvíos puntuales adentro de cada módulo.

---

## 5. Plan de remediación priorizado (input para Fase 3.2)

### Bloque B1 · Tokenizar primitivos UI (prioridad MÁXIMA — arregla 11 hits con 1 PR)

**Archivos**: `components/ui/modal-form.tsx`, `components/ui/status-badge.tsx`, `components/ui/button.tsx`.

1. Definir token `--info` en `app/globals.css` + entry en `tailwind.config.ts` (HSL semántico, sin paleta brand).
2. Reemplazar `border-amber-200 bg-amber-50 text-slate-700` → `border-warning/20 bg-warning/10 text-foreground` en las 3 variantes de `<FormBanner>`.
3. Reemplazar `text-{amber,red,blue}-700` por `text-{warning,destructive,info}` en `<FormError>`.
4. Tokenizar `border-red-200` en `<Button variant="destructive-outline">`.
5. Limpiar `text-amber-700` en `<StatusBadge tone="warning">`.

Resuelve B01-B08, M07-M08. Cero cambios visuales perceptibles.

### Bloque B2 · Consolidar header de módulos (Blocker B09)

Editar `app/(dashboard)/secretary/page.tsx:100` para usar token. Opcional: definir mapping `roleAccentColor` en `lib/tokens/colors.ts` y leerlo desde un componente compartido `<ModuleHeader>` que use el mismo bullet en los 3 roles (single source of truth).

### Bloque B3 · Ampliar reglas de `check-primitives.mjs`

Agregar reglas para que estos desvíos sean **bloqueantes en CI** y no se reintroduzcan:

- `tailwind-raw-color`: bloquear `bg-(amber|red|blue|emerald|green|slate)-(50|100|200|400|500|700|800|900|950)` en `app/**` y `components/**` (excepto `components/ui/*` whitelisted explícitamente y solo durante migración). Sustitutos sugeridos por tono.
- `radius-out-of-taxonomy`: bloquear `rounded-(2xl|xl|lg)` y `rounded-\[Npx\]`. Excepción: `rounded-full` para chips circulares es válido.
- `typography-hardcoded`: bloquear `text-\[Npx\]` y `tracking-\[N\]em\]` cuando exista equivalente en `lib/tokens/typography.ts`.

### Bloque B4 · Migrar `tracking-[0.18em]` a `tracking-card-eyebrow`

18+ hits, mayormente mecánicos. Un solo PR de find/replace global.

### Bloque B5 · Documentar opacidades de `bg-secondary`

Decidir entre:
- (a) Crear tokens `bg-secondary-readonly`, `bg-secondary-hover`, `bg-secondary-pressed` con valores fijos de opacidad, eliminando los 51 hits de `bg-secondary/{30,40,50,60}`.
- (b) Documentar en `docs/design/design-system.md` exactamente qué opacidad va para qué uso, y agregar lint rule que sólo permita un set discreto.

Recomendado: (a) — alinea con el espíritu "un token, un significado".

### Bloque B6 · Reemplazar chips/botones hand-rolled

- `card-shell.tsx`, `members-tab.tsx`, `contract-detail-view.tsx`: chip hand-rolled → `<Chip>`/`<MetaPill>`.
- `treasury-role-card.tsx` botones dark: `bg-slate-900` → `<Button variant="dark">`.
- `hr/staff-contracts-tab.tsx`: botón destructive-outline → `<Button variant="destructive-outline">`.
- `settings-tab-shell.tsx`: input search → `<FormInput>`, CTA → `<Button>`.

### Bloque B7 · Limpiar `treasury-operation-forms.tsx`

Concentra 8+ hits de paleta cruda. PR aislado: reemplazar todos los `bg-emerald-*`, `bg-blue-*`, `text-blue-800` por tokens semánticos. Migrar el banner inline de la línea 2686 a `<FormBanner variant="info">`.

### Resumen de impacto por bloque

| Bloque | Hits resueltos | Esfuerzo | Riesgo visual |
|---|---|---|---|
| B1 (tokenizar primitivos) | 11 Blockers | S | Bajo — equivalencia 1:1 |
| B2 (header secretaría) | 1 Blocker | XS | Bajo |
| B3 (ampliar gates) | preventivo | M | Nulo |
| B4 (tracking) | 18 Major | XS (find/replace) | Nulo |
| B5 (opacidades) | 51 Minor | M | Bajo |
| B6 (hand-rolled) | 6 Major | S | Bajo |
| B7 (treasury-operation-forms) | 6 Blockers | S | Bajo |

**Sugerencia de orden**: B3 (bloquea regresiones) → B1 → B2 → B7 → B4 → B6 → B5.

---

## 6. Apéndice — Comandos de verificación usados

```bash
npm run check:primitives   # 0 violaciones (baseline)

# Hits de paleta cruda
grep -rn "bg-amber-50\|bg-red-50\|bg-blue-50\|bg-emerald-\|border-amber-200\|border-red-200\|border-blue-200\|border-emerald-200\|text-amber-700\|text-red-700\|text-blue-700\|text-emerald-700" components app

# Hits de radio fuera de taxonomía
grep -rn "rounded-2xl\|rounded-lg\|rounded-xl\|rounded-\[7px\]" components app

# Tipografía hardcoded
grep -rn "text-\[1[2-9]px\]\|text-\[2[0-9]px\]\|tracking-\[0\.\(0[0-9]\|1[5-9]\)em\]" components app

# Opacidades de secondary
grep -rn "bg-secondary/[0-9]" components app | wc -l   # 51
```
