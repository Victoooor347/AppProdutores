const express = require('express');
const { pool } = require('../db');
const { asyncHandler } = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /precos-do-dia
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT commodity, nome_exibicao, preco, unidade, descricao, atualizado_em
     FROM precos_dia
     ORDER BY commodity`
  );

  const data = result.rows.map((row) => ({
    commodity: row.commodity,
    nome_exibicao: row.nome_exibicao,
    preco: Number(row.preco),
    unidade: row.unidade,
    descricao: row.descricao || undefined,
    atualizado_em: row.atualizado_em,
  }));

  return res.json({ data });
}));

module.exports = router;