// Ferramentas usadas só nos testes automatizados (npm test). A API não importa nada daqui.
const { once } = require('node:events');
const { pool } = require('../db');
const { app } = require('../app');

const CPF_TESTE = '52998224725';

/**
 * Troca o banco por respostas programadas: cada consulta passa pela função `responder`,
 * que recebe o SQL e os parâmetros e devolve { rows, rowCount }. Sem resposta, devolve vazio.
 * Guarda todas as consultas feitas, pra o teste conferir o que a rota fez (ou não fez) no banco.
 */
function simularBanco(responder = () => undefined) {
  const consultas = [];
  const original = pool.query;
  pool.query = async (sql, params = []) => {
    consultas.push({ sql, params });
    const resposta = await responder(sql, params);
    return { rows: [], rowCount: 0, ...resposta };
  };
  return {
    consultas,
    // Consultas cujo SQL contém esse trecho
    consultasCom: (trecho) => consultas.filter((c) => c.sql.includes(trecho)),
    restaurar: () => {
      pool.query = original;
    },
  };
}

// Resposta do banco pra conferência do token (middleware/auth.js): sessão válida do CPF_TESTE
function sessaoValida(sql) {
  if (sql.includes('FROM sessions')) {
    return {
      rows: [{ user_cpf: CPF_TESTE, expires_at: new Date(Date.now() + 60_000), revoked_at: null }],
    };
  }
  return undefined;
}

// Sobe a API numa porta livre. `chamar` faz a requisição já com JSON e token.
async function subirApi() {
  const servidor = app.listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  const base = `http://127.0.0.1:${servidor.address().port}`;

  async function chamar(metodo, caminho, { corpo, token = 'token-de-teste', corpoCru } = {}) {
    const resposta = await fetch(base + caminho, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: corpoCru ?? (corpo === undefined ? undefined : JSON.stringify(corpo)),
    });
    return { status: resposta.status, corpo: await resposta.json().catch(() => null) };
  }

  return { chamar, fechar: () => new Promise((resolve) => servidor.close(resolve)) };
}

module.exports = { CPF_TESTE, simularBanco, sessaoValida, subirApi };
