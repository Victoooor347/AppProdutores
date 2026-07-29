const express = require('express');
const { pool } = require('../db');
const { asyncHandler } = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /cargas/resumo?ano=2026
router.get('/resumo', requireAuth, asyncHandler(async (req, res) => {
  const ano = req.query.ano ? Number(req.query.ano) : new Date().getFullYear();

  const result = await pool.query(
    `SELECT cultura, COALESCE(SUM(quantidade), 0) AS total_sacas, MIN(unidade) AS unidade
     FROM cargas
     WHERE user_cpf = $1 AND EXTRACT(YEAR FROM data) = $2
     GROUP BY cultura`,
    [req.userCpf, ano]
  );

  const data = result.rows.map((row) => ({
    cultura: row.cultura,
    total_sacas: Number(row.total_sacas),
    unidade: row.unidade || 'sc',
  }));

  return res.json({ data });
}));

// GET /cargas?page=1&per_page=20&ano=&inscricao_estadual=&cultura=&data=
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const perPage = Number(req.query.per_page) || 20;
  const { ano, inscricao_estadual: inscricaoEstadual, cultura, data } = req.query;

  const conditions = ['user_cpf = $1'];
  const params = [req.userCpf];

  if (ano) {
    params.push(Number(ano));
    conditions.push(`EXTRACT(YEAR FROM data) = $${params.length}`);
  }
  if (inscricaoEstadual) {
    params.push(inscricaoEstadual);
    conditions.push(`inscricao_estadual = $${params.length}`);
  }
  if (cultura) {
    params.push(cultura);
    conditions.push(`cultura = $${params.length}`);
  }
  if (data) {
    params.push(data);
    conditions.push(`data = $${params.length}`);
  }

  const whereClause = conditions.join(' AND ');

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM cargas WHERE ${whereClause}`,
    params
  );
  const totalItems = Number(countResult.rows[0].count);

  const listParams = [...params, perPage, (page - 1) * perPage];
  const listResult = await pool.query(
    `SELECT id, cultura, data, inscricao_estadual, quantidade, unidade, placa
     FROM cargas
     WHERE ${whereClause}
     ORDER BY data DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    listParams
  );

  return res.json({
    data: listResult.rows.map((row) => ({
      id: row.id,
      cultura: row.cultura,
      data: row.data,
      inscricao_estadual: row.inscricao_estadual,
      quantidade: Number(row.quantidade),
      unidade: row.unidade,
      placa: row.placa,
    })),
    pagination: {
      page,
      per_page: perPage,
      total_items: totalItems,
      total_pages: Math.max(1, Math.ceil(totalItems / perPage)),
    },
  });
}));

module.exports = router;