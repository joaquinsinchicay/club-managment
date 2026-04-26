# PDD — US-59 · Job diario de finalización automática de contratos

> PDD del módulo **E04 · RRHH**. Fuente Notion: `E04 👥 RRHH` · alias `US-36`. En el repo: **US-59**. (Pre-refactor 2026-04-27 el alias era `US-35`.)

---

## 1. Identificación

| Campo | Valor |
|---|---|
| Epic | E04 · RRHH |
| User Story | Como sistema, quiero finalizar automáticamente los contratos cuya fecha fin se cumple, para mantener consistente el estado de los contratos sin intervención manual. |
| Prioridad | Media |
| Objetivo de negocio | Mantener coherencia operativa sin requerir intervención humana diaria: los contratos con fecha fin vencida pasan solos a `finalizado`, liberando la estructura para nuevos contratos y evitando generaciones de liquidación indebidas. |

---

## 2. Problema a resolver

Sin un proceso automatizado, los contratos con `end_date = hoy` quedan marcados como `vigente` aunque lógicamente ya no lo estén, lo que mantiene bloqueada la estructura y puede producir liquidaciones fuera de alcance al cambiar el mes. Ejecutarlo manualmente es frágil y propenso a olvidos.

---

## 3. Objetivo funcional

Un job programado via **`pg_cron`** corre diariamente en horario de baja carga (ej. 03:05 local del club). Recorre todos los clubes y, por cada contrato con `status = 'vigente'` y `end_date = current_date`, lo pasa a `finalizado` con `finalized_at = now()` y `finalized_reason = 'auto_finalized_by_end_date'`. Cada finalización se registra en `hr_activity_log`.

---

## 4. Alcance

### Incluye
- Habilitación de la extensión `pg_cron` en la migration de Fase 1 (si no está habilitada).
- RPC `hr_finalize_contracts_due_today_all_clubs()` que itera clubes y finaliza contratos.
- Schedule `cron.schedule('hr-finalize-contracts', '5 3 * * *', ...)`.
- Log de ejecución con totales procesados y errores en una tabla `hr_job_runs`.

### No incluye
- UI de ejecución manual (en esta US). Si en el futuro se requiere, se expone una action.
- Notificaciones al admin sobre contratos auto-finalizados (fuera de scope; la UI se entera al renderizar).
- Pagos automáticos ni generación de liquidaciones finales.

---

## 5. Actor principal

Sistema (proceso programado `pg_cron`).

---

## 6. Precondiciones

- Extensión `pg_cron` habilitada en el proyecto Supabase.
- La migration de RRHH (Fase 1) creó la RPC y el schedule.

---

## 7. Postcondiciones

| Escenario | Resultado esperado |
|---|---|
| Hay contratos con `end_date = hoy` y `status = 'vigente'` | Pasan a `finalizado`. |
| Hay contratos con `end_date` nula o futura | No son afectados. |
| La ejecución falla a mitad de camino | Los contratos ya procesados permanecen finalizados; el resto no se toca; el error se registra en `hr_job_runs`. |

---

## 8. Reglas de negocio

### Alcance del job
- Itera sin `app.current_club_id` (corre como función global del sistema). La RPC recorre `staff_contracts` filtrando por `status = 'vigente' and end_date = current_date`.
- El cálculo de `current_date` se hace con `timezone('America/Argentina/Buenos_Aires', now())::date` para coincidir con la zona horaria default del producto. Puede parametrizarse a futuro por club.

### Atomicidad
- La RPC envuelve todo en una transacción implícita por statement. Cada contrato finalizado se actualiza con un UPDATE que incluye su INSERT correspondiente en `hr_activity_log` via trigger o via bloque PL/pgSQL. Si un UPDATE falla para un contrato específico, el job no aborta — se loggea el error y continúa con el siguiente.

### Motivo de finalización
- Al procesar, el contrato toma `finalized_reason = 'auto_finalized_by_end_date'` y `finalized_by_user_id = null` (marcando origen sistema).

### Auditoría específica
- Evento `CONTRACT_FINALIZED_AUTO` en `hr_activity_log`.
- Registro de la ejecución en `hr_job_runs`:
  - `id`, `job_name` (`hr_finalize_contracts_due_today`), `started_at`, `finished_at`, `status` (`success | partial | failed`), `contracts_processed int`, `contracts_failed int`, `error_payload jsonb`.

### Idempotencia
- Si el job corre dos veces el mismo día, la segunda corrida no encuentra candidatos (porque ya están `finalizado`). Seguro volver a ejecutarlo.

---

## 9. Flujo principal

1. `pg_cron` dispara la RPC a las 03:05 hora local (8:05 UTC aprox).
2. La RPC:
   a. INSERT inicial en `hr_job_runs` con `status = 'running'`.
   b. SELECT `staff_contracts` con `status = 'vigente' and end_date = current_date`.
   c. Loop: por cada contrato, UPDATE + INSERT `hr_activity_log`.
   d. UPDATE final de `hr_job_runs` con totales y `status` final.
3. Ninguna notificación externa.

---

## 10. Flujos alternativos

### A. Sin contratos candidatos
- `contracts_processed = 0`, `status = 'success'`.

### B. Error parcial
- Un UPDATE falla → se loggea en `error_payload` como array, se continúa con el siguiente → `status = 'partial'` si hubo al menos un error y algún éxito; `failed` si todos fallaron.

### C. pg_cron deshabilitado
- Si la extensión no está disponible en el proyecto, la migration debe fallar explícitamente al intentar `create extension pg_cron`. Fallback documentado: Vercel Cron hitting `/api/cron/hr-finalize-contracts` con header `CRON_SECRET`. Este fallback no se implementa ahora; la decisión está tomada (pg_cron).

---

## 11. UI / UX

- No hay UI directa en esta US.
- El efecto se observa en el listado de contratos (contratos que estaban `vigente` pasan a `finalizado` tras la primera carga después de la ejecución del job).
- La ficha del contrato muestra `finalized_by_user_id = null` y `finalized_reason = auto_finalized_by_end_date` interpretado como `<Chip tone="neutral">Finalización automática</Chip>`.

---

## 12. Mensajes y textos

### Namespace
`rrhh.contracts.auto_finalized_label` (label único en la UI de ficha).

### Keys mínimas
- `rrhh.contracts.auto_finalized_label` = "Finalización automática"
- `rrhh.contracts.auto_finalized_description` = "El contrato se finalizó automáticamente al cumplirse su fecha fin."

---

## 13. Persistencia

### Entidad nueva
- `public.hr_job_runs`:
  - `id uuid pk default gen_random_uuid()`
  - `job_name text not null`
  - `started_at timestamptz not null default now()`
  - `finished_at timestamptz null`
  - `status text not null check (status in ('running','success','partial','failed'))`
  - `contracts_processed int default 0`
  - `contracts_failed int default 0`
  - `error_payload jsonb null`
  - Índice: `(job_name, started_at desc)`.

### RPC
- `hr_finalize_contracts_due_today_all_clubs() returns void` SECURITY DEFINER (owner `postgres`).

### Schedule
- `cron.schedule('hr-finalize-contracts', '5 3 * * *', $$select public.hr_finalize_contracts_due_today_all_clubs()$$);`

### RLS
- `hr_job_runs`: lectura sólo para `admin` (mediante policy si se expone UI en el futuro). Por ahora, sin exposición UI. Escritura sólo por la RPC.

---

## 14. Seguridad

- El schedule corre como usuario `postgres` (owner de la extensión pg_cron).
- La RPC es `security definer`, el nombre no se expone al cliente (no hay policy de RPC para roles de usuario).
- `hr_job_runs` no contiene datos sensibles más allá de IDs internos.

---

## 15. Dependencias

- **contracts:** ninguno expuesto al cliente.
- **domain entities:** `staff_contracts`, `hr_activity_log`, `hr_job_runs`.
- **infra:** extensión `pg_cron` habilitada en Supabase.
- **otras US:** US-57, US-58 (modelo de contrato).
