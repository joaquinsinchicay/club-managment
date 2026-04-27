-- Carga inicial de contratos multi-ocupante (jugadores, personal de limpieza,
-- DTs FEFI/Promo). El cat lalogo `salary_structures` representa el puesto, no la
-- persona, por lo que m ultiples contratos vigentes por estructura son v alidos.
DROP INDEX IF EXISTS staff_contracts_unique_active_per_structure;
