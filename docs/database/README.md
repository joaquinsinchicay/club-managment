# Database Setup

## Objetivo

Este documento describe cómo inicializar, configurar y validar la base de datos del sistema de gestión de clubes.

Es obligatorio seguir este orden para garantizar:

* consistencia del esquema
* correcta aplicación de seguridad (RLS)
* funcionamiento del modelo multi-club

---

## 1. Stack

* PostgreSQL
* Supabase (Auth + DB + RLS)

---

## 2. Archivos relevantes

```text
/domain/schema.sql
/database/rls-policies.sql
```

---

## 3. Orden de ejecución (CRÍTICO)

Ejecutar en este orden:

### Paso 1: Schema

```sql
-- ejecutar completo
/domain/schema.sql
```

Esto crea:

* tablas
* enums
* relaciones
* constraints

---

### Paso 2: RLS

```sql
-- ejecutar completo
/database/rls-policies.sql
```

Esto:

* activa Row Level Security
* crea funciones helper
* define políticas de acceso

### Ejecución remota desde este repo

Para aplicar `/database/rls-policies.sql` directamente desde una terminal local se necesita al menos uno de estos mecanismos disponibles:

* `supabase` CLI autenticado contra el proyecto
* `psql` + `POSTGRES_URL_NON_POOLING` o `POSTGRES_URL` con credenciales completas
* un driver Postgres local y `POSTGRES_URL_NON_POOLING` o `POSTGRES_URL` con credenciales completas

Si `POSTGRES_URL*` está vacío en `.env.local` / `.env.production.local`, el SQL debe ejecutarse manualmente desde Supabase SQL Editor o completarse primero la connection string de base.

Si el host de conexión directa `db.<project_ref>.supabase.co` no resuelve desde la red local, usar la URI de **Session pooler** provista por el botón **Connect** del dashboard de Supabase.

---

## 4. Supabase Auth

### Requerido

* habilitar Google OAuth
* asegurar que `auth.uid()` esté disponible

---

## 5. Contexto obligatorio: active_club_id

## 5.1 Concepto

Todas las queries dependen de:

```sql
auth.uid()
app.current_club_id
```

## 5.2 Cómo setearlo

Debe setearse en cada request autenticada:

```sql
set app.current_club_id = 'uuid-del-club';
```

## 5.3 Responsabilidad

Esto debe hacerlo:

* backend (server actions / middleware)
* nunca confiar en frontend únicamente

## 5.4 Excepción preselección de club

Durante la resolución post-login todavía puede no existir `active_club_id`.
En ese caso RLS solo debe permitir lecturas/mutaciones sobre recursos propios del usuario autenticado:

* `users` → perfil propio
* `memberships` → memberships propias
* `user_club_preferences` → preferencia propia

No debe habilitarse lectura de datos operativos multi-club sin `app.current_club_id`.

---

## 6. Validación del entorno

### 6.1 Crear usuario de prueba

* autenticarse con Google

---

### 6.2 Crear club

Insert manual o vía API

---

### 6.3 Crear membership

```sql
insert into memberships (user_id, club_id, role, status)
values ('USER_ID', 'CLUB_ID', 'admin', 'activo');
```

---

### 6.4 Setear contexto

```sql
set app.current_club_id = 'CLUB_ID';
```

---

### 6.5 Test básico

```sql
select * from treasury_accounts;
```

Debe:

* devolver datos solo del club activo
* no devolver datos de otros clubes

---

## 7. Validación de RLS

### 7.1 Test cross-club (CRÍTICO)

* crear dos clubes
* mismo usuario en uno solo
* intentar leer datos del otro

Resultado esperado:

* ❌ no debe devolver datos

---

### 7.2 Test de roles

Cambiar rol en membership:

```sql
update memberships set role = 'secretaria'
where user_id = 'USER_ID' and club_id = 'CLUB_ID';
```

Verificar:

* qué queries funcionan
* cuáles fallan

---

## 8. Troubleshooting

### Problema: no devuelve datos

Causa probable:

* no seteaste `app.current_club_id` para consultas de datos operativos del club
* estás intentando leer recursos de otro usuario fuera de las policies self-owned

---

### Problema: error de permisos

Causa probable:

* membership inexistente
* membership no activa
* rol incorrecto

---

### Problema: RLS bloquea todo

Causa probable:

* no existe membership para ese club
* `auth.uid()` no está presente

---

## 9. Buenas prácticas

1. Nunca desactivar RLS en producción.
2. Nunca confiar en frontend para permisos.
3. Siempre setear `app.current_club_id`.
4. Testear siempre con distintos roles.
5. Validar escenarios cross-club.
6. No usar superuser para lógica de negocio.

---

## 10. Notas para IA implementadora

1. Ejecutar scripts en orden exacto.
2. No modificar schema sin actualizar domain-model.
3. No modificar RLS sin validar permission-matrix.
4. No omitir `current_club_id`.
5. Todas las queries deben ser multi-tenant safe.
6. Validar siempre membership antes de operar.

---

## 11. Checklist de instalación

* [ ] Ejecutado schema.sql
* [ ] Ejecutado rls-policies.sql
* [ ] Google Auth funcionando
* [ ] Membership creada
* [ ] active_club_id seteado
* [ ] Query básica funcionando
* [ ] Test cross-club OK
* [ ] Test de roles OK

---

## 12. Estado esperado

Si todo está correcto:

* el sistema es multi-tenant seguro
* cada usuario solo ve su club
* los permisos funcionan por rol
* la base está lista para operar

---

## 13. Importante

Sin `active_club_id` correctamente seteado:

* el sistema NO funciona
* las queries NO devuelven datos
* RLS bloquea acceso

Esto no es un bug, es el comportamiento esperado.

```
```
