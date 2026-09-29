const express = require('express');
const { pool } = require('../db');
const { asyncHandler } = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { gerarPdfContraNotaExemplo, juntarPdfs } = require('../services/pdfService');

const router = express.Router();

// Máximo de notas num PDF só — acima disso o arquivo fica pesado demais pro celular
const MAX_NOTAS_POR_PDF = 200;

// Links dos PDFs de exemplo (seed.sql) ficam gravados sem o endereço do servidor.
// Ver linkCompleto() e o GET /arquivos/contra-notas/exemplo/... no index.js.
const PREFIXO_PDF_EXEMPLO = '/arquivos/contra-notas/exemplo/';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Transforma "/arquivos/..." em link completo, usando o endereço pelo qual o app acessou
// a API (IP da rede local ou domínio). Links que já são completos ficam como estão.
function linkCompleto(req, url) {
  return url.startsWith('/') ? `${req.protocol}://${req.get('host')}${url}` : url;
}

// Filtros da listagem. A data de emissão é comparada pelo dia em UTC — o mesmo dia que o
// app mostra na tela (ele exibe a parte da data do texto que a API devolve).
function montarFiltros(req) {
  const { ano, data_inicio: dataInicio, data_fim: dataFim } = req.query;
  const conditions = ['user_cpf = $1'];
  const params = [req.userCpf];

  if (ano) {
    params.push(Number(ano));
    conditions.push(`EXTRACT(YEAR FROM data_emissao AT TIME ZONE 'UTC') = $${params.length}`);
  }
  if (dataInicio) {
    params.push(dataInicio);
    conditions.push(`(data_emissao AT TIME ZONE 'UTC')::date >= $${params.length}`);
  }
  if (dataFim) {
    params.push(dataFim);
    conditions.push(`(data_emissao AT TIME ZONE 'UTC')::date <= $${params.length}`);
  }

  return { whereClause: conditions.join(' AND '), params };
}

// GET /contra-notas?page=1&per_page=20&ano=&data_inicio=&data_fim=
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const perPage = Number(req.query.per_page) || 20;
  const { whereClause, params } = montarFiltros(req);

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM contra_notas WHERE ${whereClause}`,
    params
  );
  const totalItems = Number(countResult.rows[0].count);

  const listResult = await pool.query(
    `SELECT id, numero, data_emissao, arquivo_pdf_url
     FROM contra_notas
     WHERE ${whereClause}
     ORDER BY data_emissao DESC, id DESC -- o id desempata notas com a mesma data, pra paginação não repetir/pular nenhuma
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, perPage, (page - 1) * perPage]
  );

  return res.json({
    data: listResult.rows.map((row) => ({
      id: row.id,
      numero: row.numero,
      data_emissao: row.data_emissao,
      arquivo_pdf_url: linkCompleto(req, row.arquivo_pdf_url),
    })),
    pagination: {
      page,
      per_page: perPage,
      total_items: totalItems,
      total_pages: Math.max(1, Math.ceil(totalItems / perPage)),
    },
  });
}));

// Bytes do PDF de uma nota: os de exemplo são gerados aqui mesmo; os outros são baixados do link.
async function baixarPdfDaNota(nota) {
  if (nota.arquivo_pdf_url.startsWith(PREFIXO_PDF_EXEMPLO)) {
    return gerarPdfContraNotaExemplo(nota.numero);
  }

  const resposta = await fetch(nota.arquivo_pdf_url);
  if (!resposta.ok) {
    throw new Error(`PDF da contra-nota ${nota.numero} não baixou (HTTP ${resposta.status})`);
  }
  return Buffer.from(await resposta.arrayBuffer());
}

// POST /contra-notas/gerar-pdf
// Junta os PDFs das notas selecionadas num arquivo só. Mesmo esquema do relatório de cargas:
// responde na hora com o job e termina em segundo plano (o app consulta até ficar "pronto").
// Os jobs ficam na mesma tabela dos relatórios (relatorio_pdf_jobs).
router.post('/gerar-pdf', requireAuth, asyncHandler(async (req, res) => {
  const { contra_nota_ids: ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'Selecione ao menos uma contra-nota.' });
  }
  if (ids.length > MAX_NOTAS_POR_PDF) {
    return res
      .status(400)
      .json({ message: `Selecione no máximo ${MAX_NOTAS_POR_PDF} contra-notas por PDF.` });
  }
  if (!ids.every((id) => UUID_REGEX.test(String(id)))) {
    return res.status(400).json({ message: 'Contra-nota inválida na seleção.' });
  }

  // Busca as notas já conferindo que são do usuário logado, em ordem de emissão
  const notasResult = await pool.query(
    `SELECT id, numero, arquivo_pdf_url
     FROM contra_notas
     WHERE id = ANY($1::uuid[]) AND user_cpf = $2
     ORDER BY data_emissao, id`,
    [ids, req.userCpf]
  );

  if (notasResult.rows.length !== new Set(ids).size) {
    return res
      .status(403)
      .json({ message: 'Uma ou mais contra-notas não pertencem a este usuário.' });
  }

  const jobResult = await pool.query(
    `INSERT INTO relatorio_pdf_jobs (user_cpf, status) VALUES ($1, 'processando') RETURNING id, status`,
    [req.userCpf]
  );
  const job = jobResult.rows[0];
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  // Junta os PDFs em segundo plano (a resposta HTTP sai logo abaixo)
  (async () => {
    try {
      const pdfs = [];
      for (const nota of notasResult.rows) {
        pdfs.push(await baixarPdfDaNota(nota));
      }
      await juntarPdfs({ jobId: job.id, pdfs });

      await pool.query(
        `UPDATE relatorio_pdf_jobs SET status = 'pronto', arquivo_pdf_url = $2 WHERE id = $1`,
        [job.id, `${baseUrl}/arquivos/relatorios/${job.id}.pdf`]
      );
    } catch (err) {
      console.error('Falha ao juntar os PDFs das contra-notas:', err);
      await pool.query(`UPDATE relatorio_pdf_jobs SET status = 'erro' WHERE id = $1`, [job.id]);
    }
  })();

  return res.json({ job_id: job.id, status: job.status });
}));

// GET /contra-notas/gerar-pdf/:jobId
router.get('/gerar-pdf/:jobId', requireAuth, asyncHandler(async (req, res) => {
  if (!UUID_REGEX.test(req.params.jobId)) {
    return res.status(404).json({ message: 'Job não encontrado.' });
  }

  const result = await pool.query(
    `SELECT id, status, arquivo_pdf_url FROM relatorio_pdf_jobs WHERE id = $1 AND user_cpf = $2`,
    [req.params.jobId, req.userCpf]
  );

  const job = result.rows[0];
  if (!job) {
    return res.status(404).json({ message: 'Job não encontrado.' });
  }

  return res.json({
    job_id: job.id,
    status: job.status,
    arquivo_pdf_url: job.arquivo_pdf_url || undefined,
  });
}));

module.exports = router;
