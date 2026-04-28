# PDD — US-68 · Dashboard del módulo RRHH

> PDD del módulo **E04 · RRHH**. Fuente Notion: `E04 👥 RRHH` · alias `US-47`. En el repo: **US-68**. (Pre-refactor 2026-04-27 el alias era `US-44`.)
>
> Última actualización: 2026-04-28 — rediseño de Resumen y eliminación de la
> dependencia con US-69 (Reportes), que fue deprecado.

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E04 · RRHH |
| User Story | Como Tesorero / Coordinador RRHH del club, quiero ver un dashboard del módulo RRHH con el estado de las liquidaciones del mes, los contratos vigentes y los próximos hitos, para saber qué está pendiente de procesar y qué requiere atención. |
| Prioridad | Alta |
| Objetivo de negocio | Dar visibilidad inmediata del estado de la nómina mensual y del ciclo de vida de los contratos: cuánto falta confirmar, cuánto falta pagar, cuál es la dotación activa, qué revisiones salariales están atrasadas y qué contratos vencen pronto. Convertir el módulo RRHH en un tablero operativo denso que reemplace la necesidad de una pantalla separada de reportes. |

---

## 2. Problema a resolver

Sin dashboard, el coordinador de RRHH y el tesorero sólo pueden entender el estado del mes navegando listados y sumando mentalmente. Un resumen consolidado de cards con números grandes + banner de alerta + lista de hitos próximos reduce el tiempo de análisis de minutos a segundos y elimina la necesidad de una pantalla separada de reportes históricos.

---

## 3. Objetivo funcional

La ruta `/rrhh` renderiza:

### Banner top (condicional)
Cuando hay contratos cuya última revisión salarial es de hace más de 12 meses (excluyendo `por_hora` / `por_clase`), se muestra un banner amarillo con el count y un CTA "Revisar" hacia `/rrhh/contracts`.

### 7 cards operativas

1. **Liquidación vigente** — período actual (`YYYY-MM · estado dominante`), monto total y barra de progreso `pagadas/total` con sub-línea `X pagadas · Y pendientes`.
2. **A pagar esta semana** *(solo si el usuario tiene rol Tesorería)* — monto total + count + fecha estimada de vencimiento (último día del mes en curso) + CTA a `/treasury/payroll`.
3. **Colaboradores activos** — count de `staff_members.hasActiveContract = true` + `+N altas` (creados en los últimos 30 días) + CTA a `/rrhh/staff`.
4. **Contratos vigentes** — count + sub-línea `N con revisión atrasada · M vencen en 60d` + CTA a `/rrhh/contracts`.
5. **Costo mensual** — ejecutado del mes en curso + delta `↑/↓ X% vs mes anterior` + minicard `{prev_label}: $... · {two_label}: $...`.
6. **Estructuras** — count de estructuras activas + lista inline de roles (top 6) + CTA a `/rrhh/structures`.
7. **Alertas** — count de colaboradores sin contrato vigente. Si > 0, CTA a `/rrhh/staff?contract=without_active`; si 0, mensaje neutro.

### Sección "Próximos hitos"

Lista (top 8) ordenada por urgencia con dos tipos de eventos:
- **Revisión salarial** — contratos cuya última revisión es de hace más de 12 meses (o no tienen revisión).
- **Fin de contrato** — contratos vigentes con `end_date` entre hoy y hoy + 60 días.

Cada item muestra título (`Tipo · Colaborador`), subtítulo (`Contrato CODE · fecha`), y chip semántico (`vencido hace X días` / `hoy` / `en X días`). Cada item es un link al detalle del contrato.

Empty state si no hay hitos próximos.

---

## 4. Alcance

### Incluye
- Página `/rrhh` protegida por `canAccessHrModule` (rol `rrhh` exclusivo).
- Banner condicional + 7 cards (la de Tesorería gateada por `hasMembershipRole(membership, "tesoreria")`).
- Sección "Próximos hitos" con DataTable compact.
- Empty states por card y por sección.
- Cálculo server-side a nivel de página (sin RPC dedicada en MVP).
- Comparativas de costo mes a mes (último, anterior, dos anteriores) — la única comparativa simple del dashboard.
- Heurística de "revisión salarial atrasada" basada en `staff_contract_revisions.effective_date` de la revisión vigente (la última con `end_date is null`).

### No incluye
- Pantalla separada de Reportes (US-69 deprecada).
- Gráficos (deja para futura iteración).
- Personalización de cards.
- Tracking real de altas/bajas históricas (las "altas en últimos 30 días" usan `staff_members.created_at`; el concepto de "baja" no existe en el modelo actual y se omite).

---

## 5. Actor principal

`rrhh` (puede ser combinado con `tesoreria` para ver la card "A pagar esta semana").

---

## 6. Precondiciones

- Club activo resuelto.
- Membership con rol `rrhh` (validado por `canAccessHrModule`).

---

## 7. Postcondiciones

- Sólo lectura; no hay efectos.

---

## 8. Reglas de negocio

### Cálculos en `lib/services/hr-dashboard-service.ts`

Todos los cálculos derivan de listas ya cargadas (`payroll_settlements`, `staff_contracts`, `salary_structures`, `staff_members`) — sin queries dedicadas:

- **Liquidación vigente**: filtra `settlements` con `period_year/period_month` igual al mes actual y `status != 'anulada'`. Cuenta total, pagadas y suma `total_amount`. El "estado dominante" se elige por mayoría con prioridad `pagada > aprobada_rrhh > generada > anulada`.
- **A pagar esta semana**: `count(*)` y `sum(total_amount)` de settlements `status = 'aprobada_rrhh'`. El `dueDate` es el último día del mes en curso si hay pendientes (heurística de carga típica del cierre de mes).
- **Colaboradores activos**: `staff_members.filter(m => m.hasActiveContract)` + altas con `created_at >= now-30d`.
- **Contratos vigentes**: `staff_contracts.filter(c => c.status === 'vigente')`. Sub-métricas:
  - **Revisión atrasada**: contratos no `por_hora`/`por_clase` cuya `currentRevisionEffectiveDate` es nula o de hace más de 12 meses.
  - **Vencen en 60d**: contratos con `endDate` entre hoy y hoy + 60 días.
- **Costo mensual**: agrupa settlements pagados por `paid_at` mensual; toma el del mes actual, anterior y dos anteriores. El delta % es `(actual - previo) / previo * 100`, redondeado a 1 decimal. Si `previo === 0`, delta es null.
- **Estructuras**: `salary_structures.filter(s => s.status === 'activa')`. La lista de nombres usa `functionalRole` (o `name` como fallback) deduplicada, top 6.
- **Alertas**: `staff_members.filter(m => !m.hasActiveContract).length` (sin cambios respecto a versión anterior).
- **Próximos hitos**: combina contratos con revisión atrasada + contratos próximos a vencer; ordena por `daysUntil` asc; toma top 8.

### Acceso read-only para `tesoreria`

El módulo RRHH (`/rrhh`) está cerrado para Tesorería pura — solo se accede con rol `rrhh`. Tesorería ve su propia card "Pagos pendientes nómina" en `/treasury` (US-71).

Si el usuario tiene **ambos** roles `rrhh` + `tesoreria`, ve todas las cards en `/rrhh` incluyendo "A pagar esta semana".

---

## 9. Flujo principal

1. Usuario con rol `rrhh` navega a `/rrhh`.
2. El server ejecuta `getHrDashboardSummary()` que carga 4 listas en paralelo.
3. Renderiza banner (si aplica), 7 cards (filtrando "A pagar" según rol Tesorería) y la sección "Próximos hitos".
4. Usuario clickea CTAs o items de hitos para navegar al detalle.

---

## 10. Flujos alternativos

### A. Club con zero actividad RRHH
- Banner no renderiza.
- Card "Liquidación vigente" muestra "Sin liquidaciones generadas para el mes en curso.".
- Card "A pagar esta semana" muestra "Nada pendiente de pago.".
- Cards de counts muestran "0" + sub-línea o CTA neutro.
- Sección "Próximos hitos" muestra empty state con descripción.

### B. Sin rol autorizado
- Redirect a `/dashboard`.

### C. Service falla
- El page recibe un summary default (todos los counts en 0) y renderiza la UI sin banners ni hitos.

---

## 11. UI / UX

### Reglas
- Banner top: `<FormBanner variant="warning" action={<LinkButton ... >}>` (full width).
- Layout cards: grid `sm:grid-cols-2 lg:grid-cols-3` (igual al patrón general del dashboard).
- Cada card usa `<Card padding="comfortable">` con `<CardHeader eyebrow title>` + body con número grande (`text-h2 font-semibold`) + sub-líneas (`text-sm text-muted-foreground`).
- Card "Liquidación vigente" tiene una barra de progreso simple (div con `bg-foreground` + width %).
- Card "Costo mensual" colorea el delta: amarillo (`text-ds-amber-700`) si sube o flat, verde (`text-emerald-700`) si baja, neutro si no hay comparable.
- Sección "Próximos hitos" usa `<DataTable density="compact">` con cada row envuelto en `<Link>` (Next/Link) para navegar al detalle.
- Chips de hito con `<Chip tone>`: `warning` si vencido, `info` si ≤ 14 días, `neutral` si más lejano.
- Tipografía y espacios consistentes con dashboards de Tesorería y Secretaría.

---

## 12. Mensajes y textos

### Namespace
`rrhh.dashboard.*`

### Keys principales

- `section_eyebrow`, `section_title`
- `alert_revisions_template` (banner) + `alert_revisions_cta`
- `settlement_status_{generada,aprobada_rrhh,pagada,anulada}` (texto del estado dominante)
- Por card: `card_<id>_eyebrow`, `card_<id>_title`, sub-líneas/templates específicos, `card_<id>_cta`. Identificadores: `current_period`, `pay_this_week`, `active_staff`, `active_contracts`, `monthly_cost`, `structures`, `alerts`.
- Sección hitos: `milestones_eyebrow`, `milestones_title`, `milestones_days_{template,today,overdue_template}`, `milestones_empty_{title,description}`, `milestone_type_{revision,end_contract}`.

Toda copy vive en `lib/texts.json`. Templates usan tokens `{count}`, `{period}`, `{paid}`, `{total}`, `{pending}`, `{dueDateLabel}`, `{additions}`, `{revisions}`, `{ending}`, `{pct}`, `{prevLabel}`, `{prev}`, `{twoLabel}`, `{two}`, `{days}`.

---

## 13. Persistencia

- Sólo lectura.
- 4 reads en paralelo (settlements + contracts + structures + staff_members) vía repositorios.
- Si se vuelve pesado a futuro: materializar en vista `public.hr_dashboard_snapshot` o RPC `hr_dashboard_summary`.

---

## 14. Seguridad

- Club-scoped por RLS.
- Page guard: `canAccessHrModule(membership)` (rol `rrhh`).
- Card "A pagar" gateada extra por `hasMembershipRole(membership, "tesoreria")`.

---

## 15. Dependencias

- **domain entities:** `payroll_settlements`, `staff_contracts`, `staff_contract_revisions` (vía `currentRevisionEffectiveDate`), `staff_members`, `salary_structures`.
- **otras US:** US-60 (alertas de colaboradores sin contrato), US-61 (settlements), US-63 (revisiones), US-64/US-65 (pagos), US-71 (mirror Tesorería).
- ~~US-69 (Reportes)~~ — deprecada el 2026-04-28; las comparativas mes a mes simples viven ahora en este dashboard.

---

## 16. Diferenciación por rol (refactor 2026-04-27 / 2026-04-28)

> **Notion alias**: US-47.

### Visibilidad de cards

| Card | Visible para |
|---|---|
| Liquidación vigente | Rol RRHH (la página entera ya está gateada por `canAccessHrModule`) |
| A pagar esta semana | Solo si el usuario también tiene rol `tesoreria` activo en el club |
| Colaboradores activos | Rol RRHH |
| Contratos vigentes | Rol RRHH |
| Costo mensual | Rol RRHH |
| Estructuras | Rol RRHH |
| Alertas (colaboradores sin contrato) | Rol RRHH |
| Próximos hitos | Rol RRHH |
| Banner de revisiones atrasadas | Rol RRHH; el CTA "Revisar" solo se renderiza si el usuario puede operar settlements (`canOperateHrSettlements`) |

Usuario con ambos roles (RRHH + Tesorería) → ve **todas** las cards en `/rrhh`.
Rol Tesorería puro → no entra a `/rrhh`; ve la card "Pagos pendientes nómina" en `/treasury` (US-71).

### Implementación

- `app/(dashboard)/rrhh/page.tsx` — `hasMembershipRole(membership, "tesoreria")` decide la visibilidad de la card "A pagar esta semana". El CTA linkea a `/treasury/payroll` (US-71) porque el ownership del pago está en Tesorería.
- `lib/services/hr-dashboard-service.ts` mantiene un único summary plano; las decisiones de render viven en la página.
