// Testa se os services conversam com a API no formato do contrato (contrato-api.md):
// o que mandam (rota, parâmetros, corpo) e como convertem a resposta para o app.
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { confirmarCodigo, loginRequest, logoutRequest, solicitarCodigo } from '../authService';
import { getResumoCargas, listCargas, listarIdsCargas, gerarPdfCargas } from '../cargasService';
import {
  consultarJobPdfContraNotas,
  gerarPdfContraNotas,
  listarIdsContraNotas,
  listContraNotas,
} from '../contranotasService';
import { getPrecosDoDia } from '../precosService';
import { getProfile } from '../userService';
import { FinalidadeCodigo } from '../../types/auth';

const API_URL = 'https://api.teste.local';

// fetch simulado: cada teste diz o que ele responde
const fetchMock = jest.fn<(...args: any[]) => Promise<unknown>>();

// Faz o fetch simulado responder 200 com esse corpo
function responder(body: unknown) {
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => body });
}

// Devolve a URL e as opções da última chamada ao fetch
function ultimaChamada() {
  const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return { url: url as string, init, body: init.body ? JSON.parse(init.body) : undefined };
}

const PAGINACAO = { page: 1, per_page: 30, total_items: 1, total_pages: 1 };

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe('authService', () => {
  it('login manda o CPF só com os dígitos', async () => {
    responder({ user: { cpf: '52998224725' }, token: 't', expires_in: 86400 });

    await loginRequest('529.982.247-25', '123456');

    const { url, body } = ultimaChamada();
    expect(url).toBe(`${API_URL}/auth/login`);
    expect(body).toEqual({ cpf: '52998224725', password: '123456' });
  });

  it('logout chama POST /auth/logout com o token', async () => {
    responder({ message: 'ok' });

    await logoutRequest('abc');

    const { url, init } = ultimaChamada();
    expect(url).toBe(`${API_URL}/auth/logout`);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer abc');
  });

  const rotasPorFinalidade: [FinalidadeCodigo, string][] = [
    ['primeiro_acesso', '/auth/primeiro-acesso'],
    ['recuperar_senha', '/auth/recuperar-senha'],
  ];

  it.each(rotasPorFinalidade)('solicitarCodigo (%s) usa a rota certa e manda só os dígitos do CPF', async (finalidade, rota) => {
    responder({ email_mascarado: 'jo****@gmail.com', expira_em_segundos: 600, reenviar_em_segundos: 60 });

    const enviado = await solicitarCodigo(finalidade, '529.982.247-25');

    const { url, init, body } = ultimaChamada();
    expect(url).toBe(`${API_URL}${rota}/solicitar-codigo`);
    expect(body).toEqual({ cpf: '52998224725' });
    expect(init.headers.Authorization).toBeUndefined();
    expect(enviado).toEqual({ emailMascarado: 'jo****@gmail.com', expiraEmSegundos: 600, reenviarEmSegundos: 60 });
  });

  it('confirmarCodigo manda CPF, código e senha, e devolve a sessão', async () => {
    responder({ user: { cpf: '52998224725', name: 'Produtor' }, token: 't-novo', expires_in: 86400 });

    const sessao = await confirmarCodigo('recuperar_senha', '529.982.247-25', '012345', 'novaSenha');

    const { url, body } = ultimaChamada();
    expect(url).toBe(`${API_URL}/auth/recuperar-senha/confirmar`);
    expect(body).toEqual({ cpf: '52998224725', codigo: '012345', password: 'novaSenha' });
    expect(sessao.token).toBe('t-novo');
  });
});

describe('cargasService', () => {
  it('listCargas manda os filtros em snake_case e ignora os vazios', async () => {
    responder({ data: [], pagination: PAGINACAO });

    await listCargas(
      { page: 2, perPage: 30, ano: 2026, inscricaoEstadual: '123', cultura: undefined, dataInicio: '2026-03-01' },
      'abc'
    );

    const { url } = ultimaChamada();
    expect(url).toBe(
      `${API_URL}/cargas?page=2&per_page=30&ano=2026&inscricao_estadual=123&data_inicio=2026-03-01`
    );
  });

  it('listCargas converte a resposta para o formato do app', async () => {
    responder({
      data: [
        {
          id: 'c1',
          cultura: 'arroz',
          data: '2026-07-20',
          inscricao_estadual: '123',
          quantidade: 500,
          unidade: 'sc',
          placa: 'ABC1D23',
        },
      ],
      pagination: { page: 1, per_page: 30, total_items: 73, total_pages: 3 },
    });

    const resultado = await listCargas({ page: 1 }, 'abc');

    expect(resultado.data[0]).toEqual({
      id: 'c1',
      cultura: 'arroz',
      data: '2026-07-20',
      inscricaoEstadual: '123',
      quantidade: 500,
      unidade: 'sc',
      placa: 'ABC1D23',
    });
    expect(resultado.pagination).toEqual({ page: 1, perPage: 30, totalItems: 73, totalPages: 3 });
  });

  it('getResumoCargas devolve os totais e as IEs do ano', async () => {
    responder({
      data: [{ cultura: 'soja', total_sacas: 800, unidade: 'sc' }],
      inscricoes_estaduais: ['123', '456'],
    });

    const resumo = await getResumoCargas(2026, 'abc');

    expect(ultimaChamada().url).toBe(`${API_URL}/cargas/resumo?ano=2026`);
    expect(resumo).toEqual({
      totais: [{ cultura: 'soja', totalSacas: 800, unidade: 'sc' }],
      inscricoesEstaduais: ['123', '456'],
    });
  });

  it('getResumoCargas não quebra se a API não mandar as IEs', async () => {
    responder({ data: [] });

    const resumo = await getResumoCargas(2026, 'abc');

    expect(resumo.inscricoesEstaduais).toEqual([]);
  });

  it('gerarPdfCargas manda os IDs e o token', async () => {
    responder({ job_id: 'j1', status: 'processando' });

    const job = await gerarPdfCargas(['c1', 'c2'], 'abc');

    const { url, init, body } = ultimaChamada();
    expect(url).toBe(`${API_URL}/relatorios/gerar-pdf`);
    expect(init.headers.Authorization).toBe('Bearer abc');
    expect(body).toEqual({ carga_ids: ['c1', 'c2'] });
    expect(job).toEqual({ jobId: 'j1', status: 'processando', arquivoPdfUrl: undefined });
  });
});

describe('contranotasService', () => {
  it('lista com paginação e converte os campos', async () => {
    responder({
      data: [{ id: 'n1', numero: '000125', data_emissao: '2026-07-22', arquivo_pdf_url: 'https://x/n1.pdf' }],
      pagination: PAGINACAO,
    });

    const resultado = await listContraNotas({ page: 1, perPage: 20 }, 'abc');

    expect(ultimaChamada().url).toBe(`${API_URL}/contra-notas?page=1&per_page=20`);
    expect(resultado.data[0]).toEqual({
      id: 'n1',
      numero: '000125',
      dataEmissao: '2026-07-22',
      arquivoPdfUrl: 'https://x/n1.pdf',
    });
  });

  it('manda os filtros de ano e período', async () => {
    responder({ data: [], pagination: PAGINACAO });

    await listContraNotas(
      { page: 1, perPage: 20, ano: 2026, dataInicio: '2026-07-01', dataFim: '2026-07-31' },
      'abc'
    );

    expect(ultimaChamada().url).toBe(
      `${API_URL}/contra-notas?page=1&per_page=20&ano=2026&data_inicio=2026-07-01&data_fim=2026-07-31`
    );
  });

  it('gerarPdfContraNotas manda os IDs e o token; consultar usa a rota das contra-notas', async () => {
    responder({ job_id: 'j9', status: 'processando' });

    const job = await gerarPdfContraNotas(['n1', 'n2'], 'abc');

    const { url, init, body } = ultimaChamada();
    expect(url).toBe(`${API_URL}/contra-notas/gerar-pdf`);
    expect(init.headers.Authorization).toBe('Bearer abc');
    expect(body).toEqual({ contra_nota_ids: ['n1', 'n2'] });
    expect(job).toEqual({ jobId: 'j9', status: 'processando', arquivoPdfUrl: undefined });

    responder({ job_id: 'j9', status: 'pronto', arquivo_pdf_url: 'https://x/j9.pdf' });
    const final = await consultarJobPdfContraNotas('j9', 'abc');
    expect(ultimaChamada().url).toBe(`${API_URL}/contra-notas/gerar-pdf/j9`);
    expect(final.arquivoPdfUrl).toBe('https://x/j9.pdf');
  });

  it('listarIdsContraNotas percorre todas as páginas com o mesmo filtro', async () => {
    const nota = (id: string) => ({ id, numero: id, data_emissao: '2026-07-01', arquivo_pdf_url: 'x' });
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [nota('n1'), nota('n2')], pagination: { page: 1, per_page: 100, total_items: 3, total_pages: 2 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [nota('n3')], pagination: { page: 2, per_page: 100, total_items: 3, total_pages: 2 } }),
      });

    const ids = await listarIdsContraNotas({ ano: 2026, perPage: 20 }, 'abc');

    expect(ids).toEqual(['n1', 'n2', 'n3']);
    const urls = fetchMock.mock.calls.map((chamada) => chamada[0]);
    expect(urls).toEqual([
      `${API_URL}/contra-notas?page=1&per_page=100&ano=2026`,
      `${API_URL}/contra-notas?page=2&per_page=100&ano=2026`,
    ]);
  });
});

describe('Selecionar todas (cargas)', () => {
  it('listarIdsCargas busca todas as páginas do filtro e devolve só os IDs', async () => {
    const carga = (id: string) => ({
      id, cultura: 'arroz', data: '2026-07-01', inscricao_estadual: '1', quantidade: 1, unidade: 'sc', placa: 'A',
    });
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [carga('c1')], pagination: { page: 1, per_page: 100, total_items: 2, total_pages: 2 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [carga('c2')], pagination: { page: 2, per_page: 100, total_items: 2, total_pages: 2 } }),
      });

    const ids = await listarIdsCargas({ ano: 2026, cultura: 'arroz', perPage: 30 }, 'abc');

    expect(ids).toEqual(['c1', 'c2']);
    expect(fetchMock.mock.calls[1][0]).toBe(`${API_URL}/cargas?page=2&per_page=100&ano=2026&cultura=arroz`);
  });
});

describe('precosService', () => {
  it('converte os preços do dia', async () => {
    responder({
      data: [
        {
          commodity: 'arroz',
          nome_exibicao: 'Arroz',
          preco: 63.2,
          unidade: 'sc',
          atualizado_em: '2026-09-29T08:00:00-03:00',
        },
      ],
    });

    const precos = await getPrecosDoDia('abc');

    expect(precos[0]).toMatchObject({ nomeExibicao: 'Arroz', preco: 63.2, atualizadoEm: '2026-09-29T08:00:00-03:00' });
  });
});

describe('userService', () => {
  it('troca e-mail, telefone e propriedade nulos por texto vazio', async () => {
    responder({ cpf: '52998224725', name: 'Produtor', email: null, telefone: null, propriedade: null });

    const perfil = await getProfile('abc');

    expect(perfil).toEqual({
      cpf: '52998224725',
      name: 'Produtor',
      email: '',
      telefone: '',
      propriedade: '',
    });
  });

  it('traz o e-mail do cadastro', async () => {
    responder({ cpf: '52998224725', name: 'Produtor', email: 'p@x.com', telefone: '1', propriedade: 'F' });

    const perfil = await getProfile('abc');

    expect(perfil.email).toBe('p@x.com');
  });
});
