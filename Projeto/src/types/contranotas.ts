export type ContraNota = {
  id: string;
  numero: string;
  dataEmissao: string; // ISO 8601
  arquivoPdfUrl: string;
};

export type ContraNotasFiltros = {
  page?: number;
  perPage?: number;
};

export type ContraNotasResponse = {
  data: ContraNota[];
  pagination: {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  };
};