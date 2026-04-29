#!/usr/bin/env python3
"""Backfill receipt_number para movs IMP2022-* desde el CSV.

Bug detectado 2026-04-29: el rest-import.py 2022 no mapeaba la columna
"Recibo" del CSV al campo `receipt_number` de treasury_movements. Mismo
issue que en 2023 (corregido en commit 06e193a).

El CSV puede ser el original 2022 o uno consolidado multi-año (toma solo
filas con fecha 2022). 1698 actualizaciones esperadas.

Idempotente: solo UPDATE filas con receipt_number IS NULL.
"""

import csv
import json
import sys
import urllib.request
import urllib.error
from pathlib import Path

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
            return resp.status, ""
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
            d = row.get("Fecha", "").strip().split("/")
            if len(d) != 3 or d[2] != "2022":
                continue
            cid = row.get("ID", "").strip()
            rec = row.get("Recibo", "").strip()
            if cid and rec:
                updates.append((cid, rec))

    print(f"Total filas 2022 con recibo: {len(updates)}")

    ok = 0
    fail = 0
    for cid, rec in updates:
        external_id = f"IMP2022-{cid}"
        status, body = patch(env, "treasury_movements",
                              {"external_id": f"eq.{external_id}", "receipt_number": "is.null"},
                              {"receipt_number": rec})
        if status >= 300:
            fail += 1
            if fail <= 5:
                print(f"  ❌ {external_id}: HTTP {status} {body[:200]}")
        else:
            ok += 1
        if (ok + fail) % 200 == 0:
            print(f"  Progress: {ok + fail}/{len(updates)} (ok={ok}, fail={fail})", flush=True)

    print(f"\n✅ Backfill recibos 2022: {ok} ok, {fail} fail")


if __name__ == "__main__":
    main()
