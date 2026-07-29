import { api, ApiError } from './api';
import {
  Carga,
  CargasFiltros,
  CargasResponse,
  GerarPdfJob,
  ResumoCultura,
} from '../types/cargas';

// Mesma ideia do authService: se EXPO_PUBLIC_API_URL não estiver configurada,
// cai automaticamente no mock — assim dá pra montar a tela de Relatório de
// Safra sem esperar o backend.

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

export async function getResumoCargas(ano: number, token: string): Promise<ResumoCultura[]> {
  try {
    const query = buildQuery({ ano });
    const response = await api.get<{ data: ResumoCultura[] }>(`/cargas/resumo${query}`, token);
    return response.data;
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.message === 'API_URL_NOT_CONFIGURED') {
      return mockResumoCargas();
    }
    throw error;
  }
}

export async function listCargas(
  filtros: CargasFiltros,
  token: string
): Promise<CargasResponse> {
  try {
    const query = buildQuery({
      page: filtros.page,
      per_page: filtros.perPage,
      ano: filtros.ano,
      inscricao_estadual: filtros.inscricaoEstadual,
      cultura: filtros.cultura,
      data: filtros.data,
    });
    return await api.get<CargasResponse>(`/cargas${query}`, token);
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.message === 'API_URL_NOT_CONFIGURED') {
      return mockListCargas(filtros);
    }
    throw error;
  }
}

// Inicia a geração assíncrona do PDF combinando as cargas selecionadas.
export async function gerarPdfCargas(cargaIds: string[], token: string): Promise<GerarPdfJob> {
  try {
    return await api.post<GerarPdfJob>('/relatorios/gerar-pdf', { carga_ids: cargaIds });
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.message === 'API_URL_NOT_CONFIGURED') {
      return mockGerarPdfCargas();
    }
    throw error;
  }
}

// Consulta o status do job de geração de PDF (polling).
export async function consultarJobPdf(jobId: string, token: string): Promise<GerarPdfJob> {
  try {
    return await api.get<GerarPdfJob>(`/relatorios/gerar-pdf/${jobId}`, token);
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.message === 'API_URL_NOT_CONFIGURED') {
      return mockConsultarJobPdf(jobId);
    }
    throw error;
  }
}

// ---- Mocks (usados enquanto a API não existe) ----

async function delay(ms = 500) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function mockResumoCargas(): Promise<ResumoCultura[]> {
  await delay();
  return [
    { cultura: 'arroz', totalSacas: 2175, unidade: 'sc' },
    { cultura: 'soja', totalSacas: 2175, unidade: 'sc' },
  ];
}

async function mockListCargas(filtros: CargasFiltros): Promise<CargasResponse> {
  await delay();

  const todas: Carga[] = [
    {
      id: 'carga_001',
      cultura: 'arroz',
      data: '2026-07-20',
      inscricaoEstadual: '123456789',
      quantidade: 500,
      unidade: 'sc',
      placa: 'ABC1D23',
    },
    {
      id: 'carga_002',
      cultura: 'soja',
      data: '2026-07-22',
      inscricaoEstadual: '123456789',
      quantidade: 800,
      unidade: 'sc',
      placa: 'XYZ9E87',
    },
    {
      id: 'carga_003',
      cultura: 'arroz',
      data: '2026-07-25',
      inscricaoEstadual: '987654321',
      quantidade: 300,
      unidade: 'sc',
      placa: 'JKL4F56',
    },
  ];

  const filtradas = todas.filter((carga) => {
    if (filtros.cultura && carga.cultura !== filtros.cultura) return false;
    if (filtros.inscricaoEstadual && carga.inscricaoEstadual !== filtros.inscricaoEstadual) {
      return false;
    }
    if (filtros.data && carga.data !== filtros.data) return false;
    return true;
  });

  return {
    data: filtradas,
    pagination: {
      page: filtros.page ?? 1,
      perPage: filtros.perPage ?? 20,
      totalItems: filtradas.length,
      totalPages: 1,
    },
  };
}

async function mockGerarPdfCargas(): Promise<GerarPdfJob> {
  await delay(300);
  return { jobId: 'job_mock_123', status: 'processando' };
}

async function mockConsultarJobPdf(jobId: string): Promise<GerarPdfJob> {
  await delay(300);
  // No mock, o job já nasce pronto na segunda consulta pra simular o polling.
  return {
    jobId,
    status: 'pronto',
    arquivoPdfUrl: 'https://exemplo.com/mock/relatorio-cargas.pdf',
  };
}