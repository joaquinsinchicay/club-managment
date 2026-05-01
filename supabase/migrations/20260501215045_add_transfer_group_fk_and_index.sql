-- treasury_movements.transfer_group_id apunta a account_transfers.id solo por convención
-- (CLAUDE.md § "Transferencias entre cuentas"). Sin FK la integridad es solo aplicativa
-- y sin índice las queries de trazabilidad por grupo hacen seq scan.
--
-- Verificado pre-migration: 0 orphans (1410 movs / 705 grupos).
-- Auditoría: docs/audit/20260501_db_audit.md (sección 3 · Crítica).

alter table public.treasury_movements
  add constraint treasury_movements_transfer_group_id_fkey
    foreign key (transfer_group_id)
    references public.account_transfers(id)
    on delete restrict
    deferrable initially deferred;

create index if not exists treasury_movements_transfer_group_id_idx
  on public.treasury_movements (transfer_group_id)
  where transfer_group_id is not null;

comment on constraint treasury_movements_transfer_group_id_fkey
  on public.treasury_movements
  is 'Transferencias entre cuentas: ambos movimientos (egreso + ingreso) comparten transfer_group_id = account_transfers.id. Deferrable para permitir crear los 3 registros (1 transfer + 2 movs) en la misma transacción.';
