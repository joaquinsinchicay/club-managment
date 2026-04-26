# PDD — US-68 · Dashboard del módulo RRHH

> PDD del módulo **E04 · RRHH**. Fuente Notion: `E04 👥 RRHH` · alias `US-47`. En el repo: **US-68**. (Pre-refactor 2026-04-27 el alias era `US-44`.)

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E04 · RRHH |
| User Story | Como Tesorero del club, quiero ver un dashboard del módulo RRHH con el estado de liquidaciones y el costo proyectado del mes, para saber qué está pendiente de procesar. |
| Prioridad | Alta |
| Objetivo de negocio | Dar visibilidad inmediata del estado de la nómina mensual: cuánto falta confirmar, cuánto falta pagar, cuál es el costo proyectado y cuál el ejecutado. Convertir el módulo RRHH en un tablero operativo. |

---

## 2. Problema a resolver

Sin dashboard, el tesorero sólo puede entender el estado del mes navegando listados y sumando mentalmente. Un resumen consolidado de cards con números grandes + links a listados filtrados reduce el tiempo de análisis de minutos a segundos.

---

## 3. Objetivo funcional

La ruta `/rrhh` renderiza un dashboard con 6 cards operativas:

1. **Liquidaciones pendientes de confirmar** — cantidad + monto total.
2. **Liquidaciones confirmadas pendientes de pago** — cantidad + monto total.
3. **Costo proyectado del mes** — suma de montos vigentes de estructuras ocupadas.
4. **Ejecutado del mes** — suma de liquidaciones `pagada` del mes en curso.
5. **Estructuras vacantes** — cantidad de estructuras activas sin contrato vigente.
6. **Alertas** — colaboradores activos sin contratos vigentes (US-60).

Cada card linkea al listado filtrado correspondiente.

---

## 4. Alcance

### Incluye
- Página `/rrhh` protegida para `admin`, `rrhh`, `tesoreria`.
- 6 cards con los indicadores descritos.
- Estado vacío por card cuando aplique.
- Links a listados filtrados.
- Cálculo server-side a nivel de página (sin RPC dedicada en MVP; si performance degrada, se materializa).

### No incluye
- Comparativas mes a mes en el dashboard (viven en US-69 Reportes).
- Gráficos (se dejan para futura iteración).
- Personalización de cards.
- Tendencias / deltas vs mes anterior.

---

## 5. Actor principal

`admin`, `rrhh` o `tesoreria`.

---

## 6. Precondiciones

- Club activo resuelto.

---

## 7. Postcondiciones

- Sólo lectura; no hay efectos.

---

## 8. Reglas de negocio

### Cálculos
- **Pendientes de confirmar**: `count(*), sum(total_amount) from payroll_settlements where status = 'generada'`.
- **Confirmadas pendientes de pago**: `count(*), sum(total_amount) from payroll_settlements where status = 'confirmada'`.
- **Costo proyectado del mes**: por cada `staff_contracts.status = 'vigente'` vigente durante el mes en curso:
  - Si `uses_structure_amount = true` → versión vigente del monto.
  - Si `false` → `frozen_amount`.
  - Se suma. Excluye contratos `por_hora / por_clase` (son variables; se excluyen del proyectado o se suman con `amount_base * carga_horaria_esperada`; decisión: se excluyen y se muestra nota).
- **Ejecutado del mes**: `sum(total_amount) from payroll_settlements where status = 'pagada' and date_trunc('month', paid_at) = date_trunc('month', current_date)`.
- **Estructuras vacantes**: `count(*) from salary_structures where status = 'activa' and not exists (select 1 from staff_contracts where salary_structure_id = salary_structures.id and status = 'vigente')`.
- **Alertas**: `count(*) from staff_members where status = 'activo' and not exists (select 1 from staff_contracts where staff_member_id = staff_members.id and status = 'vigente')` (ver US-60).

### Links
- Pendientes de confirmar → `/rrhh/settlements?status=generada`.
- Confirmadas pendientes de pago → `/rrhh/settlements?status=confirmada`.
- Costo proyectado → `/rrhh/reports?view=projected&month=current`.
- Ejecutado del mes → `/rrhh/settlements?status=pagada&month=current`.
- Estructuras vacantes → `/rrhh/structures?filter=vacant`.
- Alertas → `/rrhh/staff?alert=no_active_contracts`.

### Acceso read-only para `tesoreria`
- Ver todas las cards pero en los links que lleven a maestros (estructuras, colaboradores), el acceso puede ser de lectura o bloqueado según las reglas de cada US. El dashboard no discrimina por rol en el render de las cards.

---

## 9. Flujo principal

1. Usuario con rol autorizado navega a `/rrhh`.
2. El server ejecuta las 6 queries en paralelo.
3. Renderiza las 6 cards con valores o empty states.
4. Usuario clickea una card y navega al listado filtrado.

---

## 10. Flujos alternativos

### A. Club con zero actividad RRHH
- Todas las cards muestran empty state con CTA sugerido:
  - Pendientes/confirmadas/ejecutado → "Sin liquidaciones".
  - Costo proyectado → "Sin contratos vigentes".
  - Estructuras vacantes → "Todas ocupadas" o "Sin estructuras".
  - Alertas → "Sin alertas".

### B. Sin rol autorizado
- 404 o redirect al dashboard general.

---

## 11. UI / UX

### Reglas
- Layout grid 3×2 en desktop, 1×6 en mobile.
- Cada card usa `<Card padding="comfortable">` con `<CardHeader eyebrow={group} title={label}>` + body con número grande + metadata secundaria.
- Empty state por card: texto sutil (`text-muted-foreground`) sin CTAs prominentes para no abarrotar.
- Cards accionables con `<LinkButton variant="secondary" size="sm">` a la derecha (Ver detalle) o toda la card clickable.
- Números formateados con `Intl.NumberFormat('es-AR', {style:'currency', currency: clubs.currency_code})`.
- Tipografía consistente con dashboard general (`app/(dashboard)/dashboard/page.tsx`).

---

## 12. Mensajes y textos

### Namespace
`rrhh.dashboard.*`

### Keys mínimas
- `page_title`, `page_description`
- `card_pending_confirm.{title,description,count_label,amount_label,cta,empty}`
- `card_pending_pay.{...}`
- `card_projected_cost.{title,description,amount_label,note_excluded,cta,empty}`
- `card_executed.{...}`
- `card_vacant_structures.{...}`
- `card_alerts.{...}` (reutiliza keys de US-60).

---

## 13. Persistencia

- Sólo lectura.
- Queries descritas en sección 8.
- Si se vuelve pesado: materializar en vista `public.hr_dashboard_snapshot` refrescada vía CTE o trigger.

---

## 14. Seguridad

- Club-scoped por RLS.
- Role check en el page component para filtrar acceso.

---

## 15. Dependencias

- **domain entities:** `payroll_settlements`, `staff_contracts`, `staff_contract_revisions`, `staff_members`, `salary_structures`.
- **otras US:** US-60 (alertas), US-61 (settlements), US-63, US-64, US-65, US-69 (reportes desde link).

---

## 16. Cards diferenciadas por rol (refactor 2026-04-27)

> **Notion alias**: US-47 (corresponde a esta US-68 en numeración repo).

E04 RRHH (Notion) pidió diferenciar visibilidad de cards según el rol del usuario.

### Reglas de visibilidad

| Card | Visible para |
|---|---|
| Pendientes de aprobar | Rol RRHH (siempre — la página entera ya está gateada por `canAccessHrModule`) |
| Pendientes de pago | Solo si el usuario también tiene rol `tesoreria` activo en el club |
| Costo proyectado del mes | Rol RRHH |
| Ejecutado del mes | Rol RRHH |
| Estructuras vacantes | Rol RRHH |
| Alertas (colaboradores sin contrato) | Rol RRHH — link a `/rrhh/staff?contract=without_active` |

Usuario con ambos roles (RRHH + Tesorería) → ve **todas** las cards en `/rrhh`.
Rol Tesorería puro → no entra a `/rrhh`; ve la card "Pagos pendientes nómina"
en su propio dashboard `/treasury` (mirror, ver US-71).

### Implementación

- `app/(dashboard)/rrhh/page.tsx` — `hasMembershipRole(membership, "tesoreria")` decide la visibilidad de la card "pending_pay". El CTA de esa card linkea a `/treasury/payroll` (la bandeja de Tesorería de US-71), no al listado `/rrhh/settlements?status=aprobada_rrhh`, porque el ownership real del flujo de pago está en Tesorería.
- Service `hr-dashboard-service` mantiene un único summary `pendingApprove` + `pendingPay`; las decisiones de render viven en la página.
