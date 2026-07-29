// Wrapper simples em cima do fetch nativo.
// Quando a API estiver pronta, defina EXPO_PUBLIC_API_URL no .env
// (ver .env.example) e todas as chamadas passam a usá-la automaticamente.

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const TIMEOUT_MS = 10000;

export type ApiError = {
  message: string;
  status?: number;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_URL) {
    // Erro específico para a authService saber que deve cair no mock.
    throw { message: 'API_URL_NOT_CONFIGURED' } as ApiError;
  }

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