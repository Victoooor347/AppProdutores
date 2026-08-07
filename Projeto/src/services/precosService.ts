import { api, ApiError } from './api'; // Importa a instância da API e o tipo ApiError do arquivo api.ts, que são usados para fazer requisições HTTP e tratar erros da API.
import { PrecoDia } from '../types/precos'; // Importa o tipo PrecoDia que define a estrutura dos preços do dia retornados pela API.

// Tipo que representa os dados brutos do preço do dia recebidos da API.
type RawPrecoDia = {
  commodity: PrecoDia['commodity'];
  nome_exibicao: string;
  preco: number;
  unidade: string;
  descricao?: string;
  atualizado_em: string;
};

// Função que mapeia os dados brutos do preço do dia recebidos da API para o formato esperado pelo frontend.
function mapPreco(raw: RawPrecoDia): PrecoDia {
  return {
    commodity: raw.commodity,
    nomeExibicao: raw.nome_exibicao,
    preco: raw.preco,
    unidade: raw.unidade,
    descricao: raw.descricao,
    atualizadoEm: raw.atualizado_em,
  };
}

// Função que busca os preços do dia, retornando uma lista de PrecoDia.
export async function getPrecosDoDia(token: string): Promise<PrecoDia[]> {
  try {
    const response = await api.get<{ data: RawPrecoDia[] }>('/precos-do-dia', token);
    return response.data.map(mapPreco);
  } catch (error) {
    const apiError = error as ApiError;
    // if (apiError.message === 'API_URL_NOT_CONFIGURED') {
    //   return mockPrecosDoDia();
    // }
    throw error;
  }
}

// async function mockPrecosDoDia(): Promise<PrecoDia[]> {
//   await new Promise((resolve) => setTimeout(resolve, 500));

//   const agora = new Date().toISOString();

//   return [
//     {
//       commodity: 'arroz',
//       nomeExibicao: 'Arroz',
//       preco: 63.2,
//       unidade: 'sc',
//       descricao: '62 x 8 de Grão inteiro, Tipo 1',
//       atualizadoEm: agora,
//     },
//     {
//       commodity: 'soja',
//       nomeExibicao: 'Soja',
//       preco: 123.5,
//       unidade: 'sc',
//       atualizadoEm: agora,
//     },
//   ];
// }