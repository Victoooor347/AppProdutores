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

// Tipo que representa o resumo do ano: totais por cultura e as IEs com entregas no ano.
export type ResumoCargas = {
  totais: ResumoCultura[];
  inscricoesEstaduais: string[];
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

// O job de geração de PDF agora é usado também pelas contra-notas: fica em types/pdf.ts.
export type { GerarPdfJob, GerarPdfJobStatus } from './pdf';