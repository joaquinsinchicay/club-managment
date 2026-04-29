#!/usr/bin/env python3
"""Backfill receipt_number para movs IMP2023-* desde el CSV.

Bug detectado 2026-04-29: el rest-import.py 2023 no mapeaba la columna
"Recibo" del CSV al campo `receipt_number` de treasury_movements. Este
script repara la omisión vía UPDATE matching por external_id.

Mismo patrón se aplica al import 2022 (también afectado, pendiente de CSV).
El import 2021 sí mapeaba correctamente — no requiere fix.

Idempotente: solo UPDATE filas con receipt_number IS NULL.
"""

import csv
import json
import sys
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DEFAULT_CSV = "/Users/joaquin/Downloads/Movimientos-Grid View.csv"


def load_env():
    env_path = Path(__file__).resolve().parents[2] / ".env.local"
    cfg = {}
    for line in env_path.read_text().splitlines():
        if "=" not in line or line.startswith("#"):
            continue
        k, v = line.split("=", 1)
        cfg[k.strip()] = v.strip().strip('"')
    return cfg


def patch(env, table, params, body):
    from urllib.parse import urlencode
    url = env["SUPABASE_URL"].rstrip("/") + "/rest/v1/" + table + "?" + urlencode(params)
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="PATCH")
    req.add_header("apikey", env["SUPABASE_SECRET_KEY"])
    req.add_header("Authorization", "Bearer " + env["SUPABASE_SECRET_KEY"])
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "return=minimal")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.status, resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")


def main():
    env = load_env()
    csv_path = Path(DEFAULT_CSV)
    if not csv_path.exists():
        print(f"CSV not found: {csv_path}", file=sys.stderr)
        sys.exit(1)

    updates = []
    with csv_path.open(encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            csv_id = row.get("ID", "").strip()
            recibo = row.get("Recibo", "").strip()
            if csv_id and recibo:
                updates.append((csv_id, recibo))

    print(f"Total filas con recibo: {len(updates)}")

    ok = 0
    fail = 0
    for csv_id, recibo in updates:
        external_id = f"IMP2023-{csv_id}"
        status, body = patch(env, "treasury_movements",
                              {"external_id": f"eq.{external_id}", "receipt_number": "is.null"},
                              {"receipt_number": recibo})
        if status >= 300:
            fail += 1
            if fail <= 5:
                print(f"  ❌ {external_id}: HTTP {status} {body[:200]}")
        else:
            ok += 1
        if (ok + fail) % 200 == 0:
            print(f"  Progress: {ok + fail}/{len(updates)} (ok={ok}, fail={fail})")

    print(f"\n✅ Backfill recibos 2023: {ok} updates ok, {fail} errores")


if __name__ == "__main__":
    main()
