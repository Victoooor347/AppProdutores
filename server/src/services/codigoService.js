const crypto = require('crypto');
const { pool } = require('../db');

// Regras dos códigos enviados por e-mail (primeiro acesso e recuperação de senha)
const VALIDADE_CODIGO_SEGUNDOS = 10 * 60; // 10 minutos
const INTERVALO_REENVIO_SEGUNDOS = 60; // tempo mínimo entre dois pedidos de código
const MAX_CODIGOS_POR_HORA = 5; // por CPF e finalidade — evita usar o app pra lotar o e-mail de alguém
const MAX_TENTATIVAS = 5; // códigos errados antes de invalidar

const FINALIDADES = ['primeiro_acesso', 'recuperar_senha'];

// Erro com status HTTP: o tratamento de erro do index.js devolve { message } com esse status.
function erroHttp(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// 6 dígitos com gerador criptográfico (Math.random é previsível — não serve pra segurança).
function gerarCodigo() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

// "joao.silva@gmail.com" → "jo****@gmail.com". Mostra onde procurar sem expor o e-mail inteiro.
// A quantidade de * é fixa, pra não revelar o tamanho do e-mail.
function mascararEmail(email) {
  const [usuario, dominio] = email.split('@');
  const visivel = usuario.length <= 2 ? usuario.slice(0, 1) : usuario.slice(0, 2);
  return `${visivel}****@${dominio}`;
}

/**
 * Cria um código novo pro CPF/finalidade, respeitando os limites de envio.
 * Só o código mais recente vale — pedir outro invalida os anteriores.
 * @returns {Promise<{ id: string, codigo: string }>}
 */
async function criarCodigo(userCpf, finalidade) {
  // Conta os pedidos da última hora e quantos segundos faltam pra liberar o próximo
  // (calculado no banco, pra não depender do relógio do servidor da API).
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS pedidos_na_hora,
            CEIL(EXTRACT(EPOCH FROM (MAX(created_at) + make_interval(secs => $3) - now())))::int AS espera
     FROM verification_codes
     WHERE user_cpf = $1 AND purpose = $2 AND created_at > now() - interval '1 hour'`,
    [userCpf, finalidade, INTERVALO_REENVIO_SEGUNDOS]
  );
  const { pedidos_na_hora: pedidosNaHora, espera } = rows[0];

  if (espera > 0) {
    throw erroHttp(429, `Aguarde ${espera} segundos para pedir um novo código.`);
  }
  if (pedidosNaHora >= MAX_CODIGOS_POR_HORA) {
    throw erroHttp(429, 'Você pediu muitos códigos. Tente de novo daqui a 1 hora.');
  }

  const codigo = gerarCodigo();
  const result = await pool.query(
    `INSERT INTO verification_codes (user_cpf, purpose, code_hash, expires_at)
     VALUES ($1, $2, crypt($3, gen_salt('bf')), now() + make_interval(secs => $4))
     RETURNING id`,
    [userCpf, finalidade, codigo, VALIDADE_CODIGO_SEGUNDOS]
  );

  return { id: result.rows[0].id, codigo };
}

// Apaga um código (usado quando o e-mail não pôde ser enviado, pra não contar como pedido).
async function descartarCodigo(id) {
  await pool.query(`DELETE FROM verification_codes WHERE id = $1`, [id]);
}

/**
 * Confere o código digitado. Se estiver certo, marca como usado (uso único).
 * Se estiver errado, conta a tentativa. Lança erro 400 com a mensagem pro produtor.
 */
async function verificarCodigo(userCpf, finalidade, codigo) {
  const { rows } = await pool.query(
    `SELECT id, attempts, used_at,
            expires_at < now() AS expirado,
            code_hash = crypt($3, code_hash) AS confere
     FROM verification_codes
     WHERE user_cpf = $1 AND purpose = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [userCpf, finalidade, codigo]
  );
  const atual = rows[0];

  if (!atual || atual.used_at) {
    throw erroHttp(400, 'Não há código válido para este CPF. Peça um novo código.');
  }
  if (atual.expirado) {
    throw erroHttp(400, 'Este código expirou. Peça um novo código.');
  }
  if (atual.attempts >= MAX_TENTATIVAS) {
    throw erroHttp(400, 'Muitas tentativas com código errado. Peça um novo código.');
  }

  if (!atual.confere) {
    await pool.query(`UPDATE verification_codes SET attempts = attempts + 1 WHERE id = $1`, [
      atual.id,
    ]);
    const restantes = MAX_TENTATIVAS - atual.attempts - 1;
    throw erroHttp(
      400,
      restantes > 0
        ? `Código incorreto. Você ainda tem ${restantes} ${restantes === 1 ? 'tentativa' : 'tentativas'}.`
        : 'Código incorreto. Peça um novo código.'
    );
  }

  // "AND used_at IS NULL" garante uso único mesmo se duas requisições chegarem juntas
  const usado = await pool.query(
    `UPDATE verification_codes SET used_at = now() WHERE id = $1 AND used_at IS NULL RETURNING id`,
    [atual.id]
  );
  if (usado.rowCount === 0) {
    throw erroHttp(400, 'Este código já foi usado. Peça um novo código.');
  }
}

// Escapa texto que vai dentro do HTML do e-mail (o nome vem do banco)
function escaparHtml(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Monta o e-mail com o código
function montarEmailCodigo({ nome, email, codigo, finalidade }) {
  const acao =
    finalidade === 'primeiro_acesso' ? 'criar sua senha' : 'redefinir sua senha';
  const minutos = VALIDADE_CODIGO_SEGUNDOS / 60;

  const texto =
    `Olá, ${nome}!\n\n` +
    `Use o código abaixo para ${acao} no app Dickow Produtores:\n\n` +
    `${codigo}\n\n` +
    `O código vale por ${minutos} minutos e só pode ser usado uma vez.\n` +
    'Se não foi você que pediu, ignore este e-mail — sua conta continua segura.\n\n' +
    'Dickow Alimentos';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; color: #1C1C1C;">
      <h2 style="color: #085227;">Dickow Produtores</h2>
      <p>Olá, ${escaparHtml(nome)}!</p>
      <p>Use o código abaixo para ${acao} no app:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #085227;">${codigo}</p>
      <p>O código vale por ${minutos} minutos e só pode ser usado uma vez.</p>
      <p style="color: #9E9E9E; font-size: 12px;">
        Se não foi você que pediu, ignore este e-mail — sua conta continua segura.
      </p>
    </div>`;

  return { para: email, assunto: `${codigo} é o seu código — Dickow Produtores`, texto, html };
}

module.exports = {
  FINALIDADES,
  VALIDADE_CODIGO_SEGUNDOS,
  INTERVALO_REENVIO_SEGUNDOS,
  erroHttp,
  mascararEmail,
  criarCodigo,
  descartarCodigo,
  verificarCodigo,
  montarEmailCodigo,
};
