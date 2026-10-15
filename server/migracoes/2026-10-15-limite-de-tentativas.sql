-- =========================================================
-- Migração: limite de tentativas (erros de login e pedidos de código por IP)
--
-- Para bancos que JÁ EXISTEM. Banco novo não precisa disso: o schema.sql atual
-- já vem com essa tabela.
-- Rode uma vez no SQL Editor do Neon. Pode rodar de novo sem problema.
-- =========================================================

CREATE TABLE IF NOT EXISTS tentativas (
  id          BIGSERIAL PRIMARY KEY,
  tipo        TEXT NOT NULL,                     -- 'login' | 'pedido_codigo'
  cpf         TEXT NOT NULL,                     -- como foi digitado (só dígitos); pode não existir em users
  ip          TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tentativas_cpf ON tentativas(tipo, cpf, created_at);
CREATE INDEX IF NOT EXISTS idx_tentativas_ip ON tentativas(tipo, ip, created_at);

-- Conferência:
-- SELECT tipo, cpf, ip, created_at FROM tentativas ORDER BY created_at DESC;
