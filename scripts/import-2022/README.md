# Import movimientos 2022

Carga histórica del CSV `Movimientos-Grid View.csv` (3.724 rows, 2022) al club activo.

## ⚠️ Lecciones aprendidas (post-mortem 2026-04-28)

El primer pass del import introdujo **2 errores de modelo** que se corrigieron post-aplicación con migraciones dedicadas:

1. **Transferencias entre cuentas mal modeladas**: las 88 parejas (176 filas con `Transacción = ID TRX N` en el CSV) se importaron como movimientos sueltos categorizados con 2 subcategorías legacy `Egreso/Ingreso e/cuentas` que YO creé en `20260428200000_masters_for_2022_import.sql` sin que nadie lo pidiera. Esas subcats habían sido **eliminadas del producto** en el commit `2a0f53c` (refactor 2026-04-27).
   - **Modelo correcto** (US-25): cada par = 1 fila en `account_transfers` + 2 movs hijos con `transfer_group_id = <transfer.id>` y `category_id = NULL`. Confirmado contra las 4 transferencias del 2021 modeladas bien.
   - **Corrección aplicada**: migración `20260428250000_fix_transferencias_2022_a_account_transfers.sql` (88 transfers creados, 176 movs linkeados) + `20260428260000_drop_legacy_transferencias_subcategories.sql` (2 subcats eliminadas).
2. **Bloque (3) de la migración masters quedó inerte**: ya no crea las subcats fantasma. Para una re-ejecución desde cero, el script `parse_csv.py` marca esas filas como `kind="transfer"` y `rest-import.py` aborta si las encuentra (no soporta el procesamiento de `account_transfers` aún).

**Convención canónica para imports futuros**: si el CSV trae filas con columna `Transacción ≠ ""`, NO crear subcategorías ni movs sueltos — se modelan como `account_transfers` + `transfer_group_id`. Ver `CLAUDE.md` § "Convenciones del modelo".

## Resultados

- **3.724 treasury_movements** importados con `display_id = IMP2022-N`.
- **267 payroll_settlements** 2022 generados via backfill (status `pagada`).
- **186 cost_center_movement_links** (multi-CC: 10 movs con 2 CCs cada uno).
- **8 cost centers** nuevos creados, 1 reusado (`Préstamo Horacio Jimenez` del 2021).
- **2 cuentas** creadas: `MP Tesoreria`, `FCI`.
- **2 subcategorías** legacy re-creadas: `Egreso e/cuentas`, `Ingreso e/cuentas` (visible_for_*=false).
- **4 contratos** finalizado 2022 creados para staff sin contrato cubriendo el año (MACRI, QUIROGA Cesar, ALVAREZ, FRAGA).

## Flujo

1. **Fase 1 — `parse_csv.py`**: lee el CSV, normaliza fechas/montos/multi-CC, valida contra DB y produce `out/2022_normalized.json` + `out/2022_summary.json`. No toca DB.
2. **Fase 2 — `20260428200000_masters_for_2022_import.sql`**: crea cuentas, subcategorías legacy y 8 cecos nuevos.
3. **Fase 3 — `20260428210000_missing_contracts_for_2022_import.sql`**: crea 4 contratos finalizado para staff sin coverage 2022.
4. **Fase 4 — `rest-import.py`**: bulk insert via Supabase REST. UUIDs determinísticos via `uuid5(NS_2022, csv_id)` para idempotencia. Chunks de 500.
5. **Fase 5 — `20260428220000_backfill_payroll_settlements_2022.sql`**: 1 settlement por (contract, year, month) con `total_amount=SUM`, `paid_movement_id=el más antiguo del par`.

## Re-ejecución

UUIDs determinísticos, idempotencia por `display_id`. Para re-correr:

```bash
# 1. Limpiar (si querés re-empezar)
DELETE FROM treasury_movement_cost_centers WHERE movement_id IN
  (SELECT id FROM treasury_movements WHERE display_id LIKE 'IMP2022-%');
DELETE FROM treasury_movements WHERE display_id LIKE 'IMP2022-%';
DELETE FROM payroll_settlements WHERE notes LIKE 'Carga historica CSV 2022%';

# 2. Re-aplicar
python3 scripts/import-2022/parse_csv.py
python3 scripts/import-2022/rest-import.py
# Re-aplicar la migración de backfill desde supabase mcp.
```

## Decisiones tomadas

| # | Decisión | Valor |
|---|---|---|
| 1 | "Secretaría" CSV → DB | `Efectivo Secretaria` (mismo mapping que 2021) |
| 2 | "MP Tesorería" cuenta nueva | `billetera_virtual` / `tesoreria` / ARS |
| 3 | "FCI" cuenta nueva | `bancaria` / `tesoreria` / ARS / bank=Galicia |
| 4 | 8 cecos nuevos | type=`evento` (sin requerir amount), status=`inactivo`. Editables por usuario luego. |
| 5 | Subcats `Egreso/Ingreso e/cuentas` | re-creadas con `is_legacy=true visible_for_*=false` |
| 6 | Contratos faltantes (4) | `finalizado` 2022-01-01 → 2022-12-31 con structure `Pago histórico 2021` |
| 7 | Multi-CC (10 movs) | filas en `treasury_movement_cost_centers` (1 por cc por mov) |
| 8 | 28 contracts ambiguous | resuelto determinísticamente por `start_date asc` |
