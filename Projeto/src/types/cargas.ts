export type Cultura = 'arroz' | 'soja';

export type Carga = {
  id: string;
  cultura: Cultura;
  data: string; // ISO 8601 (data)
  inscricaoEstadual: string;
  quantidade: number;
  unidade: string; // ex: "sc"
  placa: string; // placa do caminhão
};

export type ResumoCultura = {
  cultura: Cultura;
  totalSacas: number;
  unidade: string;
};

export type CargasFiltros = {
  page?: number;
  perPage?: number;
  ano?: number;
  inscricaoEstadual?: string;
  cultura?: Cultura;
  data?: string;
};

export type Pagination = {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
};

export type CargasResponse = {
  data: Carga[];
  pagination: Pagination;
};

export type GerarPdfJobStatus = 'processando' | 'pronto' | 'erro';

export type GerarPdfJob = {
  jobId: string;
  status: GerarPdfJobStatus;
  arquivoPdfUrl?: string;
};