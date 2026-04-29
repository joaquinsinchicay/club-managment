#!/usr/bin/env python3
"""Fase 1 — Parse y valida CSV 2022 contra DB.

Lee el CSV `Movimientos-Grid View.csv`, normaliza los datos y reporta
contra la DB qué cuentas, subcategorías, contratos y cost centers
faltan o están listos. NO toca DB — solo SELECT vía REST API.

Uso:
    python3 scripts/import-2022/parse_csv.py [--csv PATH]

Output:
    out/2022_summary.json
    out/2022_normalized.json (todas las filas con FKs resueltos cuando aplica)
"""

import argparse
import csv
import json
import re
import sys
import urllib.request
import urllib.error
import unicodedata
from datetime import date
from pathlib import Path
from collections import Counter, defaultdict

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "out"
OUT.mkdir(exist_ok=True)
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


def supabase_get(env, path, params=None):
    url = env["SUPABASE_URL"].rstrip("/") + "/rest/v1/" + path
    if params:
        from urllib.parse import urlencode
        url += "?" + urlencode(params)
    req = urllib.request.Request(url, method="GET")
    req.add_header("apikey", env["SUPABASE_SECRET_KEY"])
    req.add_header("Authorization", "Bearer " + env["SUPABASE_SECRET_KEY"])
    req.add_header("Accept", "application/json")
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def normalize(s):
    """lowercase + strip + remove accents."""
    if s is None:
        return ""
    s = s.strip().lower()
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))


def parse_date(s):
    """dd/mm/yyyy → date object."""
    s = s.strip()
    if not s:
        return None
    parts = s.split("/")
    if len(parts) != 3:
        return None
    try:
        return date(int(parts[2]), int(parts[1]), int(parts[0]))
    except ValueError:
        return None


def parse_amount(s):
    """'$33,00' or '1.234,56' or '-500' → float."""
    if not s:
        return 0.0
    s = s.replace("$", "").replace(" ", "").strip()
    # Argentine format: thousand sep is `.`, decimal is `,`
    s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


# Account name mapping CSV → DB
ACCOUNT_MAP = {
    "secretaria": "Efectivo Secretaria",      # CSV: "Secretaría"
    "tesoreria": "Efectivo Tesoreria",        # CSV: "Tesorería"
    "galicia": "Galicia",
    "mercado pago": "Mercado Pago",
    "presidencia": "Presidencia",
    "tarjeta clubes en obra": "Tarjeta Clubes en Obra",
    "mp tesoreria": "MP Tesoreria",           # NUEVO 2022 — debe crearse
    "fci": "FCI",                              # NUEVO 2022 — debe crearse
}


def parse_contract(raw):
    """'CTR 3: EMP-2020-3: LANSORENA Gabriela' → ('LANSORENA', 'Gabriela', 'EMP-2020-3').
    Returns dict with fields or None."""
    if not raw:
        return None
    # Pattern: "CTR N: EMP-YYYY-N: APELLIDO Nombre"
    m = re.match(r"CTR\s+\d+:\s*(EMP-\d{4}-\d+):\s*(.+)$", raw.strip())
    if not m:
        return None
    emp_code = m.group(1)
    name_part = m.group(2).strip()
    # Split into UPPERCASE_LASTNAME and Title-cased First Names
    # Lastname is the consecutive UPPERCASE words at the start
    tokens = name_part.split()
    last_tokens = []
    first_tokens = []
    seen_lower = False
    for t in tokens:
        if not seen_lower and t.upper() == t and any(c.isalpha() for c in t):
            last_tokens.append(t)
        else:
            seen_lower = True
            first_tokens.append(t)
    return {
        "emp_code": emp_code,
        "last_name": " ".join(last_tokens),
        "first_name": " ".join(first_tokens),
        "raw": raw,
    }


def parse_cost_centers(raw):
    """'CC-330: ...,CC-336: ...' → [('CC-330', 'Presupuesto 1ra AFA 2022'), ...]."""
    if not raw:
        return []
    out = []
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        m = re.match(r"(CC-\d+):\s*(.+)$", part)
        if m:
            out.append((m.group(1), m.group(2).strip()))
        else:
            out.append((None, part))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default=DEFAULT_CSV)
    args = ap.parse_args()

    csv_path = Path(args.csv)
    if not csv_path.exists():
        print(f"CSV not found: {csv_path}", file=sys.stderr)
        sys.exit(1)

    env = load_env()
    if not env.get("SUPABASE_SECRET_KEY") or not env.get("SUPABASE_URL"):
        print("Faltan SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local", file=sys.stderr)
        sys.exit(1)

    # 1. Resolve active club
    clubs = supabase_get(env, "clubs", {"select": "id,name", "order": "created_at.asc", "limit": "1"})
    club_id = clubs[0]["id"]
    print(f"Club activo: {clubs[0]['name']} ({club_id})")

    # 2. Load DB masters
    accounts = supabase_get(env, "treasury_accounts", {"club_id": f"eq.{club_id}", "select": "id,name"})
    accounts_by_name = {a["name"]: a["id"] for a in accounts}

    # treasury_categories es una tabla flat: cada fila tiene `name` (o `sub_category_name`)
    # y `parent_category` (string del padre). Matcheamos contra `name` y/o `sub_category_name`.
    cats = supabase_get(env, "treasury_categories", {
        "club_id": f"eq.{club_id}",
        "select": "id,name,sub_category_name,parent_category,movement_type"
    })
    cats_by_subname = {}
    for c in cats:
        sn = (c.get("sub_category_name") or c.get("name") or "").strip()
        if sn:
            cats_by_subname[normalize(sn)] = c["id"]
    # Fallback also by `name` for system cats sin subcategory
    cats_by_name = {normalize(c["name"]): c["id"] for c in cats if c.get("name")}

    cecos = supabase_get(env, "cost_centers", {"club_id": f"eq.{club_id}", "select": "id,name,status"})
    cecos_by_norm = {normalize(c["name"]): {"id": c["id"], "name": c["name"], "status": c["status"]} for c in cecos}

    members = supabase_get(env, "staff_members", {
        "club_id": f"eq.{club_id}",
        "select": "id,first_name,last_name",
    })
    # Index by (lastname_norm, firstname_norm)
    members_by_name = defaultdict(list)
    for m in members:
        key = (normalize(m["last_name"]), normalize(m["first_name"]))
        members_by_name[key].append(m)

    contracts = supabase_get(env, "staff_contracts", {
        "club_id": f"eq.{club_id}",
        "select": "id,staff_member_id,start_date,end_date,status",
    })
    contracts_by_member = defaultdict(list)
    for c in contracts:
        contracts_by_member[c["staff_member_id"]].append(c)

    # 3. Parse CSV + validate
    summary = {
        "csv_path": str(csv_path),
        "total_rows": 0,
        "year_counts": Counter(),
        "amount_zero": 0,
        "accounts_unknown": Counter(),
        "subcats_unknown": Counter(),
        "contracts_unknown": Counter(),
        "contracts_no_coverage_2022": Counter(),
        "contracts_ambiguous": Counter(),
        "cecos_unknown": Counter(),
        "cecos_to_create": [],
        "cecos_reused": [],
        "currency_counts": Counter(),
        "type_counts": Counter(),
    }
    rows_normalized = []

    target_start = date(2022, 1, 1)
    target_end = date(2022, 12, 31)

    cecos_seen_in_csv = {}  # norm name → first display name

    with csv_path.open(encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            summary["total_rows"] += 1
            row_id = row.get("ID", "").strip()
            d = parse_date(row.get("Fecha", ""))
            if d:
                summary["year_counts"][d.year] += 1
            amount = parse_amount(row.get("Importe", ""))
            if amount == 0:
                summary["amount_zero"] += 1

            account_name_csv = row.get("Cuenta", "").strip()
            account_name_db = ACCOUNT_MAP.get(normalize(account_name_csv))
            account_id = accounts_by_name.get(account_name_db) if account_name_db else None
            if not account_id:
                summary["accounts_unknown"][account_name_csv] += 1

            cat_name = row.get("Categorías (from SubCatNorm)", "").strip()
            sub_name = row.get("Sub Categoría", "").strip()
            sub_id = (
                cats_by_subname.get(normalize(sub_name))
                or cats_by_name.get(normalize(sub_name))
                or cats_by_name.get(normalize(cat_name))
            )

            # Transferencia entre cuentas (US-25): cuando el CSV trae
            # "Transacción = ID TRX N", la fila NO es un movimiento normal sino
            # un lado de un par. Se modela como account_transfer + 2 movs hijos
            # con category_id=NULL y transfer_group_id. NUNCA crear subcategorías
            # "Egreso/Ingreso e/cuentas" (eliminadas del modelo en commit 2a0f53c).
            trx = row.get("Transacción", "").strip()
            is_transfer = bool(trx)
            if is_transfer:
                # Para transferencias, el sub_id se ignora — la fila irá al pipeline
                # de account_transfers, no al INSERT de movimientos categorizados.
                sub_id = None
            elif not sub_id:
                summary["subcats_unknown"][f"{cat_name} > {sub_name}"] += 1

            mvtype = row.get("Tipo de movimiento (From SubCat)", "").strip()
            summary["type_counts"][mvtype] += 1

            currency = row.get("Moneda", "").strip() or "ARS"
            summary["currency_counts"][currency] += 1

            # Contract resolution
            contract_raw = row.get("Contrato", "").strip()
            staff_contract_id = None
            if contract_raw:
                parsed = parse_contract(contract_raw)
                if not parsed:
                    summary["contracts_unknown"][contract_raw] += 1
                else:
                    key = (normalize(parsed["last_name"]), normalize(parsed["first_name"]))
                    member_candidates = members_by_name.get(key, [])
                    if not member_candidates:
                        summary["contracts_unknown"][contract_raw] += 1
                    else:
                        # Resolve contract by date overlap with movement date
                        ref_date = d or target_start
                        eligible = []
                        for m in member_candidates:
                            for c in contracts_by_member.get(m["id"], []):
                                start = date.fromisoformat(c["start_date"])
                                end = date.fromisoformat(c["end_date"]) if c.get("end_date") else date(9999, 12, 31)
                                if start <= ref_date <= end:
                                    eligible.append(c)
                        if not eligible:
                            # Fallback: any contract that touches 2022
                            for m in member_candidates:
                                for c in contracts_by_member.get(m["id"], []):
                                    start = date.fromisoformat(c["start_date"])
                                    end = date.fromisoformat(c["end_date"]) if c.get("end_date") else date(9999, 12, 31)
                                    if start <= target_end and end >= target_start:
                                        eligible.append(c)
                        if not eligible:
                            summary["contracts_no_coverage_2022"][contract_raw] += 1
                        elif len(eligible) > 1:
                            # Pick the longest one covering the year as deterministic tie-breaker
                            eligible.sort(key=lambda c: (c["start_date"], c["end_date"] or "9999-12-31"))
                            staff_contract_id = eligible[0]["id"]
                            summary["contracts_ambiguous"][contract_raw] += 1
                        else:
                            staff_contract_id = eligible[0]["id"]

            # Cost centers
            cc_raw = row.get("Centro de Costo", "").strip()
            cc_ids = []
            for code, name in parse_cost_centers(cc_raw):
                norm = normalize(name)
                if norm in cecos_by_norm:
                    cc_ids.append(cecos_by_norm[norm]["id"])
                else:
                    if norm not in cecos_seen_in_csv:
                        cecos_seen_in_csv[norm] = name
                    cc_ids.append(None)  # placeholder; needs to be created
                    summary["cecos_unknown"][f"{code or '?'}: {name}"] += 1

            rows_normalized.append({
                "csv_id": row_id,
                "external_id": f"IMP2022-{row_id}",
                # kind="transfer" → procesador downstream agrupa por trx_id,
                # crea account_transfer + 2 movs hijos (category_id=NULL,
                # transfer_group_id=<new>). kind="movement" → INSERT directo.
                "kind": "transfer" if is_transfer else "movement",
                "trx_id": trx if is_transfer else None,
                "movement_date": d.isoformat() if d else None,
                "account_csv": account_name_csv,
                "account_id": account_id,
                "category_csv": cat_name,
                "subcategory_csv": sub_name,
                "subcategory_id": sub_id,
                "movement_type_csv": mvtype,
                "currency": currency,
                "amount": amount,
                "concept": row.get("Concepto", "").strip(),
                "contract_csv": contract_raw,
                "staff_contract_id": staff_contract_id,
                "cost_centers_csv": cc_raw,
                "cost_center_ids": cc_ids,  # may contain None for ones to-be-created
                "receipt_csv": row.get("Recibo", "").strip() or None,
                "cost_centers_pending": [
                    name for code, name in parse_cost_centers(cc_raw)
                    if normalize(name) not in cecos_by_norm
                ],
            })

    # Build cecos_to_create from seen
    for norm, name in cecos_seen_in_csv.items():
        summary["cecos_to_create"].append(name)
    summary["cecos_reused"] = [
        cecos_by_norm[normalize(name)]["name"]
        for code, name in {(k, v) for k, v in cecos_seen_in_csv.items()}
        if False  # placeholder — done below
    ]
    # Recalc cecos that ARE in DB (matched)
    matched = set()
    for r in rows_normalized:
        for code, name in parse_cost_centers(r["cost_centers_csv"]):
            norm = normalize(name)
            if norm in cecos_by_norm:
                matched.add(cecos_by_norm[norm]["name"])
    summary["cecos_reused"] = sorted(matched)

    # Convert Counters to dicts for JSON
    for k, v in list(summary.items()):
        if isinstance(v, Counter):
            summary[k] = dict(v)

    summary_path = OUT / "2022_summary.json"
    summary_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False, default=str))
    norm_path = OUT / "2022_normalized.json"
    norm_path.write_text(json.dumps(rows_normalized, indent=2, ensure_ascii=False, default=str))

    print(f"\n=== SUMMARY ===")
    print(f"Total rows: {summary['total_rows']}")
    print(f"Year counts: {summary['year_counts']}")
    print(f"Amount=0 rows: {summary['amount_zero']}")
    print(f"Type counts: {summary['type_counts']}")
    print(f"Currency counts: {summary['currency_counts']}")
    print(f"\nAccounts UNKNOWN ({sum(summary['accounts_unknown'].values())} rows):")
    for a, c in summary["accounts_unknown"].items():
        print(f"  {c:5}  {a}")
    print(f"\nSubcategories UNKNOWN ({sum(summary['subcats_unknown'].values())} rows):")
    for s, c in sorted(summary["subcats_unknown"].items(), key=lambda x: -x[1]):
        print(f"  {c:5}  {s}")
    print(f"\nContracts UNKNOWN ({sum(summary['contracts_unknown'].values())} rows):")
    for c, n in sorted(summary["contracts_unknown"].items(), key=lambda x: -x[1])[:20]:
        print(f"  {n:5}  {c}")
    print(f"\nContracts NO_COVERAGE_2022 ({sum(summary['contracts_no_coverage_2022'].values())} rows):")
    for c, n in sorted(summary["contracts_no_coverage_2022"].items(), key=lambda x: -x[1])[:20]:
        print(f"  {n:5}  {c}")
    print(f"\nContracts AMBIGUOUS ({sum(summary['contracts_ambiguous'].values())} rows):")
    for c, n in sorted(summary["contracts_ambiguous"].items(), key=lambda x: -x[1])[:20]:
        print(f"  {n:5}  {c}")
    print(f"\nCost centers TO CREATE ({len(summary['cecos_to_create'])}):")
    for c in summary["cecos_to_create"]:
        print(f"  - {c}")
    print(f"\nCost centers REUSED from DB ({len(summary['cecos_reused'])}):")
    for c in summary["cecos_reused"]:
        print(f"  - {c}")

    print(f"\nOutput:\n  {summary_path}\n  {norm_path}")


if __name__ == "__main__":
    main()
