import { api, buildQuery } from './api';
import { ContraNota, ContraNotasFiltros, ContraNotasResponse } from '../types/contranotas';
import { GerarPdfJob } from '../types/pdf';
import { mapPagination, mapPdfJob, RawGerarPdfJob, RawPagination } from '../utils/apiMappers';
import { buscarTodasAsPaginas } from './paginacao';

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

// Função que lista as contra notas com base nos filtros fornecidos, retornando uma resposta paginada.
export async function listContraNotas(
  filtros: ContraNotasFiltros,
  token: string
): Promise<ContraNotasResponse> {
  const query = buildQuery({
    page: filtros.page,
    per_page: filtros.perPage,
    ano: filtros.ano,
    data_inicio: filtros.dataInicio,
    data_fim: filtros.dataFim,
  });
  const response = await api.get<{ data: RawContraNota[]; pagination: RawPagination }>(
    `/contra-notas${query}`,
    token
  );
  return {
    data: response.data.map(mapContraNota),
    pagination: mapPagination(response.pagination),
  };
}

// IDs de TODAS as contra-notas que o filtro encontra (todas as páginas) — usado no "Selecionar todas".
export async function listarIdsContraNotas(
  filtros: ContraNotasFiltros,
  token: string
): Promise<string[]> {
  const notas = await buscarTodasAsPaginas((page, perPage) =>
    listContraNotas({ ...filtros, page, perPage }, token)
  );
  return Array.from(new Set(notas.map((nota) => nota.id)));
}

// Máximo de contra-notas num PDF só (limite da API — ver contrato-api.md)
export const MAX_CONTRA_NOTAS_POR_PDF = 200;

// Inicia a geração do PDF único com as contra-notas selecionadas juntas.
export async function gerarPdfContraNotas(
  contraNotaIds: string[],
  token: string
): Promise<GerarPdfJob> {
  const response = await api.post<RawGerarPdfJob>(
    '/contra-notas/gerar-pdf',
    { contra_nota_ids: contraNotaIds },
    token
  );
  return mapPdfJob(response);
}

// Consulta o status da geração do PDF das contra-notas (polling).
export async function consultarJobPdfContraNotas(
  jobId: string,
  token: string
): Promise<GerarPdfJob> {
  const response = await api.get<RawGerarPdfJob>(`/contra-notas/gerar-pdf/${jobId}`, token);
  return mapPdfJob(response);
}
