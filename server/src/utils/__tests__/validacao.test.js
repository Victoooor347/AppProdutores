const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { lerPaginacao, lerAno, lerData, lerTexto, lerListaDeIds } = require('../validacao');

const ID = '3f2b9c1e-8a41-4a3c-9d1e-2b7f6c0a1d22';

// Confere que a função lança o erro 400 esperado
function deveRecusar(fn, trechoDaMensagem) {
  assert.throws(fn, (erro) => {
    assert.equal(erro.status, 400);
    assert.match(erro.message, new RegExp(trechoDaMensagem));
    return true;
  });
}

describe('lerPaginacao', () => {
  it('usa os padrões do contrato quando não vem nada', () => {
    assert.deepEqual(lerPaginacao({}), { page: 1, perPage: 20 });
  });

  it('aceita per_page=100, que o "Selecionar todas" do app usa', () => {
    assert.deepEqual(lerPaginacao({ page: '3', per_page: '100' }), { page: 3, perPage: 100 });
  });

  for (const page of ['0', '-1', '1.5', 'abc', '']) {
    it(`recusa page="${page}"`, () => deveRecusar(() => lerPaginacao({ page }), 'Página'));
  }

  for (const perPage of ['0', '101', '1000000']) {
    it(`recusa per_page=${perPage}`, () =>
      deveRecusar(() => lerPaginacao({ per_page: perPage }), 'de 1 a 100'));
  }

  it('recusa parâmetro repetido (?page=1&page=2 chega como lista)', () => {
    deveRecusar(() => lerPaginacao({ page: ['1', '2'] }), 'Página');
  });
});

describe('lerAno', () => {
  it('ano com 4 dígitos vira número', () => assert.equal(lerAno('2026'), 2026));
  it('sem ano: undefined', () => assert.equal(lerAno(undefined), undefined));
  it('recusa texto', () => deveRecusar(() => lerAno('abc'), 'Ano'));
});

describe('lerData', () => {
  it('aceita AAAA-MM-DD que existe', () => assert.equal(lerData('2026-02-28', 'Data'), '2026-02-28'));
  it('aceita 29/02 em ano bissexto', () => assert.equal(lerData('2028-02-29', 'Data'), '2028-02-29'));
  it('recusa dia que não existe', () => deveRecusar(() => lerData('2026-02-30', 'Data inicial'), 'Data inicial'));
  it('recusa outro formato', () => deveRecusar(() => lerData('28/02/2026', 'Data final'), 'AAAA-MM-DD'));
});

describe('lerTexto', () => {
  it('texto passa', () => assert.equal(lerTexto('123456789', 'de IE'), '123456789'));
  it('recusa parâmetro repetido', () => deveRecusar(() => lerTexto(['a', 'b'], 'de IE'), 'IE'));
});

describe('lerListaDeIds', () => {
  const opcoes = {
    maximo: 2,
    mensagemVazia: 'vazia',
    mensagemInvalida: 'inválido',
    mensagemMaximo: 'máximo',
  };

  it('tira repetidos, sem diferenciar maiúscula de minúscula', () => {
    assert.deepEqual(lerListaDeIds([ID, ID.toUpperCase()], opcoes), [ID]);
  });

  it('recusa lista vazia ou que não é lista', () => {
    deveRecusar(() => lerListaDeIds([], opcoes), 'vazia');
    deveRecusar(() => lerListaDeIds('x', opcoes), 'vazia');
  });

  it('recusa ID fora do formato UUID', () => {
    deveRecusar(() => lerListaDeIds([ID, 'abc'], opcoes), 'inválido');
    deveRecusar(() => lerListaDeIds([123], opcoes), 'inválido');
  });

  it('recusa acima do máximo (contando depois de tirar os repetidos)', () => {
    const outros = ['3f2b9c1e-8a41-4a3c-9d1e-2b7f6c0a1d23', '3f2b9c1e-8a41-4a3c-9d1e-2b7f6c0a1d24'];
    deveRecusar(() => lerListaDeIds([ID, ...outros], opcoes), 'máximo');
    assert.equal(lerListaDeIds([ID, ID, outros[0]], opcoes).length, 2);
  });
});
