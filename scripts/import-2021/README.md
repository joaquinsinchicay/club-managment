# Import movimientos 2021

Carga histórica del CSV `Movimientos-Grid View (1).csv` (2120 rows, 14/04/2021 → 31/12/2021) al club activo.

## Resumen del proceso

1. **Pre-requisito (Paso 0)** — Eliminar la categoría sistema "Transferencias e/cuentas" (commit `2a0f53c`) y deployar a Vercel para que no se recree.
2. **Paso 1: Limpieza** — `supabase/migrations/20260427190000_reset_treasury_for_2021_import.sql`. Borra movimientos, transferencias, FX, sesiones, consolidaciones y cecos (excepto "1ra AFA").
3. **Paso 2: Masters** — `supabase/migrations/20260427200000_masters_for_2021_import.sql` y `20260427210000_fix_cecos_for_2021_import.sql`. Crea cuentas (Tarjeta Clubes en Obra, Presidencia), cecos, columnas `external_id` y `staff_contract_id` en `treasury_movements`.
4. **Contratos históricos** — Para 3 staff (MARGELI, CARRACEDO, LAS HERAS) sin contrato cubriendo 2021, se crearon contratos `finalizado` con structure dummy "Pago histórico 2021".
5. **Paso 3: Importación** — Este script.

## Archivos

- `build-sql.py` — Lee el CSV y genera SQL determinístico (UUIDs estables vía `uuid5`) en `out/`. Ejecutar primero.
- `rest-import.py` — Aplica los archivos SQL `out/05-movements-*.sql` vía PostgREST de Supabase (usa `SUPABASE_SECRET_KEY` del `.env.local`). Bypassa RLS.
- `apply.py` — Variante con psycopg2 (no se usó por problemas de auth con la pooler).

## Decisiones del usuario

| # | Decisión | Valor |
|---|---|---|
| 1 | "Secretaría" CSV → DB | `Efectivo Secretaria` |
| 2 | Tarjeta Clubes en Obra | `bancaria/tesoreria` |
| 3 | Presidencia | `efectivo/secretaria` |
| 4 | "FEFI" CSV → | `FEFI 1er Tira` |
| 5 | "Promo" CSV → | `Promo 1er Tira` |
| 6 | Conservar "1ra AFA" en limpieza | Sí |
| 7 | CC-7 Hernan Perez | `sponsor/ARS/1.00/mensual` |
| 8 | CC-14 Préstamo Horacio Jimenez | `deuda/USD/1500/responsable=Tesorería Primera Junta` |
| 9 | Sesiones | 1 por mes, status=closed |
| 10 | 252 pagos RRHH | linkeados via `staff_contract_id` (Opción C) |
| 11 | Idempotencia | columna `external_id = "IMP2021-<csv_id>"` |

## Pares ID TRX X (clasificación manual)

| TRX | Tipo | Modelado como |
|---|---|---|
| 1, 2, 4, 6, 7 | FX (compra USD) | `fx_operations` (US-26) |
| 5, 10 | Transferencia entre cuentas | `account_transfers` (US-25) |
| 3, 8, 9 | Singletons mal etiquetados | Movimientos sueltos re-categorizados |

## Verificación final

```
2118 movimientos · 9 sesiones · 2 transfers · 5 FX
91 movs con cost_center · 252 movs con staff_contract
ARS: ingresos 5.004.155,74 / egresos 4.186.414,03
USD: ingresos 1.000 / egresos 1.000
Skipped: 2 rows con amount=0 (saldo Mercado Pago, Recibo Anulado)
```

## Re-ejecución

Los UUIDs son determinísticos. Si querés re-correr:

```bash
# 1. Limpiar inserts previos (idempotencia via external_id)
DELETE FROM treasury_movements WHERE external_id LIKE 'IMP2021-%';
DELETE FROM account_transfers WHERE id IN (...);
DELETE FROM fx_operations WHERE id IN (...);
DELETE FROM daily_cash_sessions WHERE id IN (...);

# 2. Regenerar SQL
python3 scripts/import-2021/build-sql.py

# 3. Re-aplicar
python3 scripts/import-2021/rest-import.py
```
