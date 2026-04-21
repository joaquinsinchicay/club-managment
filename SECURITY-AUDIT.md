# Security Audit – club-managment

**Generado:** 2026-04-20 (re-run con classifier fully patched)
**Fuente:** `vercel env ls production` (CLI autenticado) + `classify.py` con patrones POSTGRES + Supabase públicas
**Skill:** `security-audit-env`

> Alcance: 16 variables gestionadas del proyecto en Vercel. Las vars `VERCEL_*`, `TURBO_*`, `NX_DAEMON` que aparecían en el reporte anterior son inyectadas por la plataforma al build, no están almacenadas como env vars del proyecto → excluidas.

---

## Resumen ejecutivo

| Clasificación | Cantidad | Tipo actual dominante |
|---|---|---|
| 🔴 Crown jewel | **7** | ⚠ **Encrypted** (legacy) — migrar a `Sensitive` |
| 🟡 Semi-sensible | 2 | Encrypted |
| 🟢 Público | **4** | Encrypted (pero son valores públicos, OK) |
| ⚪ Revisar manual | **3** | Encrypted (metadata de conexión, no secretos) |

**Finding crítico:** Ninguna variable está marcada como `type: Sensitive`. Las 7 crown jewels están en `Encrypted`, lo que significa que **sus valores son recuperables desde el dashboard de Vercel** por cualquiera con acceso al team. Las vars `Sensitive` son write-only (una vez guardadas no se pueden leer, solo reemplazar).

---

## Tabla de variables

| Variable | Clasificación | Tipo actual | Rotar? | Cómo rotar |
|----------|---------------|-------------|--------|------------|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 🟡 semi_sensitive | Encrypted | Preventivo | Supabase → Settings → API (se regenera con el JWT Secret) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 🟢 public | Encrypted | No | — |
| `NEXT_PUBLIC_SUPABASE_URL` | 🟢 public | Encrypted | No | — |
| `POSTGRES_DATABASE` | ⚪ review_manual | Encrypted | No | Nombre de la DB (no secreto) |
| `POSTGRES_HOST` | ⚪ review_manual | Encrypted | No | Hostname (no secreto) |
| `POSTGRES_PASSWORD` | 🔴 **crown_jewel** | **Encrypted** ⚠ | **SÍ** | Supabase → Settings → Database → Reset password |
| `POSTGRES_PRISMA_URL` | 🔴 **crown_jewel** | **Encrypted** ⚠ | **SÍ** | Re-pullear desde Supabase tras rotar password |
| `POSTGRES_URL` | 🔴 **crown_jewel** | **Encrypted** ⚠ | **SÍ** | Re-pullear desde Supabase tras rotar password |
| `POSTGRES_URL_NON_POOLING` | 🔴 **crown_jewel** | **Encrypted** ⚠ | **SÍ** | Re-pullear desde Supabase tras rotar password |
| `POSTGRES_USER` | ⚪ review_manual | Encrypted | No | Usuario DB (no secreto) |
| `SUPABASE_ANON_KEY` | 🟡 semi_sensitive | Encrypted | Preventivo | Supabase → Settings → API |
| `SUPABASE_JWT_SECRET` | 🔴 **crown_jewel** | **Encrypted** ⚠ | **SÍ** | Supabase → Settings → API → JWT Secret → Roll (⚠ invalida todas las sesiones) |
| `SUPABASE_PUBLISHABLE_KEY` | 🟢 public | Encrypted | No | Nueva anon key (Supabase) — diseñada para exponerse al cliente |
| `SUPABASE_SECRET_KEY` | 🔴 **crown_jewel** | **Encrypted** ⚠ | **SÍ** | Supabase → Settings → API → Reset |
| `SUPABASE_SERVICE_ROLE_KEY` | 🔴 **crown_jewel** | **Encrypted** ⚠ | **SÍ** | Supabase → Settings → API → Reset |
| `SUPABASE_URL` | 🟢 public | Encrypted | No | URL del proyecto Supabase, sin credenciales |

---

## Cambios respecto al audit anterior

- ✅ **Classifier patch #1 — POSTGRES:** 3 patrones explícitos
  ```python
  r'POSTGRES_URL',        # literal
  r'POSTGRES_.*_URL',     # atrapa POSTGRES_PRISMA_URL, POSTGRES_URL_NON_POOLING
  r'POSTGRES_URL.*',      # alternativo más amplio
  ```
  Efecto: `POSTGRES_PRISMA_URL` y `POSTGRES_URL_NON_POOLING` se detectan como crown_jewel.

- ✅ **Classifier patch #2 — Supabase públicas:** agregados a `public`
  ```python
  r'^SUPABASE_URL$',      # URL del proyecto, sin credenciales
  r'PUBLISHABLE_KEY',     # nueva anon key de Supabase, expuesta al cliente
  ```
  Efecto: `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` salen de `review_manual` y pasan a `public`. `reference.md` actualizado en paralelo.

- ✅ **Columna "Tipo actual" completada** via `vercel env ls`. Resultado: **todas** las 16 vars están en `Encrypted`. Ninguna `Sensitive`.

- ✅ Scope acotado a vars reales del proyecto (excluidas las inyectadas por plataforma).

**Conteos antes → después del patch #2:** public `2 → 4`, review_manual `5 → 3`. Crown jewels/semi_sensitive sin cambios.

---

## Checklist de acción

### 🚨 Prioridad 1 — Rotar crown jewels (7 vars)

Orden por blast radius:

- [ ] **1. `SUPABASE_JWT_SECRET`** — ⚠ invalida sesiones activas, coordinar ventana.
- [ ] **2. `SUPABASE_SECRET_KEY`** — dashboard Supabase.
- [ ] **3. `SUPABASE_SERVICE_ROLE_KEY`** — dashboard Supabase.
- [ ] **4. `POSTGRES_PASSWORD`** — dashboard Supabase (Database → Reset).
- [ ] **5. Re-pullear** `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_PRISMA_URL` (contienen la pwd, Supabase los regenera).

### 🔒 Prioridad 2 — Migrar a `Sensitive`

Después de rotar, al crear los nuevos valores en Vercel usar `type: sensitive` (no `encrypted`). Vía API v10:
```bash
curl -X POST "https://api.vercel.com/v10/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"SUPABASE_JWT_SECRET","value":"<new>","type":"sensitive","target":["production","preview","development"]}'
```

La skill `security-rotate-secrets` lo hace automáticamente para vars autogenerables.

### 📋 Prioridad 3 — Validación post-rotación

- [ ] Confirmar en `vercel env ls production` que los 7 crown jewels figuren como `Sensitive`.
- [ ] Redeploy: `vercel --prod` o push a main.
- [ ] Smoke test: login + query autenticada + insert con service role.

### 🧹 Mejoras de housekeeping (no urgente)

- [ ] Aplicar el parche del classifier para `SUPABASE_URL` / `PUBLISHABLE_KEY`.
- [ ] Eliminar duplicados de keys antiguas si se confirma que `SUPABASE_PUBLISHABLE_KEY` reemplaza a `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] Considerar `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_SECRET_KEY` — ¿son la misma key con dos nombres? Revisar si alguna es legacy y se puede borrar.

---

## Próximos pasos

1. Correr `security-rotate-secrets` para las vars Supabase (requiere confirmación del dashboard externo, la skill genera el checklist).
2. Si hay sospecha de exposición real, correr `security-incident-response` para hacer grep de secretos en git history + audit de tokens GitHub/npm.
