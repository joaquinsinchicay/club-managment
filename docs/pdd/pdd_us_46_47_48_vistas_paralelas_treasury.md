# PDD · US-46 / US-47 / US-48 · Vistas paralelas Tesorería

> **Epic**: E04 · 👥 RRHH
> **Notion IDs**: US-46, US-47, US-48
> **Estado**: implementado en Fase 4 del refactor E04 (2026-04-27)

Este PDD cubre las tres US juntas porque comparten la misma decisión arquitectónica:
**no se abre el módulo `/rrhh` a Tesorería** (regla de [CLAUDE.md](CLAUDE.md) intacta);
en su lugar, se crean **vistas paralelas en `/treasury`** que reusan los services
con guards "permisivos" en el backend.

---

## Decisión arquitectónica

| Aspecto | Decisión |
|---|---|
| `/rrhh/**` | Sigue exclusivo de rol `rrhh` (guard `canAccessHrModule`). |
| `/treasury/staff/[id]` | Mirror **read-only** de la ficha. Guard de página: `canAccessTreasuryStaffProfile` (rol `tesoreria`). |
| `/treasury/reports/payroll` | Mirror **read-only** de los reportes. Guard de página: `canAccessTreasuryPayrollReports` (rol `tesoreria`). |
| `/treasury` (dashboard) | Card "Pagos pendientes nómina" para Tesorería (Fase 3 + acceso a reportes payroll en Fase 4). |
| Services compartidos | `getStaffProfile`, `getHrReport` cambian su guard interno a `canViewStaffProfile` / `canViewHrReports` (admiten `rrhh` o `tesoreria`). Los **guards de página** son los que deciden quién entra a qué ruta. |
| Mutaciones | NO se abren. Tesorería solo lee desde sus mirrors. Las mutaciones canónicas siguen en /rrhh para rol RRHH y en /treasury/payroll (US-45) para Tesorería (pagar + devolver). |

---

## US-47 · Cards dashboard `/rrhh` condicionadas por rol

### AC

- Card "Liquidaciones pendientes de aprobar" → solo rol RRHH.
- Card "Liquidaciones pendientes de pago" → solo rol Tesorería.
- Usuario con ambos roles → ve ambas cards.

### Implementación

[app/(dashboard)/rrhh/page.tsx](app/(dashboard)/rrhh/page.tsx):

```ts
const hasTreasuryRole = context.activeMembership
  ? hasMembershipRole(context.activeMembership, "tesoreria")
  : false;
```

- La card "pending_pay" se renderiza solo si `hasTreasuryRole === true`.
- La card "pending_approve" se mantiene visible (la página entera ya está gateada por `canAccessHrModule`, así que el rol RRHH siempre está presente).
- El CTA de la card "pending_pay" ahora linkea a `/treasury/payroll` (la bandeja Tesorería de US-45) en lugar de a `/rrhh/settlements?status=aprobada_rrhh` — más coherente con la ownership real del flujo de pago.

### Cards en `/treasury`

La card "Pagos de nómina pendientes" para Tesorería se implementó en **Fase 3** ([components/treasury/payroll-pending-card.tsx](components/treasury/payroll-pending-card.tsx)). En Fase 4 se agrega un CTA secundario "Ver reportes" que lleva a `/treasury/reports/payroll`.

---

## US-46 · Ficha colaborador read-only en `/treasury/staff/[id]`

### AC

- Acceso desde el listado de colaboradores → para Tesorería, el "listado" canónico es la bandeja `/treasury/payroll` (el nombre del colaborador es link a la ficha mirror).
- Visualización: datos personales, contratos, revisiones, liquidaciones, pagos, totales.
- "Acceso rápido a crear un contrato nuevo desde la ficha (solo rol RRHH)" → en `/treasury` el CTA NO se renderiza (`canMutate=false`).

### Implementación

**Authorization** ([lib/domain/authorization.ts](lib/domain/authorization.ts)):

```ts
canAccessTreasuryStaffProfile(membership)  // rol "tesoreria"
canViewStaffProfile(membership)            // rol "rrhh" o "tesoreria"  (service)
```

**Service** ([lib/services/hr-staff-profile-service.ts](lib/services/hr-staff-profile-service.ts)):
- `getStaffProfile` cambia su guard de `canAccessHrModule` → `canViewStaffProfile`. Sin esta apertura, Tesorería tendría `forbidden` aunque pase el guard de página.

**Componente** ([components/hr/staff-profile-view.tsx](components/hr/staff-profile-view.tsx)):
- Props `updateAction` y `createContractAction` ahora son **opcionales**.
- Cuando `canMutate === false`, los CTAs ("Editar", "Nuevo contrato") no se renderizan y los handlers checkean `if (!action) return;` defensivamente.

**Ruta** ([app/(dashboard)/treasury/staff/[id]/page.tsx](app/(dashboard)/treasury/staff/[id]/page.tsx)):
- Server component, redirige a `/treasury` si no es Tesorería.
- Reusa `<StaffProfileView>` con `canMutate={false}` y sin pasar `updateAction`/`createContractAction`.
- Breadcrumb minimal con back-link a `/treasury/payroll`.

**Bandeja** ([components/treasury/payroll-tray.tsx](components/treasury/payroll-tray.tsx)):
- El nombre del colaborador en cada fila ahora es un `<Link>` a `/treasury/staff/${staffMemberId}`.

---

## US-48 · Reportes RRHH desde `/treasury/reports/payroll`

### AC

- Mismos filtros (rango de fechas, colaborador, estructura, actividad, rol funcional).
- Mismas agrupaciones (período, colaborador, actividad, proyectado vs ejecutado).
- Solo liquidaciones `pagada` cuentan.
- Exportación a CSV.

### Implementación

**Authorization** ([lib/domain/authorization.ts](lib/domain/authorization.ts)):

```ts
canAccessTreasuryPayrollReports(membership)  // rol "tesoreria"
canViewHrReports(membership)                 // rol "rrhh" o "tesoreria"  (service)
```

**Service** ([lib/services/hr-reports-service.ts](lib/services/hr-reports-service.ts)):
- `getHrReport` cambia su guard de `canAccessHrModule` → `canViewHrReports`.
- El endpoint `app/api/rrhh/reports/export/route.ts` no requiere cambios — usa `getHrReport` que ya admite ambos roles.

**Ruta** ([app/(dashboard)/treasury/reports/payroll/page.tsx](app/(dashboard)/treasury/reports/payroll/page.tsx)):
- Mirror 1:1 de `/rrhh/reports/page.tsx` con dos diferencias mínimas:
  - Guard de página: `canAccessTreasuryPayrollReports`.
  - Back-link y reset action apuntan a `/treasury` y `/treasury/reports/payroll` respectivamente (en lugar de `/rrhh`).
- **Decisión documentada**: optamos por **duplicar la página** (~280 líneas) en lugar de extraer un componente reusable. Razón: la página ya es estable (no se ha modificado en muchos commits), el riesgo de refactorizarla con todos los demás cambios en flight es mayor que la deuda de duplicación. Si en el futuro hay cambios frecuentes, refactorizar a `<HrReportsView>` componente compartido.

---

## Verificación end-to-end

1. **Como rol RRHH puro** (sin tesoreria):
   - `/rrhh` → ve cards: pending_approve, projected, executed, vacant, alerts. **NO** ve pending_pay.
   - `/rrhh/staff/[id]` → ficha completa con CTAs "Editar" y "Nuevo contrato".
   - `/rrhh/reports` → reportes completos con export.
   - `/treasury/staff/[id]` → redirige a `/treasury` (no tiene rol Tesorería).

2. **Como rol Tesorería puro** (sin rrhh):
   - `/treasury` → ve card "Pagos pendientes nómina" si hay pendientes (Fase 3) + CTA "Ver reportes".
   - `/treasury/payroll` → bandeja con liquidaciones aprobadas (Fase 3).
   - `/treasury/staff/[id]` → ficha mirror **read-only** sin CTAs de mutación.
   - `/treasury/reports/payroll` → reportes idénticos a /rrhh/reports, export funciona.
   - `/rrhh/**` → todas redirigen a `/dashboard` (no tiene rol RRHH).

3. **Como usuario con ambos roles** (rrhh + tesoreria):
   - `/rrhh` → ve **todas** las cards (incluida pending_pay con link a /treasury/payroll).
   - `/treasury` → ve card de pagos pendientes.
   - `/rrhh/staff/[id]` → ficha completa con mutaciones.
   - `/treasury/staff/[id]` → ficha mirror read-only (misma data, vista distinta).
   - Ambas rutas de reportes accesibles.

---

## Archivos tocados (Fase 4 completa)

**Authorization**
- [lib/domain/authorization.ts](lib/domain/authorization.ts) — 4 guards nuevos: `canAccessTreasuryStaffProfile`, `canAccessTreasuryPayrollReports`, `canViewStaffProfile`, `canViewHrReports`.

**Services**
- [lib/services/hr-staff-profile-service.ts](lib/services/hr-staff-profile-service.ts) — guard cambiado a `canViewStaffProfile`.
- [lib/services/hr-reports-service.ts](lib/services/hr-reports-service.ts) — guard cambiado a `canViewHrReports`.

**UI**
- [app/(dashboard)/rrhh/page.tsx](app/(dashboard)/rrhh/page.tsx) — card pending_pay condicionada + link a `/treasury/payroll`.
- [app/(dashboard)/treasury/staff/[id]/page.tsx](app/(dashboard)/treasury/staff/[id]/page.tsx) — **nueva**.
- [app/(dashboard)/treasury/reports/payroll/page.tsx](app/(dashboard)/treasury/reports/payroll/page.tsx) — **nueva**.
- [components/hr/staff-profile-view.tsx](components/hr/staff-profile-view.tsx) — props mutaciones opcionales + handlers defensivos.
- [components/treasury/payroll-tray.tsx](components/treasury/payroll-tray.tsx) — nombre del colaborador como link a la ficha mirror.
- [components/treasury/payroll-pending-card.tsx](components/treasury/payroll-pending-card.tsx) — CTA secundario "Ver reportes".

**Textos**
- [lib/texts.json](lib/texts.json) — `dashboard.treasury.payroll.dashboard_card_reports_cta`.
