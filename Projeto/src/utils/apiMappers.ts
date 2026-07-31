// A API (Express + Postgres) responde em snake_case, seguindo a convenção
// do banco (data_emissao, arquivo_pdf_url, per_page...). O app usa
// camelCase nos tipos (dataEmissao, arquivoPdfUrl, perPage...), seguindo a
// convenção do TypeScript/JS. Esse arquivo concentra essa tradução — sem
// isso, os campos ficam "undefined" silenciosamente (o TypeScript não pega
// esse erro, porque é só um `as` de tipo, não uma checagem em tempo real).
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