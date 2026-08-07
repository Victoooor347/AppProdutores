// Tipo que representa uma commodity.
export type Commodity = 'arroz' | 'soja';

// Tipo que representa os dados do preço do dia de uma commodity.
export type PrecoDia = {
  commodity: Commodity;
  nomeExibicao: string;
  preco: number; // vem direto do banco, formato decimal (ex: 62.50)
  unidade: string; // ex: "sc"
  descricao?: string; // ex: "62 x 8 de Grão inteiro, Tipo 1"
  atualizadoEm: string; // ISO 8601
};