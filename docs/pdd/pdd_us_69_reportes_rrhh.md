# PDD — US-69 · Reportes de gasto en personal

> PDD del módulo **E04 · RRHH**. Fuente Notion: `E04 👥 RRHH` · alias `US-48`. En el repo: **US-69**. (Pre-refactor 2026-04-27 el alias era `US-45`.)

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E04 · RRHH |
| User Story | Como Tesorero del club, quiero ver reportes de gasto en personal por período, colaborador y actividad, para analizar la inversión en recursos humanos del club. |
| Prioridad | Media |
| Objetivo de negocio | Habilitar análisis financiero retrospectivo y prospectivo: cuánto se pagó a lo largo del tiempo, por quién y en qué disciplina, con exportación para análisis externos. |

---

## 2. Problema a resolver

El dashboard (US-68) da el estado instantáneo. Para decisiones estratégicas (presupuesto anual, discusión con comisión directiva, análisis de costo por actividad), hace falta ver la serie temporal y cruzar contra colaboradores y actividades.

---

## 3. Objetivo funcional

Página `/rrhh/reports` con filtros (rango de fechas, colaborador, estructura, actividad) y tres agrupaciones alternativas:

1. **Por período** — total pagado por mes dentro del rango.
2. **Por colaborador** — total pagado por colaborador en el rango.
3. **Por actividad** — total pagado por actividad.

Y una cuarta vista **Proyectado vs Ejecutado** que compara mes a mes.

Cada vista exporta a CSV mediante un server action.

---

## 4. Alcance

### Incluye
- Página `/rrhh/reports` accesible para `admin`, `rrhh`, `tesoreria`.
- Filtros acumulativos aplicados via querystring (`?from=...&to=...&staff_id=...`).
- 4 vistas de agrupación con pestañas o selector.
- Export CSV por vista.
- Sólo considera `payroll_settlements` en estado `pagada` (excluye anuladas y pendientes).

### No incluye
- Gráficos (texto tabular primero; gráficos como mejora futura).
- Reportes comparativos inter-clubes.
- Programación de envío automático de reportes por email.
- Filtrado por tipo de remuneración (se puede agregar si se pide).

---

## 5. Actor principal

`admin`, `rrhh` o `tesoreria`.

---

## 6. Precondiciones

- Club activo con al menos una liquidación `pagada` (en su defecto se muestra empty state).

---

## 7. Postcondiciones

- Sólo lectura y generación de CSV. Sin mutaciones.

---

## 8. Reglas de negocio

### Filtros
- `from`, `to`: rango de fechas sobre `paid_at`. Default: mes en curso.
- `staff_member_id`: opcional, multi-select no requerido (simple en MVP).
- `salary_structure_id`: opcional.
- `activity_id`: opcional.

### Agrupaciones

**Por período**
```sql
select date_trunc('month', ps.paid_at) as period, sum(ps.total_amount) as total
from payroll_settlements ps
where ps.status = 'pagada'
  and ps.paid_at between $from and $to
  [y filtros opcionales via join con staff_contracts/salary_structures]
group by 1
order by 1;
```

**Por colaborador**
```sql
select sm.id, sm.first_name, sm.last_name, sum(ps.total_amount) as total
from payroll_settlements ps
join staff_contracts sc on sc.id = ps.contract_id
join staff_members sm on sm.id = sc.staff_member_id
where ps.status = 'pagada' and ps.paid_at between $from and $to
group by sm.id, sm.first_name, sm.last_name
order by total desc;
```

**Por actividad**
```sql
select a.id, a.name, sum(ps.total_amount) as total
from payroll_settlements ps
join staff_contracts sc on sc.id = ps.contract_id
join salary_structures ss on ss.id = sc.salary_structure_id
join activities a on a.id = ss.activity_id
where ps.status = 'pagada' and ps.paid_at between $from and $to
group by a.id, a.name
order by total desc;
```

**Proyectado vs Ejecutado**
- Proyectado por mes: para cada mes del rango, suma de montos vigentes de estructuras ocupadas en ese mes.
- Ejecutado por mes: `sum(total_amount) from payroll_settlements where status = 'pagada' and date_trunc('month', paid_at) = <mes>`.
- Display: tabla con columnas Mes, Proyectado, Ejecutado, Diff ($), Diff (%).
- Consideraciones: Proyectado es aproximación (no considera ajustes ni contratos cerrados a mitad de mes); se anota como tal en la UI.

### Export CSV
- Server action `exportRrhhReportCsv` que toma los filtros + agrupación y genera un `Response` con `text/csv; charset=utf-8`.
- El archivo tiene BOM UTF-8 para compatibilidad con Excel en Windows.
- Delimitador `,`; strings entrecomilladas si contienen comas.
- Nombre sugerido: `rrhh-{agrupacion}-{from}-{to}.csv`.

### Rendimiento
- Limitar rango máximo a 24 meses en MVP para evitar queries enormes.
- Si se necesita más, paginar exportación.

---

## 9. Flujo principal

1. Usuario navega a `/rrhh/reports`.
2. Aplica filtros en la barra superior.
3. Selecciona la agrupación.
4. El server ejecuta la query y renderiza tabla.
5. Usuario presiona `Exportar CSV` y descarga el archivo.

---

## 10. Flujos alternativos

### A. Sin datos en el rango
Empty state con mensaje informativo y link para cambiar filtros.

### B. Rango > 24 meses
Bloqueado en UI con mensaje "Rango máximo 24 meses".

### C. Export sin datos
Archivo con solo el header, permitido.

---

## 11. UI / UX

### Reglas
- Barra de filtros sticky al scrollear con `<FormSelect>`, `<FormInput type="date">`, botón "Aplicar" y "Limpiar".
- Selector de agrupación como tabs o `<ChipButton>` group.
- Tabla de resultado con `<DataTable density="compact">` y totales al pie.
- Número grande "Total del período" arriba.
- CTA `Exportar CSV` como `<Button variant="secondary">` al top-right.

---

## 12. Mensajes y textos

### Namespace
`rrhh.reports.*`

### Keys mínimas
- `page_title`, `page_description`
- `filter_from`, `filter_to`, `filter_staff`, `filter_structure`, `filter_activity`
- `apply_cta`, `reset_cta`
- `grouping_period`, `grouping_staff`, `grouping_activity`, `grouping_projected_executed`
- `total_label`, `export_csv_cta`, `export_csv_pending`
- Headers de tabla por agrupación.
- `empty_title`, `empty_description`, `range_too_large`
- `feedback.{csv_exported,range_too_large,forbidden,unknown_error}`

---

## 13. Persistencia

- Sólo lectura.
- Sin entidades nuevas.

### RPC opcional
- Si las queries se vuelven pesadas, migrar a RPC `hr_report_*(p_from, p_to, ...)` con índices dedicados. En MVP: queries directas.

---

## 14. Seguridad

- Club-scoped por RLS.
- Role check en la page y en el server action de export.
- El CSV no incluye PII de otros clubes (RLS ya lo garantiza).
- El server action de export responde vía `Response` con headers explícitos, sin persistir archivos intermedios.

---

## 15. Dependencias

- **domain entities:** `payroll_settlements`, `staff_contracts`, `staff_members`, `salary_structures`, `activities`, `staff_contract_revisions`.
- **otras US:** US-61 (origen de datos), US-64/65 (pagos).

---

## 16. Mirror para rol Tesorería en `/treasury/reports/payroll` (refactor 2026-04-27)

> **Notion alias**: US-48 (corresponde a esta US-69 en numeración repo).

E04 RRHH (Notion) pidió que rol Tesorería pueda **leer** los reportes de
gasto en personal desde su propio módulo, sin abrir `/rrhh` (que sigue
exclusivo de rol RRHH según [CLAUDE.md](../../CLAUDE.md)).

### Implementación

- **Ruta nueva**: `app/(dashboard)/treasury/reports/payroll/page.tsx` — server component, redirige a `/treasury` si no es Tesorería. Mirror 1:1 de `/rrhh/reports/page.tsx` con dos diferencias:
  - Guard de página: `canAccessTreasuryPayrollReports` (rol `tesoreria`).
  - Back-link y reset action apuntan a `/treasury` y `/treasury/reports/payroll` (en lugar de `/rrhh`).
- **Authorization** (`lib/domain/authorization.ts`):
  - `canAccessTreasuryPayrollReports(membership)` — guard de página.
  - `canViewHrReports(membership)` — guard del service, rol `rrhh` o `tesoreria` (permisivo). El `getHrReport` se cambió a este guard para soportar ambas rutas.
- **Endpoint export**: `POST /api/rrhh/reports/export` no requiere cambios — usa `getHrReport` que ya admite ambos roles. Tesorería puede exportar CSV desde la mirror.
- **Decisión documentada**: optamos por **duplicar la página** (~280 LOC) en lugar de extraer un componente compartido. La página estaba estable, refactorizar con todos los demás cambios en flight era riesgoso. Si en el futuro hay cambios frecuentes en reportes, refactorizar a `<HrReportsView>` componente compartido.

### Acceso esperado por rol

| Rol activo | `/rrhh/reports` | `/treasury/reports/payroll` |
|---|---|---|
| RRHH puro | ✅ | ❌ redirige a `/treasury` |
| Tesorería puro | ❌ redirige a `/dashboard` | ✅ read-only, exporta CSV |
| Ambos | ✅ | ✅ |
