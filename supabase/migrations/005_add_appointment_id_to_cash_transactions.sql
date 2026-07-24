-- Migration 005: Adicionar coluna appointment_id em cash_transactions
-- Permite rastrear qual transação de caixa está associada a qual agendamento.

ALTER TABLE cash_transactions
  ADD COLUMN IF NOT EXISTS appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL;

-- Índice para busca por agendamento
CREATE INDEX IF NOT EXISTS idx_cash_tx_appointment_id ON cash_transactions(appointment_id);
