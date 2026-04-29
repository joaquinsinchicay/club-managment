#!/usr/bin/env python3
"""Fase 4 — Import movimientos 2023 via Supabase REST.

Lee out/2023_normalized.json (producido por parse_csv.py), construye los
payloads para 4 buckets:
  - kind="movement"               → INSERT directo a treasury_movements
  - kind="transfer"               → INSERT account_transfers + 2 movs hijos (US-25)
  - kind="fx_operation"           → INSERT fx_operations + N movs hijos (US-26)
  - kind="anomaly_solo"           → INSERT mov suelto con flag en concept
  - kind="anomaly_pair_imbalanced"→ INSERT 2 movs sueltos con flag (sin transfer_group)

Idempotente: cada mov usa external_id único 'IMP2023-<csv_id>'. Re-correr
con datos ya importados aborta el script (pre-flight check).

UUIDs determinísticos via uuid5 → mismas semillas dan mismos IDs.

Uso: python3 scripts/import-2023/rest-import.py [--dry-run] [--limit N]
"""

import argparse
import json
import sys
import urllib.request
import urllib.error
import uuid as uuid_lib
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "out"

# Namespaces (uuid5) para garantizar IDs determinísticos por bucket.
NS_MOV = uuid_lib.UUID("00000000-0000-0000-0000-000000202300")
NS_TRANSFER = uuid_lib.UUID("00000000-0000-0000-0000-000000202301")
NS_FX = uuid_lib.UUID("00000000-0000-0000-0000-000000202302")


def load_env():
    env_path = Path(__file__).resolve().parents[2] / ".env.local"
    cfg = {}
    for line in env_path.read_text().splitlines():
        if "=" not in line or line.startswith("#"):
            continue
        k, v = line.split("=", 1)
        cfg[k.strip()] = v.strip().strip('"')
    return cfg


def post_batch(env, table, rows):
    url = env["SUPABASE_URL"].rstrip("/") + "/rest/v1/" + table
    body = json.dumps(rows).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("apikey", env["SUPABASE_SECRET_KEY"])
    req.add_header("Authorization", "Bearer " + env["SUPABASE_SECRET_KEY"])
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "return=minimal")
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return resp.status, resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")


def get(env, path, params):
    from urllib.parse import urlencode
    url = env["SUPABASE_URL"].rstrip("/") + "/rest/v1/" + path + "?" + urlencode(params)
    req = urllib.request.Request(url, method="GET")
    req.add_header("apikey", env["SUPABASE_SECRET_KEY"])
    req.add_header("Authorization", "Bearer " + env["SUPABASE_SECRET_KEY"])
    req.add_header("Accept", "application/json")
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def build_movement(r, club_id, override_concept=None, override_category_id="__use_subcat__",
                   transfer_group_id=None, fx_operation_group_id=None):
    """Construye el payload de un treasury_movements desde una fila normalizada."""
    movement_id = str(uuid_lib.uuid5(NS_MOV, r["csv_id"]))
    mvtype = (r.get("movement_type_csv") or "").strip().lower()
    if mvtype not in ("ingreso", "egreso"):
        mvtype = "egreso"
    category_id = r["subcategory_id"] if override_category_id == "__use_subcat__" else override_category_id
    return {
        "id": movement_id,
        "club_id": club_id,
        "origin_role": "tesoreria",
        "origin_source": "manual",
        "account_id": r["account_id"],
        "category_id": category_id,
        "movement_type": mvtype,
        "currency_code": r.get("currency") or "ARS",
        "amount": r["amount"],
        "movement_date": r["movement_date"],
        "concept": override_concept if override_concept is not None else (r.get("concept") or ""),
        "receipt_number": r.get("receipt_csv") or None,
        "status": "posted",
        "display_id": r["external_id"],  # temporal IMP2023-N (renumerado en Fase 4.5)
        "external_id": r["external_id"],
        "staff_contract_id": r.get("staff_contract_id"),
        "transfer_group_id": transfer_group_id,
        "fx_operation_group_id": fx_operation_group_id,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int)
    ap.add_argument("--chunk-size", type=int, default=500)
    args = ap.parse_args()

    env = load_env()
    if not env.get("SUPABASE_SECRET_KEY") or not env.get("SUPABASE_URL"):
        print("Faltan SUPABASE_URL o SUPABASE_SECRET_KEY", file=sys.stderr)
        sys.exit(1)

    norm_path = OUT / "2023_normalized.json"
    if not norm_path.exists():
        print(f"Falta {norm_path}. Corré parse_csv.py primero.", file=sys.stderr)
        sys.exit(1)

    rows = json.loads(norm_path.read_text())

    # Pre-flight: 0 IMP2023-* en DB
    if not args.dry_run:
        existing = get(env, "treasury_movements", {
            "external_id": "like.IMP2023-%", "select": "id", "limit": "1",
        })
        if existing:
            print("⚠️  Ya hay movimientos IMP2023-* en DB. Abortando.")
            sys.exit(2)

    clubs = get(env, "clubs", {"select": "id", "order": "created_at.asc", "limit": "1"})
    club_id = clubs[0]["id"]

    if args.limit:
        rows = rows[:args.limit]

    # Particionar por kind
    movs_normales = [r for r in rows if r.get("kind") == "movement"]
    transfers_grouped = defaultdict(list)
    fx_grouped = defaultdict(list)
    anomaly_solo = [r for r in rows if r.get("kind") == "anomaly_solo"]
    anomaly_pairs = [r for r in rows if r.get("kind") == "anomaly_pair_imbalanced"]
    for r in rows:
        if r.get("kind") == "transfer":
            transfers_grouped[r["trx_id"]].append(r)
        elif r.get("kind") == "fx_operation":
            fx_grouped[r["trx_id"]].append(r)

    # Build payloads
    movements = []     # treasury_movements (todos los kinds)
    cc_links = []      # treasury_movement_cost_centers
    transfers = []     # account_transfers
    fxops = []         # fx_operations
    skipped = 0

    # 1) Filas normales
    for r in movs_normales:
        if not r["account_id"] or not r["subcategory_id"] or not r["movement_date"]:
            skipped += 1
            continue
        movements.append(build_movement(r, club_id))
        for cc_id in r.get("cost_center_ids") or []:
            if cc_id:
                cc_links.append({
                    "movement_id": movements[-1]["id"],
                    "cost_center_id": cc_id,
                })

    # 2) Transfers (account_transfers + 2 movs hijos por trx_id)
    for trx_id, members in transfers_grouped.items():
        if len(members) != 2:
            print(f"⚠️  Skipping transfer {trx_id}: esperaba 2 filas, hay {len(members)}", file=sys.stderr)
            continue
        egreso = next(m for m in members if m["movement_type_csv"].lower() == "egreso")
        ingreso = next(m for m in members if m["movement_type_csv"].lower() == "ingreso")
        if not egreso["account_id"] or not ingreso["account_id"] or not egreso["movement_date"]:
            skipped += 2
            continue
        transfer_id = str(uuid_lib.uuid5(NS_TRANSFER, trx_id))
        movement_date = egreso["movement_date"]
        # Concept del transfer = concept del egreso (más descriptivo típicamente)
        transfer_concept = egreso.get("concept") or f"Transferencia {trx_id}"
        transfers.append({
            "id": transfer_id,
            "club_id": club_id,
            "source_account_id": egreso["account_id"],
            "target_account_id": ingreso["account_id"],
            "currency_code": egreso.get("currency") or "ARS",
            "amount": egreso["amount"],
            "concept": transfer_concept,
            "created_at": f"{movement_date}T12:00:00",
        })
        # Los 2 movs hijos: category_id=NULL, transfer_group_id=<transfer_id>
        for r in members:
            movements.append(build_movement(
                r, club_id,
                override_category_id=None,
                transfer_group_id=transfer_id,
            ))

    # 3) FX operations (fx_operations + N movs hijos por trx_id)
    for trx_id, members in fx_grouped.items():
        egresos = [m for m in members if m["movement_type_csv"].lower() == "egreso"]
        ingresos = [m for m in members if m["movement_type_csv"].lower() == "ingreso"]
        if not egresos or not ingresos:
            print(f"⚠️  Skipping fx {trx_id}: estructura inválida", file=sys.stderr)
            continue
        ingreso = ingresos[0]
        if not all(r["account_id"] and r["movement_date"] for r in members):
            skipped += len(members)
            continue
        fx_id = str(uuid_lib.uuid5(NS_FX, trx_id))
        source_total = sum(e["amount"] for e in egresos)
        movement_date = members[0]["movement_date"]
        fxops.append({
            "id": fx_id,
            "club_id": club_id,
            "source_account_id": egresos[0]["account_id"],
            "target_account_id": ingreso["account_id"],
            "source_amount": source_total,
            "target_amount": ingreso["amount"],
            "created_at": f"{movement_date}T12:00:00",
        })
        # N movs hijos: category_id=NULL, fx_operation_group_id=<fx_id>
        for r in members:
            movements.append(build_movement(
                r, club_id,
                override_category_id=None,
                fx_operation_group_id=fx_id,
            ))

    # 4) anomaly_solo: 1 mov suelto con flag (concept ya prefijado por parser)
    for r in anomaly_solo:
        if not r["account_id"] or not r["movement_date"]:
            skipped += 1
            continue
        # category_id=NULL para que no apunte a una subcat fantasma
        movements.append(build_movement(r, club_id, override_category_id=None))

    # 5) anomaly_pair_imbalanced: 2 movs sueltos con flag (sin transfer_group)
    for r in anomaly_pairs:
        if not r["account_id"] or not r["movement_date"]:
            skipped += 1
            continue
        movements.append(build_movement(r, club_id, override_category_id=None))

    print(f"Total rows en JSON: {len(rows)}")
    print(f"  Filas movement: {len(movs_normales)}")
    print(f"  Filas transfer: {sum(len(v) for v in transfers_grouped.values())} ({len(transfers_grouped)} grupos)")
    print(f"  Filas fx_operation: {sum(len(v) for v in fx_grouped.values())} ({len(fx_grouped)} grupos)")
    print(f"  Filas anomaly_solo: {len(anomaly_solo)}")
    print(f"  Filas anomaly_pair_imbalanced: {len(anomaly_pairs)}")
    print(f"\nPayloads construidos:")
    print(f"  movements: {len(movements)}")
    print(f"  cc_links: {len(cc_links)}")
    print(f"  account_transfers: {len(transfers)}")
    print(f"  fx_operations: {len(fxops)}")
    print(f"  Skipped (sin account/date): {skipped}")

    if args.dry_run:
        print("\n[dry-run] No se postea nada.")
        return

    # Orden de inserción: PRIMERO transfers + fxops (para que las FK sean válidas
    # si se valida via constraint), DESPUÉS movements, DESPUÉS cc_links.
    if transfers:
        status, body = post_batch(env, "account_transfers", transfers)
        if status >= 300:
            print(f"❌ account_transfers HTTP {status}: {body[:500]}")
            sys.exit(2)
        print(f"✓ account_transfers: {len(transfers)}")

    if fxops:
        status, body = post_batch(env, "fx_operations", fxops)
        if status >= 300:
            print(f"❌ fx_operations HTTP {status}: {body[:500]}")
            sys.exit(2)
        print(f"✓ fx_operations: {len(fxops)}")

    inserted_movs = 0
    for i in range(0, len(movements), args.chunk_size):
        chunk = movements[i:i+args.chunk_size]
        status, body = post_batch(env, "treasury_movements", chunk)
        if status >= 300:
            print(f"❌ movements chunk {i}-{i+len(chunk)} HTTP {status}: {body[:500]}")
            sys.exit(2)
        inserted_movs += len(chunk)
        print(f"✓ movements {i}-{i+len(chunk)} (total: {inserted_movs}/{len(movements)})")

    if cc_links:
        for i in range(0, len(cc_links), args.chunk_size):
            chunk = cc_links[i:i+args.chunk_size]
            status, body = post_batch(env, "treasury_movement_cost_centers", chunk)
            if status >= 300:
                print(f"❌ cc_links chunk {i} HTTP {status}: {body[:500]}")
                sys.exit(2)
        print(f"✓ cc_links: {len(cc_links)}")

    print(f"\n✅ Import completo: {inserted_movs} movs, {len(transfers)} transfers, "
          f"{len(fxops)} fxops, {len(cc_links)} cc_links.")


if __name__ == "__main__":
    main()
