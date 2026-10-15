const { erroHttp } = require('./erroHttp');

// Validação da entrada das rotas (query string e corpo). Entrada inválida vira erro 400
// com mensagem em português — nunca chega no banco, onde viraria um 500
// (ver "Validação de entrada" na seção 10 do contrato-api.md).

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const POR_PAGINA_PADRAO = 20;
const POR_PAGINA_MAXIMO = 100; // o contrato garante de 1 a 100

function ehUuid(valor) {
  return typeof valor === 'string' && UUID_REGEX.test(valor);
}

// Número inteiro positivo vindo da query string. Recusa "1.5", "-1", "abc" e parâmetro
// repetido (?page=1&page=2 chega como lista).
function lerInteiro(valor, { min, max, mensagem }) {
  if (typeof valor !== 'string' || !/^\d{1,9}$/.test(valor)) {
    throw erroHttp(400, mensagem);
  }
  const numero = Number(valor);
  if (numero < min || numero > max) {
    throw erroHttp(400, mensagem);
  }
  return numero;
}

// ?page=&per_page= → { page, perPage }, com os padrões do contrato quando não vierem.
function lerPaginacao(query) {
  const page =
    query.page === undefined
      ? 1
      : lerInteiro(query.page, {
          min: 1,
          max: Number.MAX_SAFE_INTEGER,
          mensagem: 'Página inválida. Use um número a partir de 1.',
        });
  const perPage =
    query.per_page === undefined
      ? POR_PAGINA_PADRAO
      : lerInteiro(query.per_page, {
          min: 1,
          max: POR_PAGINA_MAXIMO,
          mensagem: `Itens por página inválido. Use um número de 1 a ${POR_PAGINA_MAXIMO}.`,
        });
  return { page, perPage };
}

// ?ano= opcional, com 4 dígitos. Devolve undefined se não vier.
function lerAno(valor) {
  if (valor === undefined || valor === '') return undefined;
  return lerInteiro(valor, { min: 1900, max: 2999, mensagem: 'Ano inválido.' });
}

// Data opcional no formato AAAA-MM-DD, e que exista de verdade (recusa 2026-02-30).
function lerData(valor, nomeCampo) {
  if (valor === undefined || valor === '') return undefined;

  const mensagem = `${nomeCampo} inválida. Use o formato AAAA-MM-DD.`;
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw erroHttp(400, mensagem);
  }
  const data = new Date(`${valor}T00:00:00Z`);
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== valor) {
    throw erroHttp(400, mensagem);
  }
  return valor;
}

// Texto opcional da query string (filtros como IE e cultura). Recusa parâmetro repetido.
function lerTexto(valor, nomeCampo) {
  if (valor === undefined || valor === '') return undefined;
  if (typeof valor !== 'string') {
    throw erroHttp(400, `Filtro ${nomeCampo} inválido.`);
  }
  return valor;
}

// Lista de IDs (UUID) vinda do corpo, para os PDFs. Tira repetidos e confere o limite.
function lerListaDeIds(lista, { maximo, mensagemVazia, mensagemInvalida, mensagemMaximo }) {
  if (!Array.isArray(lista) || lista.length === 0) {
    throw erroHttp(400, mensagemVazia);
  }
  if (!lista.every(ehUuid)) {
    throw erroHttp(400, mensagemInvalida);
  }
  const ids = Array.from(new Set(lista.map((id) => id.toLowerCase())));
  if (ids.length > maximo) {
    throw erroHttp(400, mensagemMaximo);
  }
  return ids;
}

module.exports = {
  ehUuid,
  lerPaginacao,
  lerAno,
  lerData,
  lerTexto,
  lerListaDeIds,
};
