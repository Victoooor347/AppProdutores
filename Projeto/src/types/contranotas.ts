// Tipo que representa uma contra nota.
export type ContraNota = {
  id: string;
  numero: string;
  dataEmissao: string; // ISO 8601
  arquivoPdfUrl: string;
};

// Tipo que representa os filtros possíveis para listagem de contra notas.
export type ContraNotasFiltros = {
  page?: number;
  perPage?: number;
};

// Tipo que representa a resposta da listagem de contra notas.
export type ContraNotasResponse = {
  data: ContraNota[];
  pagination: {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  };
};