const express = require('express');
const { pool } = require('../db');
const { asyncHandler } = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /contra-notas?page=1&per_page=20
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const perPage = Number(req.query.per_page) || 20;

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM contra_notas WHERE user_cpf = $1`,
    [req.userCpf]
  );
  const totalItems = Number(countResult.rows[0].count);

  const listResult = await pool.query(
    `SELECT id, numero, data_emissao, arquivo_pdf_url
     FROM contra_notas
     WHERE user_cpf = $1
     ORDER BY data_emissao DESC
     LIMIT $2 OFFSET $3`,
    [req.userCpf, perPage, (page - 1) * perPage]
  );

  return res.json({
    data: listResult.rows.map((row) => ({
      id: row.id,
      numero: row.numero,
      data_emissao: row.data_emissao,
      arquivo_pdf_url: row.arquivo_pdf_url,
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