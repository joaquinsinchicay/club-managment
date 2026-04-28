-- Habilitar visibilidad de TODAS las categorias de tesoreria (no legacy)
-- para ambos roles (secretaria y tesoreria).
--
-- Issue: 20 categorias del catalogo del seed (Sueldos, Impuestos,
-- Mantenimiento, Obras, Cuotas/Fichajes, etc.) tenian visible_for_*=false,
-- lo que las ocultaba del dropdown del modal de edicion de movimientos
-- y dejaba el campo subcategoria vacio aunque el movimiento ya tenia
-- una categoria asignada (visible en la tabla).
--
-- Fix: marcarlas todas visibles. Si en el futuro un usuario quiere ocultar
-- una categoria especifica, puede hacerlo desde la UI de configuracion.
--
-- Idempotente: el WHERE filtra solo categorias actualmente ocultas.

UPDATE public.treasury_categories
SET visible_for_tesoreria = true,
    visible_for_secretaria = true
WHERE is_legacy = false
  AND (visible_for_tesoreria = false OR visible_for_secretaria = false);
