import { describe, expect, it, jest } from '@jest/globals';
import { buscarTodasAsPaginas } from '../paginacao';

// Simula uma API com `total` itens numerados (1, 2, 3...), paginada
function apiComItens(total: number) {
  return jest.fn(async (page: number, perPage: number) => {
    const inicio = (page - 1) * perPage;
    const data = Array.from(
      { length: Math.max(0, Math.min(perPage, total - inicio)) },
      (_, i) => inicio + i + 1
    );
    return { data, pagination: { totalPages: Math.max(1, Math.ceil(total / perPage)) } };
  });
}

describe('buscarTodasAsPaginas', () => {
  it('junta os itens de todas as páginas, de 100 em 100', async () => {
    const buscarPagina = apiComItens(250);

    const itens = await buscarTodasAsPaginas(buscarPagina);

    expect(itens).toHaveLength(250);
    expect(itens[0]).toBe(1);
    expect(itens[249]).toBe(250);
    expect(buscarPagina.mock.calls).toEqual([
      [1, 100],
      [2, 100],
      [3, 100],
    ]);
  });

  it('com uma página só, faz uma chamada', async () => {
    const buscarPagina = apiComItens(73);

    const itens = await buscarTodasAsPaginas(buscarPagina);

    expect(itens).toHaveLength(73);
    expect(buscarPagina).toHaveBeenCalledTimes(1);
  });

  it('para em 50 páginas mesmo que a API diga que tem mais (trava de segurança)', async () => {
    const buscarPagina = jest.fn(async () => ({ data: [1], pagination: { totalPages: 9999 } }));

    await buscarTodasAsPaginas(buscarPagina);

    expect(buscarPagina).toHaveBeenCalledTimes(50);
  });
});
