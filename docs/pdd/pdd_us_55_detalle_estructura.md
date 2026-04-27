# PDD US-55 · Detalle de Estructura (vista por Actividad)

## 0. Resumen

Página `/rrhh/structures/[id]` que muestra el detalle de una actividad agrupando todas las estructuras salariales asociadas, sus colaboradores con contrato vigente y la evolución del costo mensual. El segmento `[id]` es un `club_activities.id`. Reemplaza el modal de edición inline del listado de Estructuras: el listado pasa a tener un ícono "ver" que navega a esta ficha.

## 9. Flujo feliz

1. Usuario con rol RRHH (o Admin) entra a `/rrhh/structures`.
2. La tabla muestra todas las estructuras del club. En cada fila con `activity_id` se renderiza un ícono "ver" (`<ViewIconLink>`); en filas sin actividad (estructuras transversales) la celda de acciones queda vacía.
3. Click en "ver" → navega a `/rrhh/structures/{activity_id}`.
4. El layout `app/(dashboard)/rrhh/layout.tsx` ya provee `PageContentHeader` (eyebrow PERSONAL · CONTRATOS · LIQUIDACIONES + título RRHH + chip de fecha).
5. La página renderiza:
   - Breadcrumb `Estructuras · {activity.name}`.
   - Header card con eyebrow `Estructura · {N} colaboradores · {M} divisiones`, título = nombre de la actividad, chips de divisions, CTA "+ Contrato" (deshabilitado hasta que se apruebe el flujo de asignación masiva — Open question del plan).
   - Tres stats cards en grid 3 cols: costo mensual + delta vs mes anterior, count de colaboradores + breakdown por `remuneration_type`, % del total RRHH con progress bar.
   - Card "Colaboradores · {actividad}" con la lista agrupada por `primaryDivision` (primera división del array de la estructura). Cada grupo tiene header `{DIVISION} · {N} colab.` + total mensual; cada item es un row con avatar + nombre + (rol · división) + monto, link a la ficha del colaborador.
   - Card "Evolución del costo mensual" con bar chart de los últimos 6 meses + bloque de detalle del último mes y % de variación.

## 10. Flujos alternativos

### A. Actividad sin contratos vigentes
- `collaborators.length === 0` → card de Colaboradores muestra `<EmptyState variant="dashed">` con `empty_collaborators_*`.
- Stats: costo mensual = 0, count = 0, share % = 0; UI muestra "Sin histórico previo" debajo del costo.

### B. Actividad sin liquidaciones pagadas en los últimos 6 meses
- `costEvolution` viene con todos los puntos en 0 → card muestra mensaje `cost_evolution_no_data`.

### C. ID de actividad inexistente o de otro club
- Service devuelve `{ ok: false, code: "activity_not_found" }` → `notFound()` (Next 404).
- Otros errores → redirect a `/rrhh/structures`.

### D. Estructura sin actividad (transversales)
- En el listado, el ícono "ver" se oculta. No existe ficha para roles transversales (Administrativo, Limpieza, Prensa, Abogado, Contador, Coordinador, Entrenador Arqueros 5ta-8va, Intendente). Ver Open question del plan.

## 11. UI / UX

### Reglas
- Layout heredado de `app/(dashboard)/rrhh/layout.tsx` (max-w-6xl + PageContentHeader + RrhhModuleNav).
- Uso obligatorio de primitivos canónicos (CLAUDE.md):
  - `<Card padding="comfortable">` + `<CardHeader>` + `<CardBody>` (sin `divider`).
  - `<DataTableChip tone="neutral">` para chips de divisions del header.
  - `<Avatar name size="sm" tone="neutral">` para items de colaboradores.
  - `<EmptyState variant="dashed">` para empty state de la card de colaboradores.
  - Tipografía DS: `text-h1` (título de actividad), `text-h2` (último mes en bar chart, valores grandes), `text-eyebrow tracking-card-eyebrow` (eyebrows + group headers), `text-body` y `text-small` (jerarquía secundaria).
  - Bar chart: divs flex con altura proporcional + `bg-ds-pink-600` para el último mes y `bg-secondary` para los previos. Sin librería externa.
  - Progress bar: `<div role="progressbar">` con `bg-secondary` shell + `bg-ds-pink-600` fill.

### Layout responsive
- Grid de stats: `md:grid-cols-3` (mobile-first stacked).
- Group headers de colaboradores usan `flex items-center justify-between`.
- Bar chart fixed height 11rem (h-44).

## 12. Mensajes y textos

### Namespace
`rrhh.activity_detail.*`

### Keys
- `breadcrumb_root` = "Estructuras"
- `header_eyebrow_template` con placeholders `{collaborators}`, `{divisions}`
- `cta_new_contract` = "+ Contrato"
- `stats_cost_eyebrow`, `stats_cost_delta_template` con placeholders `{sign}{percent}{prevMonth}`, `stats_cost_no_delta`
- `stats_collaborators_eyebrow`, `stats_collaborators_subtitle_template` con placeholders `{mensual}{porHora}{porClase}`
- `stats_share_eyebrow`, `stats_share_no_data`
- `collaborators_card_title_template` con `{activity}`, `collaborators_card_subtitle`
- `collaborators_group_header_template` con `{division}{count}`, `collaborators_group_amount_template` con `{amount}`
- `collaborators_no_division_label`, `collaborators_amount_unit`
- `empty_collaborators_title`, `empty_collaborators_description`
- `cost_evolution_title`, `cost_evolution_subtitle`, `cost_evolution_variation_label`, `cost_evolution_no_data`
- `month_short_template`, `month_short_labels.{1..12}`

## 13. Persistencia

Sólo lectura. El servicio `lib/services/hr-activity-detail-service.ts` implementa `getActivityDetail(activityId)`.

### Queries clave
```sql
-- 1. Activity
select id, name, club_id from club_activities
where id = $activityId and club_id = current_setting('app.current_club_id')::uuid;

-- 2. Structures de la actividad
select * from salary_structures
where club_id = $clubId and activity_id = $activityId;

-- 3. Contratos vigentes para esas estructuras + nombre del colaborador
select sc.id, sc.staff_member_id, sc.salary_structure_id,
       sm.first_name, sm.last_name
from staff_contracts sc
join staff_members sm on sm.id = sc.staff_member_id
where sc.club_id = $clubId
  and sc.status = 'vigente'
  and sc.salary_structure_id in (...);

-- 4. Revisiones vigentes (monto actual)
select contract_id, amount
from staff_contract_revisions
where club_id = $clubId and end_date is null and contract_id in (...);

-- 5. Total club RRHH (denominador del share %)
select sum(scr.amount) from staff_contract_revisions scr
join staff_contracts sc on sc.id = scr.contract_id
where sc.club_id = $clubId and sc.status = 'vigente' and scr.end_date is null;

-- 6. Cost evolution (últimos 6 meses)
select period_year, period_month, total_amount
from payroll_settlements
where club_id = $clubId and status = 'pagada' and contract_id in (...)
  and (period_year, period_month) in (...);
```

### RLS
- Todas las tablas son club-scoped por RLS existente. No se requieren policies adicionales.
- El service usa el admin Supabase client + filtro explícito `club_id = activeClub.id` en cada query (defensa en profundidad).

## 14. Permisos

- Lectura: `canAccessHrMasters` (mismo guard que el listado de estructuras). RRHH y Admin pueden ver.
- Mutación (CTA "+ Contrato"): `canMutateHrMasters`. Tesorería NO accede al módulo RRHH.

## Open questions

1. **CTA "+ Contrato"**: hoy queda deshabilitado en la ficha. Faltaría un modal `<AssignContractToActivityModal>` que permita elegir estructura (entre las de esta actividad) + colaborador y crear el contrato. Decisión por defecto del plan: posponer y abrir la ficha sin asignación masiva.
2. **CTA "Editar"**: ocultado del header de la ficha (la actividad agrupa N estructuras, no hay un único target). Iteración futura: dropdown "Editar estructura" con la lista de N estructuras.
3. **Estructuras transversales**: sin vista propia. Iteración futura: definir si `/rrhh/structures/transversales` muestra una "actividad pseudo" agrupándolas.
