// Este arquivo define a função `request` que é responsável por fazer requisições HTTP para a API do backend. 
// Ele também exporta um objeto `api` com métodos para realizar requisições POST, PUT e GET de forma simplificada.
const API_URL = process.env.EXPO_PUBLIC_API_URL;
const TIMEOUT_MS = 10000;

export type ApiError = {
  message: string;
  status?: number;
};

// A função `request` é uma função genérica que recebe um caminho de URL e opções de requisição, 
// e retorna uma Promise com o tipo de dado esperado.
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_URL) {
    throw { message: 'API_URL_NOT_CONFIGURED' } as ApiError;
  }

  // Cria um controlador de abortamento para permitir cancelar a requisição se ela demorar mais do que o tempo limite definido.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const error: ApiError = {
        message: data?.message ?? 'Não foi possível completar a requisição.',
        status: response.status,
      };
      throw error;
    }

    return data as T;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw { message: 'Tempo de conexão esgotado. Tente novamente.' } as ApiError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// O objeto `api` exportado fornece métodos convenientes para fazer requisições POST, PUT e GET,
// encapsulando a função `request` e adicionando cabeçalhos de autorização quando necessário.
export const api = {
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
  get: <T>(path: string, token?: string) =>
    request<T>(path, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
};