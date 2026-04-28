#!/usr/bin/env python3
"""Fase 4 — Import movimientos 2022 via Supabase REST.

Lee out/2022_normalized.json (producido por parse_csv.py), construye el
payload de inserción para `treasury_movements` y `treasury_movement_cost_centers`,
y los postea en chunks de 500 vía service-role API.

Idempotente: cada movimiento usa `display_id = 'IMP2022-<csv_id>'`. Re-correr
con datos ya importados es no-op (UNIQUE en display_id falla y se reporta).

Uso: python3 scripts/import-2022/rest-import.py [--dry-run] [--limit N]
"""

import argparse
import json
import sys
import urllib.request
import urllib.error
import uuid as uuid_lib
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "out"


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

    norm_path = OUT / "2022_normalized.json"
    if not norm_path.exists():
        print(f"Falta {norm_path}. Corré parse_csv.py primero.", file=sys.stderr)
        sys.exit(1)

    rows = json.loads(norm_path.read_text())

    # Pre-flight: si ya hay IMP2022-* en DB, abortar para evitar duplicados parciales.
    if not args.dry_run:
        existing = get(env, "treasury_movements", {
            "display_id": "like.IMP2022-%",
            "select": "id",
            "limit": "1",
        })
        if existing:
            print(f"⚠️  Ya hay movimientos IMP2022-* en DB. Abortando.")
            print("Para re-correr, primero ejecutá: DELETE FROM treasury_movements WHERE display_id LIKE 'IMP2022-%';")
            sys.exit(2)

    # Resolve club_id (siempre es el primer club)
    clubs = get(env, "clubs", {"select": "id", "order": "created_at.asc", "limit": "1"})
    club_id = clubs[0]["id"]

    # Build payloads
    movements = []
    cc_links = []
    skipped = 0

    if args.limit:
        rows = rows[:args.limit]

    for r in rows:
        if not r["account_id"] or not r["subcategory_id"] or not r["movement_date"]:
            skipped += 1
            continue

        # Generate UUID determinístico desde csv_id para idempotencia.
        # Usamos uuid5 con namespace fijo + csv_id.
        ns = uuid_lib.UUID("00000000-0000-0000-0000-000000202200")
        movement_id = str(uuid_lib.uuid5(ns, r["csv_id"]))

        # movement_type: del CSV. Casing: 'Ingreso'/'Egreso' → lower.
        mvtype = (r.get("movement_type_csv") or "").strip().lower()
        if mvtype not in ("ingreso", "egreso"):
            # fallback por subcategory hint
            mvtype = "egreso"

        movements.append({
            "id": movement_id,
            "club_id": club_id,
            "origin_role": "tesoreria",
            "origin_source": "manual",
            "account_id": r["account_id"],
            "category_id": r["subcategory_id"],
            "movement_type": mvtype,
            "currency_code": r.get("currency") or "ARS",
            "amount": r["amount"],
            "movement_date": r["movement_date"],
            "concept": r.get("concept") or "",
            "status": "consolidated",
            "display_id": r["external_id"],
            "external_id": r["external_id"],
            "staff_contract_id": r.get("staff_contract_id"),
        })

        for cc_id in r.get("cost_center_ids") or []:
            if cc_id:
                cc_links.append({
                    "movement_id": movement_id,
                    "cost_center_id": cc_id,
                })

    print(f"Total rows en JSON: {len(rows)}")
    print(f"Movimientos a insertar: {len(movements)}")
    print(f"Cost-center links: {len(cc_links)}")
    print(f"Skipped (sin account/subcat/date): {skipped}")

    if args.dry_run:
        print("\n[dry-run] No se postea nada.")
        return

    # Insert movements en chunks
    inserted_movs = 0
    for i in range(0, len(movements), args.chunk_size):
        chunk = movements[i:i+args.chunk_size]
        status, body = post_batch(env, "treasury_movements", chunk)
        if status >= 300:
            print(f"  ❌ chunk {i}-{i+len(chunk)} HTTP {status}: {body[:500]}")
            sys.exit(2)
        inserted_movs += len(chunk)
        print(f"  ✓ movements {i}-{i+len(chunk)} (total: {inserted_movs}/{len(movements)})")

    # Insert cc_links en chunks
    if cc_links:
        inserted_links = 0
        for i in range(0, len(cc_links), args.chunk_size):
            chunk = cc_links[i:i+args.chunk_size]
            status, body = post_batch(env, "treasury_movement_cost_centers", chunk)
            if status >= 300:
                print(f"  ❌ link chunk {i} HTTP {status}: {body[:500]}")
                sys.exit(2)
            inserted_links += len(chunk)
            print(f"  ✓ cc_links {i}-{i+len(chunk)} (total: {inserted_links}/{len(cc_links)})")

    print(f"\n✅ Import completo: {inserted_movs} movimientos, {len(cc_links)} cost-center links.")


if __name__ == "__main__":
    main()
