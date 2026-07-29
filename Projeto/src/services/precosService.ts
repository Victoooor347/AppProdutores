import { api, ApiError } from './api';
import { PrecoDia } from '../types/precos';

// Preço do dia vem direto do banco (sem interface de admin, ver contrato da
// API) — aqui só lemos. Segue o mesmo padrão de fallback mock dos outros
// services enquanto EXPO_PUBLIC_API_URL não existir.
export async function getPrecosDoDia(token: string): Promise<PrecoDia[]> {
  try {
    const response = await api.get<{ data: PrecoDia[] }>('/precos-do-dia', token);
    return response.data;
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.message === 'API_URL_NOT_CONFIGURED') {
      return mockPrecosDoDia();
    }
    throw error;
  }
}

async function mockPrecosDoDia(): Promise<PrecoDia[]> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const agora = new Date().toISOString();

  return [
    {
      commodity: 'arroz',
      nomeExibicao: 'Arroz',
      preco: 63.2,
      unidade: 'sc',
      descricao: '62 x 8 de Grão inteiro, Tipo 1',
      atualizadoEm: agora,
    },
    {
      commodity: 'soja',
      nomeExibicao: 'Soja',
      preco: 123.5,
      unidade: 'sc',
      atualizadoEm: agora,
    },
  ];
}