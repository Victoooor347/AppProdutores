const express = require('express');
const { pool } = require('../db');
const { asyncHandler } = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { gerarPdfRelatorioCargas } = require('../services/pdfService');

const router = express.Router();

// POST /relatorios/gerar-pdf
// Recebe os IDs das cargas selecionadas e inicia a geração assíncrona.
router.post('/gerar-pdf', requireAuth, asyncHandler(async (req, res) => {
  const { carga_ids: cargaIds } = req.body;

  if (!Array.isArray(cargaIds) || cargaIds.length === 0) {
    return res.status(400).json({ message: 'Selecione ao menos uma carga.' });
  }

  // Busca as cargas já confirmando que pertencem ao usuário logado —
  // nunca confiar em IDs vindos do cliente sem checar o dono. Também serve
  // pra já trazer os dados que vão pro PDF, sem precisar de uma segunda query.
  const cargasResult = await pool.query(
    `SELECT id, cultura, data, inscricao_estadual, quantidade, unidade, placa
     FROM cargas
     WHERE id = ANY($1::uuid[]) AND user_cpf = $2
     ORDER BY data`,
    [cargaIds, req.userCpf]
  );

  if (cargasResult.rows.length !== cargaIds.length) {
    return res.status(403).json({ message: 'Uma ou mais cargas não pertencem a este usuário.' });
  }

  const userResult = await pool.query(
    `SELECT cpf, name, propriedade FROM users WHERE cpf = $1`,
    [req.userCpf]
  );
  const produtor = userResult.rows[0];

  const jobResult = await pool.query(
    `INSERT INTO relatorio_pdf_jobs (user_cpf, status) VALUES ($1, 'processando') RETURNING id, status`,
    [req.userCpf]
  );
  const job = jobResult.rows[0];

  await pool.query(
    `INSERT INTO relatorio_pdf_job_cargas (job_id, carga_id)
     SELECT $1, unnest($2::uuid[])`,
    [job.id, cargaIds]
  );

  // Gera o PDF de verdade. Isso roda em background (a resposta HTTP já foi
  // decidida abaixo) — é por isso que o app faz polling no job_id até o
  // status virar "pronto".
  (async () => {
    try {
      await gerarPdfRelatorioCargas({
        jobId: job.id,
        produtor,
        cargas: cargasResult.rows,
      });

      // Monta a URL pública a partir da própria requisição (funciona tanto
      // em localhost/IP da rede local quanto depois de um deploy real,
      // sem precisar de uma variável de ambiente fixa pra isso).
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const arquivoPdfUrl = `${baseUrl}/arquivos/relatorios/${job.id}.pdf`;

      await pool.query(
        `UPDATE relatorio_pdf_jobs SET status = 'pronto', arquivo_pdf_url = $2 WHERE id = $1`,
        [job.id, arquivoPdfUrl]
      );
    } catch (err) {
      console.error('Falha ao gerar PDF do relatório:', err);
      await pool.query(`UPDATE relatorio_pdf_jobs SET status = 'erro' WHERE id = $1`, [job.id]);
    }
  })();

  return res.json({ job_id: job.id, status: job.status });
}));

// GET /relatorios/gerar-pdf/:jobId
router.get('/gerar-pdf/:jobId', requireAuth, asyncHandler(async (req, res) => {
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