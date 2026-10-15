import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Alert, Linking } from 'react-native';
import { abrirPdfGerado, aguardarPdfPronto, gerarEAbrirPdf } from '../pdfJob';
import { GerarPdfJob } from '../../types/pdf';

const processando: GerarPdfJob = { jobId: 'j1', status: 'processando' };
const pronto: GerarPdfJob = { jobId: 'j1', status: 'pronto', arquivoPdfUrl: 'https://x/j1.pdf' };

describe('aguardarPdfPronto', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('se o job já vem pronto, não consulta a API', async () => {
    const consultar = jest.fn(async () => pronto);

    const final = await aguardarPdfPronto(pronto, consultar);

    expect(final).toBe(pronto);
    expect(consultar).not.toHaveBeenCalled();
  });

  it('consulta a cada 1,5s até ficar pronto', async () => {
    const consultar = jest
      .fn<(jobId: string) => Promise<GerarPdfJob>>()
      .mockResolvedValueOnce(processando)
      .mockResolvedValueOnce(pronto);

    const espera = aguardarPdfPronto(processando, consultar);
    await jest.advanceTimersByTimeAsync(3000);

    await expect(espera).resolves.toEqual(pronto);
    expect(consultar).toHaveBeenCalledTimes(2);
    expect(consultar).toHaveBeenCalledWith('j1');
  });

  it('desiste depois de 20 consultas (~30s) e devolve ainda "processando"', async () => {
    const consultar = jest.fn(async () => processando);

    const espera = aguardarPdfPronto(processando, consultar);
    await jest.advanceTimersByTimeAsync(60000);

    await expect(espera).resolves.toEqual(processando);
    expect(consultar).toHaveBeenCalledTimes(20);
  });
});

describe('abrirPdfGerado', () => {
  let abrirLink: jest.SpiedFunction<typeof Linking.openURL>;
  let alerta: jest.SpiedFunction<typeof Alert.alert>;

  beforeEach(() => {
    // O ambiente de testes do React Native já troca o Linking por uma função simulada;
    // zera o histórico dela pra um teste não enxergar as chamadas do anterior.
    jest.clearAllMocks();
    abrirLink = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('PDF pronto: abre o link', async () => {
    await abrirPdfGerado(pronto);

    expect(abrirLink).toHaveBeenCalledWith('https://x/j1.pdf');
    expect(alerta).not.toHaveBeenCalled();
  });

  it('erro: avisa o produtor', async () => {
    await abrirPdfGerado({ jobId: 'j1', status: 'erro' });

    expect(abrirLink).not.toHaveBeenCalled();
    expect(alerta).toHaveBeenCalledWith('Erro', expect.stringContaining('Não foi possível gerar'));
  });

  it('ainda processando: pede pra tentar de novo', async () => {
    await abrirPdfGerado(processando);

    expect(alerta).toHaveBeenCalledWith('Ainda processando', expect.any(String));
  });
});

describe('gerarEAbrirPdf', () => {
  let abrirLink: jest.SpiedFunction<typeof Linking.openURL>;
  let alerta: jest.SpiedFunction<typeof Alert.alert>;

  beforeEach(() => {
    jest.clearAllMocks();
    abrirLink = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('acima do limite: explica o limite e não chama a API', async () => {
    const gerar = jest.fn(async () => pronto);

    await gerarEAbrirPdf(['a', 'b', 'c'], {
      maximo: 2,
      nomeItens: 'cargas',
      gerar,
      consultar: jest.fn(async () => pronto),
    });

    expect(gerar).not.toHaveBeenCalled();
    expect(alerta).toHaveBeenCalledWith(
      'Seleção grande demais',
      expect.stringContaining('no máximo 2 cargas, e você marcou 3')
    );
  });

  it('dentro do limite: gera e abre o PDF', async () => {
    const gerar = jest.fn(async (_ids: string[]) => pronto);

    await gerarEAbrirPdf(['a', 'b'], {
      maximo: 2,
      nomeItens: 'cargas',
      gerar,
      consultar: jest.fn(async () => pronto),
    });

    expect(gerar).toHaveBeenCalledWith(['a', 'b']);
    expect(abrirLink).toHaveBeenCalledWith('https://x/j1.pdf');
  });

  it('erro da API vira alerta com a mensagem dela', async () => {
    await gerarEAbrirPdf(['a'], {
      maximo: 2,
      nomeItens: 'cargas',
      gerar: jest.fn(async () => {
        throw { message: 'Sem conexão com o servidor.' };
      }),
      consultar: jest.fn(async () => pronto),
    });

    expect(alerta).toHaveBeenCalledWith('Erro', 'Sem conexão com o servidor.');
  });
});
