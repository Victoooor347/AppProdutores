-- =========================================================
-- Migração: PDFs de exemplo das contra-notas de teste
--
-- As contra-notas de teste apontavam para links falsos (https://exemplo.com/...),
-- que não abrem e não dá pra juntar num PDF só. Esta migração troca esses links
-- pelos PDFs de exemplo que a própria API de teste gera.
-- Só mexe em contra-notas com link de exemplo.com — notas reais não são tocadas.
-- Pode rodar de novo sem problema.
-- =========================================================

UPDATE contra_notas
SET arquivo_pdf_url = '/arquivos/contra-notas/exemplo/' || numero || '.pdf'
WHERE arquivo_pdf_url LIKE 'https://exemplo.com/%';

-- Conferência:
-- SELECT numero, data_emissao, arquivo_pdf_url FROM contra_notas ORDER BY data_emissao;
