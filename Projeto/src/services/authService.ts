import { api, ApiError } from './api';
import { User } from '../types/auth';

export type LoginResponse = {
  user: User;
  token: string;
};

// Enquanto EXPO_PUBLIC_API_URL não existir, usamos um mock local.
// Isso permite desenvolver as telas normalmente e trocar para a API
// real depois só configurando a variável de ambiente — sem tocar
// no restante do app.
export async function loginRequest(cpf: string, password: string): Promise<LoginResponse> {
  // IMPORTANTE (segurança): quando a API real existir, ela deve responder
  // com a MESMA mensagem genérica e, se possível, o mesmo tempo de resposta,
  // tanto para "CPF não encontrado" quanto para "senha incorreta".
  // Se a API distinguir os dois casos, dá pra descobrir quais CPFs estão
  // cadastrados só testando senhas erradas (enumeração de usuários).
  try {
    return await api.post<LoginResponse>('/auth/login', { cpf, password });
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.message === 'API_URL_NOT_CONFIGURED') {
      return mockLogin(cpf, password);
    }
    throw error;
  }
}

async function mockLogin(cpf: string, password: string): Promise<LoginResponse> {
  if (__DEV__) {
    console.warn(
      '[authService] EXPO_PUBLIC_API_URL não configurada — usando login mock. ' +
      'Configure essa variável no .env quando a API estiver pronta (ver .env.example).'
    );
  }

  // Simula latência de rede para o loading da tela se comportar
  // igual ao que vai acontecer com a API de verdade.
  await new Promise((resolve) => setTimeout(resolve, 800));

  if (cpf === 'V' && password === 'V') {
    return { user: { cpf }, token: 'mock-token' };
  }

  throw { message: 'CPF ou senha incorretos.' } as ApiError;
}