# PDDs · Mapping Notion ↔ Repo

Los Product Definition Documents (PDDs) viven en este directorio. Esta tabla es la fuente de verdad de equivalencias entre la numeración de Notion (cliente) y la numeración del repo (técnica).

> **Decisión** (2026-04-27): El Epic E04 RRHH se reescribió en Notion con numeración US-30..US-48. El repo conserva la numeración legacy US-54..US-69 para no renombrar archivos ni referencias internas. Las modificaciones materiales (rename de estado, nuevas vistas, nuevas RPCs) están aplicadas; solo difiere el ID por el que se referencia cada US.

---

## E04 · 👥 RRHH (refactor 2026-04-27)

| US Notion | Tema | PDD repo | Estado |
|---|---|---|---|
| US-30 | Estructuras Salariales (sin monto) | `pdd_us_54_estructuras_salariales.md` (+ `pdd_us_55` legacy) | ✅ refactor monto-al-contrato completo |
| US-31 | Colaboradores (sin estado activo/inactivo) | `pdd_us_56_colaboradores.md` | ✅ drop `deactivated_at` aplicado |
| US-32 | Crear contrato + 1ª revisión auto | `pdd_us_57_alta_contratos.md` | ✅ retroactividad 30d ya estaba |
| US-33 | Detalle contrato + ciclo de vida | `pdd_us_58_edicion_finalizacion_contratos.md` | ✅ |
| US-34 | Nueva revisión salarial individual | parte de `pdd_us_55_actualizacion_monto_con_historial.md` | ✅ |
| US-35 | Revisión salarial masiva | parte de `pdd_us_55_actualizacion_monto_con_historial.md` | ✅ |
| US-36 | Job finalización automática | `pdd_us_59_job_finalizacion_automatica.md` | ✅ |
| US-37 | Alerta colaboradores sin contrato | `pdd_us_60_alerta_colaboradores_sin_contratos.md` | ✅ + dashboard linkea a listado pre-filtrado |
| US-38 | Generar liquidaciones del mes | `pdd_us_61_generacion_masiva_liquidaciones.md` | ✅ skip+report ya estaba |
| US-39 | Ajustar liquidación | `pdd_us_62_ajustes_liquidacion.md` | ✅ |
| US-40 | Aprobar (estado `aprobada_rrhh`) | `pdd_us_63_confirmacion_liquidaciones.md` | ⚠️ rename enum aplicado en código; el archivo PDD aún menciona "confirmación" — consultar este README + commit `b7d3cb5` |
| US-41 | Devolver liquidación a "generada" | **`pdd_us_41_devolver_liquidacion.md`** | ✅ NUEVA RPC + UI + indicador "Devuelta por [rol]" |
| US-42 | Pagar individual | `pdd_us_64_pago_individual_liquidacion.md` | ✅ `treasury_session_id` ya se setea |
| US-43 | Pagar en lote | `pdd_us_65_pago_en_lote.md` | ✅ |
| US-44 | Anular liquidación | `pdd_us_66_anulacion_liquidacion.md` | ✅ |
| US-45 | Bandeja Tesorería dedicada | **`pdd_us_45_bandeja_tesoreria.md`** | ✅ NUEVA ruta `/treasury/payroll` + service + dashboard card |
| US-46 | Ficha colaborador (RRHH + Tesorería) | `pdd_us_67_ficha_colaborador.md` + **`pdd_us_46_47_48_vistas_paralelas_treasury.md`** | ✅ mirror read-only en `/treasury/staff/[id]` |
| US-47 | Dashboard cards diferenciadas por rol | `pdd_us_68_dashboard_rrhh.md` + **`pdd_us_46_47_48_vistas_paralelas_treasury.md`** | ✅ card "pending_pay" condicionada por rol |
| US-48 | Reportes RRHH (RRHH + Tesorería) | `pdd_us_69_reportes_rrhh.md` + **`pdd_us_46_47_48_vistas_paralelas_treasury.md`** | ✅ mirror read-only en `/treasury/reports/payroll` |

## Decisiones arquitectónicas

- **Estado `aprobada_rrhh`** (no `confirmada`). Enum DB renombrado en migración `20260427040000`. Funciones renombradas: `hr_confirm_settlement` → `hr_approve_settlement`, idem bulk. Columnas: `confirmed_at` → `approved_at`, `confirmed_by_user_id` → `approved_by_user_id`. Ver commit `b7d3cb5`.
- **Acceso de Tesorería al módulo RRHH**: `/rrhh/**` sigue exclusivo de rol `rrhh`. Tesorería accede vía mirrors en `/treasury` (ficha, reportes, bandeja). Detalle en [`pdd_us_46_47_48_vistas_paralelas_treasury.md`](pdd_us_46_47_48_vistas_paralelas_treasury.md). CLAUDE.md actualizado.
- **`staff_members` sin estado**: drop columnas `deactivated_at`, `deactivated_by_user_id`, `deactivation_reason` + drop RPC `hr_deactivate_staff_member`. Migración `20260427030000`. Ver commit `e197c2c`.
- **Estructura sin monto**: refactor previo (migración `20260424000000`); residuos limpiados en commit `e197c2c` (texts, feedback codes, comments).

## Migraciones SQL del refactor E04 (2026-04-27)

| Timestamp | US Notion | Cambio principal |
|---|---|---|
| `20260427030000` | US-31 | Drop `staff_members.deactivated_at` + RPC `hr_deactivate_staff_member` |
| `20260427040000` | US-40 | Rename enum `confirmada` → `aprobada_rrhh` + columnas `approved_*` + funciones `hr_approve_*` + replace `hr_pay_settlement` |
| `20260427050000` | US-41 | Nueva RPC `hr_return_settlement_to_generated` + 4 columnas `returned_*` |

## Commits Fase E04 refactor (orden cronológico)

| Commit | Fase | Resumen |
|---|---|---|
| `e197c2c` | 1.1 + 1.2 | US-30 cleanup monto + US-31 drop deactivated_at |
| `b7d3cb5` | 2.1 | US-40 rename `confirmada` → `aprobada_rrhh` |
| `e86d491` | 2.2 | US-41 devolver liquidación a generada |
| `2b99a0a` | 3 | US-45 bandeja Tesorería |
| `c8c2ddf` | 4 | US-46/47/48 vistas paralelas Tesorería |
| `a3fd252` | 5 | US-37 dashboard "Alertas" linkea pre-filtrado |
