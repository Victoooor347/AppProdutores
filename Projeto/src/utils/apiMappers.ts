import { GerarPdfJob } from '../types/pdf';

// Mapeia os dados de paginação da API para o formato do app.

export type RawPagination = {
  page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
};

export function mapPagination(raw: RawPagination) {
  return {
    page: raw.page,
    perPage: raw.per_page,
    totalItems: raw.total_items,
    totalPages: raw.total_pages,
  };
}

// Tipo que representa os dados brutos do job de geração de PDF recebidos da API
// (mesmo formato no relatório de cargas e nas contra-notas).
export type RawGerarPdfJob = {
  job_id: string;
  status: GerarPdfJob['status'];
  arquivo_pdf_url?: string;
};

// Mapeia o job de geração de PDF da API para o formato do app.
export function mapPdfJob(raw: RawGerarPdfJob): GerarPdfJob {
  return {
    jobId: raw.job_id,
    status: raw.status,
    arquivoPdfUrl: raw.arquivo_pdf_url,
  };
}
