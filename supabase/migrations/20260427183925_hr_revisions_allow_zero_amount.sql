-- Carga histórica de revisiones admite montos $0 (roles voluntarios / honorarios cero).
-- El check anterior amount > 0 era pensado para evitar entradas inválidas,
-- pero el negocio modela legítimamente algunos contratos sin remuneración.
ALTER TABLE staff_contract_revisions DROP CONSTRAINT IF EXISTS staff_contract_revisions_amount_check;
ALTER TABLE staff_contract_revisions ADD CONSTRAINT staff_contract_revisions_amount_check CHECK (amount >= 0);
