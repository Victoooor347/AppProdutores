import { api, ApiError } from './api'; // Importa a instância da API e o tipo ApiError do arquivo api.ts, que são usados para fazer requisições HTTP e tratar erros da API.
import { ContraNota, ContraNotasFiltros, ContraNotasResponse } from '../types/contranotas'; // Importa os tipos ContraNota, ContraNotasFiltros e ContraNotasResponse que definem a estrutura das contra notas, os filtros possíveis para listagem e a resposta paginada da listagem de contra notas.
import { mapPagination, RawPagination } from '../utils/apiMappers'; // Importa a função mapPagination e o tipo RawPagination do arquivo apiMappers.ts, que são usados para mapear a paginação da resposta da API para o formato esperado pelo frontend.

// Tipo que representa os dados brutos da contra nota recebidos da API.
type RawContraNota = {
  id: string;
  numero: string;
  data_emissao: string;
  arquivo_pdf_url: string;
};

// Função que mapeia os dados brutos da contra nota recebidos da API para o formato esperado pelo frontend.
function mapContraNota(raw: RawContraNota): ContraNota {
  return {
    id: raw.id,
    numero: raw.numero,
    dataEmissao: raw.data_emissao,
    arquivoPdfUrl: raw.arquivo_pdf_url,
  };
}

// Função auxiliar que constrói uma query string a partir de um objeto de parâmetros, ignorando valores undefined, null ou vazios.
function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

// Função que lista as contra notas com base nos filtros fornecidos, retornando uma resposta paginada.
export async function listContraNotas(
  filtros: ContraNotasFiltros,
  token: string
): Promise<ContraNotasResponse> {
  try {
    const query = buildQuery({ page: filtros.page, per_page: filtros.perPage });
    const response = await api.get<{ data: RawContraNota[]; pagination: RawPagination }>(
      `/contra-notas${query}`,
      token
    );
    return {
      data: response.data.map(mapContraNota),
      pagination: mapPagination(response.pagination),
    };
  } catch (error) {
    const apiError = error as ApiError;
    // if (apiError.message === 'API_URL_NOT_CONFIGURED') {
    //   return mockListContraNotas(filtros);
    // }
    throw error;
  }
}

// async function mockListContraNotas(filtros: ContraNotasFiltros): Promise<ContraNotasResponse> {
//   await new Promise((resolve) => setTimeout(resolve, 500));

//   const todas = [
//     {
//       id: 'cn_001',
//       numero: '000123',
//       dataEmissao: '2026-07-15T00:00:00Z',
//       arquivoPdfUrl: 'https://exemplo.com/mock/contra-nota-000123.pdf',
//     },
//     {
//       id: 'cn_002',
//       numero: '000124',
//       dataEmissao: '2026-07-18T00:00:00Z',
//       arquivoPdfUrl: 'https://exemplo.com/mock/contra-nota-000124.pdf',
//     },
//     {
//       id: 'cn_003',
//       numero: '000125',
//       dataEmissao: '2026-07-22T00:00:00Z',
//       arquivoPdfUrl: 'https://exemplo.com/mock/contra-nota-000125.pdf',
//     },
//   ];

//   return {
//     data: todas,
//     pagination: {
//       page: filtros.page ?? 1,
//       perPage: filtros.perPage ?? 20,
//       totalItems: todas.length,
//       totalPages: 1,
//     },
//   };
// }