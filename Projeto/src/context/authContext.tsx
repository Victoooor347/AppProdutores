import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { AuthContextData, FinalidadeCodigo, User } from '../types/auth';
import {
  confirmarCodigo,
  loginRequest,
  logoutRequest,
  refreshRequest,
} from '../services/authService';
import { ApiError, setUnauthorizedHandler } from '../services/api';
import { calcularExpiracao, precisaRenovar } from '../utils/sessao';

// Chave usada para armazenar a sessão do usuário no SecureStore do dispositivo
const SESSION_KEY = 'AppProdutores.session';

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

type StoredSession = {
  user: User;
  token: string;
  // Quando o token expira (ms, como Date.now()). Sessões salvas antes da renovação
  // automática não têm esse campo.
  expiraEm?: number;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cópia da sessão atual em refs. O aviso de 401 vem de fora do React (do api.ts) e a
  // renovação roda quando o app volta pra tela; as refs garantem que os dois sempre leiam
  // a sessão mais recente, não a de quando foram registrados.
  const sessaoRef = useRef<StoredSession | null>(null);
  // Token que está sendo trocado agora por um novo (null = nenhuma renovação em andamento)
  const renovandoTokenRef = useRef<string | null>(null);

  // Apaga a sessão do SecureStore e limpa o estado do usuário e do token.
  // Sem usuário, o routes/index.routes.tsx volta pra tela de Login sozinho.
  const clearSession = useCallback(async () => {
    sessaoRef.current = null;
    setUser(null);
    setToken(null);
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }, []);

  const encerrarSessaoExpirada = useCallback(() => {
    clearSession();
    Alert.alert('Sessão expirada', 'Sua sessão expirou. Faça login novamente.');
  }, [clearSession]);

  // Guarda a sessão no SecureStore e atualiza o estado — com usuário, o routes/index.routes.tsx
  // troca sozinho para as telas do app. Usada pelo login, pela confirmação do código e pela renovação.
  const saveSession = useCallback(async (sessao: StoredSession) => {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(sessao));
    sessaoRef.current = sessao;
    setUser(sessao.user);
    setToken(sessao.token);
  }, []);

  // Chamada pelo api.ts quando uma requisição autenticada volta 401 (token expirado ou revogado).
  const handleSessionExpired = useCallback(
    (failedToken: string) => {
      // Ignora se o token recusado não é mais o atual. Acontece quando várias requisições
      // falham juntas (só a primeira conta) ou na resposta do próprio logout, que já limpou a sessão.
      if (failedToken !== sessaoRef.current?.token) return;
      // Também ignora durante a renovação: a API já invalidou o token antigo, e uma requisição
      // que saiu com ele um pouco antes volta 401 mesmo com a sessão boa. Se a renovação
      // falhar por sessão expirada, quem encerra é o renovarSessaoSeNecessario.
      if (failedToken === renovandoTokenRef.current) return;

      encerrarSessaoExpirada();
    },
    [encerrarSessaoExpirada]
  );

  // Troca o token por um novo antes de ele expirar, sem pedir a senha de novo
  const renovarSessaoSeNecessario = useCallback(async () => {
    const sessao = sessaoRef.current;
    if (!sessao || renovandoTokenRef.current) return;
    if (!precisaRenovar(sessao.expiraEm, Date.now())) return;

    renovandoTokenRef.current = sessao.token;
    try {
      const { token: novoToken, expires_in: expiresIn } = await refreshRequest(sessao.token);
      // Se o produtor saiu (ou entrou com outra conta) durante a renovação, descarta o resultado
      if (sessaoRef.current?.token !== sessao.token) return;
      await saveSession({
        user: sessao.user,
        token: novoToken,
        expiraEm: calcularExpiracao(expiresIn, Date.now()),
      });
    } catch (error) {
      // 401 = o token já tinha expirado: volta pro login. Outros erros (ex: sem internet)
      // não fazem nada — tenta de novo na próxima vez que o app abrir.
      if ((error as ApiError).status === 401 && sessaoRef.current?.token === sessao.token) {
        encerrarSessaoExpirada();
      }
    } finally {
      renovandoTokenRef.current = null;
    }
  }, [saveSession, encerrarSessaoExpirada]);

  useEffect(() => {
    // Carrega a sessão salva no SecureStore do dispositivo, se houver
    async function loadStoredSession() {
      try {
        const raw = await SecureStore.getItemAsync(SESSION_KEY);
        if (raw) {
          const session: StoredSession = JSON.parse(raw);
          sessaoRef.current = session;
          setUser(session.user);
          setToken(session.token);
        }
      } catch (error) {
        console.error('Erro ao carregar sessão salva:', error);
      } finally {
        setIsLoading(false);
      }
      renovarSessaoSeNecessario();
    }

    loadStoredSession();
  }, [renovarSessaoSeNecessario]);

  // Quando o produtor volta pro app (estava em segundo plano), confere se precisa renovar
  useEffect(() => {
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') renovarSessaoSeNecessario();
    });
    return () => assinatura.remove();
  }, [renovarSessaoSeNecessario]);

  // Registra no api.ts o que fazer quando a API recusar o token (sessão expirada ou revogada).
  useEffect(() => {
    setUnauthorizedHandler(handleSessionExpired);
    return () => setUnauthorizedHandler(null);
  }, [handleSessionExpired]);

  async function signIn(cpf: string, password: string) {
    if (!cpf || !password) {
      throw new Error('Por favor, preencha todos os campos.');
    }

    try {
      const resposta = await loginRequest(cpf, password);
      await saveSession({
        user: resposta.user,
        token: resposta.token,
        expiraEm: calcularExpiracao(resposta.expires_in, Date.now()),
      });
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.message ?? 'Não foi possível fazer login.');
    }
  }

  // Primeiro acesso / recuperação de senha: confirma o código que chegou por e-mail,
  // grava a senha nova e já entra no app (a API devolve a sessão, igual ao login).
  async function signInWithCode(
    finalidade: FinalidadeCodigo,
    cpf: string,
    codigo: string,
    password: string
  ) {
    try {
      const resposta = await confirmarCodigo(finalidade, cpf, codigo, password);
      await saveSession({
        user: resposta.user,
        token: resposta.token,
        expiraEm: calcularExpiracao(resposta.expires_in, Date.now()),
      });
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.message ?? 'Não foi possível confirmar o código.');
    }
  }

  // Sai na hora no aparelho e depois avisa a API, para o token deixar de valer também no servidor.
  async function signOut() {
    const currentToken = sessaoRef.current?.token;
    await clearSession();

    if (currentToken) {
      try {
        await logoutRequest(currentToken);
      } catch (error) {
        // Sem internet ou token já expirado: não impede o logout no aparelho.
        console.warn('Não foi possível encerrar a sessão no servidor:', error);
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        signIn,
        signInWithCode,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth precisa ser usado dentro de um AuthProvider');
  }

  return context;
}
