import { api, buildQuery } from './api';
import {
  Carga,
  CargasFiltros,
  CargasResponse,
  GerarPdfJob,
  ResumoCargas,
  ResumoCultura,
} from '../types/cargas';
import { mapPagination, mapPdfJob, RawGerarPdfJob, RawPagination } from '../utils/apiMappers';
import { buscarTodasAsPaginas } from './paginacao';

// Tipo que representa os dados brutos da carga recebidos da API.
type RawCarga = {
  id: string;
  cultura: 'arroz' | 'soja';
  data: string;
  inscricao_estadual: string;
  quantidade: number;
  unidade: string;
  placa: string;
};

// Função que mapeia os dados brutos da carga recebidos da API para o formato esperado pelo frontend.
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

// Tipo que representa os dados brutos do resumo de cultura recebidos da API.
type RawResumoCultura = {
  cultura: 'arroz' | 'soja';
  total_sacas: number;
  unidade: string;
};

// Função que mapeia os dados brutos do resumo de cultura recebidos da API para o formato esperado pelo frontend.
function mapResumo(raw: RawResumoCultura): ResumoCultura {
  return {
    cultura: raw.cultura,
    totalSacas: raw.total_sacas,
    unidade: raw.unidade,
  };
}

// Função que busca o resumo de cargas do ano: total entregue por cultura e as
// inscrições estaduais (IEs) com entregas no ano, usadas nas opções do filtro de IE.
export async function getResumoCargas(ano: number, token: string): Promise<ResumoCargas> {
  const query = buildQuery({ ano });
  const response = await api.get<{
    data: RawResumoCultura[];
    inscricoes_estaduais?: string[];
  }>(`/cargas/resumo${query}`, token);
  return {
    totais: response.data.map(mapResumo),
    inscricoesEstaduais: response.inscricoes_estaduais ?? [],
  };
}

// Função que lista as cargas com base nos filtros fornecidos, retornando uma resposta paginada.
export async function listCargas(filtros: CargasFiltros, token: string): Promise<CargasResponse> {
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
}

// IDs de TODAS as cargas que o filtro encontra (todas as páginas) — usado no "Selecionar todas".
export async function listarIdsCargas(filtros: CargasFiltros, token: string): Promise<string[]> {
  const cargas = await buscarTodasAsPaginas((page, perPage) =>
    listCargas({ ...filtros, page, perPage }, token)
  );
  return Array.from(new Set(cargas.map((carga) => carga.id)));
}

// Máximo de cargas num PDF só (limite da API — ver contrato-api.md)
export const MAX_CARGAS_POR_PDF = 2000;

// Inicia a geração assíncrona do PDF combinando as cargas selecionadas.
export async function gerarPdfCargas(cargaIds: string[], token: string): Promise<GerarPdfJob> {
  const response = await api.post<RawGerarPdfJob>(
    '/relatorios/gerar-pdf',
    { carga_ids: cargaIds },
    token
  );
  return mapPdfJob(response);
}

// Consulta o status do job de geração de PDF (polling).
export async function consultarJobPdf(jobId: string, token: string): Promise<GerarPdfJob> {
  const response = await api.get<RawGerarPdfJob>(`/relatorios/gerar-pdf/${jobId}`, token);
  return mapPdfJob(response);
}
