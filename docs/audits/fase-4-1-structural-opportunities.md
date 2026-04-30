# FASE 4.1 — Oportunidades de mejora estructural del frontend

**Fecha**: 2026-04-29
**Alcance**: `components/**` y `app/**` del repo `club-managment`. Excluye `components/ui/*` excepto cuando una inconsistencia interna del primitivo afecta a todos los consumers.
**Contexto**: ejecutado después de cerrar la Fase 3 (Design System tokenizado, 0 violaciones en `check:primitives`). Esta fase mira **arquitectura y mantenibilidad**, no estilos.

---

## Executive summary

El DS está limpio en tokens, pero el código de aplicación arrastra **3 categorías de deuda estructural**:

1. **Patrones duplicados sin abstracción**: 5 modales de crear/editar repiten la misma máquina de estado, 5+ archivos repiten `useListFiltering` ad-hoc, 3+ archivos repiten un helper `runAction`. Son hooks que faltan.
2. **Lógica de presentación inline**: 7 formatters de fecha duplicados, 3 enum-label mappings dispersos, helpers visuales (`progressBarColor`, `getMovementTypeColor`) que viven dentro del componente que los usa. Faltan módulos `lib/dates.ts` y `lib/labels.ts`.
3. **Inconsistencias de API entre primitivos similares**: 6 primitivos de pill/badge con tones divergentes (Chip=6, StatusBadge=5, DataTableChip=5, Avatar=5 con tones de dominio); `Button` y `LinkButton` con default `variant` distinto; god component `treasury-operation-forms.tsx` (2702 LOC, 11 useState calls).

**Esfuerzo total estimado**: ~3-5 sprints si se hace en bloques. Bajo riesgo (la Fase 3 ya bloqueó regresiones de DS).

### Totales por tier

| Tier | Items | Esfuerzo | Beneficio agregado |
|---|---|---|---|
| **T1 — Quick wins** | 6 | Bajo | Type safety + DX inmediato |
| **T2 — Hooks & abstracciones** | 7 | Medio | Elimina ~250 líneas de duplicación, mejora testability |
| **T3 — Refactors arquitectónicos** | 3 | Alto | Resuelve god components y props drilling |

---

## Tier 1 · Quick wins (bajo esfuerzo, alto beneficio)

| # | Oportunidad | Archivos | Esfuerzo | Beneficio |
|---|---|---|---|---|
| **T1.1** | **`lib/dates.ts` — centralizar 7 formatters Intl duplicados** | [components/dashboard/treasury-role-card.tsx:153-166](components/dashboard/treasury-role-card.tsx:153), [components/dashboard/secretaria-movement-list.tsx:45-54](components/dashboard/secretaria-movement-list.tsx:45), [components/dashboard/account-detail-card.tsx:43-64](components/dashboard/account-detail-card.tsx:43), [components/dashboard/treasury-card.tsx:74](components/dashboard/treasury-card.tsx:74), [components/treasury/cost-centers-tab.tsx:157-175](components/treasury/cost-centers-tab.tsx:157), [components/dashboard/movement-list.tsx](components/dashboard/movement-list.tsx) | Bajo | Elimina ~40 LOC, centraliza formato es-AR, single point of change para i18n |
| **T1.2** | **`lib/labels.ts` — centralizar 3 enum→label mappings dispersos** | [components/treasury/cost-centers-tab.tsx:91-142](components/treasury/cost-centers-tab.tsx:91) (TYPE_LABEL, STATUS_LABEL, PERIODICITY_LABEL, BADGE_TONES), [components/hr/settlements-list.tsx:136](components/hr/settlements-list.tsx:136) (settlementStatusTone) | Bajo | Elimina ~50 LOC, centraliza traducción de enums, facilita i18n futuro |
| **T1.3** | **Helpers de moneda y movement type** | `getCurrencySymbol(code)`, `formatCurrencyAmount(amount, code)`, `getMovementTypeColor(type)`, `getMovementTypeTone(type)`. Duplicados en [treasury-role-card.tsx:407-471](components/dashboard/treasury-role-card.tsx:407), [secretaria-movement-list.tsx:39-43](components/dashboard/secretaria-movement-list.tsx:39), [account-detail-card.tsx:37-41](components/dashboard/account-detail-card.tsx:37) | Bajo | Centraliza el "$ vs US$" y el mapeo type→color en 1 lugar |
| **T1.4** | **Exportar types `*Tone`, `*Size`, `*Variant` de los primitivos** | [components/ui/button.tsx:5](components/ui/button.tsx:5), [components/ui/link-button.tsx:6](components/ui/link-button.tsx:6), [components/ui/card.tsx:6](components/ui/card.tsx:6), [components/ui/avatar.tsx:6](components/ui/avatar.tsx:6), [components/ui/data-table.tsx](components/ui/data-table.tsx) (Density) | Bajo | Type safety: consumers pueden importar el tipo, validar tones en helpers, evitar magic strings |
| **T1.5** | **Agregar `forwardRef` a primitivos display** | [components/ui/chip.tsx:52](components/ui/chip.tsx:52), [components/ui/meta-pill.tsx:9](components/ui/meta-pill.tsx:9), [components/ui/status-badge.tsx:29](components/ui/status-badge.tsx:29), [components/ui/avatar.tsx:55](components/ui/avatar.tsx:55) | Bajo | Permite measurement / focus management vía `useRef`. Coherencia con Button/Link/Form que sí lo tienen |
| **T1.6** | **Unificar default `variant` de `LinkButton` con `Button`** | [components/ui/link-button.tsx:30](components/ui/link-button.tsx:30) (`"secondary"` → `"primary"`) | Bajo | Hoy `<Button>` default es primary y `<LinkButton>` default es secondary — drift sin razón documentada. Consumers tienen que recordar qué default usa cada uno |

---

## Tier 2 · Hooks y abstracciones (esfuerzo medio)

| # | Oportunidad | Archivos | Esfuerzo | Beneficio |
|---|---|---|---|---|
| **T2.1** | **Hook `useListFiltering<T>(items, opts)`** | search + filter combinados repetidos en 5+ archivos: [components/hr/staff-members-tab.tsx:76-103](components/hr/staff-members-tab.tsx:76), [components/hr/staff-contracts-tab.tsx:98-137](components/hr/staff-contracts-tab.tsx:98), [components/hr/salary-structures-tab.tsx](components/hr/salary-structures-tab.tsx), [components/settings/tabs/members-tab.tsx:75-174](components/settings/tabs/members-tab.tsx:75), [components/treasury/cost-centers-tab.tsx](components/treasury/cost-centers-tab.tsx) | Medio | Elimina ~30 LOC por archivo. Standardiza el shape `{ search, setSearch, filter, setFilter, filtered }` |
| **T2.2** | **Hook `useServerAction()` / `useFormSubmissionState()`** | helper `runAction` re-implementado en [components/hr/staff-members-tab.tsx:105-122](components/hr/staff-members-tab.tsx:105), [components/hr/staff-contracts-tab.tsx:139-157](components/hr/staff-contracts-tab.tsx:139), [components/hr/settlements-list.tsx:250-262](components/hr/settlements-list.tsx:250), patrón equivalente embebido en [components/dashboard/treasury-card.tsx](components/dashboard/treasury-card.tsx) y [components/dashboard/treasury-role-card.tsx](components/dashboard/treasury-role-card.tsx) | Medio | Encapsula `setPending(true) → action → triggerFeedback → router.refresh → setPending(false)`. Elimina ~15 LOC por archivo |
| **T2.3** | **Hook `useModalCrud<T>({ createAction, updateAction })`** | patrón "lista + modal create + modal edit" replicado en [components/hr/staff-members-tab.tsx](components/hr/staff-members-tab.tsx), [components/hr/staff-contracts-tab.tsx](components/hr/staff-contracts-tab.tsx), [components/settings/tabs/members-tab.tsx](components/settings/tabs/members-tab.tsx) (3 archivos completos, posiblemente 5+) | Medio | Encapsula `{ isCreateOpen, editingItem, handleCreate, handleEdit }`. Elimina ~50 LOC por archivo |
| **T2.4** | **Singleton `ToneScheme` para los 6 primitivos de pill/badge** | [components/ui/chip.tsx:12](components/ui/chip.tsx:12) (6 tones), [components/ui/status-badge.tsx:3](components/ui/status-badge.tsx:3) (5 tones distintos), [components/ui/data-table.tsx:285](components/ui/data-table.tsx:285) (5 tones sin accent), [components/ui/avatar.tsx:6](components/ui/avatar.tsx:6) (5 tones de dominio), [components/ui/meta-pill.tsx](components/ui/meta-pill.tsx) (sin tone prop) | Medio | Consolidar a 1 set: `neutral / success / warning / danger / info / accent`. Migrar `income`→`success`, `expense`→`danger` (alias documentados) |
| **T2.5** | **Hook `useFieldValidation(initial, validator, errorMsg)`** | validación inline + onBlur replicada en [components/settings/tabs/club-data-tab.tsx:44-74](components/settings/tabs/club-data-tab.tsx:44), [components/dashboard/close-session-modal-form.tsx:248-257](components/dashboard/close-session-modal-form.tsx:248), múltiples campos en [components/treasury/account-form.tsx](components/treasury/account-form.tsx) | Medio | Estandariza el patrón `value, error, handleChange, handleBlur`. Reduce ~10 LOC por campo validado |
| **T2.6** | **Unificar `MovementList` y `SecretariaMovementList` con `variant` prop** | [components/dashboard/movement-list.tsx](components/dashboard/movement-list.tsx) vs [components/dashboard/secretaria-movement-list.tsx](components/dashboard/secretaria-movement-list.tsx). Mismo dominio (treasury movements), distinto UX (tabular vs apilado), 90% del data shape coincide | Medio | `<MovementListView variant="tabular" \| "compact">`. Cualquier feature paritaria (ej. agregar checkbox de selección) toca 1 archivo en lugar de 2 |
| **T2.7** | **Exponer `maxWidth` y `bordered` props en `<Card>`** | [components/settings/tabs/placeholder-tab.tsx](components/settings/tabs/placeholder-tab.tsx), [components/dashboard/daily-session-balance-card.tsx](components/dashboard/daily-session-balance-card.tsx), [components/dashboard/account-detail-card.tsx](components/dashboard/account-detail-card.tsx) — 3 consumers que escapan el primitivo con `className="w-full max-w-5xl p-6 sm:p-8 border-dashed"` | Bajo-Medio | Elimina la confusión `padding="none" + className="p-6"` (gana className por orden de `cn()`). Hace explícito el set de configuraciones soportadas |

---

## Tier 3 · Refactors arquitectónicos (alto esfuerzo, transformacional)

| # | Oportunidad | Archivos | Esfuerzo | Beneficio |
|---|---|---|---|---|
| **T3.1** | **Refactor de `treasury-operation-forms.tsx` — god component** | [components/dashboard/treasury-operation-forms.tsx](components/dashboard/treasury-operation-forms.tsx) — **2702 LOC, 11 `useState` calls, 4 forms distintos en el mismo archivo** (TreasuryRoleMovementForm, TreasuryRoleFxForm, AccountTransferForm, SecretariaMovementEditForm) | Alto | Extraer 3-5 hooks (`useMovementFormState`, `useCostCenterSelection`, `useRecipientAccountSelection`) y separar los 4 forms a archivos dedicados. Habilita testing unitario de cada form. Reduce el "buscar bug en 2700 líneas" |
| **T3.2** | **`TreasuryDataContext` — eliminar props drilling de dominio** | `accounts: TreasuryAccount[]`, `categories: TreasuryCategory[]`, `activities: ClubActivity[]` se pasan a través de **8+ niveles** desde `treasury/page.tsx` → `TreasuryRoleCard` (25+ props) → `TreasuryRoleMovementForm` (20+ props) → sub-componentes. 14 archivos importan tipos de `@/lib/domain/access`. Cada feature de dominio (ej. agregar `CostCenterColor`) toca 8+ archivos. | Alto | Context (server-side hidratado) + custom hooks (`useTreasuryAccounts()`, `useTreasuryCategories()`). El árbol baja de 25+ props a 5-6 props específicos del componente |
| **T3.3** | **Deprecar `<CardShell>` y consolidar con `<Card>` + `<CardHeader>` + composición** | [components/ui/card-shell.tsx](components/ui/card-shell.tsx) — primitivo legacy con padding hardcoded, eyebrow acoplado a `<StatusBadge>`, tone hardcoded a `bg-card`, sin sub-componentes. Solo se usa en `app/(auth)/login/page.tsx` y `app/(auth)/pending-approval/page.tsx`. | Medio-Alto | Reemplazar CardShell por composición Card + CardHeader. 1 primitivo menos en el catálogo. Toda página de auth usa la misma API que el resto del DS |

---

## Top 5 antipatrones que pesan más a futuro

Síntesis de los 3 análisis. Ordenados por costo acumulado en 6 meses si no se atacan.

1. **Props drilling de datos de dominio (T3.2)** — 8+ archivos tocados por cada feature de dominio. **Costo más alto en 6 meses**.
2. **God component `treasury-operation-forms.tsx` (T3.1)** — 11 useState + 4 forms en 1 archivo. Cualquier bug de state requiere navegar 2700 líneas.
3. **6 primitivos de pill/badge sin tone unificado (T2.4)** — agregar un tone nuevo (ej. `pending`) requiere tocar 4-5 archivos.
4. **Falta de hooks compartidos (T2.1, T2.2, T2.3)** — `useListFiltering`, `useServerAction`, `useModalCrud`. Cada nuevo CRUD tab repite ~80 LOC.
5. **Lógica de presentación inline (T1.1, T1.2, T1.3)** — formatters y mappings dispersos. Cualquier ajuste de formato es-AR toca 6+ archivos.

---

## Cosas que están bien (no tocar)

Para no introducir cambios innecesarios:

- **Form controls** (`<FormInput>`, `<FormSelect>`, `<FormTextarea>`, `<FormReadonly>`) tienen API uniforme heredando de HTML attributes. ✓
- **`<SegmentedNav>`** ya unifica tabs link-based y button-based. ✓
- **`<DataTable>`** tiene API consistente con `density`, `gridColumns`, `useGrid`. ✓
- **Naming `variant` (buttons) vs `tone` (badges)** es semánticamente correcto y consistente dentro de cada categoría. Solo documentar la distinción. ✓
- **Avatar wrappers `rounded-full border bg-card`** repartidos en 7 lugares — cada uno tiene razón legítima distinta (avatar wrapper, edit button absoluto, action chip, date chip de header, etc.). No son duplicación destructiva, son la primitiva correcta + composición. ✓

---

## Plan de remediación sugerido

| Sprint | Bloque | Items | Esfuerzo |
|---|---|---|---|
| **Sprint A — Quick wins** | T1 completo | T1.1 + T1.2 + T1.3 + T1.4 + T1.5 + T1.6 | ~5-8h total |
| **Sprint B — Hooks comunes** | T2.1 + T2.2 + T2.5 | 3 hooks nuevos + migrar 5-8 archivos | ~12-16h |
| **Sprint C — DS API** | T2.4 + T2.6 + T2.7 + T3.3 | ToneScheme, MovementList, Card maxWidth, deprecar CardShell | ~10-15h |
| **Sprint D — God component** | T3.1 | Split treasury-operation-forms en 4 archivos + extracted hooks | ~16-24h |
| **Sprint E — Architecture** | T3.2 | TreasuryDataContext + migración de consumers | ~20-30h |

Total estimado: **~60-90 horas de trabajo enfocado**, distribuible en 4-6 sprints sin bloquear features.

---

## Métricas esperadas post-Fase 4

- **LOC reducido**: ~250-400 líneas de duplicación eliminadas (Tier 1 + 2).
- **Complejidad ciclomática**: god component baja de 11 useState a ≤3 por sub-form.
- **Discoverability**: 100% de los `*Tone`, `*Size`, `*Variant` types accesibles via import.
- **Bug surface**: cada bug de state o formato vive en 1 lugar, no en 6.
- **Time to add feature**: agregar un campo de dominio toca ~3 archivos en lugar de 8+.

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Refactor de `treasury-operation-forms` rompe flujos críticos de Tesorería | Hacer en commits chicos por form (1 form a la vez). Smoke visual obligatorio en cada commit (modales de movimiento, transfer, FX, edit). |
| Context para `TreasuryDataContext` rompe SSR / hydration | Hidratar el context server-side desde `treasury/page.tsx`. Usar el patrón ya conocido del proyecto (server components → client provider). |
| `ToneScheme` unificado cambia tones existentes (`income` → `success`) | Mantener aliases por 1 sprint con deprecation warning, luego remover. |
| Agregar reglas a `check:primitives` para los nuevos hooks | No hace falta — esto es código de aplicación, no DS. La regla del DS solo aplica a primitivos. |

---

## Anexo · Métricas de los componentes más grandes

Top 5 archivos por LOC en `components/`:

| # | Archivo | LOC | useState | Props | Acción sugerida |
|---|---|---|---|---|---|
| 1 | components/dashboard/treasury-operation-forms.tsx | 2702 | 11 | 20+ | T3.1 (split) |
| 2 | components/dashboard/treasury-role-card.tsx | 1549 | 5 | 25+ | T3.2 (context) |
| 3 | components/hr/settlements-list.tsx | 1303 | 3 | 8 | OK |
| 4 | components/hr/contract-detail-view.tsx | 970 | 4 | 12 | OK |
| 5 | components/dashboard/treasury-card.tsx | 908 | 6 | 27 | T3.2 (context) |
