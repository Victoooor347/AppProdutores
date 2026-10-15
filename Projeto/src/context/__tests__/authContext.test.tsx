// Testa a renovação automática do token (POST /auth/refresh) no AuthContext.
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Alert } from 'react-native';
import { act } from 'react-test-renderer';
import * as SecureStore from 'expo-secure-store';
import { AuthProvider, useAuth } from '../authContext';
import { refreshRequest, RefreshResponse } from '../../services/authService';
import { esperarRespostas, renderHook } from '../../testes/renderHook';

// SecureStore simulado: guarda numa lista na memória
jest.mock('expo-secure-store', () => {
  const guardado = new Map<string, string>();
  return {
    guardado,
    getItemAsync: async (chave: string) => guardado.get(chave) ?? null,
    setItemAsync: async (chave: string, valor: string) => {
      guardado.set(chave, valor);
    },
    deleteItemAsync: async (chave: string) => {
      guardado.delete(chave);
    },
  };
});

jest.mock('../../services/authService', () => ({
  loginRequest: jest.fn(),
  logoutRequest: jest.fn(async () => {}),
  confirmarCodigo: jest.fn(),
  refreshRequest: jest.fn(),
}));

// api.ts simulado: guarda o aviso de 401 registrado pelo AuthContext, pra o teste disparar
jest.mock('../../services/api', () => {
  const avisos: { handler: ((token: string) => void) | null } = { handler: null };
  return {
    avisos,
    setUnauthorizedHandler: (handler: ((token: string) => void) | null) => {
      avisos.handler = handler;
    },
  };
});

const guardado = (SecureStore as unknown as { guardado: Map<string, string> }).guardado;
const avisos = (jest.requireMock('../../services/api') as any).avisos as {
  handler: ((token: string) => void) | null;
};
const refreshMock = refreshRequest as jest.MockedFunction<typeof refreshRequest>;

const CHAVE = 'AppProdutores.session';
const HORA = 60 * 60 * 1000;
const USUARIO = { cpf: '52998224725', name: 'Produtor de Teste' };

function salvarSessao(sessao: object) {
  guardado.set(CHAVE, JSON.stringify(sessao));
}

function sessaoSalva() {
  const raw = guardado.get(CHAVE);
  return raw ? JSON.parse(raw) : null;
}

async function abrirApp() {
  const hook = renderHook(
    () => useAuth(),
    undefined,
    (filho) => <AuthProvider>{filho}</AuthProvider>
  );
  await esperarRespostas();
  return hook;
}

describe('AuthContext — renovação do token', () => {
  let alerta: jest.SpiedFunction<typeof Alert.alert>;

  beforeEach(() => {
    guardado.clear();
    refreshMock.mockReset();
    alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sessão perto de expirar: troca o token e salva a nova validade', async () => {
    salvarSessao({ user: USUARIO, token: 'antigo', expiraEm: Date.now() + 2 * HORA });
    refreshMock.mockResolvedValue({ token: 'novo', expires_in: 86400 });

    const { result } = await abrirApp();

    expect(refreshMock).toHaveBeenCalledWith('antigo');
    expect(result.current.token).toBe('novo');
    expect(sessaoSalva().token).toBe('novo');
    expect(sessaoSalva().expiraEm).toBeGreaterThan(Date.now() + 23 * HORA);
  });

  it('sessão salva por versão antiga do app (sem validade): renova', async () => {
    salvarSessao({ user: USUARIO, token: 'antigo' });
    refreshMock.mockResolvedValue({ token: 'novo', expires_in: 86400 });

    const { result } = await abrirApp();

    expect(result.current.token).toBe('novo');
  });

  it('sessão com bastante tempo pela frente: não renova', async () => {
    salvarSessao({ user: USUARIO, token: 'atual', expiraEm: Date.now() + 20 * HORA });

    const { result } = await abrirApp();

    expect(refreshMock).not.toHaveBeenCalled();
    expect(result.current.token).toBe('atual');
  });

  it('token já expirado (refresh responde 401): volta pro login com aviso', async () => {
    salvarSessao({ user: USUARIO, token: 'vencido', expiraEm: Date.now() - HORA });
    refreshMock.mockRejectedValue({ message: 'Sessão inválida ou expirada.', status: 401 });

    const { result } = await abrirApp();

    expect(result.current.isAuthenticated).toBe(false);
    expect(sessaoSalva()).toBeNull();
    expect(alerta).toHaveBeenCalledWith('Sessão expirada', expect.any(String));
  });

  it('sem internet na renovação: continua logado com o token atual', async () => {
    salvarSessao({ user: USUARIO, token: 'antigo', expiraEm: Date.now() + 2 * HORA });
    refreshMock.mockRejectedValue({ message: 'Sem conexão com o servidor.' });

    const { result } = await abrirApp();

    expect(result.current.token).toBe('antigo');
    expect(alerta).not.toHaveBeenCalled();
  });

  it('401 de outra requisição com o token antigo durante a renovação não derruba a sessão', async () => {
    salvarSessao({ user: USUARIO, token: 'antigo', expiraEm: Date.now() + 2 * HORA });
    let responderRefresh!: (resposta: RefreshResponse) => void;
    refreshMock.mockImplementation(() => new Promise((resolve) => (responderRefresh = resolve)));

    const { result } = await abrirApp();

    // A API já invalidou o token antigo; uma lista que saiu com ele volta 401
    act(() => avisos.handler?.('antigo'));
    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => responderRefresh({ token: 'novo', expires_in: 86400 }));
    expect(result.current.token).toBe('novo');
    expect(alerta).not.toHaveBeenCalled();

    // Depois da renovação, um 401 com o token atual volta a encerrar a sessão normalmente
    await act(async () => avisos.handler?.('novo'));
    expect(result.current.isAuthenticated).toBe(false);
  });
});
