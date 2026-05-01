-- Fix: los movs IMP2022 quedaron con status='consolidated' pero el botón
-- editar de la UI requiere status='posted' (mismo estado que los del 2021).
-- Sin esto, los movs 2022 aparecen como solo-lectura.
UPDATE public.treasury_movements
SET status = 'posted'
WHERE external_id LIKE 'IMP2022-%'
  AND status = 'consolidated';
