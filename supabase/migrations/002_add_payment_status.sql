-- Adicionar coluna de status de pagamento à tabela de agendamentos
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pendente';

-- Atualizar registros antigos para 'pago' (assumindo que agendamentos passados com preço já foram pagos, ou apenas inicializando para não quebrar a lógica)
UPDATE appointments SET payment_status = 'pago' WHERE price IS NOT NULL AND status IN ('Concluído', 'Agendado');
