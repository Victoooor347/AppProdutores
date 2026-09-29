const express = require('express');
const crypto = require('crypto');
const { pool } = require('../db');
const { asyncHandler } = require('../utils/asyncHandler');
const { requireAuth, hashToken } = require('../middleware/auth');
const { enviarEmail } = require('../services/emailService');
const {
  VALIDADE_CODIGO_SEGUNDOS,
  INTERVALO_REENVIO_SEGUNDOS,
  erroHttp,
  mascararEmail,
  criarCodigo,
  descartarCodigo,
  verificarCodigo,
  montarEmailCodigo,
} = require('../services/codigoService');

const router = express.Router();

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 1 dia (decidido no contrato)
const MIN_PASSWORD_LENGTH = 6; // mesma regra do app (Projeto/src/utils/validators.ts)
const JA_TEM_SENHA = 'Este CPF já tem senha. Se não lembrar dela, use "Esqueci minha senha".';

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

  const result = await pool.query(
    `SELECT cpf, name,
            password_hash IS NULL AS sem_senha,
            password_hash = crypt($2, password_hash) AS senha_confere
     FROM users
     WHERE cpf = $1`,
    [digits, password]
  );

  const user = result.rows[0];

  // Produtor cadastrado pela empresa que ainda não criou a senha no app
  if (user && user.sem_senha) {
    return res.status(401).json({
      message: 'Você ainda não criou sua senha. Toque em "Primeiro acesso" para criar.',
    });
  }

  // IMPORTANTE (segurança): mesma mensagem genérica tanto para CPF
  // inexistente quanto para senha errada — evita enumeração de usuários
  // (ver observação no contrato da API).
  if (!user || !user.senha_confere) {
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

// ---------------------------------------------------------------
// Primeiro acesso e recuperação de senha (código enviado por e-mail)
// ---------------------------------------------------------------

// Busca o produtor pelo CPF. O e-mail vem SEMPRE do cadastro da empresa, nunca do app —
// é isso que impede alguém de criar ou trocar a senha da conta de outra pessoa.
async function buscarProdutor(cpf) {
  const digits = String(cpf || '').replace(/\D/g, '');
  if (digits.length !== 11) {
    throw erroHttp(400, 'Informe um CPF válido.');
  }

  const { rows } = await pool.query(
    `SELECT cpf, name, email, password_hash IS NOT NULL AS tem_senha FROM users WHERE cpf = $1`,
    [digits]
  );
  const produtor = rows[0];

  if (!produtor) {
    throw erroHttp(404, 'CPF não encontrado. Fale com a Dickow para fazer seu cadastro.');
  }
  if (!produtor.email) {
    throw erroHttp(
      422,
      'Não há e-mail cadastrado para este CPF. Fale com a Dickow para atualizar seu cadastro.'
    );
  }
  return produtor;
}

function validarFormatoCodigo(codigo) {
  if (!/^\d{6}$/.test(String(codigo || ''))) {
    throw erroHttp(400, 'Digite o código de 6 números que chegou no seu e-mail.');
  }
}

function validarNovaSenha(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw erroHttp(400, `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }
}

// Gera o código, manda por e-mail e responde pro app para onde ele foi (e-mail mascarado).
async function enviarCodigo(produtor, finalidade, res) {
  const { id, codigo } = await criarCodigo(produtor.cpf, finalidade);

  try {
    await enviarEmail(
      montarEmailCodigo({ nome: produtor.name, email: produtor.email, codigo, finalidade })
    );
  } catch (err) {
    // Sem o e-mail o código não serve pra nada — descarta pra não travar o próximo pedido
    await descartarCodigo(id);
    console.error('Falha ao enviar e-mail com código:', err);
    return res
      .status(503)
      .json({ message: 'Não foi possível enviar o e-mail agora. Tente novamente em alguns minutos.' });
  }

  return res.json({
    email_mascarado: mascararEmail(produtor.email),
    expira_em_segundos: VALIDADE_CODIGO_SEGUNDOS,
    reenviar_em_segundos: INTERVALO_REENVIO_SEGUNDOS,
  });
}

// Grava a nova senha e já abre uma sessão — o produtor entra direto no app.
async function definirSenhaEEntrar(produtor, password, res) {
  await pool.query(`UPDATE users SET password_hash = crypt($2, gen_salt('bf')) WHERE cpf = $1`, [
    produtor.cpf,
    password,
  ]);

  const { token, expiresIn } = await createSession(produtor.cpf);

  return res.json({
    user: { cpf: produtor.cpf, name: produtor.name },
    token,
    expires_in: expiresIn,
  });
}

// POST /auth/primeiro-acesso/solicitar-codigo — produtor cadastrado pela empresa, ainda sem senha
router.post('/primeiro-acesso/solicitar-codigo', asyncHandler(async (req, res) => {
  const produtor = await buscarProdutor(req.body.cpf);
  if (produtor.tem_senha) {
    throw erroHttp(409, JA_TEM_SENHA);
  }
  return enviarCodigo(produtor, 'primeiro_acesso', res);
}));

// POST /auth/primeiro-acesso/confirmar — confere o código, cria a senha e entra
router.post('/primeiro-acesso/confirmar', asyncHandler(async (req, res) => {
  const { codigo, password } = req.body;
  validarFormatoCodigo(codigo);
  validarNovaSenha(password);

  const produtor = await buscarProdutor(req.body.cpf);
  if (produtor.tem_senha) {
    throw erroHttp(409, JA_TEM_SENHA);
  }

  await verificarCodigo(produtor.cpf, 'primeiro_acesso', codigo);
  return definirSenhaEEntrar(produtor, password, res);
}));

// POST /auth/recuperar-senha/solicitar-codigo
router.post('/recuperar-senha/solicitar-codigo', asyncHandler(async (req, res) => {
  const produtor = await buscarProdutor(req.body.cpf);
  return enviarCodigo(produtor, 'recuperar_senha', res);
}));

// POST /auth/recuperar-senha/confirmar — confere o código, troca a senha e entra
router.post('/recuperar-senha/confirmar', asyncHandler(async (req, res) => {
  const { codigo, password } = req.body;
  validarFormatoCodigo(codigo);
  validarNovaSenha(password);

  const produtor = await buscarProdutor(req.body.cpf);
  await verificarCodigo(produtor.cpf, 'recuperar_senha', codigo);

  // Se alguém estava usando a conta com a senha antiga (em outro celular), perde o acesso agora
  await pool.query(
    `UPDATE sessions SET revoked_at = now() WHERE user_cpf = $1 AND revoked_at IS NULL`,
    [produtor.cpf]
  );

  return definirSenhaEEntrar(produtor, password, res);
}));

module.exports = router;