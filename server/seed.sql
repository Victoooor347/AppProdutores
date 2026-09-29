-- =========================================================
-- AppProdutores — dados de exemplo (seed)
-- Rode depois do schema.sql.
-- =========================================================

-- Usuário de teste. CPF 529.982.247-25 é um CPF de teste válido
-- (passa no dígito verificador, é amplamente usado em tutoriais/testes —
-- não pertence a ninguém de verdade). Senha: "123456"
-- Troque o e-mail pelo seu pra receber os códigos de verdade (com SMTP configurado).
INSERT INTO users (cpf, password_hash, name, email, telefone, propriedade)
VALUES (
  '52998224725',
  crypt('123456', gen_salt('bf')),
  'Produtor de Teste',
  'produtor.teste@exemplo.com',
  '11999999999',
  'Fazenda Exemplo'
);

-- Produtor cadastrado pela empresa que AINDA NÃO criou a senha — serve pra
-- testar o "Primeiro acesso". CPF 111.444.777-35 (CPF de teste válido).
INSERT INTO users (cpf, password_hash, name, email)
VALUES ('11144477735', NULL, 'Produtor Primeiro Acesso', 'primeiro.acesso@exemplo.com');

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

-- Contra-notas de exemplo. O link começa com "/": a API completa com o próprio endereço
-- e gera um PDF de exemplo na hora (ver index.js). Na produção, é o link do PDF real.
INSERT INTO contra_notas (user_cpf, numero, data_emissao, arquivo_pdf_url)
VALUES
  ('52998224725', '000123', '2026-07-15T00:00:00Z', '/arquivos/contra-notas/exemplo/000123.pdf'),
  ('52998224725', '000124', '2026-07-18T00:00:00Z', '/arquivos/contra-notas/exemplo/000124.pdf'),
  ('52998224725', '000125', '2026-07-22T00:00:00Z', '/arquivos/contra-notas/exemplo/000125.pdf');

-- Conferência rápida depois de rodar:
-- SELECT * FROM users;
-- SELECT * FROM precos_dia;
-- SELECT * FROM cargas;
-- SELECT * FROM contra_notas;

-- Pra simular o login (é assim que a API real deveria validar a senha):
-- SELECT cpf FROM users
-- WHERE cpf = '52998224725' AND password_hash = crypt('123456', password_hash);
-- (se devolver a linha, a senha bateu)