import { api, ApiError } from './api';
import { ContraNota, ContraNotasFiltros, ContraNotasResponse } from '../types/contranotas';
import { mapPagination, RawPagination } from '../utils/apiMappers';

type RawContraNota = {
  id: string;
  numero: string;
  data_emissao: string;
  arquivo_pdf_url: string;
};

function mapContraNota(raw: RawContraNota): ContraNota {
  return {
    id: raw.id,
    numero: raw.numero,
    dataEmissao: raw.data_emissao,
    arquivoPdfUrl: raw.arquivo_pdf_url,
  };
}

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
    if (apiError.message === 'API_URL_NOT_CONFIGURED') {
      return mockListContraNotas(filtros);
    }
    throw error;
  }
}

async function mockListContraNotas(filtros: ContraNotasFiltros): Promise<ContraNotasResponse> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const todas = [
    {
      id: 'cn_001',
      numero: '000123',
      dataEmissao: '2026-07-15T00:00:00Z',
      arquivoPdfUrl: 'https://exemplo.com/mock/contra-nota-000123.pdf',
    },
    {
      id: 'cn_002',
      numero: '000124',
      dataEmissao: '2026-07-18T00:00:00Z',
      arquivoPdfUrl: 'https://exemplo.com/mock/contra-nota-000124.pdf',
    },
    {
      id: 'cn_003',
      numero: '000125',
      dataEmissao: '2026-07-22T00:00:00Z',
      arquivoPdfUrl: 'https://exemplo.com/mock/contra-nota-000125.pdf',
    },
  ];

  return {
    data: todas,
    pagination: {
      page: filtros.page ?? 1,
      perPage: filtros.perPage ?? 20,
      totalItems: todas.length,
      totalPages: 1,
    },
  };
}