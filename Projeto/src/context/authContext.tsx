import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { AuthContextData, FinalidadeCodigo, User } from '../types/auth';
import { confirmarCodigo, loginRequest, logoutRequest } from '../services/authService';
import { ApiError, setUnauthorizedHandler } from '../services/api';

// Chave usada para armazenar a sessão do usuário no SecureStore do dispositivo
const SESSION_KEY = 'AppProdutores.session';

// Cria um contexto de autenticação para gerenciar o estado do usuário e do token de autenticação na aplicação.
const AuthContext = createContext<AuthContextData>({} as AuthContextData);

type StoredSession = {
  user: User;
  token: string;
};

// Componente provedor de autenticação, responsável por fornecer o contexto de autenticação para os componentes filhos.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Estado local para armazenar o usuário autenticado, o token de autenticação e o estado de carregamento da sessão.
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cópia do token atual numa ref. O aviso de 401 vem de fora do React (do api.ts),
  // e a ref garante que ele sempre leia o token mais recente, não o de quando foi registrado.
  const tokenRef = useRef<string | null>(null);

  // Apaga a sessão do SecureStore e limpa o estado do usuário e do token.
  // Sem usuário, o routes/index.routes.tsx volta pra tela de Login sozinho.
  const clearSession = useCallback(async () => {
    tokenRef.current = null;
    setUser(null);
    setToken(null);
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }, []);

  // Chamada pelo api.ts quando uma requisição autenticada volta 401 (token expirado ou revogado).
  const handleSessionExpired = useCallback(
    (failedToken: string) => {
      // Ignora se o token recusado não é mais o atual. Acontece quando várias requisições
      // falham juntas (só a primeira conta) ou na resposta do próprio logout, que já limpou a sessão.
      if (failedToken !== tokenRef.current) return;

      clearSession();
      Alert.alert('Sessão expirada', 'Sua sessão expirou. Faça login novamente.');
    },
    [clearSession]
  );

  useEffect(() => {
    // Carrega a sessão salva no SecureStore do dispositivo, se houver, e atualiza o estado do usuário e do token.
    async function loadStoredSession() {
      try {
        const raw = await SecureStore.getItemAsync(SESSION_KEY);
        if (raw) {
          const session: StoredSession = JSON.parse(raw);
          tokenRef.current = session.token;
          setUser(session.user);
          setToken(session.token);
        }
      } catch (error) {
        console.error('Erro ao carregar sessão salva:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadStoredSession();
  }, []);

  // Registra no api.ts o que fazer quando a API recusar o token (sessão expirada ou revogada).
  useEffect(() => {
    setUnauthorizedHandler(handleSessionExpired);
    return () => setUnauthorizedHandler(null);
  }, [handleSessionExpired]);

  // Guarda a sessão no SecureStore e atualiza o estado — com usuário, o routes/index.routes.tsx
  // troca sozinho para as telas do app. Usada pelo login e pela confirmação do código por e-mail.
  async function saveSession(authenticatedUser: User, newToken: string) {
    await SecureStore.setItemAsync(
      SESSION_KEY,
      JSON.stringify({ user: authenticatedUser, token: newToken } as StoredSession)
    );

    tokenRef.current = newToken;
    setUser(authenticatedUser);
    setToken(newToken);
  }

  // Função para realizar o login do usuário, enviando as credenciais para a API e armazenando a sessão no SecureStore.
  async function signIn(cpf: string, password: string) {
    if (!cpf || !password) {
      throw new Error('Por favor, preencha todos os campos.');
    }

    try {
      const { user: authenticatedUser, token: newToken } = await loginRequest(cpf, password);
      await saveSession(authenticatedUser, newToken);
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
      const { user: authenticatedUser, token: newToken } = await confirmarCodigo(
        finalidade,
        cpf,
        codigo,
        password
      );
      await saveSession(authenticatedUser, newToken);
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.message ?? 'Não foi possível confirmar o código.');
    }
  }

  // Função para realizar o logout do usuário. Sai na hora no aparelho e depois avisa a API,
  // para o token deixar de valer também no servidor.
  async function signOut() {
    const currentToken = tokenRef.current;
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

// Hook personalizado para acessar o contexto de autenticação em outros componentes da aplicação.
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth precisa ser usado dentro de um AuthProvider');
  }

  return context;
}
