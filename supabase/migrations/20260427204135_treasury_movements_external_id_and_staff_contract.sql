ALTER TABLE public.treasury_movements
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS staff_contract_id uuid REFERENCES public.staff_contracts(id);

CREATE UNIQUE INDEX IF NOT EXISTS treasury_movements_unique_external_per_club
  ON public.treasury_movements (club_id, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS treasury_movements_staff_contract_id_idx
  ON public.treasury_movements (staff_contract_id)
  WHERE staff_contract_id IS NOT NULL;
