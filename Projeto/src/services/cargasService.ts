import { api, ApiError } from './api';
import {
  Carga,
  CargasFiltros,
  CargasResponse,
  GerarPdfJob,
  ResumoCultura,
} from '../types/cargas';
import { mapPagination, RawPagination } from '../utils/apiMappers';

// Mesma ideia do authService: se EXPO_PUBLIC_API_URL não estiver configurada,
// cai automaticamente no mock — assim dá pra montar a tela de Relatório de
// Safra sem esperar o backend.

// A API responde em snake_case (ver contrato); esses tipos "Raw*" e as
// funções map* abaixo traduzem pro camelCase que o resto do app usa.
type RawCarga = {
  id: string;
  cultura: 'arroz' | 'soja';
  data: string;
  inscricao_estadual: string;
  quantidade: number;
  unidade: string;
  placa: string;
};

function mapCarga(raw: RawCarga): Carga {
  return {
    id: raw.id,
    cultura: raw.cultura,
    data: raw.data,
    inscricaoEstadual: raw.inscricao_estadual,
    quantidade: raw.quantidade,
    unidade: raw.unidade,
    placa: raw.placa,
  };
}

type RawResumoCultura = {
  cultura: 'arroz' | 'soja';
  total_sacas: number;
  unidade: string;
};

function mapResumo(raw: RawResumoCultura): ResumoCultura {
  return {
    cultura: raw.cultura,
    totalSacas: raw.total_sacas,
    unidade: raw.unidade,
  };
}

type RawGerarPdfJob = {
  job_id: string;
  status: GerarPdfJob['status'];
  arquivo_pdf_url?: string;
};

function mapPdfJob(raw: RawGerarPdfJob): GerarPdfJob {
  return {
    jobId: raw.job_id,
    status: raw.status,
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

export async function getResumoCargas(ano: number, token: string): Promise<ResumoCultura[]> {
  try {
    const query = buildQuery({ ano });
    const response = await api.get<{ data: RawResumoCultura[] }>(
      `/cargas/resumo${query}`,
      token
    );
    return response.data.map(mapResumo);
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
      data_inicio: filtros.dataInicio,
      data_fim: filtros.dataFim,
    });
    const response = await api.get<{ data: RawCarga[]; pagination: RawPagination }>(
      `/cargas${query}`,
      token
    );
    return {
      data: response.data.map(mapCarga),
      pagination: mapPagination(response.pagination),
    };
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
    const response = await api.post<RawGerarPdfJob>('/relatorios/gerar-pdf', {
      carga_ids: cargaIds,
    });
    return mapPdfJob(response);
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
    const response = await api.get<RawGerarPdfJob>(`/relatorios/gerar-pdf/${jobId}`, token);
    return mapPdfJob(response);
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
    if (filtros.dataInicio && carga.data < filtros.dataInicio) return false;
    if (filtros.dataFim && carga.data > filtros.dataFim) return false;
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