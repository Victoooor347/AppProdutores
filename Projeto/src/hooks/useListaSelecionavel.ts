import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

const SEM_SELECAO: ReadonlySet<string> = new Set();

// Uma página da API, já convertida pro formato do app
export type PaginaDaLista<T> = {
  data: T[];
  pagination: { page: number; totalPages: number; totalItems: number };
};

type Opcoes<T, F> = {
  token: string | null;
  // Precisa ser memorizado (useMemo) na tela: um objeto novo a cada render recarregaria a lista
  filtros: F;
  buscarPagina: (filtros: F, page: number, token: string) => Promise<PaginaDaLista<T>>;
  // IDs de tudo o que o filtro encontra, inclusive o que ainda não apareceu na rolagem
  buscarTodosIds: (filtros: F, token: string) => Promise<string[]>;
  mensagemErroLista: string;
  mensagemErroSelecao: string;
};

/**
 * Lista com rolagem infinita, pull-to-refresh e seleção múltipla ("Selecionar todas").
 * Usada pelo Relatório de Safra e pelas Contra-Notas.
 *
 * Trocar os filtros recarrega a página 1 e limpa a seleção (os itens marcados podem não
 * fazer parte do novo resultado).
 */
export function useListaSelecionavel<T extends { id: string }, F>({
  token,
  filtros,
  buscarPagina,
  buscarTodosIds,
  mensagemErroLista,
  mensagemErroSelecao,
}: Opcoes<T, F>) {
  const [itens, setItens] = useState<T[]>([]);
  const [paginacao, setPaginacao] = useState({ pagina: 1, totalPaginas: 1, totalItens: 0 });
  // Filtros da última página 1 que chegou da API (ver isLoading abaixo)
  const [filtrosCarregados, setFiltrosCarregados] = useState<F | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [isLoadingMais, setIsLoadingMais] = useState(false);
  const [erroMais, setErroMais] = useState(false);

  // Pull-to-refresh: incrementar o contador faz a lista buscar a página 1 de novo.
  // A tela também pode usar o contador pra recarregar outras coisas junto (ex: o resumo).
  const [recarregamentos, setRecarregamentos] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // A seleção guarda os filtros a que ela pertence. Trocar de filtro "limpa" a seleção sem
  // precisar apagar nada: a seleção antiga só deixa de valer (ver selectedIds abaixo).
  const [selecao, setSelecao] = useState<{ filtros: F; ids: Set<string> }>({
    filtros,
    ids: new Set(),
  });
  // Filtros para os quais um "Selecionar todas" está buscando os IDs (null = nenhum)
  const [selecionandoTodasPara, setSelecionandoTodasPara] = useState<F | null>(null);

  // Contador de buscas da lista: cada busca nova incrementa o contador, e a resposta só é
  // usada se ainda for a mais recente. Assim, se o usuário troca de filtro rápido, uma
  // resposta atrasada do filtro anterior não sobrescreve o resultado do filtro atual.
  const listaRequestRef = useRef(0);

  // "Está carregando" e a seleção são calculados, não guardados: enquanto o que temos for
  // de outro filtro, a tela mostra o carregamento e nenhum item marcado.
  const isLoading = filtrosCarregados !== filtros;
  const selectedIds: ReadonlySet<string> = selecao.filtros === filtros ? selecao.ids : SEM_SELECAO;
  const isSelecionandoTodas = selecionandoTodasPara === filtros;

  const limparSelecao = useCallback(() => {
    setSelecao({ filtros, ids: new Set() });
  }, [filtros]);

  // Busca a página 1 sempre que algum filtro muda (ou no pull-to-refresh)
  useEffect(() => {
    if (!token) return;
    const requestId = ++listaRequestRef.current;

    buscarPagina(filtros, 1, token)
      .then((response) => {
        if (requestId !== listaRequestRef.current) return;
        setItens(response.data);
        setPaginacao({
          pagina: response.pagination.page,
          totalPaginas: response.pagination.totalPages,
          totalItens: response.pagination.totalItems,
        });
        setErro(null);
      })
      .catch((error) => {
        if (requestId !== listaRequestRef.current) return;
        setErro(error?.message ?? mensagemErroLista);
      })
      .finally(() => {
        if (requestId !== listaRequestRef.current) return;
        setFiltrosCarregados(filtros);
        setIsRefreshing(false);
        // Se havia uma "próxima página" carregando, ela foi descartada por esta busca
        setIsLoadingMais(false);
        setErroMais(false);
      });
    // buscarPagina e a mensagem são fixas por tela; só filtros, token e o refresh recarregam
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, filtros, recarregamentos]);

  // Busca a próxima página e adiciona no fim da lista (rolagem infinita)
  async function carregarProximaPagina() {
    if (!token) return;
    const requestId = ++listaRequestRef.current;
    setIsLoadingMais(true);
    setErroMais(false);

    try {
      const response = await buscarPagina(filtros, paginacao.pagina + 1, token);
      if (requestId !== listaRequestRef.current) return;

      setItens((anteriores) => {
        // Evita repetir um item que apareça em duas páginas (ex: item novo cadastrado
        // enquanto o usuário rolava a lista).
        const idsCarregados = new Set(anteriores.map((item) => item.id));
        return [...anteriores, ...response.data.filter((item) => !idsCarregados.has(item.id))];
      });
      setPaginacao({
        pagina: response.pagination.page,
        totalPaginas: response.pagination.totalPages,
        totalItens: response.pagination.totalItems,
      });
    } catch {
      if (requestId !== listaRequestRef.current) return;
      setErroMais(true);
    } finally {
      if (requestId === listaRequestRef.current) setIsLoadingMais(false);
    }
  }

  // Chamada pela lista quando o usuário chega perto do fim: busca a próxima página, se houver
  function handleFimDaLista() {
    if (isLoading || isRefreshing || isLoadingMais || erroMais || erro) return;
    if (paginacao.pagina >= paginacao.totalPaginas) return;
    carregarProximaPagina();
  }

  function handleRefresh() {
    setIsRefreshing(true);
    setRecarregamentos((n) => n + 1);
  }

  function toggleSelecao(id: string) {
    setSelecao((prev) => {
      const next = new Set(prev.filtros === filtros ? prev.ids : []);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { filtros, ids: next };
    });
  }

  // Todos os itens do filtro já estão marcados? (a seleção é limpa ao trocar de filtro)
  const todasSelecionadas = paginacao.totalItens > 0 && selectedIds.size >= paginacao.totalItens;

  // "Selecionar todas" marca TODOS os itens do filtro, inclusive os que ainda não
  // apareceram na rolagem. Se já estão todos marcados, o botão desmarca.
  async function handleSelecionarTodas() {
    if (!token) return;
    if (todasSelecionadas) {
      limparSelecao();
      return;
    }

    // Se a lista já carregou tudo, não precisa ir na API
    if (itens.length >= paginacao.totalItens) {
      setSelecao({ filtros, ids: new Set(itens.map((item) => item.id)) });
      return;
    }

    // Se o usuário trocar de filtro no meio da busca, o resultado fica marcado com os
    // filtros antigos e é ignorado (ver selectedIds acima).
    const filtrosDaBusca = filtros;
    setSelecionandoTodasPara(filtrosDaBusca);
    try {
      const ids = await buscarTodosIds(filtrosDaBusca, token);
      setSelecao({ filtros: filtrosDaBusca, ids: new Set(ids) });
    } catch (error: any) {
      Alert.alert('Erro', error?.message ?? mensagemErroSelecao);
    } finally {
      setSelecionandoTodasPara((atual) => (atual === filtrosDaBusca ? null : atual));
    }
  }

  return {
    itens,
    totalItens: paginacao.totalItens,
    isLoading,
    erro,
    isLoadingMais,
    erroMais,
    isRefreshing,
    recarregamentos,
    carregarProximaPagina,
    handleFimDaLista,
    handleRefresh,
    selectedIds,
    toggleSelecao,
    todasSelecionadas,
    isSelecionandoTodas,
    handleSelecionarTodas,
  };
}
