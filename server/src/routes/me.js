const express = require('express');
const { pool } = require('../db');
const { asyncHandler } = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /me
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT cpf, name, telefone, propriedade FROM users WHERE cpf = $1`,
    [req.userCpf]
  );

  const user = result.rows[0];
  if (!user) {
    return res.status(404).json({ message: 'Usuário não encontrado.' });
  }

  return res.json(user);
}));

// PUT /me — CPF nunca é editável (vem do token, não do corpo da requisição)
router.put('/', requireAuth, asyncHandler(async (req, res) => {
  const { name, telefone, propriedade } = req.body;

  const result = await pool.query(
    `UPDATE users SET name = $1, telefone = $2, propriedade = $3
     WHERE cpf = $4
     RETURNING cpf, name, telefone, propriedade`,
    [name, telefone, propriedade, req.userCpf]
  );

  return res.json(result.rows[0]);
}));

module.exports = router;