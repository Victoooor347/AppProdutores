// Tipo que representa uma cultura.
export type Cultura = 'arroz' | 'soja';

// Tipo que representa os dados de uma carga.
export type Carga = {
  id: string;
  cultura: Cultura;
  data: string; // ISO 8601 (data)
  inscricaoEstadual: string;
  quantidade: number;
  unidade: string; // ex: "sc"
  placa: string; // placa do caminhão
};

// Tipo que representa o resumo de uma cultura.
export type ResumoCultura = {
  cultura: Cultura;
  totalSacas: number;
  unidade: string;
};

// Tipo que representa os filtros possíveis para listagem de cargas.
export type CargasFiltros = {
  page?: number;
  perPage?: number;
  ano?: number;
  inscricaoEstadual?: string;
  cultura?: Cultura;
  dataInicio?: string;
  dataFim?: string;
};

// Tipo que representa a resposta paginada da listagem de cargas.
export type Pagination = {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
};

// Tipo que representa a resposta da listagem de cargas.
export type CargasResponse = {
  data: Carga[];
  pagination: Pagination;
};

// Tipo que representa o status do job de geração de PDF.
export type GerarPdfJobStatus = 'processando' | 'pronto' | 'erro';

// Tipo que representa o job de geração de PDF.
export type GerarPdfJob = {
  jobId: string;
  status: GerarPdfJobStatus;
  arquivoPdfUrl?: string;
};