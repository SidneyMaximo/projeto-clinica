-- Migration 004: Criar tabela de orçamentos de exames
-- Armazena orçamentos gerados para pacientes, incluindo os itens selecionados.

CREATE TABLE IF NOT EXISTS orcamentos_exames (
  id             TEXT PRIMARY KEY,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  patient_id     TEXT REFERENCES patients(id) ON DELETE SET NULL,
  patient_name   TEXT NOT NULL,
  operator_id    TEXT NOT NULL,
  operator_name  TEXT NOT NULL,
  items          JSONB NOT NULL,
  -- Formato: [{ "examId": "...", "examName": "...", "quantity": 1, "unitPrice": 150.00 }]
  total_amount   NUMERIC(10,2) NOT NULL,
  notes          TEXT,
  status         TEXT NOT NULL DEFAULT 'pendente'
                   CHECK (status IN ('pendente', 'aprovado', 'expirado'))
);

-- Índices para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_orcamentos_exames_patient_id ON orcamentos_exames(patient_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_exames_created_at ON orcamentos_exames(created_at DESC);
