const express = require('express');
const crypto = require('crypto');
const { pool } = require('../db');
const { asyncHandler } = require('../utils/asyncHandler');
const { requireAuth, hashToken } = require('../middleware/auth');

const router = express.Router();

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 1 dia (decidido no contrato)

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function createSession(userCpf) {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await pool.query(
    `INSERT INTO sessions (user_cpf, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userCpf, tokenHash, expiresAt]
  );

  return { token, expiresIn: SESSION_DURATION_MS / 1000 };
}

// POST /auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const { cpf, password } = req.body;

  if (!cpf || !password) {
    return res.status(400).json({ message: 'CPF e senha são obrigatórios.' });
  }

  const digits = String(cpf).replace(/\D/g, '');

  // IMPORTANTE (segurança): mesma mensagem genérica tanto para CPF
  // inexistente quanto para senha errada — evita enumeração de usuários
  // (ver observação no contrato da API).
  const result = await pool.query(
    `SELECT cpf, name FROM users WHERE cpf = $1 AND password_hash = crypt($2, password_hash)`,
    [digits, password]
  );

  const user = result.rows[0];

  if (!user) {
    return res.status(401).json({ message: 'CPF ou senha incorretos.' });
  }

  const { token, expiresIn } = await createSession(user.cpf);

  return res.json({
    user: { cpf: user.cpf, name: user.name },
    token,
    expires_in: expiresIn,
  });
}));

// POST /auth/refresh
router.post('/refresh', requireAuth, asyncHandler(async (req, res) => {
  // Revoga a sessão antiga e cria uma nova (rotação de token).
  await pool.query(`UPDATE sessions SET revoked_at = now() WHERE token_hash = $1`, [
    req.tokenHash,
  ]);

  const { token, expiresIn } = await createSession(req.userCpf);

  return res.json({ token, expires_in: expiresIn });
}));

// POST /auth/logout
router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  await pool.query(`UPDATE sessions SET revoked_at = now() WHERE token_hash = $1`, [
    req.tokenHash,
  ]);

  return res.json({ message: 'Sessão encerrada com sucesso.' });
}));

module.exports = router;