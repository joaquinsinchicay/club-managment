#!/usr/bin/env python3
"""Aplica los archivos SQL generados por build-sql.py a Supabase via psycopg2.

Lee POSTGRES_URL del .env.local y ejecuta cada archivo en orden, dentro de
una sola transacción para garantizar atomicidad.

Uso:
  python3 scripts/import-2021/apply.py [--dry-run] [--skip-sessions]
"""

import argparse
import os
import re
import sys
from pathlib import Path

import psycopg2

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "out"

def get_pg_params():
    env = (Path(__file__).resolve().parents[2] / ".env.local").read_text()
    cfg = {}
    for line in env.splitlines():
        for key in ("POSTGRES_HOST", "POSTGRES_PASSWORD", "POSTGRES_USER", "POSTGRES_DATABASE"):
            if line.startswith(key + "="):
                cfg[key] = line.split("=", 1)[1].strip().strip('"')
    return {
        "host": cfg["POSTGRES_HOST"],
        "user": cfg["POSTGRES_USER"],
        "password": cfg["POSTGRES_PASSWORD"],
        "dbname": cfg["POSTGRES_DATABASE"],
        "port": 5432,
    }

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--skip", default="", help="Comma-separated file prefixes to skip (e.g. '01,02')")
    args = ap.parse_args()

    skip_prefixes = [p.strip() for p in args.skip.split(",") if p.strip()]

    files = sorted(OUT.glob("*.sql"))
    print(f"Archivos a aplicar: {len(files)}")
    for f in files:
        print(f"  - {f.name} ({f.stat().st_size:,} bytes)")

    if args.dry_run:
        print("\n--dry-run: no se ejecuta nada.")
        return

    params = get_pg_params()
    conn = psycopg2.connect(**params)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        for f in files:
            if any(f.name.startswith(p) for p in skip_prefixes):
                print(f"SKIP {f.name}")
                continue
            sql = f.read_text()
            print(f"APPLY {f.name} ...", flush=True, end=" ")
            cur.execute(sql)
            print("ok")
        conn.commit()
        print("\n✓ Commit OK.")
    except Exception as e:
        conn.rollback()
        print(f"\n✗ ROLLBACK: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    main()
