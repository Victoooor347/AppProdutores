// Entrada inválida tem que voltar 400 com mensagem em português, sem chegar no banco
// (antes, várias dessas viravam erro do Postgres e respondiam 500).
const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { CPF_TESTE, simularBanco, sessaoValida, subirApi } = require('../../testes/ferramentas');

const ID = '3f2b9c1e-8a41-4a3c-9d1e-2b7f6c0a1d22';
const OUTRO_ID = '3f2b9c1e-8a41-4a3c-9d1e-2b7f6c0a1d23';

let api;
let banco;
before(async () => {
  api = await subirApi();
});
after(() => api.fechar());
beforeEach(() => {
  banco = simularBanco(sessaoValida);
});
afterEach(() => banco.restaurar());

// Consultas além da conferência do token
function consultasDaRota() {
  return banco.consultas.filter((c) => !c.sql.includes('FROM sessions'));
}

describe('listas com entrada inválida → 400 sem ir no banco', () => {
  const casos = [
    ['/cargas?page=-1', 'Página inválida'],
    ['/cargas?page=0', 'Página inválida'],
    ['/cargas?per_page=1000000', 'de 1 a 100'],
    ['/cargas?ano=abc', 'Ano inválido'],
    ['/cargas?data_inicio=2026-02-30', 'Data inicial inválida'],
    ['/cargas?data_fim=ontem', 'Data final inválida'],
    ['/cargas?cultura=arroz&cultura=soja', 'cultura'],
    ['/cargas/resumo?ano=xyz', 'Ano inválido'],
    ['/contra-notas?page=1.5', 'Página inválida'],
    ['/contra-notas?per_page=101', 'de 1 a 100'],
    ['/contra-notas?data_inicio=15/10/2026', 'Data inicial inválida'],
  ];

  for (const [caminho, mensagem] of casos) {
    it(`GET ${caminho}`, async () => {
      const { status, corpo } = await api.chamar('GET', caminho);
      assert.equal(status, 400);
      assert.match(corpo.message, new RegExp(mensagem));
      assert.equal(consultasDaRota().length, 0);
    });
  }

  it('filtros válidos chegam no banco como parâmetros', async () => {
    banco.restaurar();
    banco = simularBanco((sql) =>
      sql.includes('COUNT(*)') ? { rows: [{ count: '0' }] } : sessaoValida(sql)
    );

    const { status, corpo } = await api.chamar(
      'GET',
      '/cargas?page=2&per_page=100&ano=2026&cultura=arroz&data_inicio=2026-01-01'
    );
    assert.equal(status, 200);
    assert.deepEqual(corpo.pagination, { page: 2, per_page: 100, total_items: 0, total_pages: 1 });
    const [lista] = banco.consultasCom('LIMIT');
    assert.deepEqual(lista.params, [CPF_TESTE, 2026, 'arroz', '2026-01-01', 100, 100]);
  });
});

describe('POST /relatorios/gerar-pdf', () => {
  it('ID fora do formato: 400', async () => {
    const { status, corpo } = await api.chamar('POST', '/relatorios/gerar-pdf', {
      corpo: { carga_ids: ['nao-e-uuid'] },
    });
    assert.equal(status, 400);
    assert.equal(corpo.message, 'Carga inválida na seleção.');
  });

  it('lista vazia: 400', async () => {
    const { status } = await api.chamar('POST', '/relatorios/gerar-pdf', {
      corpo: { carga_ids: [] },
    });
    assert.equal(status, 400);
  });

  it('mais de 2000 cargas: 400 com o limite na mensagem', async () => {
    const ids = Array.from({ length: 2001 }, (_, i) =>
      `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
    );
    const { status, corpo } = await api.chamar('POST', '/relatorios/gerar-pdf', {
      corpo: { carga_ids: ids },
    });
    assert.equal(status, 400);
    assert.match(corpo.message, /2000/);
  });

  it('carga de outro produtor: 403', async () => {
    banco.restaurar();
    banco = simularBanco((sql, params) => {
      if (sql.includes('FROM sessions')) return sessaoValida(sql);
      // Só a primeira carga é do produtor logado
      if (sql.includes('FROM cargas')) return { rows: [{ id: ID }] };
      return undefined;
    });

    const { status } = await api.chamar('POST', '/relatorios/gerar-pdf', {
      corpo: { carga_ids: [ID, OUTRO_ID] },
    });

    assert.equal(status, 403);
    assert.equal(banco.consultasCom('INSERT').length, 0);
    // A consulta filtra pelo CPF do token, não por algo que veio do celular
    assert.equal(banco.consultasCom('FROM cargas')[0].params[1], CPF_TESTE);
  });

  it('job com ID fora do formato: 404 sem ir no banco', async () => {
    const { status } = await api.chamar('GET', '/relatorios/gerar-pdf/abc');
    assert.equal(status, 404);
    assert.equal(consultasDaRota().length, 0);
  });
});

describe('POST /contra-notas/gerar-pdf', () => {
  it('mais de 200 notas: 400', async () => {
    const ids = Array.from({ length: 201 }, (_, i) =>
      `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
    );
    const { status, corpo } = await api.chamar('POST', '/contra-notas/gerar-pdf', {
      corpo: { contra_nota_ids: ids },
    });
    assert.equal(status, 400);
    assert.match(corpo.message, /200/);
  });
});

describe('PUT /me', () => {
  for (const [descricao, corpo] of [
    ['sem nome', { telefone: '1' }],
    ['nome em branco', { name: '   ' }],
    ['nome que não é texto', { name: 123 }],
  ]) {
    it(`${descricao}: 400`, async () => {
      const resposta = await api.chamar('PUT', '/me', { corpo });
      assert.equal(resposta.status, 400);
      assert.equal(resposta.corpo.message, 'O nome não pode ficar vazio.');
      assert.equal(consultasDaRota().length, 0);
    });
  }

  it('telefone que não é texto: 400', async () => {
    const { status } = await api.chamar('PUT', '/me', { corpo: { name: 'A', telefone: 123 } });
    assert.equal(status, 400);
  });

  it('dados válidos: grava o nome sem espaços nas pontas e vazio vira texto vazio', async () => {
    await api.chamar('PUT', '/me', { corpo: { name: '  Ana  ', telefone: '', propriedade: null } });
    const [update] = banco.consultasCom('UPDATE users');
    assert.deepEqual(update.params, ['Ana', '', null, CPF_TESTE]);
  });
});

describe('erros do corpo da requisição', () => {
  it('JSON malformado: 400 em português', async () => {
    const { status, corpo } = await api.chamar('POST', '/relatorios/gerar-pdf', {
      corpoCru: '{json quebrado',
    });
    assert.equal(status, 400);
    assert.equal(corpo.message, 'Requisição inválida.');
  });

  it('corpo grande demais: 413 em português', async () => {
    const { status, corpo } = await api.chamar('POST', '/relatorios/gerar-pdf', {
      corpoCru: JSON.stringify({ carga_ids: Array(3000).fill(ID) }),
    });
    assert.equal(status, 413);
    assert.match(corpo.message, /grande demais/);
  });
});
