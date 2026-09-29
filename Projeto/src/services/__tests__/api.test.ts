import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { api, buildQuery, setUnauthorizedHandler } from '../api';

// O endereço vem do jest.config.js (EXPO_PUBLIC_API_URL dos testes)
const API_URL = 'https://api.teste.local';
const SEM_CONEXAO = 'Sem conexão com o servidor. Verifique sua internet e tente novamente.';
const DEMOROU = 'O servidor demorou para responder. Verifique sua internet e tente novamente.';

// Simula uma resposta HTTP do servidor
function resposta(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (body === undefined) throw new SyntaxError('corpo não é JSON');
      return body;
    },
  };
}

// fetch simulado: cada teste diz o que ele responde
const fetchMock = jest.fn<(...args: any[]) => Promise<unknown>>();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  setUnauthorizedHandler(null);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('buildQuery', () => {
  it('monta a query string ignorando valores vazios', () => {
    expect(buildQuery({ page: 2, ano: undefined, cultura: '', ie: '123' })).toBe('?page=2&ie=123');
  });

  it('sem parâmetros, devolve texto vazio', () => {
    expect(buildQuery({ ano: undefined })).toBe('');
  });
});

describe('api: requisições', () => {
  it('usa o endereço da API, manda JSON e não manda token quando não tem', async () => {
    fetchMock.mockResolvedValue(resposta(200, { ok: true }));

    const data = await api.post('/auth/login', { cpf: '1' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_URL}/auth/login`);
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"cpf":"1"}');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.headers.Authorization).toBeUndefined();
    expect(data).toEqual({ ok: true });
  });

  it.each([
    ['GET', () => api.get('/me', 'abc')],
    ['POST', () => api.post('/relatorios/gerar-pdf', {}, 'abc')],
    ['PUT', () => api.put('/me', {}, 'abc')],
  ])('%s manda o token no cabeçalho Authorization', async (metodo, chamar) => {
    fetchMock.mockResolvedValue(resposta(200, {}));

    await chamar();

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe(metodo);
    expect(init.headers.Authorization).toBe('Bearer abc');
  });
});

describe('api: erros da API', () => {
  it('usa a mensagem e o status que a API mandou', async () => {
    fetchMock.mockResolvedValue(resposta(400, { message: 'Selecione ao menos uma carga.' }));

    await expect(api.post('/x', {}, 'abc')).rejects.toEqual({
      message: 'Selecione ao menos uma carga.',
      status: 400,
    });
  });

  it('se o erro não vier em JSON, usa uma mensagem padrão', async () => {
    fetchMock.mockResolvedValue(resposta(502, undefined));

    await expect(api.get('/x', 'abc')).rejects.toEqual({
      message: 'Não foi possível completar a requisição.',
      status: 502,
    });
  });

  it('401 com token (sessão expirada) avisa quem cuida da sessão, com o token recusado', async () => {
    const handler = jest.fn();
    setUnauthorizedHandler(handler);
    fetchMock.mockResolvedValue(resposta(401, { message: 'Sessão inválida ou expirada.' }));

    await expect(api.get('/me', 'token-vencido')).rejects.toMatchObject({ status: 401 });
    expect(handler).toHaveBeenCalledWith('token-vencido');
  });

  it('401 sem token (senha errada no login) não derruba a sessão', async () => {
    const handler = jest.fn();
    setUnauthorizedHandler(handler);
    fetchMock.mockResolvedValue(resposta(401, { message: 'CPF ou senha incorretos.' }));

    await expect(api.post('/auth/login', {})).rejects.toMatchObject({
      message: 'CPF ou senha incorretos.',
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('403 (sem permissão) não derruba a sessão', async () => {
    const handler = jest.fn();
    setUnauthorizedHandler(handler);
    fetchMock.mockResolvedValue(resposta(403, { message: 'Sem permissão.' }));

    await expect(api.get('/x', 'abc')).rejects.toMatchObject({ status: 403 });
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('api: falhas de conexão', () => {
  it.each([
    ['do React Native', new TypeError('Network request failed')],
    ['do Expo (Expo Go)', new Error('fetch failed: Failed to connect to /192.168.0.10:3000')],
  ])('sem resposta do servidor (fetch %s) mostra mensagem em português', async (_, erro) => {
    fetchMock.mockRejectedValue(erro);

    await expect(api.get('/x', 'abc')).rejects.toEqual({ message: SEM_CONEXAO });
  });

  it.each([
    ['do React Native', () => Object.assign(new Error('Aborted'), { name: 'AbortError' })],
    ['do Expo (Expo Go)', () => new Error('fetch failed: Fetch request has been canceled')],
  ])('servidor que não responde em 10s (fetch %s) avisa que demorou', async (_, erroAoCancelar) => {
    jest.useFakeTimers();
    // fetch que só termina quando o app cancela a requisição
    fetchMock.mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(erroAoCancelar()));
        })
    );

    const requisicao = api.get('/x', 'abc');
    jest.advanceTimersByTime(10000);

    await expect(requisicao).rejects.toEqual({ message: DEMOROU });
  });
});
