#!/usr/bin/env python3
"""Importa el CSV via PostgREST de Supabase (sin deps externas).

Lee SUPABASE_URL + SUPABASE_SECRET_KEY del .env.local y hace bulk
inserts vía POST /rest/v1/<table>. Bypassa RLS por usar service role.

Estado actual: sessions/saldos/fx/transfers ya están en DB. Este script
solo carga los 2101 movimientos restantes (los chunks 05-*) parseando
los archivos SQL ya generados en out/.

Uso: python3 scripts/import-2021/rest-import.py [--dry-run]
"""

import argparse
import json
import re
import sys
import urllib.request
import urllib.error
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

# Parse INSERT … VALUES (…) statements into dicts
INSERT_RE = re.compile(
    r"INSERT INTO public\.(\w+) \((?P<cols>[^)]+)\) VALUES\s*\((?P<vals>.*)\);?\s*$",
    re.IGNORECASE
)
VALUE_RE = re.compile(r"""
    NULL
  | '(?:[^']|'')*'(?:::\w+(?:_\w+)*)?         # 'literal' or 'literal'::type
  | -?\d+(?:\.\d+)?                              # number
""", re.VERBOSE)

def parse_value(raw):
    raw = raw.strip()
    if raw == "NULL":
        return None
    if raw.startswith("'"):
        # Strip type cast
        m = re.match(r"^'((?:[^']|'')*)'(?:::\w+(?:_\w+)*)?$", raw)
        if m:
            return m.group(1).replace("''", "'")
        return raw
    # number
    if "." in raw:
        return float(raw)
    return int(raw)

def split_values(s):
    """Split top-level comma-separated values, respecting quoted strings."""
    out = []
    buf = []
    in_str = False
    i = 0
    while i < len(s):
        ch = s[i]
        if in_str:
            buf.append(ch)
            if ch == "'":
                # Look for escaped ''
                if i + 1 < len(s) and s[i+1] == "'":
                    buf.append("'")
                    i += 2
                    continue
                in_str = False
            i += 1
        else:
            if ch == "'":
                in_str = True
                buf.append(ch)
                i += 1
            elif ch == ",":
                out.append("".join(buf))
                buf = []
                i += 1
            else:
                buf.append(ch)
                i += 1
    if buf:
        out.append("".join(buf))
    return out

def parse_insert(line):
    m = INSERT_RE.match(line.strip())
    if not m:
        return None
    table = m.group(1)
    cols = [c.strip() for c in m.group("cols").split(",")]
    vals = split_values(m.group("vals"))
    if len(cols) != len(vals):
        raise ValueError(f"Cols/vals mismatch: {len(cols)} vs {len(vals)}")
    return table, dict(zip(cols, [parse_value(v) for v in vals]))

def post_batch(env, table, rows):
    url = env["SUPABASE_URL"].rstrip("/") + "/rest/v1/" + table
    body = json.dumps(rows).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="POST")
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
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--chunk", help="Solo aplicar este chunk (e.g. 001)")
    args = ap.parse_args()

    env = load_env()
    if not env.get("SUPABASE_SECRET_KEY") or not env.get("SUPABASE_URL"):
        print("Faltan SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local")
        sys.exit(1)

    files = sorted(OUT.glob("05-movements-*.sql"))
    if args.chunk:
        files = [f for f in files if args.chunk in f.name]

    total_rows = 0
    for f in files:
        rows_by_table = {}
        with f.open() as fh:
            for line in fh:
                if not line.strip() or line.startswith("--"):
                    continue
                parsed = parse_insert(line)
                if not parsed:
                    continue
                tbl, row = parsed
                rows_by_table.setdefault(tbl, []).append(row)
        for tbl, rows in rows_by_table.items():
            print(f"{f.name} → {tbl}: {len(rows)} rows", end="", flush=True)
            if args.dry_run:
                print("  [dry-run]")
                total_rows += len(rows)
                continue
            status, body = post_batch(env, tbl, rows)
            print(f"  HTTP {status}")
            if status >= 300:
                print(f"  ERROR body: {body[:500]}")
                sys.exit(2)
            total_rows += len(rows)

    print(f"\nTotal: {total_rows} rows insertadas")

if __name__ == "__main__":
    main()
