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