# Import movimientos 2023

Carga histórica del CSV `Movimientos-Grid View.csv` (4.718 rows, 2023, IDs 5844..10561) al club activo.

## Resultados

- **4.718 treasury_movements** importados con `display_id = APJ-MOV-2023-1..4718` (renumerado por año).
- **96 account_transfers** + 192 movs hijos con `transfer_group_id` (US-25, modelo correcto desde el origen).
- **13 fx_operations** + 30 movs hijos con `fx_operation_group_id` (US-26, compras de USD).
- **3 movs anomalía** con flag `[ANOMALIA: TRX-N ...]` en concept (1 solo + 2 desbalanceados).
- **317 payroll_settlements** 2023 generados via backfill (status `pagada`).
- **234 cost_center_movement_links**.
- **2 cuentas** nuevas creadas (`Pro-Tesoreria`, `Mobbex`).
- **4 cost centers** nuevos (CC-331 AFA 2023, CC-52 Fiesta '23, CC-339 Atacamca 2023, CC-12 Deuda Chicho).
- **3 contratos finalizado 2023** creados para staff sin coverage (MACRI Matias, INSFRAN Brian, AMAS Martin).

## Diferencia clave vs imports 2021/2022

**Modelo correcto desde el origen**: las filas con columna `Transacción` se clasifican antes del INSERT en 4 buckets (`movement` / `transfer` / `fx_operation` / `anomaly_*`) y se modelan apropiadamente con `account_transfers` + `transfer_group_id` o `fx_operations` + `fx_operation_group_id`. **NO se crean subcategorías legacy** — convención documentada en `CLAUDE.md` § "Convenciones del modelo".

## Clasificación TRX (de los 111 grupos del CSV)

| Bucket | Grupos | Filas |
|---|---|---|
| `transfer` (par ARS↔ARS, mismo monto, cuentas distintas) | 96 | 192 |
| `fx_operation` (egresos ARS + ingreso USD, distinto monto) | 13 | 30 |
| `anomaly_solo` (1 fila sin contraparte — TRX 97) | 1 | 1 |
| `anomaly_pair_imbalanced` (2 filas mismo currency, montos distintos — TRX 132 Δ$100) | 1 | 2 |

Detalle completo en `out/2023_classification_report.md`.

## Flujo

1. **Fase 1 — `parse_csv.py`**: parser + clasificación TRX. Genera `out/2023_normalized.json`, `out/2023_summary.json`, `out/2023_classification_report.md`.
2. **Fase 2 — `20260428270000_masters_for_2023_import.sql`**: 2 cuentas + ARS + 4 cost centers.
3. **Fase 3 — `20260428280000_missing_contracts_for_2023_import.sql`**: 3 contratos finalizado.
4. **Fase 4 — `rest-import.py`**: bulk insert via REST. Orden: account_transfers + fx_operations PRIMERO (para que las FK sean válidas), después treasury_movements en chunks de 500, después treasury_movement_cost_centers.
5. **Fase 4.5 — `20260428290000_renumber_imp2023_display_ids.sql`**: `IMP2023-N` → `APJ-MOV-2023-<seq>` ordenado cronológicamente.
6. **Fase 5 — `20260428300000_backfill_payroll_settlements_2023.sql`**: 1 settlement por (contract, year, month).

## UUIDs determinísticos (uuid5)

- `NS_MOV = ...0202300` → `treasury_movements.id`
- `NS_TRANSFER = ...0202301` → `account_transfers.id`
- `NS_FX = ...0202302` → `fx_operations.id`

Re-correr el script con datos ya importados aborta en pre-flight check (`external_id LIKE 'IMP2023-%'` count > 0).

## Decisiones tomadas

| # | Decisión | Valor |
|---|---|---|
| 1 | Pro-Tesorería cuenta nueva | `bancaria` / `tesoreria` / ARS / bank=Galicia |
| 2 | Mobbex cuenta nueva | `billetera_virtual` / `tesoreria` / ARS |
| 3 | 4 cecos nuevos | type=`evento` (no requiere amount), status=`inactivo` |
| 4 | Contratos faltantes (3) | `finalizado` 2023-01-01 → 2023-12-31 con structure `Pago histórico 2021` |
| 5 | TRX 132 desbalanceado (Δ$100) | importado como 2 movs sueltos con flag, sin transfer_group |
| 6 | TRX 97 incongruente | importado como mov suelto con flag |
| 7 | TRX 155 fxop con 3 cuentas | source = primera cuenta del primer egreso (Galicia), demás movs hijos preservan account_id |
| 8 | 33 contracts ambiguous | resueltos determinísticamente por start_date asc |
