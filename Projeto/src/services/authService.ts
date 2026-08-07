import { api, ApiError } from './api'; // Importa a instância da API e o tipo ApiError do arquivo api.ts, que são usados para fazer requisições HTTP e tratar erros da API.
import { User } from '../types/auth'; // Importa o tipo User que define a estrutura do usuário retornado pela API após o login.

export type LoginResponse = {
  user: User;
  token: string;
};

// A função `loginRequest` é responsável por enviar uma requisição de login para a API, recebendo o CPF e a senha do usuário.
export async function loginRequest(cpf: string, password: string): Promise<LoginResponse> {
  try {
    return await api.post<LoginResponse>('/auth/login', { cpf, password });
  } catch (error) {
    const apiError = error as ApiError;
    // if (apiError.message === 'API_URL_NOT_CONFIGURED') {
    //   return mockLogin(cpf, password);
    // }
    throw error;
  }
}

// async function mockLogin(cpf: string, password: string): Promise<LoginResponse> {
//   if (__DEV__) {
//     console.warn(
//       '[authService] EXPO_PUBLIC_API_URL não configurada — usando login mock. ' +
//       'Configure essa variável no .env quando a API estiver pronta (ver .env.example).'
//     );
//   }

//   // Simula latência de rede para o loading da tela se comportar
//   // igual ao que vai acontecer com a API de verdade.
//   await new Promise((resolve) => setTimeout(resolve, 800));

//   if (cpf === 'V' && password === 'V') {
//     return { user: { cpf }, token: 'mock-token' };
//   }

//   throw { message: 'CPF ou senha incorretos.' } as ApiError;
// }