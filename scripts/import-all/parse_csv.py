#!/usr/bin/env python3
"""Fase 1 — Parse y valida CSV all contra DB.

Lee el CSV `Movimientos-Grid View.csv`, normaliza los datos y clasifica
las filas con `Transacción ≠ ""` en 4 buckets:

  - kind="movement"       → fila normal sin Transacción
  - kind="transfer"       → par perfecto egreso+ingreso ARS↔ARS (account_transfers)
  - kind="fx_operation"   → grupo egreso(s) ARS + ingreso USD/ARS distinto monto (fx_operations)
  - kind="anomaly_solo"   → grupo de 1 sola fila sin contraparte (mov suelto con flag)

NO toca DB — solo SELECT vía REST API.

Uso:
    python3 scripts/import-all/parse_csv.py [--csv PATH]

Output:
    out/all_summary.json
    out/all_normalized.json
    out/all_classification_report.md
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
    "mp tesoreria": "MP Tesoreria",
    "fci": "FCI",
    "pro-tesoreria": "Pro-Tesoreria",         # creada en 2023
    "mobbex": "Mobbex",                        # creada en 2023
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
    """'CC-330: ...,CC-336: ...' → [('CC-330', 'Presupuesto 1ra AFA all'), ...]."""
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

    # club_activities — el CSV trae columna "Actividad" que se mapea a
    # treasury_movements.activity_id por nombre normalizado.
    activities = supabase_get(env, "club_activities", {"club_id": f"eq.{club_id}", "select": "id,name"})
    activities_by_norm = {normalize(a["name"]): a["id"] for a in activities}

    # 3. Parse CSV + validate
    summary = {
        "csv_path": str(csv_path),
        "total_rows": 0,
        "year_counts": Counter(),
        "amount_zero": 0,
        "accounts_unknown": Counter(),
        "subcats_unknown": Counter(),
        "contracts_unknown": Counter(),
        "contracts_no_coverage_all": Counter(),
        "contracts_ambiguous": Counter(),
        "cecos_unknown": Counter(),
        "cecos_to_create": [],
        "cecos_reused": [],
        "cecos_resolved_with_date_suffix": Counter(),
        "activities_unknown": Counter(),
        "activities_reused": [],
        "edith_jondoe_fallback_used": 0,
        "currency_counts": Counter(),
        "type_counts": Counter(),
        "year_distribution": Counter(),
    }
    rows_normalized = []

    target_start = date(2021, 1, 1)
    target_end = date(2026, 12, 31)

    cecos_seen_in_csv = {}  # norm name → first display name

    with csv_path.open(encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            summary["total_rows"] += 1
            row_id = row.get("ID", "").strip()
            d = parse_date(row.get("Fecha", ""))
            if d:
                summary["year_counts"][d.year] += 1
                summary["year_distribution"][d.year] += 1
            amount = parse_amount(row.get("Importe", ""))
            if amount == 0:
                summary["amount_zero"] += 1
                # SKIP: el constraint check (amount > 0) en treasury_movements
                # bloquea estas filas. Son 2 filas histor (saldo inicial + recibo anulado).
                continue

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

            # Filas con "Transacción = ID TRX N" son lados de transferencias
            # entre cuentas o de operaciones FX. La clasificación final (transfer /
            # fx_operation / anomaly_solo) se hace en un segundo pass agrupando
            # por trx_id. Acá solo dejamos un placeholder y limpiamos sub_id.
            trx = row.get("Transacción", "").strip()
            is_grouped = bool(trx)
            if is_grouped:
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
                        # Fallback 1: solo last_name (caso CORDARY sin firstname en CSV)
                        last_norm = normalize(parsed["last_name"])
                        for (ln, fn), members_in_key in members_by_name.items():
                            if ln == last_norm:
                                member_candidates.extend(members_in_key)
                    if not member_candidates and not parsed["last_name"] and parsed["first_name"]:
                        # Fallback 2: regex devolvió solo first_name (caso "CTR 119: ...:  Edith"
                        # con doble espacio antes del nombre, sin apellido). Buscar por
                        # first_name solo (Edith JONDOE ya existe en DB).
                        first_norm = normalize(parsed["first_name"])
                        for (ln, fn), members_in_key in members_by_name.items():
                            if fn == first_norm:
                                member_candidates.extend(members_in_key)
                                summary["edith_jondoe_fallback_used"] += 1
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
                        if not eligible and d:
                            # Fallback: any contract that touches the year of d
                            year_start = date(d.year, 1, 1)
                            year_end = date(d.year, 12, 31)
                            for m in member_candidates:
                                for c in contracts_by_member.get(m["id"], []):
                                    start = date.fromisoformat(c["start_date"])
                                    end = date.fromisoformat(c["end_date"]) if c.get("end_date") else date(9999, 12, 31)
                                    if start <= year_end and end >= year_start:
                                        eligible.append(c)
                        if not eligible:
                            year_key = f"{d.year if d else 'unknown'}: {contract_raw}"
                            summary.setdefault("contracts_no_coverage", Counter())[year_key] += 1
                        elif len(eligible) > 1:
                            # Pick the longest one covering the year as deterministic tie-breaker
                            eligible.sort(key=lambda c: (c["start_date"], c["end_date"] or "9999-12-31"))
                            staff_contract_id = eligible[0]["id"]
                            summary["contracts_ambiguous"][contract_raw] += 1
                        else:
                            staff_contract_id = eligible[0]["id"]

            # Cost centers — match exacto, fallback con sufijo " (DD-MM-YYYY)" del movimiento
            # (los 9 CECOs renombrados durante el alineamiento previo).
            cc_raw = row.get("Centro de Costo", "").strip()
            cc_ids = []
            for code, name in parse_cost_centers(cc_raw):
                norm_name = normalize(name)
                if norm_name in cecos_by_norm:
                    cc_ids.append(cecos_by_norm[norm_name]["id"])
                elif d:
                    # Fallback: probar con sufijo de fecha (CECOs con nombres dups que
                    # renombramos en el alineamiento previo)
                    suffixed = f"{name} ({d.strftime('%d-%m-%Y')})"
                    norm_suffixed = normalize(suffixed)
                    if norm_suffixed in cecos_by_norm:
                        cc_ids.append(cecos_by_norm[norm_suffixed]["id"])
                        summary["cecos_resolved_with_date_suffix"][name] += 1
                    else:
                        if norm_name not in cecos_seen_in_csv:
                            cecos_seen_in_csv[norm_name] = name
                        cc_ids.append(None)
                        summary["cecos_unknown"][f"{code or '?'}: {name}"] += 1
                else:
                    if norm_name not in cecos_seen_in_csv:
                        cecos_seen_in_csv[norm_name] = name
                    cc_ids.append(None)
                    summary["cecos_unknown"][f"{code or '?'}: {name}"] += 1

            # Actividad → club_activities.id (match directo por nombre normalizado)
            actividad_csv = row.get("Actividad", "").strip()
            activity_id = None
            if actividad_csv:
                activity_id = activities_by_norm.get(normalize(actividad_csv))
                if not activity_id:
                    summary["activities_unknown"][actividad_csv] += 1

            year_for_ext = d.year if d else "0000"
            # Caso especial: sub "Egreso/Ingreso e/cuentas" SIN TRX = huérfano.
            # Sin esto el rest-import los skipearia por subcategory_id=None.
            is_legacy_huerfano = (not is_grouped and sub_name in ('Egreso e/cuentas', 'Ingreso e/cuentas'))
            initial_kind = (
                "anomaly_solo" if is_legacy_huerfano
                else ("pending_grouped" if is_grouped else "movement")
            )
            initial_concept = row.get("Concepto", "").strip()
            if is_legacy_huerfano:
                initial_concept = f"[ANOMALIA: huérfano sub {sub_name!r} sin TRX] " + initial_concept

            rows_normalized.append({
                "csv_id": row_id,
                "external_id": f"IMP{year_for_ext}-{row_id}",
                "year": year_for_ext,
                # kind se reasigna en post-process: "movement" | "transfer" |
                # "fx_operation" | "anomaly_solo" según composición del grupo trx_id.
                "kind": initial_kind,
                "trx_id": trx if is_grouped else None,
                "movement_date": d.isoformat() if d else None,
                "account_csv": account_name_csv,
                "account_id": account_id,
                "category_csv": cat_name,
                "subcategory_csv": sub_name,
                "subcategory_id": sub_id,
                "movement_type_csv": mvtype,
                "currency": currency,
                "amount": amount,
                "concept": initial_concept,
                "contract_csv": contract_raw,
                "staff_contract_id": staff_contract_id,
                "cost_centers_csv": cc_raw,
                "cost_center_ids": cc_ids,  # may contain None for ones to-be-created
                "actividad_csv": actividad_csv,
                "activity_id": activity_id,
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

    # ── Clasificación de filas con Transacción (TRX groups) ────────────────
    # Agrupa por trx_id y asigna kind final: transfer / fx_operation / anomaly_solo.
    trx_groups = defaultdict(list)
    for r in rows_normalized:
        if r["kind"] == "pending_grouped":
            trx_groups[r["trx_id"]].append(r)

    classification_report = []  # para markdown report
    summary["trx_classification"] = {
        "transfer": 0, "transfer_multi_source": 0, "fx_operation": 0,
        "anomaly_solo": 0, "anomaly_pair_imbalanced": 0, "anomaly_imbalanced": 0,
        "anomaly_invalid_composition": 0,
    }

    for trx_id, members in trx_groups.items():
        n = len(members)
        currencies = {m["currency"] for m in members}
        types_in_group = [m["movement_type_csv"].lower() for m in members]
        egresos = [m for m in members if m["movement_type_csv"].lower() == "egreso"]
        ingresos = [m for m in members if m["movement_type_csv"].lower() == "ingreso"]

        if n == 1:
            # Anomalía: 1 fila sola sin contraparte
            r = members[0]
            r["kind"] = "anomaly_solo"
            r["concept"] = f"[ANOMALIA: {trx_id} sin contraparte] " + r["concept"]
            summary["trx_classification"]["anomaly_solo"] += 1
            classification_report.append({
                "trx_id": trx_id, "kind": "anomaly_solo", "rows": n,
                "detail": f"1 fila ({egresos[0]['movement_type_csv'] if egresos else ingresos[0]['movement_type_csv']}) {members[0]['account_csv']} ${members[0]['amount']}",
            })
        elif (n == 2 and len(egresos) == 1 and len(ingresos) == 1
              and egresos[0]["amount"] == ingresos[0]["amount"]
              and egresos[0]["currency"] == ingresos[0]["currency"]
              and egresos[0]["account_id"] != ingresos[0]["account_id"]):
            # Transferencia normal: par ARS↔ARS (o USD↔USD) simétrico
            transfer_uuid_seed = trx_id  # usado por rest-import.py via uuid5
            for r in members:
                r["kind"] = "transfer"
                r["transfer_seed"] = transfer_uuid_seed
            summary["trx_classification"]["transfer"] += 1
            classification_report.append({
                "trx_id": trx_id, "kind": "transfer", "rows": 2,
                "detail": f"{egresos[0]['account_csv']} → {ingresos[0]['account_csv']} ${egresos[0]['amount']} {egresos[0]['currency']}",
            })
        elif (n == 2 and len(egresos) == 1 and len(ingresos) == 1
              and len(currencies) == 1
              and egresos[0]["amount"] != ingresos[0]["amount"]
              and egresos[0]["account_id"] != ingresos[0]["account_id"]):
            # Par 2 filas misma moneda con montos distintos (ej: comisión bancaria
            # mezclada). Importar como 2 movs sueltos con flag, sin transfer_group.
            for r in members:
                r["kind"] = "anomaly_pair_imbalanced"
                r["concept"] = f"[ANOMALIA: {trx_id} montos desbalanceados Δ${abs(egresos[0]['amount'] - ingresos[0]['amount'])}] " + r["concept"]
            summary["trx_classification"]["anomaly_pair_imbalanced"] += 1
            classification_report.append({
                "trx_id": trx_id, "kind": "anomaly_pair_imbalanced", "rows": 2,
                "detail": f"e={egresos[0]['account_csv']} ${egresos[0]['amount']} → i={ingresos[0]['account_csv']} ${ingresos[0]['amount']} (Δ${abs(egresos[0]['amount']-ingresos[0]['amount'])})",
            })
        elif (n >= 3 and len(egresos) >= 1 and len(ingresos) == 1
              and len(currencies) == 1
              and abs(sum(e["amount"] for e in egresos) - ingresos[0]["amount"]) < 0.01
              and ingresos[0]["account_id"] not in {e["account_id"] for e in egresos}):
            # Multi-source transfer: ≥2 egresos + 1 ingreso, mismo currency, suma OK,
            # target distinto de todos los sources. account_transfer.source_account_id
            # = primera cuenta egreso; movs hijos preservan account_id individual.
            for r in members:
                r["kind"] = "transfer_multi_source"
                r["transfer_seed"] = trx_id
            summary["trx_classification"]["transfer_multi_source"] += 1
            classification_report.append({
                "trx_id": trx_id, "kind": "transfer_multi_source", "rows": n,
                "detail": (f"{len(egresos)} egresos ${sum(e['amount'] for e in egresos)} "
                           f"{egresos[0]['currency']} → {ingresos[0]['account_csv']} "
                           f"${ingresos[0]['amount']}"),
            })
        elif len(egresos) >= 1 and len(ingresos) == 1 and len(currencies) >= 2:
            # FX: egreso(s) ARS + 1 ingreso USD (o viceversa). source = primer egreso,
            # target = ingreso, source_amount = SUM(egresos), target_amount = ingreso.
            source_total = sum(e["amount"] for e in egresos)
            ingreso = ingresos[0]
            fx_seed = trx_id
            for r in members:
                r["kind"] = "fx_operation"
                r["fx_seed"] = fx_seed
                r["fx_source_account_id"] = egresos[0]["account_id"]
                r["fx_target_account_id"] = ingreso["account_id"]
                r["fx_source_amount"] = source_total
                r["fx_target_amount"] = ingreso["amount"]
            summary["trx_classification"]["fx_operation"] += 1
            classification_report.append({
                "trx_id": trx_id, "kind": "fx_operation", "rows": n,
                "detail": (f"{len(egresos)} egreso(s) ${source_total} {egresos[0]['currency']} → "
                           f"{ingreso['account_csv']} ${ingreso['amount']} {ingreso['currency']}"),
            })
        elif (n >= 3 and len(egresos) >= 1 and len(ingresos) == 1
              and len(currencies) == 1
              and abs(sum(e["amount"] for e in egresos) - ingresos[0]["amount"]) >= 0.01):
            # Multi-source asimétrico (suma egresos ≠ ingreso) — anomalía.
            delta = sum(e["amount"] for e in egresos) - ingresos[0]["amount"]
            for r in members:
                r["kind"] = "anomaly_imbalanced"
                r["concept"] = f"[ANOMALIA: {trx_id} suma egresos ≠ ingreso (Δ${abs(delta)})] " + r["concept"]
            summary["trx_classification"]["anomaly_imbalanced"] += 1
            classification_report.append({
                "trx_id": trx_id, "kind": "anomaly_imbalanced", "rows": n,
                "detail": f"egresos ${sum(e['amount'] for e in egresos)} vs ingreso ${ingresos[0]['amount']} (Δ${abs(delta)})",
            })
        else:
            # Composición inválida (ej: 2 ingresos sin egreso, 2 egresos sin ingreso).
            # Posibles errores de carga histórica del CSV. Se importan como movs
            # sueltos con flag para revisión manual.
            for r in members:
                r["kind"] = "anomaly_invalid_composition"
                r["concept"] = (
                    f"[ANOMALIA: {trx_id} composición inválida n={n} "
                    f"egresos={len(egresos)} ingresos={len(ingresos)}] "
                    + r["concept"]
                )
            summary["trx_classification"]["anomaly_invalid_composition"] += 1
            classification_report.append({
                "trx_id": trx_id, "kind": "anomaly_invalid_composition", "rows": n,
                "detail": (f"n={n} egresos={len(egresos)} ingresos={len(ingresos)} "
                           f"currencies={currencies}"),
            })

    # Re-write JSON normalizado con kinds resueltos
    norm_path_tmp = OUT / "all_normalized.json"

    # Convert Counters to dicts for JSON
    for k, v in list(summary.items()):
        if isinstance(v, Counter):
            summary[k] = dict(v)

    summary_path = OUT / "all_summary.json"
    summary_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False, default=str))
    norm_path = OUT / "all_normalized.json"
    norm_path.write_text(json.dumps(rows_normalized, indent=2, ensure_ascii=False, default=str))

    # Markdown report de clasificación TRX
    report_path = OUT / "all_classification_report.md"
    lines = ["# Clasificación de grupos TRX — CSV all", ""]
    lines.append(f"Total grupos: {len(trx_groups)}\n")
    lines.append(f"- transfer: **{summary['trx_classification']['transfer']}**")
    lines.append(f"- fx_operation: **{summary['trx_classification']['fx_operation']}**")
    lines.append(f"- anomaly_solo: **{summary['trx_classification']['anomaly_solo']}**\n")
    for kind in ("anomaly_solo", "fx_operation", "transfer"):
        items = [c for c in classification_report if c["kind"] == kind]
        if not items: continue
        lines.append(f"## {kind} ({len(items)} grupos)\n")
        for it in items[:200]:
            lines.append(f"- **{it['trx_id']}** ({it['rows']} filas): {it['detail']}")
        lines.append("")
    report_path.write_text("\n".join(lines))

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
    nc = summary.get("contracts_no_coverage", {})
    print(f"\nContracts NO_COVERAGE ({sum(nc.values())} rows):")
    for c, n in sorted(nc.items(), key=lambda x: -x[1])[:30]:
        print(f"  {n:5}  {c}")
    print(f"\nContracts AMBIGUOUS ({sum(summary['contracts_ambiguous'].values())} rows):")
    for c, n in sorted(summary["contracts_ambiguous"].items(), key=lambda x: -x[1])[:20]:
        print(f"  {n:5}  {c}")
    print(f"\nCost centers TO CREATE ({len(summary['cecos_to_create'])}):")
    for c in summary["cecos_to_create"]:
        print(f"  - {c}")
    print(f"\nCost centers RESOLVED via date suffix ({len(summary['cecos_resolved_with_date_suffix'])}):")
    for c, n in summary["cecos_resolved_with_date_suffix"].items():
        print(f"  {n:5}  {c}")
    print(f"\nActivities UNKNOWN ({sum(summary['activities_unknown'].values())} rows):")
    for a, n in summary["activities_unknown"].items():
        print(f"  {n:5}  {a}")
    print(f"\nEdith JONDOE fallback used (filas resueltas por first_name only): {summary['edith_jondoe_fallback_used']}")

    print(f"\nTRX classification: {summary['trx_classification']}")
    print(f"\nOutput:\n  {summary_path}\n  {norm_path}\n  {report_path}")


if __name__ == "__main__":
    main()
