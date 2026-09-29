-- =========================================================
-- Migração: primeiro acesso e recuperação de senha por código no e-mail
--
-- Para bancos que JÁ EXISTEM (criados com o schema.sql antigo). Banco novo não
-- precisa disso: o schema.sql atual já vem com essas mudanças.
-- Rode uma vez no SQL Editor do Neon. Pode rodar de novo sem problema.
-- =========================================================

-- 1. E-mail do produtor (pra onde vão os códigos)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Senha pode ficar vazia: a empresa cadastra o produtor e ele cria a senha no primeiro acesso
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- 3. Códigos enviados por e-mail (só o mais recente de cada CPF/finalidade vale)
CREATE TABLE IF NOT EXISTS verification_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_cpf    CHAR(11) NOT NULL REFERENCES users(cpf) ON DELETE CASCADE,
  purpose     TEXT NOT NULL,                     -- 'primeiro_acesso' | 'recuperar_senha'
  code_hash   TEXT NOT NULL,                     -- HASH do código (bcrypt), nunca o código puro
  expires_at  TIMESTAMPTZ NOT NULL,
  attempts    INT NOT NULL DEFAULT 0,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_user
  ON verification_codes(user_cpf, purpose, created_at);

-- 4. Dados de teste (mesmos do seed.sql)
UPDATE users SET email = 'produtor.teste@exemplo.com'
WHERE cpf = '52998224725' AND email IS NULL;

INSERT INTO users (cpf, password_hash, name, email)
VALUES ('11144477735', NULL, 'Produtor Primeiro Acesso', 'primeiro.acesso@exemplo.com')
ON CONFLICT (cpf) DO NOTHING;

-- Conferência:
-- SELECT cpf, name, email, password_hash IS NULL AS sem_senha FROM users;
