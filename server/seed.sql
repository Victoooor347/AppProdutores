-- =========================================================
-- AppProdutores — dados de exemplo (seed)
-- Rode depois do schema.sql.
-- =========================================================

-- Usuário de teste. CPF 529.982.247-25 é um CPF de teste válido
-- (passa no dígito verificador, é amplamente usado em tutoriais/testes —
-- não pertence a ninguém de verdade). Senha: "123456"
INSERT INTO users (cpf, password_hash, name, telefone, propriedade)
VALUES (
  '52998224725',
  crypt('123456', gen_salt('bf')),
  'Produtor de Teste',
  '11999999999',
  'Fazenda Exemplo'
);

-- Preço do dia
INSERT INTO precos_dia (commodity, nome_exibicao, preco, unidade, descricao, atualizado_em)
VALUES
  ('arroz', 'Arroz', 63.20, 'sc', '62 x 8 de Grão inteiro, Tipo 1', now()),
  ('soja',  'Soja',  123.50, 'sc', NULL, now());

-- Cargas de exemplo (tela de Relatório de Safra)
INSERT INTO cargas (user_cpf, cultura, data, inscricao_estadual, quantidade, unidade, placa)
VALUES
  ('52998224725', 'arroz', '2026-07-20', '123456789', 500, 'sc', 'ABC1D23'),
  ('52998224725', 'soja',  '2026-07-22', '123456789', 800, 'sc', 'XYZ9E87'),
  ('52998224725', 'arroz', '2026-07-25', '123456789', 300, 'sc', 'JKL4F56');

-- Contra-notas de exemplo
INSERT INTO contra_notas (user_cpf, numero, data_emissao, arquivo_pdf_url)
VALUES
  ('52998224725', '000123', '2026-07-15T00:00:00Z', 'https://exemplo.com/contra-nota-000123.pdf'),
  ('52998224725', '000124', '2026-07-18T00:00:00Z', 'https://exemplo.com/contra-nota-000124.pdf'),
  ('52998224725', '000125', '2026-07-22T00:00:00Z', 'https://exemplo.com/contra-nota-000125.pdf');

-- Conferência rápida depois de rodar:
-- SELECT * FROM users;
-- SELECT * FROM precos_dia;
-- SELECT * FROM cargas;
-- SELECT * FROM contra_notas;

-- Pra simular o login (é assim que a API real deveria validar a senha):
-- SELECT cpf FROM users
-- WHERE cpf = '52998224725' AND password_hash = crypt('123456', password_hash);
-- (se devolver a linha, a senha bateu)