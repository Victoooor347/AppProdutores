// Este arquivo define a função `request` que é responsável por fazer requisições HTTP para a API do backend.
// Ele também exporta um objeto `api` com métodos para realizar requisições POST, PUT e GET de forma simplificada.
const API_URL = process.env.EXPO_PUBLIC_API_URL;
const TIMEOUT_MS = 10000;

export type ApiError = {
  message: string;
  status?: number;
};

// Função avisada quando a API recusa o token (resposta 401 numa requisição autenticada).
// Quem registra é o AuthContext, que encerra a sessão e manda o usuário de volta pro login.
// Fica aqui fora do React porque o api.ts não tem acesso ao contexto.
let unauthorizedHandler: ((token: string) => void) | null = null;

export function setUnauthorizedHandler(handler: ((token: string) => void) | null) {
  unauthorizedHandler = handler;
}

// Opções da requisição: as mesmas do fetch, mais o token de autenticação (opcional).
type RequestOptions = RequestInit & {
  token?: string;
};

// A função `request` é uma função genérica que recebe um caminho de URL e opções de requisição,
// e retorna uma Promise com o tipo de dado esperado.
async function request<T>(path: string, { token, ...options }: RequestOptions = {}): Promise<T> {
  if (!API_URL) {
    throw {
      message: 'Endereço do servidor não configurado. Defina EXPO_PUBLIC_API_URL no arquivo .env.',
    } as ApiError;
  }

  // Cria um controlador de abortamento para permitir cancelar a requisição se ela demorar mais do que o tempo limite definido.
  // O `timedOut` marca que fomos nós que cancelamos, pra mostrar a mensagem certa.
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, TIMEOUT_MS);

  let response: Response;
  let data: any;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        // O header de autorização é montado só aqui, pra todos os métodos (GET, POST, PUT).
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    data = await response.json().catch(() => null);
  } catch {
    // Chegar aqui significa que o servidor não respondeu: celular sem internet, endereço
    // errado, servidor fora do ar ou tempo limite estourado. O tipo do erro não serve pra
    // diferenciar — o fetch do React Native lança TypeError("Network request failed"), o do
    // Expo (usado no Expo Go) lança "fetch failed: ..." — então a mensagem sai daqui.
    throw {
      message: timedOut
        ? 'O servidor demorou para responder. Verifique sua internet e tente novamente.'
        : 'Sem conexão com o servidor. Verifique sua internet e tente novamente.',
    } as ApiError;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    // 401 numa requisição que mandou token = token expirado ou revogado.
    // (O login não manda token, então "senha errada" não cai aqui.)
    if (response.status === 401 && token) {
      unauthorizedHandler?.(token);
    }

    const error: ApiError = {
      message: data?.message ?? 'Não foi possível completar a requisição.',
      status: response.status,
    };
    throw error;
  }

  return data as T;
}

// Monta a query string de uma URL a partir de um objeto de parâmetros, ignorando valores
// undefined, null ou vazios. Ex: buildQuery({ page: 1, ano: undefined }) → "?page=1".
export function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

// O objeto `api` exportado fornece métodos convenientes para fazer requisições POST, PUT e GET,
// encapsulando a função `request`. Todos aceitam o token de autenticação como último parâmetro.
export const api = {
  post: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body), token }),
  put: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body), token }),
  get: <T>(path: string, token?: string) =>
    request<T>(path, { method: 'GET', token }),
};
