-- Migration 003: Adicionar status 'Pré-agendado' ao campo status da tabela appointments
-- Este status representa uma consulta solicitada, mas ainda não confirmada pelo paciente.

-- Remover constraint existente (se houver) e recriar com o novo valor
ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('Pré-agendado', 'Agendado', 'Em Andamento', 'Concluído', 'Cancelado'));
