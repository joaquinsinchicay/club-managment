# Import movimientos 2024

Carga histórica del CSV `Movimientos-Grid View (1).csv` (6.585 rows, 2024, IDs 10562..29377 con gaps por filas eliminadas en Notion) al club activo.

## Resultados

- **6.585 treasury_movements** importados con `display_id = APJ-MOV-2024-1..6585`, status `posted`.
- **199 account_transfers** + 400 movs hijos con `transfer_group_id` (197 pares + 2 multi-source).
- **20 fx_operations** + 41 movs hijos con `fx_operation_group_id` (compras de USD durante el año).
- **21 movs anomalía** con flag `[ANOMALIA: TRX-N composición inválida ...]` en concept (10 grupos del CSV con errores de carga histórica).
- **303 payroll_settlements 2024** generados via backfill (status `pagada`).
- **941 cost_center_movement_links** (42 movs con multi-CC).
- **123 cost centers nuevos** (98 partidos AFA/FEFI/FUTSALA/Promo + 25 generales 2024).
- **3 contratos finalizado 2024** creados para staff sin coverage (GUERRERO Darío, BLANCO Manuel, GONZALEZ Leandro).
- **2.428 movs con receipt_number** desde columna `Recibo` del CSV.

## Diferencia clave vs imports anteriores

**Clasificador extendido** para soportar:
- `transfer_multi_source` (≥3 filas, ≥1 egreso + 1 ingreso, mismo currency, suma OK, source ≠ target).
- `anomaly_imbalanced` (multi-source con suma egresos ≠ ingreso).
- `anomaly_invalid_composition` (composición no estándar — ej. 2 ingresos sin egreso, errores de carga del CSV).

## Clasificación TRX (229 grupos)

| Bucket | Grupos | Filas |
|---|---|---|
| `transfer` (par 1+1 simétrico) | 197 | 394 |
| `transfer_multi_source` (multi egreso → 1 ingreso ARS) | 2 | 6 |
| `fx_operation` (compras/ventas USD) | 20 | 41 |
| `anomaly_invalid_composition` (errores de carga) | 10 | 21 |

Detalle en `out/2024_classification_report.md`.

## Flujo

1. **Fase 1 — `parse_csv.py`**: parser + clasificador TRX extendido.
2. **Fase 2 — `20260429100000_masters_for_2024_import.sql`**: 123 cost centers nuevos como `type=evento`, `status=inactivo`.
3. **Fase 3 — `20260429110000_missing_contracts_for_2024_import.sql`**: 3 contratos finalizado.
4. **Fase 4 — `rest-import.py`**: bulk insert via REST. Orden: account_transfers + fx_operations primero, después treasury_movements en chunks de 500, después treasury_movement_cost_centers.
5. **Fase 4.5 — `20260429120000_renumber_imp2024_display_ids.sql`**: `IMP2024-N` → `APJ-MOV-2024-<seq>`.
6. **Fase 5 — `20260429130000_backfill_payroll_settlements_2024.sql`**: 303 settlements 1 por (contract, year, month).

## UUIDs determinísticos

- `NS_MOV = ...0202400` → treasury_movements.id
- `NS_TRANSFER = ...0202401` → account_transfers.id (multi-source comparte mismo namespace)
- `NS_FX = ...0202402` → fx_operations.id

Re-correr el script aborta en pre-flight si `external_id LIKE 'IMP2024-%'` count > 0.

## Decisiones tomadas

| # | Decisión | Valor |
|---|---|---|
| 1 | 0 cuentas nuevas | Las 7 cuentas usadas ya existen (Pro-Tesoreria/Mobbex creadas en 2023) |
| 2 | 123 cost centers nuevos | type=`evento` (no requiere amount), status=`inactivo` |
| 3 | Contratos faltantes (3) | `finalizado` 2024-01-01 → 2024-12-31 con structure `Pago histórico 2021` |
| 4 | TRX 285 (egresos Tesorería+Secretaría → ingreso Tesorería) | Clasificado como `anomaly_invalid_composition` por source∩target ≠ ∅ |
| 5 | TRX multi-source (227, 241) | `account_transfer.source_account_id` = primer egreso, demás movs preservan `account_id` individual |
| 6 | 113 contracts ambiguous | resueltos determinísticamente por start_date asc |
