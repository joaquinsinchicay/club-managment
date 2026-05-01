# Import histórico completo de movimientos (2021-2026)

Carga histórica del CSV `/Users/joaquin/Downloads/Movimientos-Grid View.csv` (27.154 filas, años 2021-2026) al club A.A. Primera Junta.

## Pre-requisitos (ya aplicados)

Migrations pre-import (Fases A/B/C del plan):
- `20260501005000_fix_ceco_partido_fefi_a_ve_fa.sql` — revierte rename de 1 CECO al formato del CSV de movimientos.
- `20260501010000_missing_staff_members_for_full_import.sql` — crea Patricia LEIBE (Edith JONDOE ya existe).
- `20260501020000_missing_contracts_for_full_import.sql` — 11 contratos finalizados (10 sin coverage de año + 1 Patricia 2026).

## Flujo

1. **Fase 0 — Backup defensivo** (opcional, DB vacía hoy).
2. **Fase 1 — `parse_csv.py`**: parser + clasificador TRX + resolución de `activity_id` + `cost_center_ids` (con date-suffix fallback) + `staff_contract_id` (con first-name fallback para Edith). No toca DB.
3. **Fase 3 — `rest-import.py`**: bulk insert via REST. Orden: `account_transfers` + `fx_operations` PRIMERO, después `treasury_movements` en chunks de 500, después `treasury_movement_cost_centers` en chunks de 500.
4. **Fase 4 — Migration `20260501030000_renumber_imp_display_ids_all_years.sql`**: `IMP{YEAR}-N` → `APJ-MOV-{YEAR}-<seq>`.
5. **Fase 5 — Migration `20260501040000_backfill_payroll_settlements_all_years.sql`**: 1 settlement por (contract, year, month).

## UUIDs determinísticos (por año)

```
NS_MOV_BY_YEAR[YEAR] = ...0000{YEAR}00 → treasury_movements.id
NS_TRANSFER_BY_YEAR[YEAR] = ...0000{YEAR}01 → account_transfers.id
NS_FX_BY_YEAR[YEAR] = ...0000{YEAR}02 → fx_operations.id
```

Re-correr `rest-import.py` aborta en pre-flight si `external_id LIKE 'IMP%'` count > 0.

## Conteos esperados

- 27.154 treasury_movements (por año: 2021=2.120, 2022=3.722, 2023=4.721, 2024=6.580, 2025=7.547, 2026=2.464)
- 705 account_transfers + 1.410 movs hijos
- 59 fx_operations + 118 movs hijos
- ~5.000 treasury_movement_cost_centers
- 4.622 movs con `activity_id`
- ~2.529 movs con `staff_contract_id`
- 10.949 movs con `receipt_number`
- 22 movs con `[ANOMALIA: ...]` (7 grupos invalid_composition × 2 + 8 huérfanos sin TRX)

## Decisiones tomadas

| # | Decisión | Justificación |
|---|---|---|
| 1 | Un solo import 2021-2026 | DB vacía + masters alineados → 1 ejecución |
| 2 | `external_id = IMP{YEAR}-{csv_id}` | Formato heredado, idempotencia única por año |
| 3 | `display_id = APJ-MOV-{YEAR}-{seq}` | Convención del repo (renumera Fase 4) |
| 4 | CECOs con sufijo `(DD-MM-YYYY)` | Parser intenta primero match exacto, luego con sufijo si el original no existe |
| 5 | Activities matcheo directo | DB y CSV ya sincronizadas (10 nombres canónicos) |
| 6 | Edith fallback por first_name | Edith JONDOE ya existe; el CSV referencia "CTR 119: ...:  Edith" sin apellido |
| 7 | Anomalías flagged | 22 filas con `[ANOMALIA: ...]` para revisión manual |
| 8 | Settlements 1 por (contract, year, month) | Patrón del backfill 2024, status `pagada` |
