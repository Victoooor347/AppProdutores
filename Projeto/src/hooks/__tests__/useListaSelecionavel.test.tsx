import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Alert } from 'react-native';
import { act } from 'react-test-renderer';
import { PaginaDaLista, useListaSelecionavel } from '../useListaSelecionavel';
import { esperarRespostas, renderHook } from '../../testes/renderHook';

type Item = { id: string };
type Filtros = { ano: number };

function pagina(ids: string[], page: number, totalPages: number, totalItems: number) {
  return {
    data: ids.map((id) => ({ id })),
    pagination: { page, totalPages, totalItems },
  };
}

const FILTRO_2026: Filtros = { ano: 2026 };
const FILTRO_2025: Filtros = { ano: 2025 };

type BuscarPagina = (f: Filtros, page: number, token: string) => Promise<PaginaDaLista<Item>>;
type BuscarIds = (f: Filtros, token: string) => Promise<string[]>;

function montar(buscarPagina: BuscarPagina, buscarTodosIds: BuscarIds = jest.fn<BuscarIds>()) {
  return renderHook(
    ({ filtros }: { filtros: Filtros }) =>
      useListaSelecionavel<Item, Filtros>({
        token: 'tok',
        filtros,
        buscarPagina,
        buscarTodosIds,
        mensagemErroLista: 'erro lista',
        mensagemErroSelecao: 'erro seleção',
      }),
    { filtros: FILTRO_2026 }
  );
}

describe('useListaSelecionavel', () => {
  let alerta: jest.SpiedFunction<typeof Alert.alert>;

  beforeEach(() => {
    alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('carrega a página 1 e mostra carregamento até a resposta chegar', async () => {
    const buscarPagina = jest.fn<BuscarPagina>().mockResolvedValue(pagina(['a', 'b'], 1, 1, 2));
    const { result } = montar(buscarPagina);

    expect(result.current.isLoading).toBe(true);
    await esperarRespostas();

    expect(buscarPagina).toHaveBeenCalledWith(FILTRO_2026, 1, 'tok');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.itens).toEqual([{ id: 'a' }, { id: 'b' }]);
    expect(result.current.totalItens).toBe(2);
  });

  it('erro na página 1 vira mensagem na tela', async () => {
    const buscarPagina = jest.fn<BuscarPagina>().mockRejectedValue({ message: 'Sem conexão' });
    const { result } = montar(buscarPagina);
    await esperarRespostas();

    expect(result.current.erro).toBe('Sem conexão');
    expect(result.current.isLoading).toBe(false);
  });

  it('rolagem: adiciona a próxima página sem repetir itens', async () => {
    const buscarPagina = jest
      .fn<BuscarPagina>()
      .mockResolvedValueOnce(pagina(['a', 'b'], 1, 2, 3))
      .mockResolvedValueOnce(pagina(['b', 'c'], 2, 2, 3));
    const { result } = montar(buscarPagina);
    await esperarRespostas();

    act(() => result.current.handleFimDaLista());
    await esperarRespostas();

    expect(buscarPagina).toHaveBeenLastCalledWith(FILTRO_2026, 2, 'tok');
    expect(result.current.itens.map((i) => i.id)).toEqual(['a', 'b', 'c']);

    // Já está na última página: chegar no fim de novo não busca mais nada
    act(() => result.current.handleFimDaLista());
    expect(buscarPagina).toHaveBeenCalledTimes(2);
  });

  it('resposta atrasada de um filtro antigo é descartada', async () => {
    let responderAntigo!: (p: PaginaDaLista<Item>) => void;
    const buscarPagina = jest
      .fn<BuscarPagina>()
      .mockImplementationOnce(() => new Promise((resolve) => (responderAntigo = resolve)))
      .mockResolvedValueOnce(pagina(['novo'], 1, 1, 1));
    const { result, rerender } = montar(buscarPagina);

    rerender({ filtros: FILTRO_2025 });
    await esperarRespostas();
    await act(async () => responderAntigo(pagina(['antigo'], 1, 1, 1)));

    expect(result.current.itens).toEqual([{ id: 'novo' }]);
  });

  it('marca e desmarca itens; trocar de filtro limpa a seleção', async () => {
    const buscarPagina = jest.fn<BuscarPagina>().mockResolvedValue(pagina(['a', 'b'], 1, 1, 2));
    const { result, rerender } = montar(buscarPagina);
    await esperarRespostas();

    act(() => result.current.toggleSelecao('a'));
    act(() => result.current.toggleSelecao('b'));
    act(() => result.current.toggleSelecao('a'));
    expect(Array.from(result.current.selectedIds)).toEqual(['b']);

    rerender({ filtros: FILTRO_2025 });
    expect(result.current.selectedIds.size).toBe(0);
    await esperarRespostas(); // a troca de filtro dispara a busca da nova página 1
  });

  it('"Selecionar todas" com a lista inteira carregada não vai na API', async () => {
    const buscarPagina = jest.fn<BuscarPagina>().mockResolvedValue(pagina(['a', 'b'], 1, 1, 2));
    const buscarTodosIds = jest.fn<BuscarIds>();
    const { result } = montar(buscarPagina, buscarTodosIds);
    await esperarRespostas();

    await act(() => result.current.handleSelecionarTodas());

    expect(buscarTodosIds).not.toHaveBeenCalled();
    expect(result.current.todasSelecionadas).toBe(true);

    // Segundo toque desmarca tudo
    await act(() => result.current.handleSelecionarTodas());
    expect(result.current.selectedIds.size).toBe(0);
  });

  it('"Selecionar todas" busca os IDs que ainda não apareceram na rolagem', async () => {
    const buscarPagina = jest.fn<BuscarPagina>().mockResolvedValue(pagina(['a', 'b'], 1, 2, 4));
    const buscarTodosIds = jest.fn<BuscarIds>().mockResolvedValue(['a', 'b', 'c', 'd']);
    const { result } = montar(buscarPagina, buscarTodosIds);
    await esperarRespostas();

    await act(() => result.current.handleSelecionarTodas());

    expect(buscarTodosIds).toHaveBeenCalledWith(FILTRO_2026, 'tok');
    expect(result.current.selectedIds.size).toBe(4);
    expect(result.current.todasSelecionadas).toBe(true);
    expect(result.current.isSelecionandoTodas).toBe(false);
  });

  it('"Selecionar todas" que termina depois da troca de filtro não marca nada', async () => {
    const buscarPagina = jest.fn<BuscarPagina>().mockResolvedValue(pagina(['a'], 1, 2, 2));
    let responderIds!: (ids: string[]) => void;
    const buscarTodosIds = jest
      .fn<BuscarIds>()
      .mockImplementation(() => new Promise((resolve) => (responderIds = resolve)));
    const { result, rerender } = montar(buscarPagina, buscarTodosIds);
    await esperarRespostas();

    let selecionando!: Promise<void>;
    act(() => {
      selecionando = result.current.handleSelecionarTodas();
    });
    expect(result.current.isSelecionandoTodas).toBe(true);

    rerender({ filtros: FILTRO_2025 });
    expect(result.current.isSelecionandoTodas).toBe(false);

    await act(async () => {
      responderIds(['a', 'b']);
      await selecionando;
    });
    expect(result.current.selectedIds.size).toBe(0);
  });

  it('erro no "Selecionar todas" avisa o produtor', async () => {
    const buscarPagina = jest.fn<BuscarPagina>().mockResolvedValue(pagina(['a'], 1, 2, 2));
    const buscarTodosIds = jest.fn<BuscarIds>().mockRejectedValue({});
    const { result } = montar(buscarPagina, buscarTodosIds);
    await esperarRespostas();

    await act(() => result.current.handleSelecionarTodas());

    expect(alerta).toHaveBeenCalledWith('Erro', 'erro seleção');
    expect(result.current.isSelecionandoTodas).toBe(false);
  });
});
