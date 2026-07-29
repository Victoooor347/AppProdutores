const crypto = require('crypto');
const { pool } = require('../db');
const { asyncHandler } = require('../utils/asyncHandler');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Confere o token contra a tabela sessions: precisa existir, não estar
// revogado (logout já invalidou) e não estar expirado.
async function requireAuthHandler(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Não autenticado.' });
  }

  const tokenHash = hashToken(token);

  const result = await pool.query(
    `SELECT user_cpf, expires_at, revoked_at
     FROM sessions
     WHERE token_hash = $1`,
    [tokenHash]
  );

  const session = result.rows[0];

  if (!session || session.revoked_at || new Date(session.expires_at) < new Date()) {
    return res.status(401).json({ message: 'Sessão inválida ou expirada.' });
  }

  req.userCpf = session.user_cpf;
  req.token = token;
  req.tokenHash = tokenHash;
  next();
}

const requireAuth = asyncHandler(requireAuthHandler);

module.exports = { requireAuth, hashToken };