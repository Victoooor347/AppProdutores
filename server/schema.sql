-- =========================================================
-- AppProdutores — schema de banco (baseado no contrato-api-rascunho.md)
-- Rode isso no SQL Editor do Neon, ou via psql:
--   psql "postgresql://usuario:senha@host/dbname" -f schema.sql
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- necessário para gen_random_uuid()

-- ---------------------------------------------------------
-- 1. Usuários (produtores)
-- ---------------------------------------------------------
CREATE TABLE users (
  cpf            CHAR(11) PRIMARY KEY,           -- só os 11 dígitos, sem máscara
  password_hash  TEXT NOT NULL,                  -- NUNCA guardar senha em texto puro (usar bcrypt/argon2 na API)
  name           TEXT NOT NULL,
  telefone       TEXT,
  propriedade    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------
-- 2. Sessões (para o refresh e o logout invalidando no servidor
--    — ver decisão da Opção B no contrato da API)
-- ---------------------------------------------------------
CREATE TABLE sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_cpf    CHAR(11) NOT NULL REFERENCES users(cpf) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,                     -- guardar o HASH do token, nunca o token puro
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,                       -- preenchido no POST /auth/logout
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_user_cpf ON sessions(user_cpf);
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);

-- ---------------------------------------------------------
-- 3. Preço do dia (Dashboard) — não tem interface de admin,
--    é atualizado direto no banco (decisão já registrada no contrato)
-- ---------------------------------------------------------
CREATE TABLE precos_dia (
  commodity      TEXT PRIMARY KEY,               -- 'arroz' | 'soja'
  nome_exibicao  TEXT NOT NULL,
  preco          NUMERIC(10,2) NOT NULL,          -- formato decimal, ex: 63.20
  unidade        TEXT NOT NULL DEFAULT 'sc',
  descricao      TEXT,                            -- ex: '62 x 8 de Grão inteiro, Tipo 1'
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------
-- 4. Cargas (tela de Relatório de Safra)
-- ---------------------------------------------------------
CREATE TABLE cargas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_cpf            CHAR(11) NOT NULL REFERENCES users(cpf) ON DELETE CASCADE,
  cultura             TEXT NOT NULL,              -- 'arroz' | 'soja'
  data                DATE NOT NULL,
  inscricao_estadual  TEXT NOT NULL,
  quantidade          NUMERIC(10,2) NOT NULL,
  unidade             TEXT NOT NULL DEFAULT 'sc',
  placa               TEXT NOT NULL,              -- placa do caminhão
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices pensados nos filtros da tela: ano, IE, cultura, data
CREATE INDEX idx_cargas_user_cpf ON cargas(user_cpf);
CREATE INDEX idx_cargas_cultura ON cargas(cultura);
CREATE INDEX idx_cargas_data ON cargas(data);
CREATE INDEX idx_cargas_inscricao_estadual ON cargas(inscricao_estadual);

-- ---------------------------------------------------------
-- 5. Geração de PDF de relatório (assíncrona — ver contrato)
-- ---------------------------------------------------------
CREATE TABLE relatorio_pdf_jobs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_cpf         CHAR(11) NOT NULL REFERENCES users(cpf) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'processando', -- 'processando' | 'pronto' | 'erro'
  arquivo_pdf_url  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Relação N:N entre o job de PDF e as cargas selecionadas
CREATE TABLE relatorio_pdf_job_cargas (
  job_id    UUID NOT NULL REFERENCES relatorio_pdf_jobs(id) ON DELETE CASCADE,
  carga_id  UUID NOT NULL REFERENCES cargas(id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, carga_id)
);

-- ---------------------------------------------------------
-- 6. Contra-notas (PDFs já prontos, um por NF)
-- ---------------------------------------------------------
CREATE TABLE contra_notas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_cpf         CHAR(11) NOT NULL REFERENCES users(cpf) ON DELETE CASCADE,
  numero           TEXT NOT NULL,                 -- número da NF
  data_emissao     TIMESTAMPTZ NOT NULL,
  arquivo_pdf_url  TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contra_notas_user_cpf ON contra_notas(user_cpf);

-- ---------------------------------------------------------
-- Trigger simples para manter updated_at em dia
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_relatorio_pdf_jobs_updated_at
  BEFORE UPDATE ON relatorio_pdf_jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();