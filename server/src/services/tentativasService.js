const { pool } = require('../db');
const { erroHttp } = require('../utils/erroHttp');

// Limites contra força bruta (ver "Proteção" na seção 9 do contrato-api.md).
// Cada tipo conta tentativas numa janela de tempo, por CPF e por IP — o limite por IP é maior
// porque vários produtores podem usar a mesma internet (ex: Wi-Fi da cooperativa).
const LIMITES = {
  // Erros de login: senha errada ou CPF inexistente
  login: { janelaMinutos: 15, maxPorCpf: 5, maxPorIp: 20 },
  // Pedidos de código por e-mail, inclusive para CPF não cadastrado. Por CPF o limite já
  // existe no codigoService; aqui é só por IP, pra ninguém testar vários CPFs em sequência.
  pedido_codigo: { janelaMinutos: 60, maxPorCpf: null, maxPorIp: 20 },
};

const MENSAGEM_LIMITE = 'Muitas tentativas. Tente novamente em alguns minutos.';

// Atenção: atrás de um proxy/load balancer, req.ip é o endereço do proxy. Nesse caso é preciso
// configurar o "trust proxy" do Express para o IP real do celular chegar aqui.
function ipDaRequisicao(req) {
  return req.ip || 'desconhecido';
}

// Lança 429 se o CPF ou o IP já passaram do limite na janela de tempo
async function conferirLimite(tipo, { cpf, ip }) {
  const { janelaMinutos, maxPorCpf, maxPorIp } = LIMITES[tipo];

  const { rows } = await pool.query(
    `SELECT COUNT(*) FILTER (WHERE cpf = $2)::int AS por_cpf,
            COUNT(*) FILTER (WHERE ip = $3)::int AS por_ip
     FROM tentativas
     WHERE tipo = $1 AND created_at > now() - make_interval(mins => $4)
       AND (cpf = $2 OR ip = $3)`,
    [tipo, cpf, ip, janelaMinutos]
  );
  const { por_cpf: porCpf, por_ip: porIp } = rows[0];

  if ((maxPorCpf !== null && porCpf >= maxPorCpf) || porIp >= maxPorIp) {
    throw erroHttp(429, MENSAGEM_LIMITE);
  }
}

async function registrarTentativa(tipo, { cpf, ip }) {
  await pool.query(`INSERT INTO tentativas (tipo, cpf, ip) VALUES ($1, $2, $3)`, [tipo, cpf, ip]);
  // Faxina: tentativas com mais de 1 dia não contam pra limite nenhum
  await pool.query(`DELETE FROM tentativas WHERE created_at < now() - interval '1 day'`);
}

// Login certo zera os erros do CPF (o produtor que errou a senha 4 vezes e acertou na 5ª
// não fica perto do bloqueio na próxima vez)
async function limparTentativas(tipo, { cpf }) {
  await pool.query(`DELETE FROM tentativas WHERE tipo = $1 AND cpf = $2`, [tipo, cpf]);
}

module.exports = { ipDaRequisicao, conferirLimite, registrarTentativa, limparTentativas };
