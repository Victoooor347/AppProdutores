const express = require('express');
const { pool } = require('../db');
const { asyncHandler } = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /relatorios/gerar-pdf
// Recebe os IDs das cargas selecionadas e inicia a geração assíncrona.
router.post('/gerar-pdf', requireAuth, asyncHandler(async (req, res) => {
  const { carga_ids: cargaIds } = req.body;

  if (!Array.isArray(cargaIds) || cargaIds.length === 0) {
    return res.status(400).json({ message: 'Selecione ao menos uma carga.' });
  }

  // Confere que todas as cargas pertencem mesmo ao usuário logado —
  // nunca confiar em IDs vindos do cliente sem checar a dono.
  const ownershipCheck = await pool.query(
    `SELECT id FROM cargas WHERE id = ANY($1::uuid[]) AND user_cpf = $2`,
    [cargaIds, req.userCpf]
  );

  if (ownershipCheck.rows.length !== cargaIds.length) {
    return res.status(403).json({ message: 'Uma ou mais cargas não pertencem a este usuário.' });
  }

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

  // ---------------------------------------------------------------
  // TODO (implementação real): aqui entraria a geração de verdade do PDF
  // (juntar os dados das cargas num template, ex: com pdf-lib ou puppeteer,
  // subir o arquivo pra um storage tipo S3/R2, e salvar a URL final).
  // Por enquanto isso só SIMULA o processamento com um setTimeout.
  // ---------------------------------------------------------------
  setTimeout(async () => {
    try {
      await pool.query(
        `UPDATE relatorio_pdf_jobs
         SET status = 'pronto', arquivo_pdf_url = $2
         WHERE id = $1`,
        [job.id, `https://exemplo.com/relatorios/${job.id}.pdf`]
      );
    } catch (err) {
      console.error('Falha ao gerar PDF do relatório:', err);
      await pool.query(`UPDATE relatorio_pdf_jobs SET status = 'erro' WHERE id = $1`, [job.id]);
    }
  }, 5000);

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