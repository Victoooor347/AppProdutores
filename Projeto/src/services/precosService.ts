import { api } from './api'; // Importa a instância da API, usada para fazer requisições HTTP.
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
  const response = await api.get<{ data: RawPrecoDia[] }>('/precos-do-dia', token);
  return response.data.map(mapPreco);
}
