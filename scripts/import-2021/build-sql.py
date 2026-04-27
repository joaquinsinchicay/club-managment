#!/usr/bin/env python3
"""
Genera los archivos SQL para importar el CSV "Movimientos-Grid View (1).csv"
al club activo. Los archivos se guardan en scripts/import-2021/out/ y se aplican
luego vía MCP execute_sql en lotes.

Salidas:
  out/01-sessions.sql      — sesiones mensuales cerradas para cuentas secretaría
  out/02-saldos.sql        — 5 movimientos de saldo inicial
  out/03-fx.sql            — 5 operaciones FX (TRX 1, 2, 4, 6, 7) + 10 movimientos
  out/04-transfers.sql     — 2 transferencias entre cuentas (TRX 5, 10) + 4 movs
  out/05-movements.sql     — el resto (~2099 movimientos)
  out/report.json          — totales esperados, mappings aplicados, skips

Convenciones:
  · Cada movimiento del CSV recibe external_id = "IMP2021-<id_csv>".
  · Movimientos con cuenta scope=secretaria → daily_cash_session_id por mes.
  · Movimientos con cuenta scope=tesoreria → daily_cash_session_id NULL.
  · Movimientos con campo Contrato → staff_contract_id resuelto via mapping.
  · Status='posted' para todos.
"""

import csv
import json
import os
import re
import uuid
from datetime import date, datetime, timedelta
from pathlib import Path

# UUIDs deterministicos basados en el ID del CSV / clave estable
NS = uuid.UUID("a3f1c8d2-7b4e-49d0-a5f6-e91d27c8b1a3")
def stable_uuid(key: str) -> str:
    return str(uuid.uuid5(NS, key))

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "out"
OUT.mkdir(exist_ok=True)

CSV_PATH = Path("/Users/joaquin/Downloads/Movimientos-Grid View (1).csv")

# ============================================================
# LOOKUPS (volcado de la DB - tomados via MCP execute_sql)
# ============================================================

CLUB_ID = "be7b2a37-fcb8-46fe-961c-0ba190bcda7e"

# Mapeo CSV cuenta name → DB account
ACCOUNT_NAME_MAP = {
    "Secretaría":              "Efectivo Secretaria",
    "Galicia":                 "Galicia",
    "Tarjeta Clubes en Obra":  "Tarjeta Clubes en Obra",
    "Presidencia":             "Presidencia",
    "Mercado Pago":            "Mercado Pago",
}

ACCOUNTS = {
    "Galicia":                {"id": "7a3c03ad-235a-46bb-9817-c964a74219af", "scope": "tesoreria"},
    "Efectivo Secretaria":    {"id": "5eac36ed-6ac0-4860-9f49-0ecc168f47a0", "scope": "secretaria"},
    "Efectivo Tesoreria":     {"id": "77c74694-119d-45f5-b984-4b5824b5f4e5", "scope": "tesoreria"},
    "Mercado Pago":           {"id": "d019a10e-716a-452b-9a67-63ad6898d6c8", "scope": "secretaria"},
    "Tarjeta Clubes en Obra": {"id": "a8c09446-47b6-432b-a881-3234f1e1319c", "scope": "tesoreria"},
    "Presidencia":            {"id": "985c432f-5cb2-4552-8716-1c1ad9f966f5", "scope": "secretaria"},
}

# Mapeo CSV sub_categoría → DB category id
CATEGORIES = {
    "Impuestos": "f5ca26c9-e62a-43c9-8306-b26aacb36daf",
    "Mantenimiento": "1edf922b-76cc-40be-b243-80a8ee892563",
    "Comisiones": "62387c5e-99dc-41cd-93d8-f9c7b31b77d5",
    "Insumos de oficina": "80a6593c-1fd4-4f1c-a392-0bba10f065ee",
    "Reuniones de comisión": "10aa133d-10d1-4e50-9800-72b8f5bbc0c4",
    "Software": "a1c0f547-e7c5-4237-ae54-306e87ee0cc3",
    "Ajustes contables": "aa6d2f50-baa0-44a2-bcdb-3a5d91a1b451",
    "Devolución": "2cdb2ad2-2ed7-423f-8d42-66e1d428b9d7",
    "Errores operativos": "7ea28ee9-4141-4b6a-bc8f-5a00b1d180a0",
    "Reversiones": "4c531a23-adb5-4ee9-83f2-8d55ac2682d9",
    "Árbitros": "cafe85a9-ec15-4de3-84ec-b2e6e162911a",
    "Compra de indumentaria": "1546042c-ca0f-4447-8232-c66c59f1cef4",
    "Ligas": "cbdb172b-0dad-414a-878b-c3a1c26a9b70",
    "Material deportivo": "6bcba724-6380-4136-87f4-9265cc927e47",
    "Multas": "34f8bac4-49b3-4b9c-845c-4faca3d677f7",
    "Alquiler de espacios": "2aa33eb9-365c-480c-9ca1-16d561731b5e",
    "Buffet": "720b64fa-3686-44bd-a548-36680fbeca29",
    "Entradas": "be068dc7-2c63-4c91-8e76-603fb14a5a40",
    "Gastos de evento": "674ada51-996b-4808-8d45-ae85a7ebf672",
    "Rifas": "197edd27-d80c-4e2e-a15f-50654c3002ca",
    "Comisiones bancarias": "fde4c6e5-a556-4f90-9048-f4dd6ee9c32a",
    "Devolución de préstamos": "b5f3729f-b32b-4be4-bd63-7e6ac72a1188",
    "Intereses ganados": "da31bb09-c725-45c3-8d31-a422a0651995",
    "Préstamos recibidos": "cf087f96-cd08-4ff7-a3dc-13ba85efe3ee",
    "Certificaciones": "4342a0b6-98d1-4949-b93c-9ef50c2a9fa5",
    "Honorarios profesionales": "3b0ab585-0edb-40c9-816c-741c1a55f8ba",
    "Alquiler": "ecfcb968-6ccb-4fdb-8fd9-245fb10fcb42",
    "Obras": "78b2d224-2922-49d8-b9ad-bfe69cae7a14",
    "Publicidad": "06c2ef6d-5479-439c-b632-2d28528eca29",
    "Sponsoreo": "4e779a9f-ab40-43b4-846c-dd2d504145e4",
    "Venta de indumentaria": "cde0e4d4-a63f-4e56-a61d-a3d273086af0",
    "Donaciones": "42498831-2a63-4225-9684-de90ce47343e",
    "Otros ingresos": "5c43e220-2443-4e20-916a-e7ad1042b2e2",
    "Subsidios": "3437f3aa-4db9-4b7e-842a-3302558cded7",
    "Cuotas/Fichajes": "db35b206-eeb6-43e6-85aa-f65f9b2a51b1",
    "Tecnología": "c09ac17d-9756-4d79-b24d-359f3cc0ca00",
    "Cargas sociales": "9534befb-80f8-4d17-b020-fda61c9d325d",
    "Sueldos": "0e092ee7-c21d-49ae-a694-fd68a9ffefc1",
    "Viáticos": "61f7d3a4-ac0e-48b4-9839-01e1027aa193",
    "Saldo": "abd50d14-b1a3-4f64-8ecf-236723972f0a",
    "Desratización y fumigación": "aededfa2-ba04-4d1f-916f-c4da3c568efc",
    "Limpieza": "8d2a748c-ab93-497a-b0ff-8ab9aa9c355f",
    "Medicina": "7dc00913-4165-4b5d-b502-20954023b5c7",
    "Seguridad": "0cd98e33-0cb5-40e6-b35b-380b78ed521d",
    "Seguros": "9a9c8b25-2d02-40d7-998c-42cbe81d207d",
    "Gas": "24a4e89d-99e6-4fbe-bc29-6eae1f804d74",
    "Luz": "32bfc3bc-d399-499d-ad48-3bd20876ea22",
    "Agua": "639dada2-a7ed-4c49-a0e3-35660351c182",
    "Internet": "72603da6-3180-46e8-9152-052b145cece7",
    "Telefonía": "ec750978-c7ff-483a-b111-e7d66b7151d1",
}

# CSV "FEFI" → "FEFI 1er Tira"; CSV "Promo" → "Promo 1er Tira"
ACTIVITY_NAME_MAP = {
    "Futsal AFA":  "Futsal AFA",
    "FEFI":        "FEFI 1er Tira",
    "Futsal Masc.":"Futsal Masc.",
    "Escuelita":   "Escuelita",
    "Futsal Fem.": "Futsal Fem.",
    "Promo":       "Promo 1er Tira",
}

ACTIVITIES = {
    "Boxeo": "978460ad-58bc-49ee-b2d3-111aff2573ca",
    "Escuelita": "78a5e568-22db-486e-9bb4-0bf4ac066067",
    "FEFI 1er Tira": "0b3a1b0e-f5d0-4453-ac2b-0a89d7eea7b4",
    "FEFI 2da Tira": "acb6e82a-0e74-48fb-9fde-418829948fa5",
    "Futsal AFA": "b5af6729-00b7-49fc-80b1-1753dd208ce9",
    "Futsal Fem.": "2744454b-5ab0-4c7a-b903-e092fec31e66",
    "Futsal Masc.": "2af3a461-1462-49fa-be02-1654e02cc43c",
    "Promo 1er Tira": "36d01ade-5293-4ca3-8cb0-d4cae4419512",
    "Promo 2da Tira": "66550e13-2713-4c92-8b41-7ebd3a047fff",
    "Veteranos": "73988d5a-804f-4a69-b17a-5b6992106291",
    "Entrenamiento Funcional": "7f108935-036f-44fc-9482-542163c5648d",
    "Full Body": "1b781f40-660d-41c9-8cf8-278616b40413",
    "General": "bb134524-0077-46b8-a6a2-ed88fd305a41",
}

# CSV "CC-N: Texto" → DB cost_center name
CC_NAME_MAP = {
    "CC-1: Presupuesto 1ra AFA":        "1ra AFA",
    "CC-7: Hernan Perez":               "Hernan Perez",
    "CC-14: Prestamo Horacio Jimenez":  "Préstamo Horacio Jimenez",
    "CC-50: Fiesta fin de año '21":     "Fiesta fin de año '21",
}

COST_CENTERS = {
    "1ra AFA": "b3985d89-9745-4c3a-a337-84f81f2d3709",
    "Fiesta fin de año '21": "b5389262-a46d-4cd4-a768-8acc9b551bbc",
    "Hernan Perez": "168b7ab4-8b14-42f3-badd-6406fca541c1",
    "Préstamo Horacio Jimenez": "eba6d030-8919-4fd6-906f-bfb3ee0b1c8c",
}

# Mapping EMP-N (extraído del campo Contrato) → staff_contract_id
EMP_TO_CONTRACT = {
    # 23 con DNI PEND-N (1 contrato cada uno → único)
    "EMP-1":  "da612de6-f786-4cf3-acd4-86ad634aa8c5",   # AMAS Marcela
    "EMP-6":  "604f5529-f7bb-476d-9ca5-d9c54079046d",   # CANEPA Gustavo
    "EMP-7":  "f102a606-ee48-4921-b440-fcf3d66a51ad",   # GONZALEZ Danel
    "EMP-9":  "849b3d85-fd61-44df-bc1e-2d0b0b503fc2",   # CHIRINO Juan
    "EMP-18": "99752900-0901-44c5-8fcd-ab7243e52826",   # IANNONE Franco
    "EMP-33": "e55345f2-e1ed-4364-9208-e0faea109724",   # MACRI Matias
    "EMP-54": "df9b1324-d4f4-47d8-ab5a-bd15f8d88c79",   # ROLDÁN Facundo
    "EMP-56": "9e290c48-b3ae-4cff-aadf-3c70cfd8bee0",   # SEGOVIA Angel
    "EMP-58": "3b1d2ab6-b966-418f-a669-6fb620f42fe8",   # PUCHETA Roman
    "EMP-59": "67068fc0-96ac-448f-a27b-5c4ac70139d3",   # MONTAÑA Alejo
    "EMP-60": "edb47437-aa62-4d82-a07f-256257c1b6bf",   # MICELI Lucas
    "EMP-61": "d75ae58e-27c9-4e3a-b960-2cf036090a37",   # TORREJÓN Diego
    "EMP-62": "44967dd5-d739-4ba6-9a9d-4b4e50fe167d",   # DI RICO Gastón
    "EMP-63": "4a7e85f3-8dee-47ea-a530-7e5186d95514",   # MONROIG Matias
    "EMP-64": "1a3fe0e3-8ecd-466b-a02e-af51b0a71f59",   # LUGO Claudio
    "EMP-65": "f951d3b6-32e3-4f30-b06f-30dc36d8bbba",   # GARCIA Pablo
    "EMP-66": "780dcfb7-1db9-4cb8-ba7f-3e3afd7a63ea",   # BIANCO José
    "EMP-67": "3d6159d0-5478-4161-a252-4a4a7eec3f3f",   # RODRIGUEZ Federico
    "EMP-69": "9206691b-5208-4a53-8094-cee9a46f658b",   # MALDONADO Pablo
    "EMP-71": "69ab7646-7183-4a6e-b503-d1963766572e",   # ALVAREZ Matias
    "EMP-72": "206eaf97-8e95-46f3-adf7-373190a2283e",   # FRAGA Maximiliano
    "EMP-73": "ddb1dc45-042f-46b2-9624-0644635d0629",   # PERELMAN Lucas
    "EMP-75": "55360e71-c0c6-49ba-abd2-58f5f8b06b0c",   # FRANCO Mauricio
    # 3 desambiguados manualmente
    "EMP-3":  "6d4d1cc0-b583-4d4a-8b4b-31556834bbeb",   # LANSORENA Gabriela
    "EMP-16": "95dc51fa-d8a6-4805-98dd-371465a7151c",   # NUÑEZ German DT 2019-06→2024-11
    "EMP-41": "f8309b2c-3942-4ec5-bdac-1c6e366e751a",   # PISERA Ariel DT FEFI
    "EMP-68": "640b0366-c8e5-48d9-903e-21cc47e3f7ef",   # EBORALL Emiliano 2021-01→2021-12
    # 3 históricos creados (Opción A)
    "EMP-8":  "679793db-8f6a-4456-be57-f4968a07a0b8",   # MARGELI Felipe
    "EMP-70": "adc91f0e-1239-4b9b-97f6-1ea464be9c55",   # CARRACEDO Tomás
    "EMP-74": "c9cae203-a97f-4b7d-a508-385df3b736ec",   # LAS HERAS Juan Manuel
}

# ============================================================
# HELPERS
# ============================================================

def parse_date(s):
    return datetime.strptime(s.strip(), "%d/%m/%Y").date()

def parse_amount(s):
    s = s.strip().lstrip("$").replace(".", "").replace(",", ".")
    return float(s)

def sql_str(s):
    if s is None:
        return "NULL"
    return "'" + s.replace("'", "''") + "'"

def sql_uuid(u):
    return "'" + u + "'::uuid" if u else "NULL"

def parse_contract(s):
    """CTR 7: EMP-2020-7: GONZALEZ Danel → 'EMP-7'"""
    if not s:
        return None
    m = re.match(r"CTR\s+\d+:\s+EMP-\d{4}-(\d+):", s)
    return ("EMP-" + m.group(1)) if m else None

def csv_to_movement_type(csv_type):
    # Saldo se modela como ingreso (treasury_movements.movement_type solo tiene
    # ingreso/egreso). La categoría "Saldo" diferencia el caso.
    return {"Ingreso": "ingreso", "Egreso": "egreso", "Saldo": "ingreso"}[csv_type]

# ============================================================
# LOAD CSV
# ============================================================

with CSV_PATH.open(encoding="utf-8") as f:
    rows = list(csv.DictReader(f))

# Normalizar BOM en primer key
if rows and "﻿ID" in rows[0]:
    rows = [{k.lstrip("﻿"): v for k, v in r.items()} for r in rows]

print(f"Loaded {len(rows)} rows")

# ============================================================
# ETAPA 1: Sesiones mensuales (1 por mes, scope=club, status=closed)
# ============================================================

SESSIONS = {}  # "YYYY-MM" → uuid (sesiones por mes, scope club)
sql_sessions = []
sql_sessions.append("-- Sesiones mensuales cerradas (1 por mes, scope club).")
sql_sessions.append("-- session_date = primer día del mes; status=closed; close_type=manual.\n")

# Detectar meses usados en CSV (excluyendo saldos)
months_used = set()
for r in rows:
    if r["Sub Categoría"].strip() == "Saldo":
        continue
    d = parse_date(r["Fecha"])
    months_used.add((d.year, d.month))

for (year, month) in sorted(months_used):
    first_day = date(year, month, 1)
    if month == 12:
        last_day = date(year, 12, 31)
    else:
        last_day = date(year, month + 1, 1) - timedelta(days=1)
    session_id = stable_uuid(f"session-{year:04d}-{month:02d}")
    SESSIONS[f"{year:04d}-{month:02d}"] = session_id
    sql_sessions.append(
        f"INSERT INTO public.daily_cash_sessions (id, club_id, session_date, status, opened_at, closed_at, close_type) "
        f"VALUES ({sql_uuid(session_id)}, {sql_uuid(CLUB_ID)}, '{first_day}', "
        f"'closed'::session_status, '{first_day} 00:00:00', '{last_day} 23:59:59', 'manual'::session_close_type);"
    )

(OUT / "01-sessions.sql").write_text("\n".join(sql_sessions) + "\n")
print(f"01-sessions.sql: {len(SESSIONS)} sessions")

# ============================================================
# ETAPA 2: Saldos iniciales
# ============================================================

sql_saldos = []
sql_saldos.append("-- Saldos iniciales (movimientos categoría 'Saldo')\n")
saldos_count = 0
saldos_skipped = []
for r in rows:
    if r["Sub Categoría"].strip() != "Saldo":
        continue
    csv_id = r["ID"].strip()
    fecha = parse_date(r["Fecha"])
    cuenta_csv = r["Cuenta"].strip()
    cuenta_db = ACCOUNT_NAME_MAP[cuenta_csv]
    account_id = ACCOUNTS[cuenta_db]["id"]
    is_secretaria = ACCOUNTS[cuenta_db]["scope"] == "secretaria"
    session_id = SESSIONS.get(f"{fecha.year:04d}-{fecha.month:02d}") if is_secretaria else None
    amount = parse_amount(r["Importe"])
    if amount <= 0:
        saldos_skipped.append({"id": csv_id, "cuenta": cuenta_db, "amount": amount, "reason": "amount<=0 (constraint amount>0)"})
        continue
    concept = r["Concepto"].strip() or "Saldo inicial"
    moneda = r["Moneda"].strip()
    movement_id = stable_uuid(f"movement-IMP2021-{csv_id}")
    display_id = f"IMP2021-{csv_id}"
    sql_saldos.append(
        f"INSERT INTO public.treasury_movements ("
        f"id, display_id, club_id, origin_role, origin_source, daily_cash_session_id, account_id, "
        f"movement_type, category_id, concept, currency_code, amount, movement_date, status, external_id"
        f") VALUES ("
        f"{sql_uuid(movement_id)}, {sql_str(display_id)}, {sql_uuid(CLUB_ID)}, "
        f"'tesoreria'::movement_origin_role, 'manual'::movement_origin_source, "
        f"{sql_uuid(session_id)}, {sql_uuid(account_id)}, "
        f"'ingreso'::movement_type, {sql_uuid(CATEGORIES['Saldo'])}, "
        f"{sql_str(concept)}, {sql_str(moneda)}, {amount}, '{fecha}', "
        f"'posted'::movement_status, {sql_str(f'IMP2021-{csv_id}')}"
        f");"
    )
    saldos_count += 1
(OUT / "02-saldos.sql").write_text("\n".join(sql_saldos) + "\n")
print(f"02-saldos.sql: {saldos_count} saldos")

# ============================================================
# ETAPA 3 + 4: Pares ID TRX X (FX y transferencias)
# ============================================================

FX_TRX_IDS = {"ID TRX 1", "ID TRX 2", "ID TRX 4", "ID TRX 6", "ID TRX 7"}
TRANSFER_TRX_IDS = {"ID TRX 5", "ID TRX 10"}
SPECIAL_TRX_IDS = FX_TRX_IDS | TRANSFER_TRX_IDS | {"ID TRX 3", "ID TRX 8", "ID TRX 9"}

# Group rows by TRX id
groups = {}
for r in rows:
    trx = (r["Transacción"] or "").strip()
    if trx:
        groups.setdefault(trx, []).append(r)

def emit_movement_sql(r, *, transfer_group_id=None, fx_operation_group_id=None,
                     override_movement_type=None, override_category_id=None,
                     override_concept=None):
    """Emite UN INSERT INTO treasury_movements basado en una row del CSV."""
    csv_id = r["ID"].strip()
    fecha = parse_date(r["Fecha"])
    cuenta_csv = r["Cuenta"].strip()
    cuenta_db = ACCOUNT_NAME_MAP[cuenta_csv]
    account_id = ACCOUNTS[cuenta_db]["id"]
    is_secretaria = ACCOUNTS[cuenta_db]["scope"] == "secretaria"
    session_id = SESSIONS.get(f"{fecha.year:04d}-{fecha.month:02d}") if is_secretaria else None
    amount = parse_amount(r["Importe"])
    concept = override_concept if override_concept is not None else (r["Concepto"].strip() or "")
    moneda = r["Moneda"].strip()
    movement_id = stable_uuid(f"movement-IMP2021-{csv_id}")
    display_id = f"IMP2021-{csv_id}"

    sub_categoria = r["Sub Categoría"].strip()
    category_id = override_category_id or CATEGORIES.get(sub_categoria)
    movement_type = override_movement_type or csv_to_movement_type(r["Tipo de movimiento (From SubCat)"].strip())

    actividad = r["Actividad"].strip()
    activity_id = ACTIVITIES.get(ACTIVITY_NAME_MAP.get(actividad)) if actividad else None
    recibo = r["Recibo"].strip() or None
    contrato = r["Contrato"].strip()
    staff_contract_id = EMP_TO_CONTRACT.get(parse_contract(contrato)) if contrato else None

    cols = ["id", "display_id", "club_id", "origin_role", "origin_source",
            "daily_cash_session_id", "account_id", "movement_type", "category_id",
            "concept", "currency_code", "amount", "movement_date", "status",
            "external_id", "receipt_number", "activity_id", "staff_contract_id",
            "transfer_group_id", "fx_operation_group_id"]
    vals = [
        sql_uuid(movement_id),
        sql_str(display_id),
        sql_uuid(CLUB_ID),
        "'tesoreria'::movement_origin_role",
        "'manual'::movement_origin_source",
        sql_uuid(session_id),
        sql_uuid(account_id),
        f"'{movement_type}'::movement_type",
        sql_uuid(category_id) if category_id else "NULL",
        sql_str(concept),
        sql_str(moneda),
        f"{amount}",
        f"'{fecha}'",
        "'posted'::movement_status",
        sql_str(f"IMP2021-{csv_id}"),
        sql_str(recibo),
        sql_uuid(activity_id) if activity_id else "NULL",
        sql_uuid(staff_contract_id) if staff_contract_id else "NULL",
        sql_uuid(transfer_group_id) if transfer_group_id else "NULL",
        sql_uuid(fx_operation_group_id) if fx_operation_group_id else "NULL",
    ]
    sql_movs = (
        f"INSERT INTO public.treasury_movements ({', '.join(cols)}) VALUES ({', '.join(vals)});"
    )
    cc_csv = r["Centro de Costo"].strip()
    sql_cc = []
    if cc_csv:
        for part in cc_csv.split(","):
            part = part.strip()
            cc_db_name = CC_NAME_MAP.get(part)
            if cc_db_name and cc_db_name in COST_CENTERS:
                cc_id = COST_CENTERS[cc_db_name]
                sql_cc.append(
                    f"INSERT INTO public.treasury_movement_cost_centers (movement_id, cost_center_id) "
                    f"VALUES ({sql_uuid(movement_id)}, {sql_uuid(cc_id)});"
                )
    return [sql_movs] + sql_cc, movement_id

# 3) FX
sql_fx = []
sql_fx.append("-- Operaciones FX (pares ID TRX 1, 2, 4, 6, 7)\n")
fx_count = 0
for trx_id in sorted(FX_TRX_IDS, key=lambda s: int(s.split()[-1])):
    pair = groups[trx_id]
    egreso = next(r for r in pair if r["Tipo de movimiento (From SubCat)"].strip() == "Egreso")
    ingreso = next(r for r in pair if r["Tipo de movimiento (From SubCat)"].strip() == "Ingreso")
    fx_id = stable_uuid(f"fx-{trx_id}")
    src_acc = ACCOUNTS[ACCOUNT_NAME_MAP[egreso["Cuenta"].strip()]]["id"]
    tgt_acc = ACCOUNTS[ACCOUNT_NAME_MAP[ingreso["Cuenta"].strip()]]["id"]
    sql_fx.append(
        f"INSERT INTO public.fx_operations (id, club_id, source_account_id, target_account_id, "
        f"source_amount, target_amount) VALUES ("
        f"{sql_uuid(fx_id)}, {sql_uuid(CLUB_ID)}, {sql_uuid(src_acc)}, {sql_uuid(tgt_acc)}, "
        f"{parse_amount(egreso['Importe'])}, {parse_amount(ingreso['Importe'])});"
    )
    for r in pair:
        movs, _ = emit_movement_sql(r, fx_operation_group_id=fx_id,
                                    override_category_id=None,
                                    override_concept=r["Concepto"].strip())
        sql_fx.extend(movs)
    fx_count += 1
(OUT / "03-fx.sql").write_text("\n".join(sql_fx) + "\n")
print(f"03-fx.sql: {fx_count} FX ops + {fx_count*2} movs")

# 4) Transferencias
sql_tr = []
sql_tr.append("-- Transferencias entre cuentas (pares ID TRX 5, 10)\n")
tr_count = 0
for trx_id in sorted(TRANSFER_TRX_IDS, key=lambda s: int(s.split()[-1])):
    pair = groups[trx_id]
    egreso = next(r for r in pair if r["Tipo de movimiento (From SubCat)"].strip() == "Egreso")
    ingreso = next(r for r in pair if r["Tipo de movimiento (From SubCat)"].strip() == "Ingreso")
    transfer_id = stable_uuid(f"transfer-{trx_id}")
    src_acc = ACCOUNTS[ACCOUNT_NAME_MAP[egreso["Cuenta"].strip()]]["id"]
    tgt_acc = ACCOUNTS[ACCOUNT_NAME_MAP[ingreso["Cuenta"].strip()]]["id"]
    sql_tr.append(
        f"INSERT INTO public.account_transfers (id, club_id, source_account_id, target_account_id, "
        f"currency_code, amount, concept) VALUES ("
        f"{sql_uuid(transfer_id)}, {sql_uuid(CLUB_ID)}, {sql_uuid(src_acc)}, {sql_uuid(tgt_acc)}, "
        f"{sql_str(egreso['Moneda'].strip())}, {parse_amount(egreso['Importe'])}, "
        f"{sql_str(egreso['Concepto'].strip())});"
    )
    for r in pair:
        movs, _ = emit_movement_sql(r, transfer_group_id=transfer_id,
                                    override_category_id=None,
                                    override_concept=r["Concepto"].strip())
        sql_tr.extend(movs)
    tr_count += 1
(OUT / "04-transfers.sql").write_text("\n".join(sql_tr) + "\n")
print(f"04-transfers.sql: {tr_count} transfers + {tr_count*2} movs")

# ============================================================
# ETAPA 5: Movimientos restantes (incluye TRX 3, 8, 9 re-clasificados)
# ============================================================

# Re-clasificación de singles:
#   TRX 3 → 2 ingresos a Galicia, conceptos distintos → categoría Cuotas/Fichajes
#   TRX 8 → 1 egreso de Secretaría → Sueldos (retira caja Pisera)
#   TRX 9 → 1 egreso de Galicia (transferencia a Marcela sin par) → Errores operativos

RECLASSIFY = {
    "ID TRX 3": (None, "Cuotas/Fichajes"),       # mantiene tipo
    "ID TRX 8": (None, "Sueldos"),
    "ID TRX 9": (None, "Errores operativos"),
}

sql_movs_chunks = []  # list of (filename, sqls)
current_chunk = []
chunk_idx = 1
CHUNK_SIZE = 200
all_movements_count = 0
skipped = []

for r in rows:
    sub_categoria = r["Sub Categoría"].strip()
    if sub_categoria == "Saldo":
        continue  # ya emitidos en etapa 2
    trx = (r["Transacción"] or "").strip()
    if trx in FX_TRX_IDS or trx in TRANSFER_TRX_IDS:
        continue  # ya emitidos en etapa 3 / 4

    override_cat_name = None
    if trx in RECLASSIFY:
        _, new_cat = RECLASSIFY[trx]
        override_cat_name = new_cat

    # Categoría
    cat_name = override_cat_name or sub_categoria
    if cat_name == "Egreso e/cuentas" or cat_name == "Ingreso e/cuentas":
        # row de transfer/fx no cubierta — saltar
        skipped.append({"id": r["ID"], "reason": "subcat e/cuentas no agrupada", "row": r})
        continue

    if cat_name not in CATEGORIES:
        skipped.append({"id": r["ID"], "reason": f"cat sin mapping: {cat_name}", "row": r})
        continue

    if parse_amount(r["Importe"]) <= 0:
        skipped.append({"id": r["ID"], "reason": "amount<=0 (constraint amount>0)", "concept": r["Concepto"]})
        continue

    cat_id = CATEGORIES[cat_name]
    movs, _ = emit_movement_sql(r, override_category_id=cat_id)
    current_chunk.extend(movs)
    all_movements_count += 1

    if len(current_chunk) >= CHUNK_SIZE:
        fname = f"05-movements-{chunk_idx:03d}.sql"
        (OUT / fname).write_text("\n".join(current_chunk) + "\n")
        sql_movs_chunks.append(fname)
        chunk_idx += 1
        current_chunk = []

if current_chunk:
    fname = f"05-movements-{chunk_idx:03d}.sql"
    (OUT / fname).write_text("\n".join(current_chunk) + "\n")
    sql_movs_chunks.append(fname)

print(f"05-movements: {all_movements_count} movs en {len(sql_movs_chunks)} chunks")
print(f"Skipped: {len(skipped)}")

# ============================================================
# REPORT
# ============================================================

(OUT / "report.json").write_text(json.dumps({
    "csv_total_rows": len(rows),
    "sessions_created": len(SESSIONS),
    "saldos_count": saldos_count,
    "saldos_skipped": saldos_skipped,
    "fx_operations": fx_count,
    "fx_movements": fx_count * 2,
    "transfers": tr_count,
    "transfer_movements": tr_count * 2,
    "regular_movements": all_movements_count,
    "skipped": skipped,
    "movement_chunks": sql_movs_chunks,
    "expected_total_movements": saldos_count + fx_count*2 + tr_count*2 + all_movements_count,
}, indent=2, ensure_ascii=False, default=str))

print("\nDONE.")
print(f"  Esperado: {saldos_count + fx_count*2 + tr_count*2 + all_movements_count} movs totales en treasury_movements")
