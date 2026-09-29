// Maior página que o contrato garante que a API aceita (per_page de 1 a 100)
const ITENS_POR_PAGINA = 100;

// Trava de segurança: nunca busca mais que isso (5.000 itens), mesmo que a API se perca
const MAX_PAGINAS = 50;

type Pagina<T> = {
  data: T[];
  pagination: { totalPages: number };
};

// Busca TODAS as páginas de uma lista, de 100 em 100, e junta os itens.
// Usado pelo "Selecionar todas": marca tudo o que o filtro encontrou, inclusive o que
// ainda não apareceu na rolagem da tela.
export async function buscarTodasAsPaginas<T>(
  buscarPagina: (page: number, perPage: number) => Promise<Pagina<T>>
): Promise<T[]> {
  const itens: T[] = [];
  let page = 1;
  let totalPaginas = 1;

  do {
    const resposta = await buscarPagina(page, ITENS_POR_PAGINA);
    itens.push(...resposta.data);
    totalPaginas = resposta.pagination.totalPages;
    page += 1;
  } while (page <= totalPaginas && page <= MAX_PAGINAS);

  return itens;
}
