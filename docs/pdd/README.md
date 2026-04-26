# PDDs · Mapping Notion ↔ Repo

Los Product Definition Documents (PDDs) viven en este directorio.

## Regla de numeración

> **La numeración del repo es la fuente de verdad.** Cada US tiene un único PDD con su número global del backlog (`pdd_us_NN_*.md`). Los archivos PDD usan **siempre** la numeración del repo.
>
> Las US del backlog Notion del Epic E04 RRHH se numeraron localmente al epic (US-30..US-48) en una iteración posterior. Esos números son **alias** del ID Notion, no el ID canónico del PDD. La tabla de equivalencias vive en este README.

## Sistema de numeración

- **Repo**: secuencial **global** desde US-01. Las épicas se identifican con `E01..E05` pero los números de US no se reinician por epic. Última US: **US-71** (post-refactor E04).
- **Notion (E04)**: secuencial **local al epic** US-30..US-48. Cuando se referencie en código/docs un ID Notion del E04, mencionar también el ID repo entre paréntesis.

## Equivalencias E04 RRHH (Notion ↔ Repo)

| US Notion | US Repo | PDD | Tema |
|---|---|---|---|
| US-30 | **US-54** | `pdd_us_54_estructuras_salariales.md` | Estructuras Salariales (sin monto post-refactor) |
| US-31 | **US-56** | `pdd_us_56_colaboradores.md` | Colaboradores (sin estado activo/inactivo post-refactor) |
| US-32 | **US-57** | `pdd_us_57_alta_contratos.md` | Crear contrato + 1ª revisión auto |
| US-33 | **US-58** | `pdd_us_58_edicion_finalizacion_contratos.md` | Detalle contrato + ciclo de vida |
| US-34 | **US-55** | `pdd_us_55_actualizacion_monto_con_historial.md` | Nueva revisión salarial individual |
| US-35 | **US-55** | `pdd_us_55_actualizacion_monto_con_historial.md` | Revisión salarial masiva (mismo PDD) |
| US-36 | **US-59** | `pdd_us_59_job_finalizacion_automatica.md` | Job finalización automática |
| US-37 | **US-60** | `pdd_us_60_alerta_colaboradores_sin_contratos.md` | Alerta colaboradores sin contrato |
| US-38 | **US-61** | `pdd_us_61_generacion_masiva_liquidaciones.md` | Generar liquidaciones del mes |
| US-39 | **US-62** | `pdd_us_62_ajustes_liquidacion.md` | Ajustar liquidación |
| US-40 | **US-63** | `pdd_us_63_confirmacion_liquidaciones.md` | Aprobar (estado `aprobada_rrhh`, ex `confirmada`) |
| US-41 | **US-70** | `pdd_us_70_devolver_liquidacion.md` | Devolver liquidación a "generada" (NUEVA) |
| US-42 | **US-64** | `pdd_us_64_pago_individual_liquidacion.md` | Pagar individual |
| US-43 | **US-65** | `pdd_us_65_pago_en_lote.md` | Pagar en lote |
| US-44 | **US-66** | `pdd_us_66_anulacion_liquidacion.md` | Anular liquidación |
| US-45 | **US-71** | `pdd_us_71_bandeja_tesoreria.md` | Bandeja Tesorería dedicada (NUEVA) |
| US-46 | **US-67** | `pdd_us_67_ficha_colaborador.md` § 16 | Ficha colaborador + mirror Tesorería |
| US-47 | **US-68** | `pdd_us_68_dashboard_rrhh.md` § 16 | Dashboard cards diferenciadas por rol |
| US-48 | **US-69** | `pdd_us_69_reportes_rrhh.md` § 16 | Reportes RRHH + mirror Tesorería |

## US nuevas creadas en el refactor 2026-04-27

- **US-70 · Devolver liquidación a "generada"** (Notion alias US-41) — feature nueva sin equivalente pre-refactor.
- **US-71 · Bandeja Tesorería de pagos pendientes** (Notion alias US-45) — feature nueva sin equivalente pre-refactor.

Ambas suman al backlog [`docs/product/backlog_us_mvp.md`](../product/backlog_us_mvp.md) bajo Epic E04.

## Decisiones arquitectónicas del refactor E04

- **Estado `aprobada_rrhh`** (no `confirmada`). Enum DB renombrado en migración `20260427040000`. Funciones renombradas: `hr_confirm_settlement` → `hr_approve_settlement`, idem bulk. Columnas: `confirmed_at` → `approved_at`, `confirmed_by_user_id` → `approved_by_user_id`. Ver commit `b7d3cb5`.
- **Acceso de Tesorería al módulo RRHH**: `/rrhh/**` sigue exclusivo de rol `rrhh`. Tesorería accede vía mirrors en `/treasury` (ficha, reportes, bandeja). Detalle en las secciones § 16 de [`pdd_us_67`](pdd_us_67_ficha_colaborador.md), [`pdd_us_68`](pdd_us_68_dashboard_rrhh.md), [`pdd_us_69`](pdd_us_69_reportes_rrhh.md). CLAUDE.md actualizado.
- **`staff_members` sin estado**: drop columnas `deactivated_at`, `deactivated_by_user_id`, `deactivation_reason` + drop RPC `hr_deactivate_staff_member`. Migración `20260427030000`. Ver commit `e197c2c`.
- **Estructura sin monto**: refactor previo (migración `20260424000000`); residuos limpiados en commit `e197c2c` (texts, feedback codes, comments).

## Migraciones SQL del refactor E04 (2026-04-27)

| Timestamp | Notion / Repo | Cambio principal |
|---|---|---|
| `20260427030000` | US-31 / US-56 | Drop `staff_members.deactivated_at` + RPC `hr_deactivate_staff_member` |
| `20260427040000` | US-40 / US-63 | Rename enum `confirmada` → `aprobada_rrhh` + columnas `approved_*` + funciones `hr_approve_*` + replace `hr_pay_settlement` |
| `20260427050000` | US-41 / US-70 | Nueva RPC `hr_return_settlement_to_generated` + 4 columnas `returned_*` |
| `20260427060000` | cleanup | Rename FK constraint legacy + 2 índices covering (advisor) |

## Commits Fase E04 refactor (orden cronológico)

| Commit | Fase | Resumen |
|---|---|---|
| `e197c2c` | 1.1 + 1.2 | US-54 cleanup monto + US-56 drop deactivated_at |
| `b7d3cb5` | 2.1 | US-63 rename `confirmada` → `aprobada_rrhh` |
| `e86d491` | 2.2 | US-70 devolver liquidación a generada |
| `2b99a0a` | 3 | US-71 bandeja Tesorería |
| `c8c2ddf` | 4 | US-67/68/69 mirrors Tesorería |
| `a3fd252` | 5 | US-60 dashboard "Alertas" linkea pre-filtrado |
| `0b966e8` | 6 | docs (PDDs mapping, contracts, domain, RLS, CLAUDE.md) |
| `38c344d` | cleanup | rename FK + indices covering |
